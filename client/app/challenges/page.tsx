"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Navbar from "@/components/Navbar"
import {
  type WeeklyChallenge, type PastChallenge,
  getCurrentChallenge, getPastChallenges
} from "@/lib/api"

function Countdown({ endDate }: { endDate: string }) {
  const [timeLeft, setTimeLeft] = useState("")

  useEffect(() => {
    const calc = () => {
      const end = new Date(endDate + "T23:59:59Z")
      const now = new Date()
      const diff = end.getTime() - now.getTime()
      if (diff <= 0) { setTimeLeft("Ended"); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${d}d ${h}h ${m}m ${s}s`)
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [endDate])

  return <span className="font-mono font-bold">{timeLeft}</span>
}

function ChallengeCriteriaBadges({ criteria }: { criteria: Record<string, unknown> }) {
  const pills: string[] = []
  if (criteria.min_score) pills.push(`Score ≥ ${criteria.min_score}%`)
  if (criteria.required_role) pills.push(`Role: ${criteria.required_role}`)
  if (criteria.required_company) pills.push(`Company: ${criteria.required_company}`)
  if (criteria.required_phase) pills.push(`Phase: ${String(criteria.required_phase).toUpperCase()}`)
  if (criteria.min_phase_score) pills.push(`Phase score ≥ ${criteria.min_phase_score}%`)
  if (criteria.min_confidence) pills.push(`Confidence ≥ ${criteria.min_confidence}`)
  if (criteria.min_difficulty) pills.push(`Difficulty ≥ ${criteria.min_difficulty}`)
  if (criteria.max_behavioral_flags !== undefined) pills.push(`Max ${criteria.max_behavioral_flags} behavioral flags`)

  return (
    <div className="flex flex-wrap gap-1.5">
      {pills.map((p, i) => (
        <span key={i} className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white/90">
          {p}
        </span>
      ))}
    </div>
  )
}

export default function ChallengesPage() {
  const router = useRouter()
  const [challenge, setChallenge] = useState<WeeklyChallenge | null | undefined>(undefined)
  const [past, setPast] = useState<PastChallenge[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    Promise.all([getCurrentChallenge(), getPastChallenges()])
      .then(([c, p]) => { setChallenge(c); setPast(p) })
      .catch(() => setChallenge(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return (
    <div className="min-h-screen bg-[#F7F5F3]">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 pt-24 pb-16 space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#37322F] flex items-center gap-2.5">
            <span className="w-1 h-6 rounded-full bg-[#37322F] opacity-60 shrink-0" />
            Weekly Challenge
          </h1>
          <p className="text-sm text-[rgba(55,50,47,0.5)] mt-1">
            Complete the challenge criteria to enter. Top scorers win a real recruiter interview.
          </p>
        </div>

        {/* Current Challenge Hero */}
        {loading ? (
          <div className="rounded-2xl bg-[#37322F] h-56 animate-pulse" />
        ) : challenge ? (
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#37322F] to-[#2a2521] p-7 text-white shadow-[0px_8px_32px_rgba(55,50,47,0.2)]">
            {/* Decorative circle */}
            <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white opacity-[0.03]" />

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-amber-400/20 text-amber-300 px-3 py-0.5 text-xs font-bold uppercase tracking-wide">
                    Live Challenge
                  </span>
                  <span className="text-xs text-white/50">
                    Ends in <Countdown endDate={challenge.week_end} />
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold">{challenge.title}</h2>
                <p className="text-sm text-white/70 leading-relaxed max-w-xl">{challenge.description}</p>
                <ChallengeCriteriaBadges criteria={challenge.criteria} />
              </div>

              <div className="shrink-0 space-y-3 text-right">
                <div className="rounded-xl bg-white/10 border border-white/10 p-4 text-left">
                  <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Prize</p>
                  <p className="text-sm font-semibold text-white leading-snug max-w-[240px]">
                    🏆 {challenge.prize_description}
                  </p>
                  <p className="text-xs text-white/40 mt-1">Top {challenge.max_winners} scorers win</p>
                </div>
                <button
                  onClick={() => router.push("/interview")}
                  className="w-full rounded-full bg-white text-[#37322F] px-6 py-2.5 text-sm font-bold transition hover:bg-white/90 active:scale-95"
                >
                  Start Challenge Interview →
                </button>
              </div>
            </div>

            {/* User's entry status */}
            {challenge.user_entry && (
              <div className="mt-5 pt-5 border-t border-white/10 flex items-center justify-between">
                <p className="text-sm text-white/70">
                  Your entry: <span className="font-bold text-white">{challenge.user_entry.qualifying_score.toFixed(1)}%</span>
                  {challenge.user_entry.is_winner && (
                    <span className="ml-2 text-amber-300 font-bold">🥇 Winner!</span>
                  )}
                </p>
                <p className="text-xs text-white/40">Already entered — best score counts</p>
              </div>
            )}
          </section>
        ) : (
          <div className="rounded-2xl border border-[rgba(55,50,47,0.08)] bg-white p-12 text-center text-[rgba(55,50,47,0.4)]">
            No active challenge this week. Check back Monday.
          </div>
        )}

        {/* Challenge Leaderboard */}
        {challenge && challenge.leaderboard.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-bold text-[#37322F] flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-[#37322F] opacity-50 shrink-0" />
              This Week&apos;s Top Entries
              <span className="ml-1 text-xs font-normal text-[rgba(55,50,47,0.4)]">({challenge.total_entries} total)</span>
            </h2>
            <div className="rounded-2xl border border-[rgba(55,50,47,0.08)] bg-white overflow-hidden shadow-[0px_2px_8px_rgba(55,50,47,0.04)]">
              {challenge.leaderboard.slice(0, 10).map((entry, i) => (
                <div key={entry.clerk_user_id} className="flex items-center gap-4 px-5 py-3 border-b border-[rgba(55,50,47,0.04)] last:border-0 hover:bg-[rgba(55,50,47,0.02)] transition-colors">
                  <span className={`w-7 text-sm font-bold shrink-0 ${i === 0 ? "text-amber-500" : i === 1 ? "text-[#6b7280]" : i === 2 ? "text-[#92400e]" : "text-[rgba(55,50,47,0.3)]"}`}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-[rgba(55,50,47,0.08)] flex items-center justify-center text-xs font-bold text-[#37322F] shrink-0">
                    {(entry.display_name || "A")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#37322F] truncate">{entry.display_name || "Anonymous"}</p>
                    <span className="inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase"
                      style={{ backgroundColor: `${entry.tier_color}18`, color: entry.tier_color }}>
                      {entry.rank_tier}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-[#37322F]">
                    {entry.qualifying_score.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* How it works */}
        <section className="rounded-2xl border border-[rgba(55,50,47,0.08)] bg-white p-6 shadow-[0px_2px_8px_rgba(55,50,47,0.04)]">
          <h2 className="text-base font-bold text-[#37322F] mb-4 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-[#37322F] opacity-50 shrink-0" />
            How It Works
          </h2>
          <div className="grid sm:grid-cols-4 gap-4">
            {[
              { step: "1", title: "Start Interview", desc: "Complete a mock interview — the system checks if it meets challenge criteria automatically" },
              { step: "2", title: "Get Scored", desc: "Your session is scored across technical, behavioral, DSA, and project phases" },
              { step: "3", title: "Auto-Entered", desc: "If your session qualifies, you're automatically entered into the current challenge" },
              { step: "4", title: "Win a Real Interview", desc: "Top scorers at week's end win a real interview with an industry recruiter" },
            ].map((item) => (
              <div key={item.step} className="space-y-2">
                <div className="w-8 h-8 rounded-full bg-[#37322F] text-white text-sm font-bold flex items-center justify-center">{item.step}</div>
                <p className="text-sm font-semibold text-[#37322F]">{item.title}</p>
                <p className="text-xs text-[rgba(55,50,47,0.5)] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Past Challenges */}
        {past.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-bold text-[#37322F] flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-[#37322F] opacity-50 shrink-0" />
              Hall of Fame
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {past.map((ch) => (
                <div key={ch.id} className="rounded-2xl border border-[rgba(55,50,47,0.08)] bg-white p-5 shadow-[0px_2px_8px_rgba(55,50,47,0.04)]">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="text-xs text-[rgba(55,50,47,0.4)] mb-0.5">
                        {new Date(ch.week_start).toLocaleDateString("en-US", { month: "short", day: "numeric" })} –{" "}
                        {new Date(ch.week_end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                      <h3 className="text-sm font-bold text-[#37322F]">{ch.title}</h3>
                    </div>
                    <span className="rounded-full bg-[rgba(55,50,47,0.06)] px-2 py-0.5 text-[10px] font-semibold text-[rgba(55,50,47,0.5)] uppercase shrink-0">
                      Ended
                    </span>
                  </div>
                  {ch.winners.length > 0 ? (
                    <div className="space-y-1.5">
                      <p className="text-xs text-[rgba(55,50,47,0.4)] mb-1">Winners</p>
                      {ch.winners.map((w, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-[#37322F] font-medium">
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"} {w.display_name}
                          </span>
                          <span className="text-[rgba(55,50,47,0.4)]">{w.qualifying_score.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[rgba(55,50,47,0.3)]">Winners to be announced</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
