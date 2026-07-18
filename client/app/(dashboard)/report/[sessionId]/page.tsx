"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertIcon,
  ArrowLeftIcon,
  CheckIcon,
  DownloadIcon,
} from "@/components/app/ui/icons";
import { Button } from "@/components/app/ui/button";
import { Card } from "@/components/app/ui/card";
import { Spinner } from "@/components/app/ui/feedback";
import {
  type InterviewReport,
  downloadReportPDF,
  getInterviewReport,
} from "@/lib/api";


const GRADE_COLORS: Record<string, string> = {
  "A+": "#16a34a", A: "#22c55e", "A-": "#4ade80",
  "B+": "#2563eb", B: "#3b82f6", "B-": "#60a5fa",
  "C+": "#d97706", C: "#f59e0b", "C-": "#fbbf24",
  "D+": "#dc2626", D: "#ef4444", F: "#991b1b",
};

const SEVERITY_COLORS: Record<string, string> = {
  high: "#ef4444", medium: "#f59e0b", low: "#9ca3af",
};

const PHASE_LABELS: Record<string, string> = {
  technical: "Technical", behavioral: "Behavioral",
  dsa: "DSA", project: "Project Discussion",
  intro: "Introduction", wrapup: "Wrap-Up",
};

const gradeColor = (grade: string) => GRADE_COLORS[grade] ?? "#6b7280";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-base font-semibold text-[#1a1a1a]">
      <span className="h-4 w-1 shrink-0 rounded-full bg-neutral-300" />
      {children}
    </h2>
  );
}

function MetricBar({ label, value, max = 5 }: { label: string; value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const hue = pct > 70 ? 142 : pct > 45 ? 38 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-neutral-500">{label}</span>
        <span className="font-semibold text-[#1a1a1a]">
          {value.toFixed(1)}/{max}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: `hsl(${hue}, 70%, 48%)` }}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value, unit, accent }: { label: string; value: string | number; unit?: string; accent?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-semibold" style={{ color: accent ?? "#1a1a1a" }}>
        {value}
        {unit && <span className="ml-0.5 text-sm font-normal text-neutral-400">{unit}</span>}
      </p>
    </Card>
  );
}

function GradeBadge({ text, color }: { text: string; color?: string }) {
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: `${color ?? "#6b7280"}1a`, color: color ?? "#6b7280" }}
    >
      {text}
    </span>
  );
}


export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [report, setReport] = useState<InterviewReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    const MAX_ATTEMPTS = 40;
    const POLL_MS = 2000;

    setLoading(true);
    setError("");

    const poll = async () => {
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        if (cancelled) return;
        try {
          const data = await getInterviewReport(sessionId);
          if (cancelled) return;
          setReport(data);
          setLoading(false);
          return;
        } catch (err) {
          const msg = String(err);
          if (!msg.includes("404")) {
            if (!cancelled) {
              setError(msg);
              setLoading(false);
            }
            return;
          }
        }
        await new Promise((r) => setTimeout(r, POLL_MS));
      }
      if (!cancelled) {
        setError("Report is taking longer than expected. Please refresh in a moment.");
        setLoading(false);
      }
    };

    void poll();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      await downloadReportPDF(sessionId);
    } catch (err) {
      setError(String(err));
    } finally {
      setDownloadingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <Spinner />
        <p className="mt-2 text-sm text-neutral-500">
          Generating your interview report… this can take up to a minute.
        </p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <Card className="mx-auto max-w-md p-8 text-center">
        <p className="text-sm text-red-600">{error || "Report not found."}</p>
        <Button variant="secondary" className="mt-5" onClick={() => router.push("/interview")}>
          <ArrowLeftIcon size={16} />
          Back to interviews
        </Button>
      </Card>
    );
  }

  const { session_info: info } = report;
  const phases = Object.entries(report.phase_breakdown);
  const behavior = report.behavioral_summary;
  const proctor = report.proctoring_summary;

  return (
    <div className="space-y-8">
      <Card className="p-6 sm:p-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs uppercase tracking-wider text-neutral-400">
              Interview report
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-[#1a1a1a]">
              {info.candidate_name || "Candidate"}
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              {info.target_role}
              {info.target_company ? ` at ${info.target_company}` : ""}
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-2xl text-3xl font-bold text-white"
                style={{ backgroundColor: gradeColor(report.overall_grade) }}
              >
                {report.overall_grade}
              </div>
              <p className="mt-2 text-xs text-neutral-500">{report.overall_score_pct}%</p>
            </div>
            <div className="space-y-1 text-right text-sm text-neutral-500">
              <p>
                <span className="font-semibold text-[#1a1a1a]">{report.total_questions}</span> questions
              </p>
              <p>
                <span className="font-semibold text-[#1a1a1a]">{phases.length}</span> phases
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-bodhi-line bg-bodhi-bg/60 p-4">
          <p className="text-xs uppercase tracking-wider text-neutral-400">
            Hiring recommendation
          </p>
          <p className="mt-1 text-sm leading-relaxed text-neutral-700">
            {report.hiring_recommendation}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-2.5">
          <Button variant="secondary" onClick={() => router.push("/interview")}>
            <ArrowLeftIcon size={16} />
            New interview
          </Button>
          <Button onClick={handleDownloadPDF} loading={downloadingPDF}>
            <DownloadIcon size={16} />
            Download PDF
          </Button>
        </div>
      </Card>

      <section className="space-y-4">
        <SectionTitle>Phase breakdown</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          {phases.map(([phase, data]) => (
            <Card key={phase} className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-sm font-semibold text-[#1a1a1a]">
                    {PHASE_LABELS[phase] ?? phase}
                  </h3>
                  <GradeBadge text={data.grade} color={gradeColor(data.grade)} />
                </div>
                <span className="text-xs text-neutral-500">
                  {data.questions_asked} Qs · {data.score_pct}%
                </span>
              </div>

              <div className="space-y-2.5">
                <MetricBar label="Accuracy" value={data.metrics.accuracy} />
                <MetricBar label="Depth" value={data.metrics.depth} />
                <MetricBar label="Communication" value={data.metrics.communication} />
                <MetricBar label="Confidence" value={data.metrics.confidence} />
              </div>

              {(data.strengths.length > 0 || data.improvements.length > 0) && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {data.strengths.length > 0 && (
                    <div>
                      <p className="mb-1 font-medium text-neutral-400">Strengths</p>
                      <ul className="space-y-1">
                        {data.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-neutral-700">
                            <CheckIcon size={14} className="mt-0.5 shrink-0 text-emerald-500" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {data.improvements.length > 0 && (
                    <div>
                      <p className="mb-1 font-medium text-neutral-400">To improve</p>
                      <ul className="space-y-1">
                        {data.improvements.map((s, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-neutral-700">
                            <AlertIcon size={14} className="mt-0.5 shrink-0 text-amber-500" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {data.feedback.length > 0 && (
                <details className="group">
                  <summary className="cursor-pointer text-xs text-neutral-400 transition hover:text-[#1a1a1a]">
                    Show feedback ({data.feedback.length})
                  </summary>
                  <ul className="mt-2 space-y-1 text-xs text-neutral-500">
                    {data.feedback.map((f, i) => (
                      <li key={i} className="border-l-2 border-neutral-200 pl-3">
                        {f}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle>Behavioral analytics</SectionTitle>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Confidence score"
            value={behavior.avg_confidence_score}
            unit="/100"
            accent={behavior.avg_confidence_score >= 60 ? "#16a34a" : "#ef4444"}
          />
          <StatCard
            label="Speaking rate"
            value={behavior.avg_speaking_rate}
            unit="WPM"
            accent={
              behavior.avg_speaking_rate >= 100 && behavior.avg_speaking_rate <= 170
                ? "#16a34a"
                : "#d97706"
            }
          />
          <StatCard
            label="Filler rate"
            value={behavior.avg_filler_rate.toFixed(1)}
            unit="%"
            accent={behavior.avg_filler_rate <= 5 ? "#16a34a" : "#ef4444"}
          />
          <StatCard label="Data points" value={behavior.total_data_points} />
        </div>

        <Card className="p-5">
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <p className="mb-0.5 text-xs text-neutral-400">Dominant emotion</p>
              <p className="font-semibold capitalize text-[#1a1a1a]">{behavior.dominant_emotion}</p>
            </div>
            <div>
              <p className="mb-0.5 text-xs text-neutral-400">Sentiment</p>
              <p className="font-semibold capitalize text-[#1a1a1a]">{behavior.dominant_sentiment}</p>
            </div>
            <div>
              <p className="mb-0.5 text-xs text-neutral-400">Posture issues</p>
              <p className="font-semibold" style={{ color: behavior.posture_issues > 3 ? "#ef4444" : "#1a1a1a" }}>
                {behavior.posture_issues}
              </p>
            </div>
            <div>
              <p className="mb-0.5 text-xs text-neutral-400">Gaze issues</p>
              <p className="font-semibold" style={{ color: behavior.gaze_issues > 5 ? "#ef4444" : "#1a1a1a" }}>
                {behavior.gaze_issues}
              </p>
            </div>
          </div>

          {behavior.behavioral_flags.length > 0 && (
            <div className="mt-4 border-t border-neutral-100 pt-4">
              <p className="mb-2 text-xs text-neutral-400">Behavioral flags</p>
              <div className="flex flex-wrap gap-1.5">
                {behavior.behavioral_flags.map((flag, i) => (
                  <GradeBadge key={i} text={flag} color="#d97706" />
                ))}
              </div>
            </div>
          )}
        </Card>
      </section>

      <section className="space-y-4">
        <SectionTitle>Proctoring summary</SectionTitle>
        <Card className="p-5">
          {proctor.session_flagged && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
              <AlertIcon size={16} className="text-red-600" />
              <p className="text-sm font-medium text-red-700">
                Session flagged due to proctoring violations
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Total violations" value={proctor.total_violations} accent={proctor.total_violations > 0 ? "#ef4444" : "#16a34a"} />
            <StatCard label="High severity" value={proctor.high_severity_count} accent={proctor.high_severity_count > 0 ? "#ef4444" : "#16a34a"} />
            <StatCard label="Medium severity" value={proctor.medium_severity_count} accent={proctor.medium_severity_count > 0 ? "#d97706" : "#16a34a"} />
            <StatCard label="Low severity" value={proctor.low_severity_count} />
          </div>

          {Object.keys(proctor.violation_types).length > 0 && (
            <div className="mt-4 border-t border-neutral-100 pt-4">
              <p className="mb-2 text-xs text-neutral-400">Violation types</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(proctor.violation_types).map(([type, count]) => (
                  <span
                    key={type}
                    className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600"
                  >
                    {type.replace(/_/g, " ")} <span className="font-semibold">×{count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {proctor.timeline.length > 0 && (
            <details className="group mt-4 border-t border-neutral-100 pt-4">
              <summary className="cursor-pointer text-xs text-neutral-400 transition hover:text-[#1a1a1a]">
                Show violation timeline ({proctor.timeline.length})
              </summary>
              <div className="mt-2 space-y-2">
                {proctor.timeline.map((v, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span
                      className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: SEVERITY_COLORS[v.severity] ?? "#9ca3af" }}
                    />
                    <div>
                      <span className="font-medium text-[#1a1a1a]">{v.type.replace(/_/g, " ")}</span>
                      {v.message && <span className="text-neutral-500"> — {v.message}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </Card>
      </section>

      {report.cross_section_insights.length > 0 && (
        <section className="space-y-4">
          <SectionTitle>Cross-section insights</SectionTitle>
          <Card className="space-y-2 p-5">
            {report.cross_section_insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-neutral-700">
                <span className="mt-1.75 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-300" />
                <p>{insight}</p>
              </div>
            ))}
          </Card>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {report.top_strengths.length > 0 && (
          <Card className="p-5">
            <h3 className="mb-3 text-sm font-semibold text-[#1a1a1a]">Top strengths</h3>
            <ul className="space-y-2">
              {report.top_strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-neutral-700">
                  <CheckIcon size={14} className="mt-0.5 shrink-0 text-emerald-500" />
                  {s}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {report.top_improvements.length > 0 && (
          <Card className="p-5">
            <h3 className="mb-3 text-sm font-semibold text-[#1a1a1a]">Areas for improvement</h3>
            <ul className="space-y-2">
              {report.top_improvements.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-neutral-700">
                  <AlertIcon size={14} className="mt-0.5 shrink-0 text-amber-500" />
                  {s}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
