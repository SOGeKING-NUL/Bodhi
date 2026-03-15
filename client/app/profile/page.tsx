"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Navbar from "@/components/Navbar"
import {
  type UserStats, type BadgeInfo, type SessionHistory,
  getMyStats, getMyBadges, getMyHistory
} from "@/lib/api"

const RARITY_BORDER: Record<string, string> = {
  common: "rgba(55,50,47,0.1)",
  rare: "#2563eb30",
  legendary: "#d9770630",
}
const RARITY_BG: Record<string, string> = {
  common: "rgba(55,50,47,0.03)",
  rare: "#2563eb08",
  legendary: "#d9770608",
}

function BadgeCard({ badge }: { badge: BadgeInfo }) {
  return (
    <div
      className="rounded-xl p-3 text-center space-y-1.5 transition hover:scale-105"
      style={{
        border: `1px solid ${RARITY_BORDER[badge.rarity] ?? "rgba(55,50,47,0.08)"}`,
        background: RARITY_BG[badge.rarity] ?? "white",
      }}
    >
      <p className="text-2xl">{badge.icon}</p>
      <p className="text-[11px] font-bold text-[#37322F] leading-tight">{badge.name}</p>
      <span
        className="inline-block text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
        style={{
          color: badge.rarity === "legendary" ? "#d97706" : badge.rarity === "rare" ? "#2563eb" : "rgba(55,50,47,0.4)",
          backgroundColor: badge.rarity === "legendary" ? "#d9770615" : badge.rarity === "rare" ? "#2563eb15" : "rgba(55,50,47,0.06)",
        }}
      >
        {badge.rarity}
      </span>
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const [stats, setStats] = useState<UserStats | null>(null)
  const [badges, setBadges] = useState<BadgeInfo[]>([])
  const [history, setHistory] = useState<SessionHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"badges" | "history">("badges")

  useEffect(() => {
    Promise.all([getMyStats(), getMyBadges(), getMyHistory()])
      .then(([s, b, h]) => { setStats(s); setBadges(b); setHistory(h) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F5F3]">
        <Navbar />
        <div className="flex items-center justify-center pt-40">
          <div className="w-8 h-8 rounded-full border-2 border-[rgba(55,50,47,0.1)] border-t-[#37322F] animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F5F3]">
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 pt-24 pb-16 space-y-6">

        {/* Profile hero */}
        <section className="relative overflow-hidden rounded-2xl border border-[rgba(55,50,47,0.08)] bg-gradient-to-br from-white via-white to-[#F7F5F3] p-7 shadow-[0px_4px_20px_rgba(55,50,47,0.06)]">
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl bg-[#37322F] opacity-75" />

          {stats ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Avatar */}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-extrabold text-white shrink-0"
                style={{ backgroundColor: stats.tier_color }}
              >
                {(stats.display_name || "U")[0].toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-[#37322F]">{stats.display_name || "Anonymous"}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide"
                    style={{ backgroundColor: `${stats.tier_color}18`, color: stats.tier_color }}
                  >
                    {stats.rank_tier}
                  </span>
                  {stats.current_streak > 0 && (
                    <span className="text-xs font-semibold text-amber-600">🔥 {stats.current_streak}-day streak</span>
                  )}
                </div>

                {/* XP progress bar */}
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-xs text-[rgba(55,50,47,0.5)]">
                    <span>{stats.total_xp.toLocaleString()} XP</span>
                    {stats.tier_progress.next_tier ? (
                      <span>{stats.tier_progress.needed_xp.toLocaleString()} XP to {stats.tier_progress.next_tier}</span>
                    ) : (
                      <span>Max rank reached</span>
                    )}
                  </div>
                  <div className="h-2 rounded-full bg-[rgba(55,50,47,0.08)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${stats.tier_progress.progress_pct}%`, backgroundColor: stats.tier_color }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[rgba(55,50,47,0.5)]">Complete an interview to see your stats.</p>
          )}
        </section>

        {/* Stat cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total XP", value: stats.total_xp.toLocaleString() },
              { label: "Sessions", value: stats.total_sessions },
              { label: "Best Score", value: `${stats.best_score_pct.toFixed(1)}%` },
              { label: "Avg Score", value: `${stats.avg_score_pct.toFixed(1)}%` },
            ].map((card) => (
              <div key={card.label} className="rounded-xl border border-[rgba(55,50,47,0.08)] bg-white p-4 shadow-[0px_1px_4px_rgba(55,50,47,0.04)]">
                <p className="text-xs text-[rgba(55,50,47,0.5)] mb-1">{card.label}</p>
                <p className="text-lg font-bold text-[#37322F]">{card.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-[rgba(55,50,47,0.06)] p-1 w-fit">
          {(["badges", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-5 py-1.5 text-sm font-semibold transition-all capitalize ${
                tab === t
                  ? "bg-[#37322F] text-white shadow-sm"
                  : "text-[rgba(55,50,47,0.6)] hover:text-[#37322F]"
              }`}
            >
              {t === "badges" ? `Badges (${badges.length})` : "History"}
            </button>
          ))}
        </div>

        {/* Badges grid */}
        {tab === "badges" && (
          badges.length === 0 ? (
            <div className="rounded-2xl border border-[rgba(55,50,47,0.08)] bg-white p-12 text-center text-[rgba(55,50,47,0.4)] text-sm">
              No badges yet. Complete interviews to earn them!
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {badges.map((b) => <BadgeCard key={b.id} badge={b} />)}
            </div>
          )
        )}

        {/* History */}
        {tab === "history" && (
          history.length === 0 ? (
            <div className="rounded-2xl border border-[rgba(55,50,47,0.08)] bg-white p-12 text-center text-[rgba(55,50,47,0.4)] text-sm">
              No sessions yet.{" "}
              <button onClick={() => router.push("/interview")} className="text-[#37322F] font-semibold underline">
                Start an interview
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-[rgba(55,50,47,0.08)] bg-white overflow-hidden shadow-[0px_2px_8px_rgba(55,50,47,0.04)]">
              {history.map((s, i) => (
                <div
                  key={s.session_id}
                  className="flex items-center gap-4 px-5 py-3.5 border-b border-[rgba(55,50,47,0.04)] last:border-0 cursor-pointer hover:bg-[rgba(55,50,47,0.02)] transition-colors"
                  onClick={() => router.push(`/report/${s.session_id}`)}
                >
                  <div className="w-8 h-8 rounded-lg bg-[rgba(55,50,47,0.06)] flex items-center justify-center text-xs font-bold text-[rgba(55,50,47,0.5)] shrink-0">
                    {history.length - i}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#37322F] truncate">
                      {s.target_role}{s.target_company ? ` · ${s.target_company}` : ""}
                    </p>
                    <p className="text-xs text-[rgba(55,50,47,0.4)]">
                      {new Date(s.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {s.overall_score !== null ? (
                      <p className="text-sm font-bold text-[#37322F]">{s.overall_score?.toFixed(1)}%</p>
                    ) : (
                      <p className="text-xs text-[rgba(55,50,47,0.3)]">—</p>
                    )}
                    <p className="text-xs text-[rgba(55,50,47,0.4)]">+{s.xp_earned} XP</p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

      </div>
    </div>
  )
}
