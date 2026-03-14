"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Navbar from "@/components/Navbar"
import { PageHeader } from "@/components/ui/page-header"
import { InterviewSetupForm, type InterviewFormData } from "@/components/interview/InterviewSetupForm"
import { InterviewSummary } from "@/components/interview/InterviewSummary"
import { InterviewSessionView } from "@/components/interview/InterviewSessionView"
import { useInterviewAudio } from "@/hooks/useInterviewAudio"
import { useProctoring } from "@/hooks/useProctoring"
import { useSentimentAnalysis } from "@/hooks/useSentimentAnalysis"
import {
  type SessionState,
  type SessionEnd,
  type StreamMeta,
  startInterviewStream,
  sendAudioStream,
  parseStreamHeaders,
  getSession,
  endInterview,
} from "@/lib/api"

type Phase = "idle" | "listening" | "recording" | "processing" | "speaking" | "ended"

interface Turn {
  speaker: "user" | "bodhi"
  text: string
  phase?: string
}

export default function InterviewPage() {
  const [sessionId, setSessionId] = useState("")
  const [phase, setPhase] = useState<Phase>("idle")
  const [transcript, setTranscript] = useState<Turn[]>([])
  const [summary, setSummary] = useState<SessionEnd | null>(null)
  const [error, setError] = useState("")

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const phaseRef = useRef<Phase>("idle")
  const sessionIdRef = useRef("")

  // Custom hooks
  const audio = useInterviewAudio()
  const proctoring = useProctoring(videoRef, canvasRef)
  const sentiment = useSentimentAnalysis()

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    sessionIdRef.current = sessionId
  }, [sessionId])

  const refreshSession = useCallback(async () => {
    try {
      await getSession(sessionIdRef.current)
    } catch { }
  }, [])

  const finishRecording = useCallback(async () => {
    setPhase("processing")
    phaseRef.current = "processing"
    audio.setLevel(0)

    const wavBlob = audio.getRecordedAudio()
    if (!wavBlob) {
      audio.startListening(() => setPhase("listening"), () => setPhase("recording"), finishRecording)
      return
    }

    try {
      // Send audio for sentiment analysis (non-blocking)
      sentiment.analyzeSpeech(wavBlob).catch(err => {
        console.warn("Sentiment analysis failed:", err)
      })

      const res = await sendAudioStream(sessionIdRef.current, wavBlob, "recording.wav")
      if (!res.ok) throw new Error(`${res.status}: ${await res.text().catch(() => res.statusText)}`)

      const meta: StreamMeta = parseStreamHeaders(res)
      if (meta.transcript) setTranscript((prev) => [...prev, { speaker: "user", text: meta.transcript! }])
      if (meta.text) setTranscript((prev) => [...prev, { speaker: "bodhi", text: meta.text!, phase: meta.phase }])

      setPhase("speaking")
      phaseRef.current = "speaking"
      await audio.playStreamingAudio(res)

      if (meta.shouldEnd) {
        setPhase("ended")
        proctoring.endSession()
        phaseRef.current = "ended"
        try {
          const end = await endInterview(sessionIdRef.current)
          setSummary(end)
        } catch { }
        audio.cleanup()
        proctoring.cleanupCamera()
        sentiment.reset()
        return
      }

      refreshSession()
      audio.startListening(() => setPhase("listening"), () => setPhase("recording"), finishRecording)
    } catch (err) {
      setError(String(err))
      audio.startListening(() => setPhase("listening"), () => setPhase("recording"), finishRecording)
    }
  }, [audio, proctoring, refreshSession, sentiment])

  const handleFormSubmit = async (data: InterviewFormData) => {
    setError("")
    setPhase("processing")
    phaseRef.current = "processing"

    try {
      await proctoring.initCamera()
      await audio.initMic()
      const res = await startInterviewStream(data)
      if (!res.ok) throw new Error(`${res.status}: ${await res.text().catch(() => res.statusText)}`)

      const meta: StreamMeta = parseStreamHeaders(res)
      if (meta.session) setSessionId(meta.session)
      if (meta.text) setTranscript([{ speaker: "bodhi", text: meta.text, phase: "intro" }])

      if (meta.session) {
        proctoring.connectWebSocket(meta.session, "")
      }

      setPhase("speaking")
      await audio.playStreamingAudio(res)
      refreshSession()
      audio.startListening(() => setPhase("listening"), () => setPhase("recording"), finishRecording)
    } catch (err) {
      setError(String(err))
      setPhase("idle")
    }
  }

  const handleEnd = async () => {
    audio.stopListening()
    setPhase("processing")
    proctoring.endSession()
    sentiment.reset()
    try {
      const r = await endInterview(sessionIdRef.current)
      setSummary(r)
      setPhase("ended")
    } catch (err) {
      setError(String(err))
    }
    audio.cleanup()
    proctoring.cleanupCamera()
  }

  // Cleanup
  useEffect(() => {
    return () => {
      audio.cleanup()
      proctoring.cleanupCamera()
      proctoring.endSession()
      sentiment.reset()
    }
  }, [audio, proctoring, sentiment])

  // URL params - auto-start if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const mode = params.get("mode") as "option_a" | "option_b" | null
    const userId = params.get("user_id")
    if (mode && userId && phase === "idle") {
      handleFormSubmit({
        candidate_name: "",
        company: "",
        role: "Software Engineer",
        mode,
        user_id: userId,
        jd_text: "",
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Render: Idle (Setup Form)
  if (phase === "idle") {
    return (
      <div className="min-h-screen bg-[#F7F5F3] font-sans relative overflow-hidden">
        {/* Animated Grid Background */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(to right, #37322F 1px, transparent 1px),
                linear-gradient(to bottom, #37322F 1px, transparent 1px)
              `,
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        {/* Gradient Orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#E8E3DF] rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#DED9D5] rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float" style={{ animationDelay: "2s" }} />

        <Navbar />
        
        <main className="relative pt-24 pb-16 px-4 sm:px-6 max-w-3xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-12 animate-fade-in-up">
            <h1 className="text-5xl sm:text-6xl font-bold text-[#2F3037] mb-4 tracking-tight">
              Mock Interview
            </h1>
            <p className="text-lg text-[rgba(55,50,47,0.65)] max-w-2xl mx-auto leading-relaxed">
              Hands-free voice conversation. Speak naturally — Bodhi listens, responds, and loops.
            </p>
          </div>

          {error && (
            <div className="rounded-2xl border-2 border-red-200 bg-red-50 px-6 py-5 mb-8 animate-fade-in-up shadow-[0px_4px_16px_rgba(239,68,68,0.1)]">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 4v4m0 2v.5" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-red-800 mb-1 text-sm">Error</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="rounded-2xl border-2 border-[rgba(55,50,47,0.08)] bg-white/70 backdrop-blur-sm p-8 sm:p-10 shadow-[0px_8px_24px_rgba(55,50,47,0.08)] animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <InterviewSetupForm onSubmit={handleFormSubmit} loading={phase !== "idle"} />
          </div>
        </main>
      </div>
    )
  }

  // Render: Active Interview - Show summary if ended, otherwise show session view
  if (phase === "ended" && summary) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-8 px-4 sm:px-6 max-w-7xl mx-auto">
          <InterviewSummary summary={summary} />
        </div>
      </div>
    )
  }

  // Render: Active Interview Session (no navbar, full screen)
  return (
    <>
      <canvas ref={canvasRef} className="hidden" />
      <InterviewSessionView
        sessionId={sessionId}
        videoRef={videoRef}
        transcript={transcript}
        phase={phase}
        onEndSession={handleEnd}
        proctoringActive={proctoring.proctoringActive}
        sessionFlagged={proctoring.sessionFlagged}
        cameraError={proctoring.cameraError}
        sentimentData={sentiment.sentimentData}
        violationCount={proctoring.violations.length}
      />
    </>
  )
}
