import { useCallback, useRef, useState, RefObject } from "react"
import { useAuth } from "@clerk/nextjs"

interface Violation {
  violation_type: string
  severity: string
  message: string
  timestamp: string
}

const DETECT_INTERVAL_MS = 900

// Consecutive frames a condition must hold before we flag it (debounces glances).
const PERSIST_FRAMES: Record<string, number> = {
  no_face: 3,
  looking_away: 3,
  phone_detected: 2,
  unauthorized_object: 2,
  multiple_people: 2,
}

const VIOLATION_COOLDOWN_MS = 8000  // don't re-log the same sustained condition
const EVENT_COOLDOWN_MS = 5000      // debounce discrete browser events

// Violation rate over a rolling window that triggers Bodhi's "relax" line.
const RATE_WINDOW = 12
const RATE_THRESHOLD = 0.5
const ALERT_COOLDOWN_MS = 45000

// Gaze: 0.5 = centered, flag when well off-center.
const HEAD_YAW_LO = 0.36
const HEAD_YAW_HI = 0.64
const HEAD_PITCH_LO = 0.30
const HEAD_PITCH_HI = 0.72
const IRIS_LO = 0.35
const IRIS_HI = 0.65

const OBJECT_SCORE_THRESHOLD = 0.45
const PHONE_CLASSES = new Set(["cell phone"])
const UNAUTHORIZED_CLASSES = new Set(["book", "laptop", "tv", "remote", "keyboard"])

const BEHAVIORAL_SAMPLE_MS = 4000  // how often we send an emotion/posture/gaze sample

const WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm"
const FACE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
const OBJECT_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite"
const POSE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"

// Map the 52 face blendshapes to a coarse emotion label.
function blendshapesToEmotion(categories: any[]): string {
  if (!categories || categories.length === 0) return "neutral"
  const m: Record<string, number> = {}
  for (const c of categories) m[c.categoryName] = c.score
  const smile = ((m.mouthSmileLeft ?? 0) + (m.mouthSmileRight ?? 0)) / 2
  const frown = ((m.mouthFrownLeft ?? 0) + (m.mouthFrownRight ?? 0)) / 2
  const browDown = ((m.browDownLeft ?? 0) + (m.browDownRight ?? 0)) / 2
  const jawOpen = m.jawOpen ?? 0
  const browInnerUp = m.browInnerUp ?? 0
  if (smile > 0.4) return "happy"
  if (jawOpen > 0.4 && browInnerUp > 0.3) return "surprised"
  if (browDown > 0.4) return "tense"
  if (frown > 0.3 || browInnerUp > 0.5) return "sad"
  return "neutral"
}

// Posture from pose landmarks (nose vs shoulders).
function classifyPosture(lm: any[]): string {
  const nose = lm?.[0], lsh = lm?.[11], rsh = lm?.[12]
  if (!nose || !lsh || !rsh) return "good"
  const shMidX = (lsh.x + rsh.x) / 2
  const shMidY = (lsh.y + rsh.y) / 2
  if (Math.abs(nose.x - shMidX) > 0.18) return "leaning_away"
  if (shMidY - nose.y < 0.12) return "slouching"   // head dropped toward shoulders
  if (Math.abs(lsh.y - rsh.y) > 0.12) return "leaning_away"
  return "good"
}

// Nose position between the cheek edges, ~0.5 = facing forward.
function headYawRatio(lm: any[]): number | null {
  const left = lm[234], right = lm[454], nose = lm[1]
  if (!left || !right || !nose) return null
  const span = right.x - left.x
  if (Math.abs(span) < 1e-4) return null
  return (nose.x - left.x) / span
}

// Nose position between forehead and chin, ~0.5 = level.
function headPitchRatio(lm: any[]): number | null {
  const top = lm[10], bottom = lm[152], nose = lm[1]
  if (!top || !bottom || !nose) return null
  const span = bottom.y - top.y
  if (Math.abs(span) < 1e-4) return null
  return (nose.y - top.y) / span
}

/** Horizontal iris position within an eye (~0.5 = looking straight ahead).
 *  outer/inner = eye-corner landmarks, iris = iris-center landmark. */
function irisRatio(lm: any[], outerIdx: number, innerIdx: number, irisIdx: number): number | null {
  const outer = lm[outerIdx], inner = lm[innerIdx], iris = lm[irisIdx]
  if (!outer || !inner || !iris) return null
  const span = inner.x - outer.x
  if (Math.abs(span) < 1e-4) return null
  return (iris.x - outer.x) / span
}

export function useProctoring(
  videoRef: RefObject<HTMLVideoElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  onProctorAlert?: () => void
) {
  const { getToken } = useAuth()
  const [proctoringActive, setProctoringActive] = useState(false)
  const [sessionFlagged, setSessionFlagged] = useState(false)
  const [violations, setViolations] = useState<Violation[]>([])
  const [cameraError, setCameraError] = useState("")
  const [cameraAvailable, setCameraAvailable] = useState(false)

  const cameraStreamRef = useRef<MediaStream | null>(null)
  const proctoringWsRef = useRef<WebSocket | null>(null)
  const detectIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // MediaPipe models (loaded lazily on connect).
  const faceRef = useRef<any>(null)
  const objectRef = useRef<any>(null)
  const poseRef = useRef<any>(null)
  const lastTsRef = useRef(0)

  // Latest facial emotion / gaze, sent as behavioral samples on a timer.
  const latestEmotionRef = useRef("neutral")
  const latestGazeRef = useRef("center")
  const lastSampleAtRef = useRef(0)

  // Bookkeeping.
  const lastLoggedAtRef = useRef<Record<string, number>>({})
  const persistRef = useRef<Record<string, number>>({}) // consecutive-frame counters
  const recentRef = useRef<boolean[]>([])
  const lastAlertAtRef = useRef(0)
  const eventCleanupRef = useRef<(() => void) | null>(null)

  // Keep latest alert callback without forcing a reconnect.
  const onAlertRef = useRef<(() => void) | undefined>(onProctorAlert)
  onAlertRef.current = onProctorAlert

  const initCamera = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      })
      cameraStreamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraAvailable(true)
      return true
    } catch (err) {
      setCameraError("Camera not available — proctoring disabled. Voice-only mode active.")
      setCameraAvailable(false)
      console.warn("Camera init failed:", err)
      return false
    }
  }, [videoRef])

  const cleanupCamera = useCallback(() => {
    if (detectIntervalRef.current) {
      clearInterval(detectIntervalRef.current)
      detectIntervalRef.current = null
    }
    eventCleanupRef.current?.()
    eventCleanupRef.current = null
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => {
        track.stop()
        track.enabled = false
      })
      cameraStreamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
      videoRef.current.load()
    }
    try { faceRef.current?.close?.() } catch {}
    try { objectRef.current?.close?.() } catch {}
    try { poseRef.current?.close?.() } catch {}
    faceRef.current = null
    objectRef.current = null
    poseRef.current = null
  }, [videoRef])

  // Throttle per-type, push to the UI list, and log to the backend.
  const recordViolation = useCallback(
    (type: string, severity: string, message: string, cooldown = VIOLATION_COOLDOWN_MS) => {
      const now = Date.now()
      const last = lastLoggedAtRef.current[type] ?? 0
      if (now - last < cooldown) return
      lastLoggedAtRef.current[type] = now

      const v: Violation = {
        violation_type: type,
        severity,
        message,
        timestamp: new Date().toISOString(),
      }
      setViolations((prev) => [...prev, v].slice(-30))

      const ws = proctoringWsRef.current
      if (ws?.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({
            type: "client_violation",
            violation_type: type,
            severity,
            message,
          }))
        } catch {}
      }
    },
    []
  )

  // Track the violation rate; fire the relax callback when it's sustained high.
  const updateRate = useCallback((hadViolation: boolean) => {
    const w = recentRef.current
    w.push(hadViolation)
    if (w.length > RATE_WINDOW) w.shift()
    if (w.length < RATE_WINDOW) return
    const rate = w.filter(Boolean).length / w.length
    if (rate > RATE_THRESHOLD) {
      const now = Date.now()
      if (now - lastAlertAtRef.current >= ALERT_COOLDOWN_MS) {
        lastAlertAtRef.current = now
        onAlertRef.current?.()
      }
    }
  }, [])

  // Count consecutive frames a condition holds; record it once it persists.
  const sustain = useCallback(
    (type: string, active: boolean, severity: string, message: string): boolean => {
      const need = PERSIST_FRAMES[type] ?? 2
      const counters = persistRef.current
      if (!active) {
        counters[type] = 0
        return false
      }
      counters[type] = (counters[type] ?? 0) + 1
      if (counters[type] === need) {
        recordViolation(type, severity, message)
        return true
      }
      return counters[type] >= need
    },
    [recordViolation]
  )

  const detectOnce = useCallback(() => {
    const video = videoRef.current
    if (!video || video.readyState < 2) return

    // MediaPipe VIDEO mode needs strictly increasing timestamps.
    let ts = performance.now()
    if (ts <= lastTsRef.current) ts = lastTsRef.current + 1
    lastTsRef.current = ts

    let anyViolation = false

    // Face: presence, head pose, iris gaze, emotion.
    const face = faceRef.current
    if (face) {
      let fr: any
      try { fr = face.detectForVideo(video, ts) } catch { fr = null }
      const faces: any[] = fr?.faceLandmarks ?? []

      anyViolation = sustain("no_face", faces.length === 0, "medium",
        "No face detected — candidate may have left the frame.") || anyViolation

      if (faces.length === 1) {
        const lm = faces[0]
        const yaw = headYawRatio(lm)
        const pitch = headPitchRatio(lm)
        const irisL = irisRatio(lm, 33, 133, 468)
        const irisR = irisRatio(lm, 263, 362, 473)

        const headOff =
          (yaw !== null && (yaw < HEAD_YAW_LO || yaw > HEAD_YAW_HI)) ||
          (pitch !== null && (pitch < HEAD_PITCH_LO || pitch > HEAD_PITCH_HI))
        const gazeOff =
          (irisL !== null && (irisL < IRIS_LO || irisL > IRIS_HI)) &&
          (irisR !== null && (irisR < IRIS_LO || irisR > IRIS_HI))

        anyViolation = sustain("looking_away", headOff || gazeOff, "low",
          headOff ? "Candidate's head is turned away from the screen."
                  : "Candidate's eyes are off-screen.") || anyViolation

        latestGazeRef.current = headOff || gazeOff ? "away" : "center"
        const blend = fr?.faceBlendshapes?.[0]?.categories
        if (blend) latestEmotionRef.current = blendshapesToEmotion(blend)
      } else {
        persistRef.current["looking_away"] = 0
        if (faces.length === 0) latestGazeRef.current = "away"
      }
    }

    // Objects: phone, unauthorized materials, multiple people.
    const objd = objectRef.current
    if (objd) {
      let or: any
      try { or = objd.detectForVideo(video, ts) } catch { or = null }
      const dets: any[] = or?.detections ?? []

      let personCount = 0
      let phone = false
      let material: string | null = null
      for (const d of dets) {
        const cat = d.categories?.[0]
        if (!cat || cat.score < OBJECT_SCORE_THRESHOLD) continue
        const name = (cat.categoryName || "").toLowerCase()
        if (name === "person") personCount++
        else if (PHONE_CLASSES.has(name)) phone = true
        else if (UNAUTHORIZED_CLASSES.has(name)) material = name
      }

      anyViolation = sustain("phone_detected", phone, "high",
        "A phone is visible in the frame.") || anyViolation
      anyViolation = sustain("multiple_people", personCount > 1, "high",
        `${personCount} people detected in the frame.`) || anyViolation
      anyViolation = sustain("unauthorized_object", material !== null, "medium",
        `Unauthorized item in frame: ${material ?? "object"}.`) || anyViolation
    }

    // Periodic emotion/posture/gaze sample for the report.
    const now = Date.now()
    if (now - lastSampleAtRef.current >= BEHAVIORAL_SAMPLE_MS) {
      lastSampleAtRef.current = now
      let posture = "good"
      const pose = poseRef.current
      if (pose) {
        let pr: any
        try { pr = pose.detectForVideo(video, ts + 1) } catch { pr = null }
        const plm: any[] = pr?.landmarks?.[0] ?? []
        if (plm.length) posture = classifyPosture(plm)
      }
      const ws = proctoringWsRef.current
      if (ws?.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({
            type: "client_behavioral",
            emotion: latestEmotionRef.current,
            posture,
            gaze_direction: latestGazeRef.current,
          }))
        } catch {}
      }
    }

    updateRate(anyViolation)
  }, [videoRef, sustain, updateRate])

  // Tab-switch / focus / fullscreen / clipboard signals. Returns a cleanup fn.
  const attachBrowserEvents = useCallback((): (() => void) => {
    const onVisibility = () => {
      if (document.hidden) {
        recordViolation("tab_switch", "medium",
          "Candidate switched away from the interview tab.", EVENT_COOLDOWN_MS)
      }
    }
    const onBlur = () => {
      if (!document.hidden) {
        recordViolation("focus_loss", "medium",
          "Interview window lost focus.", EVENT_COOLDOWN_MS)
      }
    }
    const onFullscreen = () => {
      if (!document.fullscreenElement) {
        recordViolation("fullscreen_exit", "low",
          "Candidate exited fullscreen.", EVENT_COOLDOWN_MS)
      }
    }
    const onCopy = () => recordViolation("clipboard_copy", "low", "Copy detected.", EVENT_COOLDOWN_MS)
    const onPaste = () => recordViolation("clipboard_paste", "low", "Paste detected.", EVENT_COOLDOWN_MS)

    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("blur", onBlur)
    document.addEventListener("fullscreenchange", onFullscreen)
    document.addEventListener("copy", onCopy)
    document.addEventListener("paste", onPaste)

    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("blur", onBlur)
      document.removeEventListener("fullscreenchange", onFullscreen)
      document.removeEventListener("copy", onCopy)
      document.removeEventListener("paste", onPaste)
    }
  }, [recordViolation])

  const connectWebSocket = useCallback(
    async (sessionId: string, _referenceImageB64: string) => {
      // Load the MediaPipe models. Face is required; object + pose are best-effort.
      if (!faceRef.current) {
        try {
          const vision = await import("@mediapipe/tasks-vision")
          const fileset = await vision.FilesetResolver.forVisionTasks(WASM_BASE)
          faceRef.current = await vision.FaceLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate: "GPU" },
            runningMode: "VIDEO",
            numFaces: 2,
            outputFaceBlendshapes: true,
          })
          if (!objectRef.current) {
            try {
              objectRef.current = await vision.ObjectDetector.createFromOptions(fileset, {
                baseOptions: { modelAssetPath: OBJECT_MODEL_URL, delegate: "GPU" },
                runningMode: "VIDEO",
                scoreThreshold: OBJECT_SCORE_THRESHOLD,
                maxResults: 5,
              })
            } catch (objErr) {
              console.warn("ObjectDetector load failed (phone/object detection off):", objErr)
            }
          }
          if (!poseRef.current) {
            try {
              poseRef.current = await vision.PoseLandmarker.createFromOptions(fileset, {
                baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate: "GPU" },
                runningMode: "VIDEO",
                numPoses: 1,
              })
            } catch (poseErr) {
              console.warn("PoseLandmarker load failed (posture tracking off):", poseErr)
            }
          }
        } catch (err) {
          console.warn("MediaPipe load failed:", err)
          setCameraError("Proctoring engine failed to load — continuing voice-only.")
          return
        }
      }

      // Logging WebSocket. The backend persists violations/samples for the report.
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
      const wsBase = apiBase.replace(/^http/, "ws")
      const token = await getToken()
      const url = `${wsBase}/api/proctoring/ws/${sessionId}${token ? `?token=${encodeURIComponent(token)}` : ""}`
      const ws = new WebSocket(url)
      proctoringWsRef.current = ws

      ws.onopen = () => setProctoringActive(true)
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === "frame_result" && msg.session_flagged) setSessionFlagged(true)
          else if (msg.type === "session_flagged") setSessionFlagged(true)
        } catch {}
      }
      ws.onerror = () => console.warn("Proctoring log WS error")
      ws.onclose = () => setProctoringActive(false)

      // Start the detection loop + browser-event listeners.
      if (detectIntervalRef.current) clearInterval(detectIntervalRef.current)
      detectIntervalRef.current = setInterval(detectOnce, DETECT_INTERVAL_MS)
      eventCleanupRef.current?.()
      eventCleanupRef.current = attachBrowserEvents()
      setProctoringActive(true)
    },
    [getToken, detectOnce, attachBrowserEvents]
  )

  const endSession = useCallback(() => {
    if (detectIntervalRef.current) {
      clearInterval(detectIntervalRef.current)
      detectIntervalRef.current = null
    }
    eventCleanupRef.current?.()
    eventCleanupRef.current = null
    const ws = proctoringWsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      try { ws.send(JSON.stringify({ type: "end_session" })) } catch {}
      ws.close()
    }
    proctoringWsRef.current = null
  }, [])

  // Re-attach the stream after a re-render remounts the <video>.
  const reattachStream = useCallback(() => {
    const video = videoRef.current
    const stream = cameraStreamRef.current
    if (video && stream && !video.srcObject) {
      video.srcObject = stream
      video.play().catch(() => {})
    }
  }, [videoRef])

  // Stubs for face-verification compatibility.
  const handleFaceViolation = useCallback(() => {}, [])
  const handleFaceFlag = useCallback(() => {}, [])

  return {
    proctoringActive,
    sessionFlagged,
    violations,
    cameraError,
    cameraAvailable,
    initCamera,
    cleanupCamera,
    connectWebSocket,
    endSession,
    reattachStream,
    handleFaceViolation,
    handleFaceFlag,
  }
}
