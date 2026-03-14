"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Navbar from "@/components/Navbar"
import { PageHeader } from "@/components/ui/page-header"
import { InterviewSetupForm, type InterviewFormData } from "@/components/interview/InterviewSetupForm"
import { TranscriptView } from "@/components/interview/TranscriptView"
import { StatusIndicator } from "@/components/interview/StatusIndicator"
import { SessionInfoCard } from "@/components/interview/SessionInfoCard"
import { ProctoringPanel } from "@/components/interview/ProctoringPanel"
import { InterviewSummary } from "@/components/interview/InterviewSummary"
import { useInterviewAudio } from "@/hooks/useInterviewAudio"
import { useProctoring } from "@/hooks/useProctoring"
import { useSentimentAnalysis } from "@/hooks/useSentimentAnalysis"
import {
  type SessionState,
  type SessionEnd,
  type StreamMeta,
  type InterviewReport,
  startInterviewStream,
  sendAudioStream,
  parseStreamHeaders,
  getSession,
  endInterview,
  downloadReportPDF,
} from "@/lib/api";
import ReportPreview from "@/components/ReportPreview";

type Phase = "idle" | "listening" | "recording" | "processing" | "speaking" | "ended"

interface Turn {
  speaker: "user" | "bodhi"
  text: string
  phase?: string
}

const SILENCE_THRESHOLD = 0.015

export default function InterviewPage() {
  const router = useRouter()
  const [sessionId, setSessionId] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState<Turn[]>([]);
  const [sessionInfo, setSessionInfo] = useState<SessionState | null>(null);
  const [summary, setSummary] = useState<SessionEnd | null>(null);
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<InterviewFormData | null>(null)

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

  // Re-attach camera stream to video element after phase transition
  // When phase changes from "idle" to an active state, the grid layout
  // (with ProctoringPanel containing <video ref={videoRef}>) mounts.
  // The camera stream was already obtained by initCamera() but the
  // <video> element was not yet in the DOM, so we need to re-apply it.
  useEffect(() => {
    if (phase !== "idle" && phase !== "ended") {
      // Small delay to ensure React has committed the DOM update
      const timer = setTimeout(() => {
        proctoring.reattachStream()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [phase, proctoring])

  // URL params - auto-start if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const mode = params.get("mode") as "option_a" | "option_b" | null
    const userId = params.get("user_id")
    if (mode && userId && phase === "idle") {
      setFormData((prev) => ({
        ...(prev || {
          candidate_name: "",
          company: "",
          role: "Software Engineer",
          mode: "standard",
          user_id: "",
          jd_text: "",
          interviewer_persona: "bodhi",
        }),
        mode,
        user_id: userId,
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refreshSession = useCallback(async () => {
    try {
      const info = await getSession(sessionIdRef.current)
      setSessionInfo(info)
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
      const res = await sendAudioStream(sessionIdRef.current, wavBlob, "recording.wav")
      if (!res.ok) throw new Error(`${res.status}: ${await res.text().catch(() => res.statusText)}`)

      const meta: StreamMeta = parseStreamHeaders(res)

      // Update sentiment data from streaming response headers
      if (meta.sentiment) {
        sentiment.updateFromMeta(meta)
      }

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
          await endInterview(sessionIdRef.current)
        } catch { }
        audio.cleanup()
        proctoring.cleanupCamera()
        router.push(`/report/${sessionIdRef.current}`)
        sentiment.reset()
        return
      }

      refreshSession()
      audio.startListening(() => setPhase("listening"), () => setPhase("recording"), finishRecording)
    } catch (err) {
      setError(String(err))
      audio.startListening(() => setPhase("listening"), () => setPhase("recording"), finishRecording)
    }
  }, [audio, proctoring, refreshSession, sentiment, router])

  const handleFormSubmit = async (data: InterviewFormData) => {
    setFormData(data)
    setError("")
    setPhase("processing")
    try {
      await proctoring.initCamera()
      await audio.initMic()
      // Pass interviewer_persona so backend uses the chosen voice/prompt
      const res = await startInterviewStream({
        ...data,
        interviewer_persona: data.interviewer_persona ?? "bodhi",
      })
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

  const handleDownloadPDF = async () => {
    if (!sessionIdRef.current) return;
    setDownloadingPDF(true);
    try {
      await downloadReportPDF(sessionIdRef.current);
    } catch (err) {
      setError(String(err));
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleEnd = async () => {
    audio.stopListening()
    setPhase("processing")
    proctoring.endSession()
    sentiment.reset()
    try {
      await endInterview(sessionIdRef.current)
    } catch (err) {
      setError(String(err))
    }
    audio.cleanup()
    proctoring.cleanupCamera()
    router.push(`/report/${sessionIdRef.current}`)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audio.cleanup()
      proctoring.cleanupCamera()
      proctoring.endSession()
      sentiment.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Render: Setup Form ──────────────────────────────────
  if (phase === "idle") {
    return (
      <div className="min-h-screen bg-[#F7F5F3]">
        <Navbar />
        <div className="mx-auto max-w-lg space-y-6 pt-28 px-4 pb-12">
          <PageHeader
            title="Mock Interview"
            description="Hands-free voice conversation. Speak naturally — your interviewer listens, responds, and loops."
          />
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-fade-in-up">
              {error}
            </div>
          )}
          <div className="rounded-2xl border border-[rgba(55,50,47,0.10)] bg-white p-6 shadow-[0px_2px_8px_rgba(55,50,47,0.06)] animate-fade-in-up">
            <InterviewSetupForm onSubmit={handleFormSubmit} loading={phase !== "idle"} />
          </div>
        </div>
      </div>
    )
  }

  // ── Render: Active Interview ─────────────────────────────
  return (
    <div className="min-h-screen bg-[#F7F5F3]">
      <Navbar />
      {/* Hidden canvas for proctoring snapshots */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="pt-24 pb-8 px-4 sm:px-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#37322F]">
              {phase === "ended" ? "Interview Complete" : "Live Interview"}
            </h1>
            {sessionId && (
              <p className="text-sm text-[rgba(55,50,47,0.5)] mt-1">
                Session: {sessionId.slice(0, 12)}...
              </p>
            )}
          </div>
          {phase !== "ended" && (
            <button
              onClick={handleEnd}
              className="rounded-full bg-red-500 px-5 py-2 text-sm font-semibold text-white hover:bg-red-600 transition-all duration-200 hover:shadow-[0px_4px_12px_rgba(239,68,68,0.3)] hover:scale-105"
            >
              End Interview
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-fade-in-up">
            {error}
          </div>
        )}

        {/* ── Ended + Summary ───────────────────────────── */}
        {phase === "ended" && summary && (
          <InterviewSummary summary={summary} />
        )}

        {/* ── Active Session Grid ───────────────────────── */}
        {phase !== "ended" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main: Status + Transcript */}
            <div className="lg:col-span-2 space-y-4">
              <StatusIndicator
                phase={phase}
                level={audio.level}
                silenceThreshold={SILENCE_THRESHOLD}
              />
              <TranscriptView
                transcript={transcript}
                isProcessing={phase === "processing"}
                interviewerPersona={formData?.interviewer_persona ?? "bodhi"}
              />
              {loadingReport && (
                <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-6 text-center animate-pulse">
                  <p className="text-sm font-medium text-blue-700">Generating comprehensive report...</p>
                  <p className="text-xs text-blue-500 mt-2">This may take a few moments</p>
                </div>
              )}
              {report && (
                <div className="mt-6 animate-fade-in-up">
                  <ReportPreview report={report} onDownloadPDF={handleDownloadPDF} downloading={downloadingPDF} />
                </div>
              )}
            </div>

            {/* Sidebar: Proctoring + Session Info */}
            <div className="space-y-4">
              <ProctoringPanel
                videoRef={videoRef}
                proctoringActive={proctoring.proctoringActive}
                sessionFlagged={proctoring.sessionFlagged}
                violations={proctoring.violations}
                cameraError={proctoring.cameraError}
                sentimentData={sentiment.sentimentData}
                faceVerification={{
                  isActive: false,
                  lastScore: null,
                  consecutiveMismatches: 0,
                }}
              />
              <SessionInfoCard sessionInfo={sessionInfo} sessionId={sessionId} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
