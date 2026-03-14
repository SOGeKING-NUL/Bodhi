"use client"

import { useState, RefObject } from "react"
import { 
  Mic, 
  MicOff, 
  PhoneOff,
  AlertTriangle,
  Activity,
  Eye
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface Turn {
  speaker: "user" | "bodhi"
  text: string
  phase?: string
}

interface SentimentData {
  emotion: string
  emotionConfidence: number
  sentiment: string
  speechRateWpm: number
  confidenceScore: number
  flags: string[]
}

interface InterviewSessionViewProps {
  sessionId: string
  videoRef: RefObject<HTMLVideoElement | null>
  transcript: Turn[]
  phase: string
  onEndSession: () => void
  proctoringActive: boolean
  sessionFlagged: boolean
  cameraError: string
  sentimentData?: SentimentData | null
  violationCount?: number
}

export function InterviewSessionView({
  videoRef,
  transcript,
  phase,
  onEndSession,
  proctoringActive,
  sessionFlagged,
  cameraError,
  sentimentData,
  violationCount = 0
}: InterviewSessionViewProps) {
  const [isMicOn, setIsMicOn] = useState(true)
  const [editorContent, setEditorContent] = useState("")

  const currentTranscript = transcript[transcript.length - 1]

  const getPhaseText = () => {
    switch (phase) {
      case "listening": return "Listening..."
      case "recording": return "Recording"
      case "processing": return "Processing"
      case "speaking": return "AI Speaking"
      default: return "Active"
    }
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-[#F7F5F3]">
      {/* Minimal Top Header */}
      <div className="border-b border-[rgba(55,50,47,0.10)] bg-white px-6 py-3 flex items-center justify-between shadow-[0px_2px_8px_rgba(55,50,47,0.06)]">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-[#2F3037] tracking-tight" style={{ fontFamily: "var(--font-inter), ui-sans-serif, sans-serif" }}>Bodhi</h1>
          <Badge className="text-xs bg-[rgba(55,50,47,0.08)] text-[#37322F] border-[rgba(55,50,47,0.12)] font-medium">
            {getPhaseText()}
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-[#37322F]">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span className="font-sans">45:00</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onEndSession}
            className="text-[#DC2626] border-[#DC2626]/30 hover:bg-[#DC2626]/10 font-sans font-medium"
          >
            End Session
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Session Metrics - Modern Design */}
        <div className="w-[280px] border-r border-[rgba(55,50,47,0.10)] bg-gradient-to-br from-white to-[#FAFAFA] flex flex-col p-6 gap-6">
          <div>
            <h3 className="text-sm font-bold text-[#37322F] mb-5 font-sans tracking-tight">Session Metrics</h3>
            
            {/* Proctoring Status - Enhanced */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[rgba(55,50,47,0.08)] shadow-sm">
                <span className="text-xs font-medium text-[rgba(55,50,47,0.6)] font-sans">Proctoring</span>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "h-2.5 w-2.5 rounded-full shadow-sm",
                    sessionFlagged ? "bg-red-500 animate-pulse" : proctoringActive ? "bg-green-500 animate-pulse" : "bg-gray-400"
                  )} />
                  <span className="text-xs font-semibold text-[#37322F] font-sans">
                    {sessionFlagged ? "Flagged" : proctoringActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              {cameraError && (
                <div className="rounded-xl bg-gradient-to-br from-red-50 to-red-100/50 border border-red-200 px-4 py-3 shadow-sm">
                  <p className="text-xs text-red-700 font-sans font-medium">{cameraError}</p>
                </div>
              )}

              {sessionFlagged && (
                <div className="rounded-xl bg-gradient-to-br from-red-50 to-red-100/50 border border-red-200 px-4 py-3 flex items-start gap-2.5 shadow-sm">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 font-sans font-medium">Session flagged due to violations</p>
                </div>
              )}
            </div>
          </div>

          {/* Attention Score - Enhanced */}
          <div className="p-4 rounded-xl bg-white border border-[rgba(55,50,47,0.08)] shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-[rgba(55,50,47,0.6)] font-sans">Attention Score</span>
              <span className="text-base font-bold text-[#37322F] font-sans">85%</span>
            </div>
            <div className="w-full h-2.5 bg-[rgba(55,50,47,0.08)] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#37322F] to-[#2A2624] rounded-full transition-all duration-500 shadow-sm" style={{ width: "85%" }} />
            </div>
          </div>

          {/* Sentiment Indicators - Enhanced */}
          <div className="p-4 rounded-xl bg-white border border-[rgba(55,50,47,0.08)] shadow-sm">
            <h4 className="text-xs font-bold text-[#37322F] mb-4 font-sans tracking-tight">Sentiment Analysis</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[rgba(55,50,47,0.6)] font-sans">Confidence</span>
                <span className="text-xs font-semibold text-[#37322F] font-sans capitalize">
                  {sentimentData ? `${sentimentData.confidenceScore}%` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[rgba(55,50,47,0.6)] font-sans">Emotion</span>
                <span className="text-xs font-semibold text-[#37322F] font-sans capitalize">
                  {sentimentData?.emotion || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[rgba(55,50,47,0.6)] font-sans">Speech Rate</span>
                <span className="text-xs font-semibold text-[#37322F] font-sans">
                  {sentimentData ? `${sentimentData.speechRateWpm} wpm` : "—"}
                </span>
              </div>
              {sentimentData?.flags && sentimentData.flags.length > 0 && (
                <div className="pt-3 border-t border-[rgba(55,50,47,0.08)]">
                  <div className="flex flex-wrap gap-1.5">
                    {sentimentData.flags.map((flag, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2.5 py-1 rounded-full bg-gradient-to-r from-[rgba(55,50,47,0.08)] to-[rgba(55,50,47,0.12)] text-[#37322F] font-sans capitalize font-medium"
                      >
                        {flag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Violations Count - Enhanced */}
          <div className="p-4 rounded-xl bg-white border border-[rgba(55,50,47,0.08)] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[rgba(55,50,47,0.6)] font-sans">Violations</span>
              <span className={cn(
                "text-lg font-bold font-sans",
                violationCount > 0 ? "text-red-600" : "text-[#37322F]"
              )}>
                {violationCount}
              </span>
            </div>
          </div>
        </div>

        {/* Center Canvas/Editor - Modern Light IDE Style */}
        <div className="flex-1 relative bg-gradient-to-br from-[#FAFAFA] to-[#F5F5F5] flex flex-col">
          {/* Modern IDE Toolbar */}
          <div className="h-12 bg-white/80 backdrop-blur-sm border-b border-[rgba(55,50,47,0.08)] flex items-center px-5 gap-3 shadow-[0px_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#FF5F56] shadow-sm hover:shadow-md transition-shadow cursor-pointer"></div>
              <div className="w-3 h-3 rounded-full bg-[#FFBD2E] shadow-sm hover:shadow-md transition-shadow cursor-pointer"></div>
              <div className="w-3 h-3 rounded-full bg-[#27C93F] shadow-sm hover:shadow-md transition-shadow cursor-pointer"></div>
            </div>
            <div className="flex-1 flex items-center gap-2 ml-4">
              <div className="px-4 py-1.5 bg-gradient-to-b from-white to-[#FAFAFA] rounded-lg text-xs text-[#37322F] font-mono border border-[rgba(55,50,47,0.12)] shadow-sm font-medium">
                📝 interview-notes.md
              </div>
            </div>
            <div className="flex items-center gap-2 text-[rgba(55,50,47,0.5)]">
              <button className="hover:bg-[rgba(55,50,47,0.06)] p-2 rounded-lg transition-all hover:text-[#37322F]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Modern IDE Editor Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Line Numbers */}
            <div className="w-14 bg-gradient-to-r from-[#FAFAFA] to-[#F8F8F8] border-r border-[rgba(55,50,47,0.08)] py-4 text-right pr-4 font-mono text-xs text-[rgba(55,50,47,0.35)] select-none">
              {Array.from({ length: 30 }, (_, i) => (
                <div key={i} className="leading-6 hover:text-[rgba(55,50,47,0.6)] transition-colors">{i + 1}</div>
              ))}
            </div>

            {/* Editor Content */}
            <div className="flex-1 relative bg-white/50">
              <Textarea
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                placeholder="# Interview Notes

## Key Points
- Take notes on important discussion points
- Track technical questions and answers

## Questions Asked
- Document the questions you were asked

## My Responses
- Record your key responses and examples

## Follow-up Items
- Note any topics to research further"
                className="w-full h-full bg-transparent border-0 text-[#2F3037] placeholder:text-[rgba(55,50,47,0.35)] resize-none font-mono text-[13px] p-6 leading-6 focus:outline-none focus:ring-0"
                style={{ 
                  caretColor: '#37322F',
                  lineHeight: '1.5rem',
                  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace'
                }}
              />
            </div>
          </div>

          {/* Floating Live Captions - Modern Glass Design */}
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 z-30">
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl px-5 py-4 shadow-[0px_8px_32px_rgba(55,50,47,0.12),0px_2px_8px_rgba(55,50,47,0.08)] border border-[rgba(55,50,47,0.08)]">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 shrink-0">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#27C93F] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#27C93F]"></span>
                  </span>
                  <span className="text-xs font-semibold text-[rgba(55,50,47,0.5)] font-sans uppercase tracking-wide">Live</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#2F3037] font-sans font-medium leading-relaxed">
                    {currentTranscript?.text || "Waiting for audio..."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Action Buttons - Modern Design */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 z-20">
            <Button
              variant={isMicOn ? "outline" : "destructive"}
              size="icon"
              className={cn(
                "rounded-full w-16 h-16 shadow-[0px_8px_32px_rgba(55,50,47,0.16)] transition-all hover:scale-110 active:scale-95",
                isMicOn 
                  ? "bg-white border-2 border-[rgba(55,50,47,0.12)] text-[#37322F] hover:bg-white hover:border-[rgba(55,50,47,0.2)] hover:shadow-[0px_12px_40px_rgba(55,50,47,0.2)]" 
                  : "bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 border-0 shadow-[0px_8px_32px_rgba(220,38,38,0.3)]"
              )}
              onClick={() => setIsMicOn(!isMicOn)}
            >
              {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6 text-white" />}
            </Button>
            <Button
              variant="destructive"
              size="icon"
              className="rounded-full w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-[0px_8px_32px_rgba(220,38,38,0.3)] transition-all hover:scale-110 active:scale-95 border-0"
              onClick={onEndSession}
            >
              <PhoneOff className="w-6 h-6 text-white" />
            </Button>
          </div>

          {/* Modern IDE Status Bar */}
          <div className="h-7 bg-gradient-to-r from-[#37322F] to-[#2A2624] flex items-center px-5 text-xs text-white/90 font-sans shadow-[0px_-1px_3px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-1.5">
                <span className="text-white/60">📝</span>
                <span className="font-medium">Markdown</span>
              </div>
              <div className="w-px h-3 bg-white/20"></div>
              <span className="text-white/80">UTF-8</span>
              <div className="w-px h-3 bg-white/20"></div>
              <span className="text-white/80">Ln {editorContent.split('\n').length}, Col 1</span>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Participants (38% width) - Modern Design */}
        <div className="w-[38%] border-l border-[rgba(55,50,47,0.10)] bg-gradient-to-br from-white to-[#FAFAFA] flex flex-col">
          {/* AI Interviewer - Enhanced with Siri-like Animation */}
          <div className="flex-1 flex flex-col items-center justify-center p-8 border-b border-[rgba(55,50,47,0.10)] relative bg-gradient-to-br from-[#FAFAFA] to-white">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                {/* Siri-like animated rings when speaking */}
                {phase === "speaking" && (
                  <>
                    <div className="absolute inset-0 -m-6 rounded-full border-4 border-[#37322F]/20 animate-ping" style={{ animationDuration: '1.5s' }}></div>
                    <div className="absolute inset-0 -m-8 rounded-full border-4 border-[#37322F]/15 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.2s' }}></div>
                    <div className="absolute inset-0 -m-10 rounded-full border-4 border-[#37322F]/10 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.4s' }}></div>
                    
                    {/* Rotating gradient border */}
                    <div className="absolute inset-0 -m-4 rounded-full animate-spin" style={{ animationDuration: '3s' }}>
                      <div className="w-full h-full rounded-full" style={{
                        background: 'conic-gradient(from 0deg, transparent 0%, rgba(55,50,47,0.4) 25%, rgba(55,50,47,0.6) 50%, rgba(55,50,47,0.4) 75%, transparent 100%)',
                        filter: 'blur(8px)'
                      }}></div>
                    </div>
                  </>
                )}
                
                <Avatar className="w-32 h-32 shadow-[0px_8px_32px_rgba(55,50,47,0.12)] relative z-10">
                  <AvatarFallback className="text-4xl font-bold bg-gradient-to-br from-[#37322F] to-[#2A2624] text-white font-sans">
                    AI
                  </AvatarFallback>
                </Avatar>
                
                {phase === "speaking" && (
                  <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-green-400 to-green-500 rounded-full p-2.5 shadow-lg animate-pulse z-20">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
            </div>
            <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-2">
              <p className="text-base font-semibold text-[#37322F] font-sans">AI Interviewer</p>
              <Badge className="text-xs bg-gradient-to-r from-[rgba(55,50,47,0.08)] to-[rgba(55,50,47,0.12)] text-[#37322F] border-[rgba(55,50,47,0.12)] font-sans font-medium px-3 py-1">
                Interviewer
              </Badge>
            </div>
          </div>

          {/* Candidate (You) with Full Video Feed - Enhanced */}
          <div className="flex-1 flex flex-col relative overflow-hidden">
            {/* Full-size Video Feed with rounded corners effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#F7F5F3] to-[#F0EDE9]">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
              
              {/* Proctoring Indicator Overlay - Modern */}
              {proctoringActive && (
                <div className="absolute top-4 right-4 bg-gradient-to-r from-green-500 to-green-600 backdrop-blur-sm rounded-full px-3 py-2 flex items-center gap-2 shadow-[0px_4px_16px_rgba(34,197,94,0.3)]">
                  <Eye className="w-4 h-4 text-white" />
                  <span className="text-xs font-semibold text-white font-sans">Monitored</span>
                </div>
              )}

              {/* Recording Indicator - Modern */}
              {phase === "recording" && (
                <div className="absolute top-4 left-4 bg-gradient-to-r from-red-500 to-red-600 backdrop-blur-sm rounded-full px-3 py-2 flex items-center gap-2 shadow-[0px_4px_16px_rgba(239,68,68,0.3)]">
                  <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
                  <span className="text-xs font-semibold text-white font-sans">Recording</span>
                </div>
              )}

              {/* Bottom Label Overlay - Modern Glass */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent pt-16 pb-6 px-6">
                <div className="flex flex-col items-center gap-2">
                  <p className="text-base font-semibold text-white font-sans drop-shadow-lg">You</p>
                  <Badge className="text-xs bg-blue-500/95 text-white border-blue-400/50 font-sans backdrop-blur-sm font-medium px-3 py-1 shadow-lg">
                    Candidate
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
