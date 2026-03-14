"use client"

import { RefObject } from "react"

interface Violation {
  violation_type: string
  severity: string
  message: string
  timestamp: string
}

interface SentimentData {
  emotion: string
  emotionConfidence: number
  sentiment: string
  speechRateWpm: number
  confidenceScore: number
  flags: string[]
}

interface FaceVerificationStatus {
  isActive: boolean
  lastScore: number | null
  consecutiveMismatches: number
}

interface ProctoringPanelProps {
  videoRef: RefObject<HTMLVideoElement | null>
  proctoringActive: boolean
  sessionFlagged: boolean
  violations: Violation[]
  cameraError: string
  sentimentData?: SentimentData | null
  faceVerification?: FaceVerificationStatus
}

export function ProctoringPanel({
  videoRef,
  proctoringActive,
  sessionFlagged,
  violations,
  cameraError,
  sentimentData,
  faceVerification,
}: ProctoringPanelProps) {
  return (
    <div className="space-y-4">
      {/* Camera Preview */}
      <div className="glass rounded-2xl overflow-hidden shadow-[0px_2px_8px_rgba(55,50,47,0.06)]">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full rounded-2xl"
          style={{ transform: "scaleX(-1)" }}
        />
        {cameraError && (
          <p className="px-4 py-3 text-xs text-red-600 bg-red-50 border-t border-red-100">
            {cameraError}
          </p>
        )}
      </div>

      {/* Proctoring Status */}
      <div className="glass rounded-2xl p-4 shadow-[0px_2px_8px_rgba(55,50,47,0.06)]">
        <div className="flex items-center gap-2 mb-3">
          <div
            className={`h-2 w-2 rounded-full ${
              sessionFlagged
                ? "bg-red-500"
                : proctoringActive
                  ? "bg-green-500 animate-pulse"
                  : "bg-gray-400"
            }`}
          />
          <h3 className="text-xs font-semibold text-[#37322F]">
            {sessionFlagged
              ? "Session Flagged"
              : proctoringActive
                ? "Proctoring Active"
                : "Proctoring Inactive"}
          </h3>
        </div>

        {sessionFlagged && (
          <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
            <p className="text-xs text-red-700">
              Session has been flagged due to violations.
            </p>
          </div>
        )}

        {violations.length > 0 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            <p className="text-xs text-[rgba(55,50,47,0.5)] mb-2">
              Recent Violations ({violations.length})
            </p>
            {violations.slice(-5).map((v, i) => (
              <div
                key={i}
                className="rounded-lg bg-red-50 border border-red-100 px-3 py-2"
              >
                <p className="text-[10px] font-semibold text-red-700 capitalize mb-0.5">
                  {v.violation_type.replace(/_/g, " ")}
                </p>
                <p className="text-[10px] text-[rgba(55,50,47,0.6)]">
                  {v.message}
                </p>
              </div>
            ))}
          </div>
        ) : proctoringActive ? (
          <p className="text-xs text-[rgba(55,50,47,0.5)]">
            No violations detected.
          </p>
        ) : null}
      </div>

      {/* Live Sentiment Data */}
      {sentimentData && (
        <div className="glass rounded-2xl p-4 shadow-[0px_2px_8px_rgba(55,50,47,0.06)]">
          <h3 className="text-xs font-semibold text-[#37322F] mb-3">Live Analysis</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-[rgba(55,50,47,0.55)]">Confidence</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-[rgba(55,50,47,0.1)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#37322F] rounded-full transition-all duration-500"
                    style={{ width: `${sentimentData.confidenceScore}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-[#37322F]">
                  {Math.round(sentimentData.confidenceScore)}%
                </span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-[rgba(55,50,47,0.55)]">Emotion</span>
              <span className="text-xs font-medium text-[#37322F] capitalize">
                {sentimentData.emotion || "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-[rgba(55,50,47,0.55)]">Sentiment</span>
              <span className="text-xs font-medium text-[#37322F] capitalize">
                {sentimentData.sentiment || "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-[rgba(55,50,47,0.55)]">Speech Rate</span>
              <span className="text-xs font-medium text-[#37322F]">
                {sentimentData.speechRateWpm ? `${Math.round(sentimentData.speechRateWpm)} wpm` : "—"}
              </span>
            </div>
            {sentimentData.flags.length > 0 && (
              <div className="pt-1 flex flex-wrap gap-1">
                {sentimentData.flags.map((f, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 capitalize"
                  >
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Face Verification (if active) */}
      {faceVerification?.isActive && (
        <div className="glass rounded-2xl p-4 shadow-[0px_2px_8px_rgba(55,50,47,0.06)]">
          <h3 className="text-xs font-semibold text-[#37322F] mb-2">Face ID</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-[rgba(55,50,47,0.55)]">Match Score</span>
              <span className="text-xs font-medium text-[#37322F]">
                {faceVerification.lastScore != null
                  ? `${Math.round(faceVerification.lastScore * 100)}%`
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-[rgba(55,50,47,0.55)]">Mismatches</span>
              <span className={`text-xs font-medium ${faceVerification.consecutiveMismatches > 1 ? "text-red-600" : "text-[#37322F]"}`}>
                {faceVerification.consecutiveMismatches}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
