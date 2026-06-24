import { useCallback, useRef, useState, RefObject } from "react"
import { useAuth } from "@clerk/nextjs"

interface Violation {
  violation_type: string
  severity: string
  message: string
  timestamp: string
}

// How often we run the in-browser CV detector (ms). ~1 FPS is plenty for
// proctoring and keeps the WASM model cheap on the main thread.
const DETECT_INTERVAL_MS = 1000

// Per-type cooldown so a sustained condition (e.g. you look away for 10s) logs
// ONE violation, not ten.
const VIOLATION_COOLDOWN_MS = 6000

// Rolling window used to compute the "violation rate" that triggers Bodhi's
// verbal reassurance. If more than RATE_THRESHOLD of the last WINDOW detections
// were violations, we ask Bodhi to tell the candidate to relax.
const RATE_WINDOW = 12        // ~12s of detections
const RATE_THRESHOLD = 0.5    // >50% of recent frames had a violation
const ALERT_COOLDOWN_MS = 45000 // client-side guard (backend also rate-limits)

// CDN-hosted WASM runtime + model. Avoids bundling large binaries; needs network
// at runtime (fine for the hosted app / dev).
const WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm"
const FACE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"

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

  // MediaPipe FaceLandmarker instance (loaded lazily on connect).
  const landmarkerRef = useRef<any>(null)
  const lastVideoTimeRef = useRef(-1)

  // Violation bookkeeping.
  const lastLoggedAtRef = useRef<Record<string, number>>({})
  const recentRef = useRef<boolean[]>([])
  const lastAlertAtRef = useRef(0)

  // Keep the latest alert callback without forcing a reconnect.
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
    try {
      landmarkerRef.current?.close?.()
    } catch {}
    landmarkerRef.current = null
  }, [videoRef])

  /** Record a violation: throttle per-type, update UI, and log to the backend. */
  const recordViolation = useCallback(
    (type: string, severity: string, message: string) => {
      const now = Date.now()
      const last = lastLoggedAtRef.current[type] ?? 0
      if (now - last < VIOLATION_COOLDOWN_MS) return
      lastLoggedAtRef.current[type] = now

      const v: Violation = {
        violation_type: type,
        severity,
        message,
        timestamp: new Date().toISOString(),
      }
      setViolations((prev) => [...prev, v].slice(-20))

      const ws = proctoringWsRef.current
      if (ws?.readyState === WebSocket.OPEN) {
        try {
          ws.send(
            JSON.stringify({
              type: "client_violation",
              violation_type: type,
              severity,
              message,
            })
          )
        } catch {}
      }
    },
    []
  )

  /** Push the latest frame's verdict into the rolling window and maybe alert. */
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

  /** Run one detection pass on the current video frame. */
  const detectOnce = useCallback(() => {
    const video = videoRef.current
    const landmarker = landmarkerRef.current
    if (!video || !landmarker || video.readyState < 2) return

    // Skip if the frame hasn't advanced (avoids "timestamp mismatch" errors).
    if (video.currentTime === lastVideoTimeRef.current) return
    lastVideoTimeRef.current = video.currentTime

    let result: any
    try {
      result = landmarker.detectForVideo(video, performance.now())
    } catch {
      return
    }

    const faces: any[] = result?.faceLandmarks ?? []
    let hadViolation = false

    if (faces.length === 0) {
      hadViolation = true
      recordViolation("no_face", "medium", "No face detected in frame.")
    } else if (faces.length > 1) {
      hadViolation = true
      recordViolation("multiple_faces", "high", `${faces.length} faces detected in frame.`)
    } else {
      // Single face — estimate horizontal head orientation from landmarks.
      // 234 = right cheek edge, 454 = left cheek edge, 1 = nose tip.
      const lm = faces[0]
      const left = lm[234]
      const right = lm[454]
      const nose = lm[1]
      if (left && right && nose) {
        const span = right.x - left.x
        if (Math.abs(span) > 1e-4) {
          const ratio = (nose.x - left.x) / span // ~0.5 when centered
          if (ratio < 0.34 || ratio > 0.66) {
            hadViolation = true
            recordViolation("looking_away", "low", "Candidate looking away from screen.")
          }
        }
      }
    }

    updateRate(hadViolation)
  }, [videoRef, recordViolation, updateRate])

  const connectWebSocket = useCallback(
    async (sessionId: string, _referenceImageB64: string) => {
      // 1) Load the MediaPipe FaceLandmarker (WASM) lazily.
      if (!landmarkerRef.current) {
        try {
          const vision = await import("@mediapipe/tasks-vision")
          const fileset = await vision.FilesetResolver.forVisionTasks(WASM_BASE)
          landmarkerRef.current = await vision.FaceLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate: "GPU" },
            runningMode: "VIDEO",
            numFaces: 2,
          })
        } catch (err) {
          console.warn("FaceLandmarker load failed:", err)
          setCameraError("Proctoring engine failed to load — continuing voice-only.")
          // No CV, but don't block the interview.
          return
        }
      }

      // 2) Open the logging WebSocket (backend persists violations for the report).
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
      const wsBase = apiBase.replace(/^http/, "ws")
      const token = await getToken()
      const url = `${wsBase}/api/proctoring/ws/${sessionId}${token ? `?token=${encodeURIComponent(token)}` : ""}`
      const ws = new WebSocket(url)
      proctoringWsRef.current = ws

      ws.onopen = () => {
        setProctoringActive(true)
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === "frame_result") {
            if (msg.session_flagged) setSessionFlagged(true)
          } else if (msg.type === "session_flagged") {
            setSessionFlagged(true)
          }
        } catch {}
      }

      ws.onerror = () => {
        // Logging WS failing should not kill proctoring — detection is local.
        console.warn("Proctoring log WS error")
      }
      ws.onclose = () => setProctoringActive(false)

      // 3) Start the local detection loop regardless of the logging WS state.
      if (detectIntervalRef.current) clearInterval(detectIntervalRef.current)
      detectIntervalRef.current = setInterval(detectOnce, DETECT_INTERVAL_MS)
      setProctoringActive(true)
    },
    [getToken, detectOnce]
  )

  const endSession = useCallback(() => {
    if (detectIntervalRef.current) {
      clearInterval(detectIntervalRef.current)
      detectIntervalRef.current = null
    }
    const ws = proctoringWsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      try { ws.send(JSON.stringify({ type: "end_session" })) } catch {}
      ws.close()
    }
    proctoringWsRef.current = null
  }, [])

  /**
   * Re-attach the saved camera stream to the video element after a re-render
   * (e.g. a phase transition that remounts the <video>).
   */
  const reattachStream = useCallback(() => {
    const video = videoRef.current
    const stream = cameraStreamRef.current
    if (video && stream && !video.srcObject) {
      video.srcObject = stream
      video.play().catch(() => {})
    }
  }, [videoRef])

  // Stubs for face verification compatibility
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
