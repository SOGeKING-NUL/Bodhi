"use client"

import { useEffect, useState } from "react"
import Navbar from "@/components/Navbar"
import { type LeaderboardEntry, getGlobalLeaderboard, getWeeklyLeaderboard } from "@/lib/api"

const RARITY_COLORS: Record<string, string> = {
  Novice: "#9ca3af",
  Apprentice: "#4a443f",
  Practitioner: "#92400e",
  Professional: "#6b7280",
  Expert: "#d97706",
  Elite: "#059669",
  Master: "#7c3aed",
}

function TierBadge({ tier, color }: { tier: string; color: string }) {
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ backgroundColor: `${color}18`, color }}
    >
      {tier}
    </span>
  )
}

export default function LeaderboardPage() {
  const [tab, setTab] = useState<"global" | "weekly">("global")
  const [global, setGlobal] = useState<LeaderboardEntry[]>([])
  const [weekly, setWeekly] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([getGlobalLeaderboard(), getWeeklyLeaderboard()])
      .then(([g, w]) => { setGlobal(g); setWeekly(w) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const rows = tab === "global" ? global : weekly
  const xpKey = tab === "global" ? "total_xp" : "weekly_xp"

  return (
    <div className="min-h-screen bg-[#F7F5F3]">
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 pt-24 pb-16 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#37322F]">Leaderboard</h1>
          <p className="text-sm text-[rgba(55,50,47,0.5)] mt-1">See how you rank against all Bodhi users</p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 rounded-xl bg-[rgba(55,50,47,0.06)] p-1 w-fit">
          {(["global", "weekly"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-5 py-1.5 text-sm font-semibold transition-all ${
                tab === t
                  ? "bg-[#37322F] text-white shadow-sm"
                  : "text-[rgba(55,50,47,0.6)] hover:text-[#37322F]"
              }`}
            >
              {t === "global" ? "All Time" : "This Week"}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-[rgba(55,50,47,0.08)] bg-white shadow-[0px_2px_8px_rgba(55,50,47,0.04)] overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[2rem_1fr_auto_auto] gap-4 px-5 py-3 text-xs font-semibold text-[rgba(55,50,47,0.4)] uppercase tracking-wider border-b border-[rgba(55,50,47,0.06)]">
            <span>#</span>
            <span>Candidate</span>
            <span className="text-right">XP</span>
            <span className="text-right hidden sm:block">Sessions</span>
          </div>

          {loading ? (
            <div className="py-20 text-center">
              <div className="w-8 h-8 mx-auto rounded-full border-2 border-[rgba(55,50,47,0.1)] border-t-[#37322F] animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-sm text-[rgba(55,50,47,0.4)]">
              No entries yet. Complete an interview to appear here!
            </div>
          ) : (
            rows.map((entry, i) => (
              <div
                key={entry.clerk_user_id}
                className={`grid grid-cols-[2rem_1fr_auto_auto] gap-4 px-5 py-3.5 items-center border-b border-[rgba(55,50,47,0.04)] last:border-0 transition-colors hover:bg-[rgba(55,50,47,0.02)] ${
                  i < 3 ? "bg-[rgba(55,50,47,0.01)]" : ""
                }`}
              >
                {/* Rank */}
                <span className={`text-sm font-bold ${i === 0 ? "text-amber-500" : i === 1 ? "text-[#6b7280]" : i === 2 ? "text-[#92400e]" : "text-[rgba(55,50,47,0.35)]"}`}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${entry.rank}`}
                </span>

                {/* Name + tier */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[rgba(55,50,47,0.08)] flex items-center justify-center text-xs font-bold text-[#37322F] shrink-0">
                    {(entry.display_name || "A")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#37322F] truncate">{entry.display_name || "Anonymous"}</p>
                    <TierBadge tier={entry.rank_tier} color={entry.tier_color} />
                  </div>
                </div>

                {/* XP */}
                <span className="text-sm font-bold text-[#37322F] text-right">
                  {((entry[xpKey as keyof LeaderboardEntry] as number) ?? 0).toLocaleString()}
                  <span className="text-xs font-normal text-[rgba(55,50,47,0.4)] ml-0.5">XP</span>
                </span>

                {/* Sessions */}
                <span className="text-xs text-[rgba(55,50,47,0.4)] text-right hidden sm:block">
                  {entry.total_sessions ?? "—"} sessions
                </span>
              </div>
            ))
          )}
        </div>

        {/* Footer note */}
        <p className="text-xs text-[rgba(55,50,47,0.3)] text-center">
          Rankings update after each completed interview session
        </p>
      </div>
    </div>
  )
}
