"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/components/app/app-shell";
import { PlayIcon } from "@/components/app/ui/icons";
import { Alert, Spinner } from "@/components/app/ui/feedback";
import { Card } from "@/components/app/ui/card";
import {
  InterviewSetupForm,
  type InterviewFormData,
} from "@/components/interview/InterviewSetupForm";
import { InterviewSessionView } from "@/components/interview/InterviewSessionView";
import { useInterviewAudio } from "@/hooks/useInterviewAudio";
import { useProctoring } from "@/hooks/useProctoring";
import { useSentimentAnalysis } from "@/hooks/useSentimentAnalysis";
import { endInterview, prepareInterview } from "@/lib/api";

type Phase = "idle" | "listening" | "recording" | "processing" | "speaking" | "ended";

interface Turn {
  speaker: "user" | "bodhi";
  text: string;
  phase?: string;
}

export default function InterviewPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [interviewPhase, setInterviewPhase] = useState<string>("intro");
  const [transcript, setTranscript] = useState<Turn[]>([]);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<InterviewFormData | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [demoPhase, setDemoPhase] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");

  // Editor content is held in a ref (not state) so per-keystroke typing never
  // re-renders this page, which owns the WebSocket, audio pipeline and transcript.
  const editorContentRef = useRef("");
  const editorSendTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef<Phase>("idle");
  const sessionIdRef = useRef("");
  const handleFormSubmitRef = useRef<
    (data: InterviewFormData, isDemoMode?: boolean, submitDemoPhase?: string) => void
  >(() => {});
  const cleanupRef = useRef<() => void>(() => {});

  const audio = useInterviewAudio();
  const handleProctorAlert = useCallback(() => {
    audio.sendControl({ type: "proctor_alert" });
  }, [audio]);
  const handleEditorContentChange = useCallback(
    (content: string) => {
      editorContentRef.current = content;
      // Debounce: push to the backend a few times/sec at most, not per keystroke.
      // The server only reads the cached value once per turn (at end-of-speech).
      if (editorSendTimer.current) clearTimeout(editorSendTimer.current);
      editorSendTimer.current = setTimeout(() => {
        audio.sendControl({ type: "editor_update", content: editorContentRef.current });
      }, 400);
    },
    [audio],
  );
  const proctoring = useProctoring(videoRef, canvasRef, handleProctorAlert);
  const sentiment = useSentimentAnalysis();

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    if (phase !== "idle" && phase !== "ended" && proctoring.cameraAvailable) {
      const timer = setTimeout(() => proctoring.reattachStream(), 100);
      return () => clearTimeout(timer);
    }
  }, [phase, proctoring]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawMode = params.get("mode");
    const mode = rawMode === "option_a" || rawMode === "resume" ? "option_a" : null;
    const userId = params.get("user_id");
    const isDemoMode = params.get("demo") === "true";
    const urlPhase = params.get("phase");

    if (isDemoMode && urlPhase) {
      setDemoMode(true);
      setDemoPhase(urlPhase);
      const demoData: InterviewFormData = {
        candidate_name: "Demo User",
        company: "GrowthX",
        role: "Software Engineer",
        experience_level: "Mid-Level",
        mode: "standard",
        user_id: "",
        jd_text: "",
        interviewer_persona: "bodhi",
      };
      setFormData(demoData);
      setTimeout(() => handleFormSubmitRef.current(demoData, true, urlPhase), 100);
    } else if (mode && userId) {
      setFormData((prev) => ({
        ...(prev || {
          candidate_name: "",
          company: "",
          role: "Software Engineer",
          experience_level: "Mid-Level",
          mode: "standard",
          user_id: "",
          jd_text: "",
          interviewer_persona: "bodhi",
        }),
        mode,
        user_id: userId,
      }));
    }
  }, []);

  const handleFormSubmit = async (
    data: InterviewFormData,
    isDemoMode = false,
    submitDemoPhase = "",
  ) => {
    setFormData(data);
    setError("");
    setPhase("processing");
    try {
      const cameraOk = await proctoring.initCamera();
      await audio.initMic();

      const res = await prepareInterview({
        ...data,
        interviewer_persona: data.interviewer_persona ?? "bodhi",
        demo_mode: isDemoMode,
        demo_phase: submitDemoPhase,
      });

      const sid = res.session_id;
      setSessionId(sid);

      if (cameraOk) proctoring.connectWebSocket(sid, "");

      audio.connectWebSocket(sid, {
        onGreetingStart: (text, sessionPhase) => {
          setTranscript([
            { speaker: "bodhi", text, phase: isDemoMode ? submitDemoPhase : sessionPhase },
          ]);
          setInterviewPhase(isDemoMode ? submitDemoPhase : sessionPhase);
        },
        onGreetingComplete: () => {},
        onTranscript: (text) => {
          setInterimTranscript("");
          setTranscript((prev) => [...prev, { speaker: "user", text }]);
        },
        onInterimTranscript: (text) => {
          setInterimTranscript(text);
        },
        onPartialReply: (chunk) => {
          setTranscript((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.speaker === "bodhi") {
              next[next.length - 1] = { ...last, text: last.text + chunk };
              return next;
            }
            return [...next, { speaker: "bodhi", text: chunk }];
          });
        },
        onReplyComplete: (text, sessionPhase, shouldEnd, sentimentData) => {
          if (sentimentData) sentiment.updateFromMeta({ sentiment: sentimentData });
          setTranscript((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.speaker === "bodhi") {
              next[next.length - 1] = { ...last, text, phase: sessionPhase };
              return next;
            }
            return [...next, { speaker: "bodhi", text, phase: sessionPhase }];
          });
          setInterviewPhase(sessionPhase);
          if (shouldEnd) {
            setPhase("ended");
            proctoring.endSession();
            audio.cleanup();
            proctoring.cleanupCamera();
            router.push(`/report/${sid}`);
            sentiment.reset();
          }
        },
        onError: (err) => {
          setError(err);
          setPhase("idle");
        },
        onTurnError: (text) => {
          setTranscript((prev) => [...prev, { speaker: "bodhi", text }]);
          setInterimTranscript("");
          audio.startListening(() => setPhase("listening"));
        },
        onPlaybackStart: () => {
          setInterimTranscript("");
          setPhase("speaking");
        },
        onPlaybackComplete: () => {
          audio.startListening(() => setPhase("listening"));
        },
      });
    } catch (err) {
      setError(String(err));
      setPhase("idle");
    }
  };
  handleFormSubmitRef.current = handleFormSubmit;

  const handleEnd = async () => {
    audio.stopListening();
    setPhase("processing");
    proctoring.endSession();
    sentiment.reset();
    try {
      await endInterview(sessionIdRef.current);
    } catch (err) {
      setError(String(err));
    }
    audio.cleanup();
    proctoring.cleanupCamera();
    router.push(`/report/${sessionIdRef.current}`);
  };

  cleanupRef.current = () => {
    audio.cleanup();
    proctoring.cleanupCamera();
    proctoring.endSession();
    sentiment.reset();
  };

  useEffect(() => {
    return () => cleanupRef.current();
  }, []);

  if (phase === "idle") {
    return (
      <AppShell>
        <div className="mx-auto">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-[#1a1a1a] sm:text-[28px]">
                {demoMode
                  ? `Demo: ${demoPhase.charAt(0).toUpperCase()}${demoPhase.slice(1)} phase`
                  : "New mock interview"}
              </h1>
              <p className="mt-1.5 text-[15px] leading-relaxed text-neutral-500">
                {demoMode
                  ? `Testing ${demoPhase} questions with GrowthX context.`
                  : "A hands-free voice conversation. Speak naturally — your interviewer listens, responds, and adapts."}
              </p>
            </div>
            {!demoMode && (
              <Link
                href="/interview/demo"
                className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-neutral-500 transition-colors hover:text-[#1a1a1a]"
              >
                <PlayIcon size={15} />
                Try phase demos
              </Link>
            )}
          </div>

          {error && <div className="mt-6"><Alert type="error">{error}</Alert></div>}

          <Card className="mt-6 p-6 sm:p-7">
            <InterviewSetupForm onSubmit={handleFormSubmit} loading={phase !== "idle"} />
          </Card>
        </div>
      </AppShell>
    );
  }

  if (phase === "processing" && transcript.length === 0) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
          <Spinner />
          <h2 className="mt-2 text-lg font-semibold text-[#1a1a1a]">
            Setting up your session…
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            {demoMode ? `Preparing the ${demoPhase} demo` : "Connecting your interviewer"}
          </p>
        </div>
      </AppShell>
    );
  }

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
        cameraAvailable={proctoring.cameraAvailable}
        sentimentData={sentiment.sentimentData}
        violationCount={proctoring.violations.length}
        violations={proctoring.violations}
        interviewerPersona={formData?.interviewer_persona ?? "bodhi"}
        onEditorContentChange={handleEditorContentChange}
        interviewPhase={interviewPhase}
        isUserSpeaking={audio.isUserSpeaking}
        interimTranscript={interimTranscript}
      />
    </>
  );
}
