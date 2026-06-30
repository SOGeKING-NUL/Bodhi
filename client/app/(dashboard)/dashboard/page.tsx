"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  YAxis,
} from "recharts";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  AwardIcon,
  CompanyIcon,
  type IconType,
  InterviewIcon,
  ResumeIcon,
  RoleIcon,
} from "@/components/app/ui/icons";
import { Button } from "@/components/app/ui/button";
import { Card } from "@/components/app/ui/card";
import { Chip } from "@/components/app/ui/chip";
import { Spinner } from "@/components/app/ui/feedback";
import {
  type InterviewHistoryItem,
  getUserProfile,
  listCompanies,
  listRoles,
} from "@/lib/api";


function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: IconType;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-neutral-500">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
          <Icon size={16} />
        </span>
      </div>
      <p className="mt-3 text-[28px] font-semibold leading-none tracking-tight text-[#1a1a1a]">
        {value}
      </p>
      {hint && <p className="mt-2 text-xs text-neutral-400">{hint}</p>}
    </Card>
  );
}

function scoreOf(h: InterviewHistoryItem): number | null {
  return typeof h.overall_score === "number" && h.overall_score > 0
    ? h.overall_score
    : null;
}


export default function DashboardPage() {
  const { user } = useUser();
  const [history, setHistory] = useState<InterviewHistoryItem[]>([]);
  const [fullName, setFullName] = useState<string | null>(null);
  const [experience, setExperience] = useState<string | null>(null);
  const [companyCount, setCompanyCount] = useState(0);
  const [roleCount, setRoleCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([getUserProfile(), listCompanies(), listRoles()]).then(
      ([profile, companies, roles]) => {
        if (cancelled) return;
        if (profile.status === "fulfilled") {
          setHistory(profile.value.interview_history ?? []);
          setFullName(profile.value.full_name);
          setExperience(profile.value.experience_level);
        }
        if (companies.status === "fulfilled") setCompanyCount(companies.value.length);
        if (roles.status === "fulfilled") setRoleCount(roles.value.length);
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const scored = history
      .map((h) => ({ h, s: scoreOf(h) }))
      .filter((x): x is { h: InterviewHistoryItem; s: number } => x.s !== null)
      .sort(
        (a, b) =>
          new Date(a.h.started_at).getTime() - new Date(b.h.started_at).getTime(),
      );

    const avg = scored.length
      ? Math.round(scored.reduce((sum, x) => sum + x.s, 0) / scored.length)
      : null;
    const best = scored.length ? Math.round(Math.max(...scored.map((x) => x.s))) : null;
    const delta =
      scored.length >= 2
        ? Math.round(scored[scored.length - 1].s - scored[scored.length - 2].s)
        : null;
    const series = scored.map((x, i) => ({ i, score: Math.round(x.s) }));

    return { scoredCount: scored.length, avg, best, delta, series };
  }, [history]);

  const recent = useMemo(
    () =>
      [...history]
        .sort(
          (a, b) =>
            new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
        )
        .slice(0, 6),
    [history],
  );

  const firstName = (fullName || user?.firstName || "there").split(" ")[0];

  if (loading) return <Spinner className="py-32" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-[#1a1a1a] sm:text-[28px]">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1.5 text-[15px] leading-relaxed text-neutral-500">
            Here&apos;s how your interview prep is shaping up.
          </p>
        </div>
        <Link href="/interview" className="shrink-0">
          <Button>
            <InterviewIcon size={16} />
            Start interview
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={InterviewIcon}
          label="Interviews"
          value={history.length}
          hint={
            stats.scoredCount > 0
              ? `${stats.scoredCount} scored`
              : "No completed sessions yet"
          }
        />
        <StatCard
          icon={AwardIcon}
          label="Average score"
          value={stats.avg !== null ? `${stats.avg}` : "—"}
          hint={stats.best !== null ? `Best ${stats.best}/100` : "Out of 100"}
        />
        <StatCard
          icon={CompanyIcon}
          label="Companies"
          value={companyCount}
          hint="Target profiles"
        />
        <StatCard icon={RoleIcon} label="Roles" value={roleCount} hint="Defined roles" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-medium text-neutral-500">Performance</p>
              <div className="mt-2 flex items-end gap-3">
                <span className="text-4xl font-semibold tracking-tight text-[#1a1a1a]">
                  {stats.avg !== null ? stats.avg : "—"}
                  {stats.avg !== null && (
                    <span className="ml-1 text-lg font-normal text-neutral-400">
                      /100
                    </span>
                  )}
                </span>
                {stats.delta !== null && stats.delta !== 0 && (
                  <span
                    className={
                      "mb-1 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold " +
                      (stats.delta > 0
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-600")
                    }
                  >
                    <ArrowUpRightIcon
                      size={13}
                      className={stats.delta > 0 ? "" : "rotate-90"}
                    />
                    {stats.delta > 0 ? "+" : ""}
                    {stats.delta} pts
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-neutral-400">
                Average across {stats.scoredCount || "no"} scored interview
                {stats.scoredCount === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div className="mt-5 h-[140px]">
            {stats.series.length >= 2 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={stats.series}
                  margin={{ top: 6, right: 6, bottom: 0, left: 0 }}
                >
                  <defs>
                    <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip
                    cursor={{ stroke: "#e5e5e5", strokeWidth: 1 }}
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid #e5e5e5",
                      fontSize: 12,
                      boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                    }}
                    labelFormatter={() => ""}
                    formatter={(v) => [`${v}/100`, "Score"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#scoreFill)"
                    dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50/50 text-center text-sm text-neutral-400">
                Complete a couple of interviews to see your score trend.
              </div>
            )}
          </div>
        </Card>

        <Card className="flex flex-col p-6">
          <p className="text-[13px] font-medium text-neutral-500">Quick start</p>
          <div className="mt-4 space-y-2.5">
            <QuickLink
              href="/interview"
              icon={InterviewIcon}
              title="New mock interview"
              subtitle="Voice-first, fully adaptive"
            />
            <QuickLink
              href="/companies"
              icon={CompanyIcon}
              title="Add a company"
              subtitle="Tailor questions to a target"
            />
            <QuickLink
              href="/resumes"
              icon={ResumeIcon}
              title="Upload resume"
              subtitle="Power resume-based rounds"
            />
          </div>
          <div className="mt-auto pt-5">
            {experience ? (
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <span>Experience level</span>
                <Chip>{experience}</Chip>
              </div>
            ) : (
              <Link
                href="/profile"
                className="text-xs font-medium text-neutral-500 underline underline-offset-2 hover:text-[#1a1a1a]"
              >
                Set your experience level
              </Link>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#1a1a1a]">Recent activity</h2>
          <Link
            href="/profile"
            className="flex items-center gap-1 text-sm font-medium text-neutral-500 transition-colors hover:text-[#1a1a1a]"
          >
            View all
            <ArrowRightIcon size={14} />
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="mt-5 flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50/50 px-6 py-12 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
              <InterviewIcon size={20} />
            </span>
            <p className="mt-3 text-sm font-semibold text-[#1a1a1a]">
              No interviews yet
            </p>
            <p className="mt-1 max-w-xs text-sm text-neutral-500">
              Start your first mock interview to begin tracking your progress.
            </p>
            <Link href="/interview" className="mt-4">
              <Button size="sm">
                <InterviewIcon size={15} />
                Start interview
              </Button>
            </Link>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-neutral-100">
            {recent.map((session) => {
              const score = scoreOf(session);
              return (
                <div
                  key={session.session_id}
                  className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
                      <InterviewIcon size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#1a1a1a]">
                        {session.target_role || "Interview"}
                        {session.target_company ? (
                          <span className="font-normal text-neutral-400">
                            {" "}
                            at {session.target_company}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-400">
                        {new Date(session.started_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-4">
                    {score !== null ? (
                      <div className="text-right">
                        <span className="text-base font-semibold text-[#1a1a1a]">
                          {Math.round(score)}
                        </span>
                        <span className="text-xs text-neutral-400">/100</span>
                      </div>
                    ) : (
                      <Chip>Incomplete</Chip>
                    )}
                    <Link
                      href={`/report/${session.session_id}`}
                      className="flex items-center gap-1 text-sm font-medium text-[#1a1a1a] hover:underline"
                    >
                      Report
                      <ArrowRightIcon size={14} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  title,
  subtitle,
}: {
  href: string;
  icon: IconType;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-3.5 py-3 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-white">
        <Icon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#1a1a1a]">{title}</p>
        <p className="truncate text-xs text-neutral-400">{subtitle}</p>
      </div>
      <ArrowRightIcon
        size={15}
        className="text-neutral-300 transition-colors group-hover:text-neutral-500"
      />
    </Link>
  );
}
