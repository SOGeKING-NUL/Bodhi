"""Gamification API endpoints: leaderboard, user stats, badges, challenges."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from src.api.deps import get_storage, require_auth
from src.gamification import get_badge_info, get_next_tier_info, TIER_COLORS
from src.storage import BodhiStorage

router = APIRouter(prefix="/api/gamification", tags=["gamification"])


# ── User stats ───────────────────────────────────────────────────────────────

@router.get("/stats/me")
async def get_my_stats(
    user_id: str = Depends(require_auth),
    storage: BodhiStorage = Depends(get_storage),
):
    stats = storage.get_user_stats(user_id)
    tier_info = get_next_tier_info(stats.get("total_xp", 0))
    return {
        **stats,
        "tier_color": TIER_COLORS.get(stats.get("rank_tier", "Novice"), "#9ca3af"),
        "tier_progress": tier_info,
        "last_session_date": str(stats["last_session_date"]) if stats.get("last_session_date") else None,
    }


@router.get("/stats/me/badges")
async def get_my_badges(
    user_id: str = Depends(require_auth),
    storage: BodhiStorage = Depends(get_storage),
):
    raw_badges = storage.get_user_badges(user_id)
    return [
        {
            **get_badge_info(b["badge_id"]),
            "earned_at": b["earned_at"].isoformat() if hasattr(b["earned_at"], "isoformat") else str(b["earned_at"]),
            "session_id": b.get("session_id"),
        }
        for b in raw_badges
    ]


@router.get("/stats/me/history")
async def get_my_history(
    user_id: str = Depends(require_auth),
    storage: BodhiStorage = Depends(get_storage),
):
    sessions = storage.get_user_session_history(user_id, limit=20)
    result = []
    for s in sessions:
        score = s.get("overall_score")
        result.append({
            "session_id": s["session_id"],
            "target_company": s.get("target_company"),
            "target_role": s.get("target_role"),
            "overall_score": round(score * 20, 1) if score else None,  # 1-5 → 0-100
            "xp_earned": s.get("xp_earned", 0),
            "started_at": s["started_at"].isoformat() if hasattr(s["started_at"], "isoformat") else str(s["started_at"]),
            "ended_at": s["ended_at"].isoformat() if s.get("ended_at") and hasattr(s["ended_at"], "isoformat") else None,
        })
    return result


@router.get("/sessions/{session_id}/xp")
async def get_session_xp(
    session_id: str,
    user_id: str = Depends(require_auth),
    storage: BodhiStorage = Depends(get_storage),
):
    entry = storage.get_session_xp(session_id)
    if not entry:
        return {"xp_earned": 0, "breakdown": {}, "new_badges": []}

    # Get badges earned in this session
    all_badges = storage.get_user_badges(user_id)
    session_badges = [
        get_badge_info(b["badge_id"])
        for b in all_badges
        if b.get("session_id") == session_id
    ]

    return {
        "xp_earned": entry["xp_earned"],
        "breakdown": entry["breakdown"] if isinstance(entry["breakdown"], dict) else {},
        "new_badges": session_badges,
    }


# ── Leaderboard ──────────────────────────────────────────────────────────────

@router.get("/leaderboard/global")
async def global_leaderboard(
    storage: BodhiStorage = Depends(get_storage),
):
    rows = storage.get_global_leaderboard(limit=100)
    return [
        {**r, "rank": i + 1, "tier_color": TIER_COLORS.get(r.get("rank_tier", "Novice"), "#9ca3af")}
        for i, r in enumerate(rows)
    ]


@router.get("/leaderboard/weekly")
async def weekly_leaderboard(
    storage: BodhiStorage = Depends(get_storage),
):
    rows = storage.get_weekly_leaderboard(limit=100)
    return [
        {**r, "rank": i + 1, "tier_color": TIER_COLORS.get(r.get("rank_tier", "Novice"), "#9ca3af")}
        for i, r in enumerate(rows)
    ]


# ── Challenges ───────────────────────────────────────────────────────────────

@router.get("/challenges/current")
async def current_challenge(
    user_id: str = Depends(require_auth),
    storage: BodhiStorage = Depends(get_storage),
):
    challenge = storage.get_active_challenge()
    if not challenge:
        return None
    # Attach user's entry if any
    entry = storage.get_user_challenge_entry(challenge["id"], user_id)
    leaderboard = storage.get_challenge_leaderboard(challenge["id"])
    return {
        **challenge,
        "criteria": challenge["criteria"] if isinstance(challenge["criteria"], dict) else {},
        "week_start": str(challenge["week_start"]),
        "week_end": str(challenge["week_end"]),
        "user_entry": entry,
        "leaderboard": leaderboard[:20],  # top 20
        "total_entries": len(leaderboard),
    }


@router.get("/challenges/past")
async def past_challenges(
    storage: BodhiStorage = Depends(get_storage),
):
    challenges = storage.get_past_challenges(limit=8)
    return [
        {
            **c,
            "week_start": str(c["week_start"]),
            "week_end": str(c["week_end"]),
        }
        for c in challenges
    ]


@router.get("/challenges/{challenge_id}/leaderboard")
async def challenge_leaderboard(
    challenge_id: str,
    storage: BodhiStorage = Depends(get_storage),
):
    entries = storage.get_challenge_leaderboard(challenge_id)
    return [
        {**e, "rank": i + 1, "tier_color": TIER_COLORS.get(e.get("rank_tier", "Novice"), "#9ca3af")}
        for i, e in enumerate(entries)
    ]
