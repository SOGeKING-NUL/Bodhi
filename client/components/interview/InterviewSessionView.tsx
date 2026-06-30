"use client";

import { useEffect, useState, RefObject } from "react";
import {
  ActivityIcon,
  AlertIcon,
  ClockIcon,
  EndCallIcon,
  EyeIcon,
  MicIcon,
  MicOffIcon,
} from "@/components/app/ui/icons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface Violation {
  violation_type: string;
  severity: string;
  message: string;
  timestamp: string;
}

interface Turn {
  speaker: "user" | "bodhi";
  text: string;
  phase?: string;
}

interface SentimentData {
  emotion: string;
  emotionConfidence: number;
  sentiment: string;
  speechRateWpm: number;
  confidenceScore: number;
  flags: string[];
}

interface InterviewSessionViewProps {
  sessionId: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  transcript: Turn[];
  phase: string;
  onEndSession: () => void;
  proctoringActive: boolean;
  sessionFlagged: boolean;
  cameraError: string;
  cameraAvailable: boolean;
  sentimentData?: SentimentData | null;
  violationCount?: number;
  violations?: Violation[];
  interviewerPersona?: "bodhi" | "riya";
  onEditorContentChange?: (content: string) => void;
  interviewPhase?: string;
  isUserSpeaking?: boolean;
  interimTranscript?: string;
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium capitalize text-[#1a1a1a]">{value}</span>
    </div>
  );
}

export function InterviewSessionView({
  videoRef,
  transcript,
  phase,
  onEndSession,
  proctoringActive,
  sessionFlagged,
  cameraError,
  cameraAvailable,
  sentimentData,
  violationCount = 0,
  violations = [],
  interviewerPersona = "bodhi",
  onEditorContentChange,
  interviewPhase = "intro",
  isUserSpeaking = false,
  interimTranscript = "",
}: InterviewSessionViewProps) {
  const [isMicOn, setIsMicOn] = useState(true);
  const [editorContent, setEditorContent] = useState("");
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsedLabel = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(
    elapsed % 60,
  ).padStart(2, "0")}`;

  const attentionScore = Math.max(40, 100 - violationCount * 6);

  const personaName = interviewerPersona === "riya" ? "Riya" : "Bodhi";
  const isTechnicalPhase = interviewPhase === "technical";
  const isAiActive = phase === "speaking" || (phase === "processing" && transcript.length > 0);

  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const content = e.target.value;
    setEditorContent(content);
    onEditorContentChange?.(content);
  };

  const liveCaption = interimTranscript || transcript[transcript.length - 1]?.text;

  const phaseText = (() => {
    if (phase === "listening" && isUserSpeaking) return "You're speaking";
    switch (phase) {
      case "listening": return "Listening…";
      case "recording": return "Recording";
      case "processing": return "Processing";
      case "speaking": return "Interviewer speaking";
      default: return "Active";
    }
  })();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F8F9FB]">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-[#1a1a1a]">{personaName}</h1>
          <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
            {phaseText}
          </span>
          <span className="rounded-md bg-neutral-900 px-2 py-0.5 text-xs font-medium capitalize text-white">
            {interviewPhase}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm font-medium tabular-nums text-neutral-500">
            <ClockIcon size={15} />
            {elapsedLabel}
          </div>
          <button
            onClick={() => setShowEndConfirm(true)}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            End session
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-[280px] flex-col gap-6 border-r border-neutral-200 bg-white p-6">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[#1a1a1a]">Session metrics</h3>
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500">Proctoring</span>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    sessionFlagged
                      ? "bg-red-500"
                      : proctoringActive
                        ? "animate-pulse bg-emerald-500"
                        : "bg-neutral-300",
                  )}
                />
                <span className="text-xs font-medium text-[#1a1a1a]">
                  {sessionFlagged
                    ? "Flagged"
                    : proctoringActive
                      ? "Active"
                      : !cameraAvailable
                        ? "Disabled"
                        : "Inactive"}
                </span>
              </div>
            </div>

            {cameraError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {cameraError}
              </div>
            )}

            {sessionFlagged && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                <AlertIcon size={14} className="mt-0.5 shrink-0 text-red-600" />
                <p className="text-xs text-red-700">Session flagged due to violations</p>
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-neutral-500">Attention score</span>
              <span className="text-sm font-semibold text-[#1a1a1a]">{attentionScore}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-[#1a1a1a] transition-all duration-500"
                style={{ width: `${attentionScore}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-[#1a1a1a]">Sentiment</h4>
            <MetricRow
              label="Confidence"
              value={sentimentData ? `${sentimentData.confidenceScore}%` : "—"}
            />
            <MetricRow label="Emotion" value={sentimentData?.emotion || "—"} />
            <MetricRow
              label="Speech rate"
              value={sentimentData ? `${sentimentData.speechRateWpm} wpm` : "—"}
            />
            {sentimentData?.flags && sentimentData.flags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {sentimentData.flags.map((flag, i) => (
                  <span
                    key={i}
                    className="rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] capitalize text-neutral-600"
                  >
                    {flag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-neutral-500">Violations</span>
              <span
                className={cn(
                  "text-sm font-semibold",
                  violationCount > 0 ? "text-red-600" : "text-[#1a1a1a]",
                )}
              >
                {violationCount}
              </span>
            </div>
            {violations.length > 0 && (
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {violations.slice(-5).map((v, i) => (
                  <div key={i} className="rounded-lg border border-red-100 bg-red-50 px-3 py-2">
                    <p className="text-[10px] font-semibold capitalize text-red-700">
                      {v.violation_type.replace(/_/g, " ")}
                    </p>
                    <p className="text-[10px] text-neutral-500">{v.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {isTechnicalPhase && (
          <div className="flex flex-1 flex-col bg-[#1e1e1e]">
            <div className="flex h-10 items-center gap-2 border-b border-black/40 px-4">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-[#FF5F56]" />
                <span className="h-3 w-3 rounded-full bg-[#FFBD2E]" />
                <span className="h-3 w-3 rounded-full bg-[#27C93F]" />
              </div>
              <span className="ml-3 rounded bg-white/5 px-2.5 py-1 font-mono text-xs text-neutral-300">
                interview-notes.md
              </span>
            </div>
            <div className="flex flex-1 overflow-hidden">
              <div className="w-12 select-none border-r border-white/5 py-3 pr-3 text-right font-mono text-xs text-neutral-600">
                {Array.from({ length: 30 }, (_, i) => (
                  <div key={i} className="leading-6">
                    {i + 1}
                  </div>
                ))}
              </div>
              <Textarea
                value={editorContent}
                onChange={handleEditorChange}
                placeholder="# Interview notes&#10;&#10;## Key points&#10;- &#10;&#10;## Questions asked&#10;- "
                className="h-full w-full resize-none border-0 bg-transparent p-3 font-mono text-sm leading-6 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-0"
                style={{ caretColor: "#fff", lineHeight: "1.5rem" }}
              />
            </div>
            <div className="flex h-6 items-center gap-4 bg-[#1a1a1a] px-4 text-xs text-neutral-400">
              <span>Markdown</span>
              <span>UTF-8</span>
              <span>Ln {editorContent.split("\n").length}</span>
            </div>
          </div>
        )}

        <div
          className={cn(
            "relative flex border-l border-neutral-200 bg-white",
            isTechnicalPhase ? "w-[38%] flex-col" : "flex-1 flex-row",
          )}
        >
          <div
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center bg-neutral-50 p-6",
              isTechnicalPhase ? "border-b border-neutral-200" : "border-r border-neutral-200",
            )}
          >
            <div className="relative">
              {isAiActive && (
                <>
                  <div className="absolute inset-0 -m-8 rounded-full border-4 border-[#1a1a1a]/15 animate-siri-ring-1" />
                  <div className="absolute inset-0 -m-6 rounded-full border-4 border-[#1a1a1a]/20 animate-siri-ring-2" />
                  <div className="absolute inset-0 -m-4 rounded-full border-4 border-[#1a1a1a]/25 animate-siri-ring-3" />
                </>
              )}
              <Avatar className="relative z-10 h-28 w-28 shadow-lg">
                <AvatarFallback className="bg-[#1a1a1a] text-3xl font-semibold text-white">
                  {interviewerPersona === "riya" ? "R" : "B"}
                </AvatarFallback>
              </Avatar>
              {isAiActive && (
                <div className="absolute -bottom-1 -right-1 z-20 animate-pulse rounded-full bg-emerald-500 p-2 shadow">
                  <ActivityIcon size={16} className="text-white" />
                </div>
              )}
            </div>
            <div className="absolute bottom-6 flex flex-col items-center gap-1.5">
              <p className="text-sm font-semibold text-[#1a1a1a]">{personaName}</p>
              <span className="rounded-md bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600">
                Interviewer
              </span>
            </div>
          </div>

          <div className="relative flex flex-1 flex-col">
            {cameraAvailable ? (
              <div
                className={cn(
                  "absolute inset-0",
                  isUserSpeaking && "ring-4 ring-inset ring-emerald-400/70",
                )}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full bg-neutral-900 object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
                {proctoringActive && (
                  <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-emerald-500/90 px-3 py-1.5 text-white shadow">
                    <EyeIcon size={14} />
                    <span className="text-xs font-medium">Monitored</span>
                  </div>
                )}
                {isUserSpeaking && (
                  <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-emerald-500/90 px-3 py-1.5 text-white shadow">
                    <MicIcon size={14} className="animate-pulse" />
                    <span className="text-xs font-medium">Speaking</span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-1 bg-gradient-to-t from-black/60 to-transparent pb-4 pt-12">
                  <p className="text-sm font-semibold text-white drop-shadow">You</p>
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  "absolute inset-0 flex flex-col items-center justify-center bg-neutral-100",
                  isUserSpeaking && "ring-4 ring-inset ring-emerald-400/70",
                )}
              >
                <div
                  className={cn(
                    "mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-neutral-200 transition-colors",
                    isUserSpeaking && "bg-emerald-100",
                  )}
                >
                  <MicOffIcon size={30} className="text-neutral-400" />
                </div>
                <p className="text-sm font-semibold text-[#1a1a1a]">Voice-only mode</p>
                <p className="mt-1 max-w-[200px] text-center text-xs text-neutral-500">
                  Turn on your camera for the full proctored experience.
                </p>
                <div className="absolute bottom-4">
                  <p className="text-sm font-semibold text-[#1a1a1a]">You</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center">
        <div className="pointer-events-auto mb-4 w-[400px] max-w-[90vw]">
          <div className="rounded-xl border border-white/10 bg-black/80 px-4 py-3 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              <p className="min-w-0 flex-1 text-sm text-white">
                {liveCaption || "Waiting for audio…"}
              </p>
            </div>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-4">
          <button
            onClick={() => setIsMicOn(!isMicOn)}
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all hover:scale-105",
              isMicOn ? "bg-white text-[#1a1a1a]" : "bg-red-600 text-white",
            )}
            aria-label={isMicOn ? "Mute microphone" : "Unmute microphone"}
          >
            {isMicOn ? <MicIcon size={22} /> : <MicOffIcon size={22} />}
          </button>
          <button
            onClick={() => setShowEndConfirm(true)}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-xl transition-all hover:scale-105 hover:bg-red-700"
            aria-label="End session"
          >
            <EndCallIcon size={22} />
          </button>
        </div>
      </div>

      <AlertDialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <AlertDialogContent className="border border-neutral-200 bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#1a1a1a]">End interview session?</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-500">
              This can&apos;t be undone. Your responses so far will be used to generate your report.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue interview</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowEndConfirm(false);
                onEndSession();
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              End session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
