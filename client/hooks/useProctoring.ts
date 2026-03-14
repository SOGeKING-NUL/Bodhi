import { useCallback, useRef, useState, RefObject } from "react"

interface Violation {
  violation_type: string
  severity: string
  message: string
  timestamp: string
}

const FRAME_INTERVAL_MS = 2500

export function useProctoring(
  videoRef: RefObject<HTMLVideoElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>
) {
  const [proctoringActive, setProctoringActive] = useState(false)
  const [sessionFlagged, setSessionFlagged] = useState(false)
  const [violations, setViolations] = useState<Violation[]>([])
  const [cameraError, setCameraError] = useState("")

  const cameraStreamRef = useRef<MediaStream | null>(null)
  const proctoringWsRef = useRef<WebSocket | null>(null)
  const frameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const frameCounterRef = useRef(0)

  const initCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      })
      cameraStreamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch (err) {
      setCameraError("Camera not available — proctoring disabled.")
      console.warn("Camera init failed:", err)
    }
  }, [videoRef])

  const cleanupCamera = useCallback(() => {
    // Stop frame interval
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current)
      frameIntervalRef.current = null
    }
    
    // Stop all video tracks properly
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => {
        track.stop()
        track.enabled = false
      })
      cameraStreamRef.current = null
    }
    
    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null
      videoRef.current.load()
    }
  }, [videoRef])

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) return null
    
    // Only update canvas dimensions if they've changed
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
    }
    
    const ctx = canvas.getContext("2d", { willReadFrequently: false })
    if (!ctx) return null
    
    // Optimize canvas operations
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    // Use lower quality for better performance (0.6 instead of 0.8)
    return canvas.toDataURL("image/jpeg", 0.6).split(",")[1]
  }, [videoRef, canvasRef])

  const connectWebSocket = useCallback(
    (sessionId: string, referenceImageB64: string) => {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
      const wsBase = apiBase.replace(/^http/, "ws")
      const ws = new WebSocket(`${wsBase}/api/proctoring/ws/${sessionId}`)
      proctoringWsRef.current = ws

      ws.onopen = () => {
        setProctoringActive(true)
        frameIntervalRef.current = setInterval(() => {
          if (proctoringWsRef.current?.readyState !== WebSocket.OPEN) return
          const frame = captureFrame()
          if (!frame) return
          frameCounterRef.current += 1
          proctoringWsRef.current.send(
            JSON.stringify({
              type: "frame",
              frame_id: `frame-${frameCounterRef.current}`,
              frame,
            })
          )
        }, FRAME_INTERVAL_MS)
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === "frame_result") {
            if (msg.has_violations && msg.violations?.length > 0)
              setViolations((prev) => [...prev, ...msg.violations].slice(-20))
            if (msg.session_flagged) setSessionFlagged(true)
          } else if (msg.type === "session_flagged") {
            setSessionFlagged(true)
          }
        } catch {}
      }

      ws.onerror = () => setCameraError("Proctoring connection error.")
      ws.onclose = () => setProctoringActive(false)
    },
    [captureFrame]
  )

  const endSession = useCallback(() => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current)
      frameIntervalRef.current = null
    }
    const ws = proctoringWsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "end_session" }))
      ws.close()
    }
    proctoringWsRef.current = null
  }, [])

  /**
   * Re-attach the saved camera stream to the video element.
   * Call this after the <video> element has mounted in the DOM
   * (e.g. after a phase transition that causes a re-render).
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
    initCamera,
    cleanupCamera,
    connectWebSocket,
    endSession,
    reattachStream,
    handleFaceViolation,
    handleFaceFlag,
  }
}
