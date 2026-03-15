"""Gamification logic: XP calculation, badge checking, streak management."""

from __future__ import annotations

import logging
from datetime import date

log = logging.getLogger("bodhi.gamification")

# ── Rank tiers ──────────────────────────────────────────────────────────────
# Ordered highest → lowest
RANK_TIERS = [
    ("Master",       50_000),
    ("Elite",        30_000),
    ("Expert",       16_000),
    ("Professional",  8_000),
    ("Practitioner",  3_500),
    ("Apprentice",    1_000),
    ("Novice",            0),
]

TIER_COLORS = {
    "Master":       "#7c3aed",
    "Elite":        "#059669",
    "Expert":       "#d97706",
    "Professional": "#6b7280",
    "Practitioner": "#92400e",
    "Apprentice":   "#4a443f",
    "Novice":       "#9ca3af",
}


def get_rank_tier(total_xp: int) -> str:
    for tier, threshold in RANK_TIERS:
        if total_xp >= threshold:
            return tier
    return "Novice"


def get_next_tier_info(total_xp: int) -> dict:
    """Return progress toward next tier."""
    tiers_asc = list(reversed(RANK_TIERS))
    current = get_rank_tier(total_xp)
    for i, (tier, threshold) in enumerate(tiers_asc):
        if tier == current:
            if i + 1 < len(tiers_asc):
                next_tier, next_threshold = tiers_asc[i + 1]
                span = next_threshold - threshold
                progress = round((total_xp - threshold) / span * 100, 1) if span else 100.0
                return {
                    "current_tier": current,
                    "next_tier": next_tier,
                    "current_xp": total_xp,
                    "needed_xp": next_threshold - total_xp,
                    "next_threshold": next_threshold,
                    "current_threshold": threshold,
                    "progress_pct": min(100.0, progress),
                }
    return {
        "current_tier": "Master",
        "next_tier": None,
        "current_xp": total_xp,
        "needed_xp": 0,
        "next_threshold": total_xp,
        "current_threshold": 50_000,
        "progress_pct": 100.0,
    }


# ── XP calculation ───────────────────────────────────────────────────────────

def calculate_xp(
    report_data: dict,
    phase_results: list[dict],
    current_streak: int,
) -> tuple[int, dict]:
    """Calculate XP earned for a session. Returns (total_xp, breakdown_dict)."""
    overall_score = report_data.get("overall_score_pct", 0)
    behavioral = report_data.get("behavioral_summary", {})
    proctoring = report_data.get("proctoring_summary", {})

    # 1. Base score XP (max 1000)
    base_xp = int(overall_score * 10)

    # 2. Difficulty bonus: (difficulty_reached - 1) * 25 per phase (max 500)
    difficulty_bonus = 0
    for pr in phase_results:
        diff = pr.get("difficulty_reached", 3)
        difficulty_bonus += (max(1, diff) - 1) * 25
    difficulty_bonus = min(difficulty_bonus, 500)

    # 3. Behavioral bonus (max 150)
    behavioral_bonus = 0
    conf = behavioral.get("avg_confidence_score", 0)
    filler = behavioral.get("avg_filler_rate", 999.0)
    wpm = behavioral.get("avg_speaking_rate", 0)
    gaze = behavioral.get("gaze_issues", 999)

    if conf >= 70:
        behavioral_bonus += 50
    if filler <= 3.0:
        behavioral_bonus += 50
    if 110 <= wpm <= 160:
        behavioral_bonus += 30
    if gaze == 0:
        behavioral_bonus += 20

    # 4. Integrity bonus: zero violations = +100
    integrity_bonus = 100 if proctoring.get("total_violations", 0) == 0 else 0

    # 5. Streak multiplier: 1.0 → 2.0 over 20 days
    streak_days = min(max(current_streak, 0), 20)
    streak_mult = round(1.0 + (streak_days * 0.05), 2)

    subtotal = base_xp + difficulty_bonus + behavioral_bonus + integrity_bonus
    total_xp = int(subtotal * streak_mult)

    return total_xp, {
        "base": base_xp,
        "difficulty": difficulty_bonus,
        "behavioral": behavioral_bonus,
        "integrity": integrity_bonus,
        "streak_multiplier": streak_mult,
        "subtotal": subtotal,
        "total": total_xp,
    }


# ── Badge definitions ────────────────────────────────────────────────────────

BADGES: dict[str, dict] = {
    "first_interview":  {"name": "First Step",       "description": "Complete your first interview",                    "icon": "🎯", "rarity": "common"},
    "rising_star":      {"name": "Rising Star",       "description": "Score 70% or higher in any session",              "icon": "⭐", "rarity": "common"},
    "top_performer":    {"name": "Top Performer",     "description": "Score 90% or higher in any session",              "icon": "🏆", "rarity": "rare"},
    "perfect_round":    {"name": "Perfect Round",     "description": "Score 100% in a session",                         "icon": "💯", "rarity": "legendary"},
    "phase_master":     {"name": "Phase Master",      "description": "Achieve A- or better in all 4 scored phases",     "icon": "👑", "rarity": "rare"},
    "silver_tongue":    {"name": "Silver Tongue",     "description": "Speak at 120–150 WPM with filler rate ≤ 2%",      "icon": "🗣️", "rarity": "rare"},
    "cool_cucumber":    {"name": "Cool Cucumber",     "description": "Average confidence score ≥ 85",                   "icon": "🥒", "rarity": "rare"},
    "clean_record":     {"name": "Clean Record",      "description": "5 sessions with zero proctoring violations",      "icon": "🛡️", "rarity": "common"},
    "iron_integrity":   {"name": "Iron Integrity",    "description": "10 sessions with zero proctoring violations",     "icon": "⚔️", "rarity": "rare"},
    "on_a_roll":        {"name": "On a Roll",          "description": "3-day interview streak",                          "icon": "🔥", "rarity": "common"},
    "weekly_warrior":   {"name": "Weekly Warrior",    "description": "7-day interview streak",                          "icon": "⚡", "rarity": "rare"},
    "dedicated":        {"name": "Dedicated",          "description": "30-day interview streak",                         "icon": "💎", "rarity": "legendary"},
    "challenge_accepted":{"name": "Challenge Accepted","description": "Enter your first weekly challenge",               "icon": "🎪", "rarity": "common"},
    "weekly_champion":  {"name": "Weekly Champion",   "description": "Win a weekly challenge",                          "icon": "🥇", "rarity": "legendary"},
    "back_to_back":     {"name": "Back to Back",       "description": "Win 2 consecutive weekly challenges",             "icon": "🔁", "rarity": "legendary"},
}


def get_badge_info(badge_id: str) -> dict:
    return {**BADGES.get(badge_id, {"name": badge_id, "description": "", "icon": "🏅", "rarity": "common"}), "id": badge_id}


def check_badges(
    report_data: dict,
    total_sessions: int,
    current_streak: int,
    existing_badge_ids: set[str],
    clean_session_count: int,
) -> list[str]:
    """Check which new badges are earned. Returns list of newly earned badge_ids."""
    new_badges: list[str] = []
    earned = set(existing_badge_ids)

    def _earn(badge_id: str):
        if badge_id not in earned:
            new_badges.append(badge_id)
            earned.add(badge_id)

    overall_pct = report_data.get("overall_score_pct", 0)
    behavioral = report_data.get("behavioral_summary", {})
    proctoring = report_data.get("proctoring_summary", {})
    phase_breakdown = report_data.get("phase_breakdown", {})

    if total_sessions == 1:
        _earn("first_interview")

    if overall_pct >= 70:
        _earn("rising_star")
    if overall_pct >= 90:
        _earn("top_performer")
    if overall_pct >= 100:
        _earn("perfect_round")

    scored_phases = {"technical", "behavioral", "dsa", "project"}
    if set(phase_breakdown.keys()) >= scored_phases:
        if all(phase_breakdown[p]["score_pct"] >= 80 for p in scored_phases):
            _earn("phase_master")

    wpm = behavioral.get("avg_speaking_rate", 0)
    filler = behavioral.get("avg_filler_rate", 999.0)
    conf = behavioral.get("avg_confidence_score", 0)
    if 120 <= wpm <= 150 and filler <= 2.0:
        _earn("silver_tongue")
    if conf >= 85:
        _earn("cool_cucumber")

    if proctoring.get("total_violations", 0) == 0:
        if clean_session_count >= 5:
            _earn("clean_record")
        if clean_session_count >= 10:
            _earn("iron_integrity")

    if current_streak >= 3:
        _earn("on_a_roll")
    if current_streak >= 7:
        _earn("weekly_warrior")
    if current_streak >= 30:
        _earn("dedicated")

    return new_badges


# ── Streak helpers ────────────────────────────────────────────────────────────

def compute_new_streak(last_session_date: date | None, current_streak: int, today: date | None = None) -> int:
    """Compute updated streak value after a new session today."""
    if today is None:
        today = date.today()
    if last_session_date is None:
        return 1
    delta = (today - last_session_date).days
    if delta == 0:
        return current_streak        # Same day, no change
    elif delta == 1:
        return current_streak + 1    # Consecutive day
    else:
        return 1                     # Streak broken


# ── Challenge qualification ───────────────────────────────────────────────────

def check_challenge_qualification(
    report_data: dict,
    criteria: dict,
    phase_results: list[dict],
) -> tuple[bool, float]:
    """
    Check if a session qualifies for a challenge.
    Returns (qualifies, qualifying_score).
    qualifying_score is used for ranking within the challenge.
    """
    overall_pct = report_data.get("overall_score_pct", 0)
    behavioral = report_data.get("behavioral_summary", {})
    proctoring = report_data.get("proctoring_summary", {})
    phase_breakdown = report_data.get("phase_breakdown", {})
    session_info = report_data.get("session_info", {})

    challenge_type = criteria.get("type", "score_threshold")

    if challenge_type == "score_threshold":
        min_score = criteria.get("min_score", 0)
        required_role = (criteria.get("required_role") or "").lower()
        required_company = (criteria.get("required_company") or "").lower()
        if required_role and required_role not in session_info.get("target_role", "").lower():
            return False, 0.0
        if required_company and required_company not in session_info.get("target_company", "").lower():
            return False, 0.0
        if overall_pct < min_score:
            return False, 0.0
        return True, overall_pct

    elif challenge_type == "phase_mastery":
        req_phase = criteria.get("required_phase", "dsa")
        min_pct = criteria.get("min_phase_score", 80)
        phase_score = phase_breakdown.get(req_phase, {}).get("score_pct", 0)
        if phase_score < min_pct:
            return False, 0.0
        return True, phase_score

    elif challenge_type == "behavioral":
        min_conf = criteria.get("min_confidence", 80)
        max_flags = criteria.get("max_behavioral_flags", 0)
        conf = behavioral.get("avg_confidence_score", 0)
        flags = len(behavioral.get("behavioral_flags", []))
        if conf < min_conf or flags > max_flags:
            return False, 0.0
        return True, float(conf)

    elif challenge_type == "clean_run":
        min_score = criteria.get("min_score", 70)
        if proctoring.get("total_violations", 0) > 0:
            return False, 0.0
        if overall_pct < min_score:
            return False, 0.0
        return True, overall_pct

    elif challenge_type == "hard_mode":
        min_diff = criteria.get("min_difficulty", 4)
        scored = [p for p in phase_results if p.get("phase") in ("technical", "behavioral", "dsa", "project")]
        if not scored:
            return False, 0.0
        if not all(p.get("difficulty_reached", 1) >= min_diff for p in scored):
            return False, 0.0
        return True, overall_pct

    # Default
    return True, overall_pct


# ── Hardcoded weekly challenge templates ──────────────────────────────────────

def get_challenge_templates() -> list[dict]:
    """8 rotating weekly challenge templates. Dates computed at seed time."""
    return [
        {
            "title": "FAANG Ready",
            "description": "Score 75% or higher interviewing for any Software Engineering role. Show us you're ready for the big leagues.",
            "challenge_type": "score_threshold",
            "criteria": {"type": "score_threshold", "min_score": 75},
            "prize_description": "Top 3 scorers win a 1-on-1 mock interview with a Senior SWE from a top-tier startup",
            "max_winners": 3,
        },
        {
            "title": "DSA Domination",
            "description": "Achieve an A- grade (80%+) in the DSA phase specifically. Pure algorithmic excellence.",
            "challenge_type": "phase_mastery",
            "criteria": {"type": "phase_mastery", "required_phase": "dsa", "min_phase_score": 80},
            "prize_description": "Top 3 scorers win a real DSA interview with a FAANG Software Engineer",
            "max_winners": 3,
        },
        {
            "title": "The Communicator",
            "description": "Achieve a confidence score ≥ 80 with zero behavioral flags. Prove your presence and composure.",
            "challenge_type": "behavioral",
            "criteria": {"type": "behavioral", "min_confidence": 80, "max_behavioral_flags": 0},
            "prize_description": "Top 3 scorers win a behavioural interview with a Product Manager at a funded startup",
            "max_winners": 3,
        },
        {
            "title": "The Clean Sweep",
            "description": "Complete a full interview scoring 70%+ with zero proctoring violations. Integrity + performance.",
            "challenge_type": "clean_run",
            "criteria": {"type": "clean_run", "min_score": 70},
            "prize_description": "Top 3 scorers win an interview with a Staff Engineer from a Series B company",
            "max_winners": 3,
        },
        {
            "title": "Hard Mode",
            "description": "Reach difficulty level 4 or higher in ALL scored phases. The ultimate challenge for the best.",
            "challenge_type": "hard_mode",
            "criteria": {"type": "hard_mode", "min_difficulty": 4},
            "prize_description": "Top 3 scorers win a real technical interview with a FAANG recruiter",
            "max_winners": 3,
        },
        {
            "title": "Technical Excellence",
            "description": "Score 80%+ specifically in the Technical phase. Show your depth of technical knowledge.",
            "challenge_type": "phase_mastery",
            "criteria": {"type": "phase_mastery", "required_phase": "technical", "min_phase_score": 80},
            "prize_description": "Top 3 scorers win a 45-min technical session with a CTO of an early-stage startup",
            "max_winners": 3,
        },
        {
            "title": "The All-Rounder",
            "description": "Score 75%+ overall with no phase below 65%. Balanced excellence across all dimensions.",
            "challenge_type": "score_threshold",
            "criteria": {"type": "score_threshold", "min_score": 75},
            "prize_description": "Top 3 scorers win an interview with a top VC-backed company recruiter",
            "max_winners": 3,
        },
        {
            "title": "Speed and Accuracy",
            "description": "Score 75%+ overall while maintaining a confidence score of 75 or higher. Sharp and confident.",
            "challenge_type": "behavioral",
            "criteria": {"type": "behavioral", "min_confidence": 75, "max_behavioral_flags": 2},
            "prize_description": "Top 3 scorers win a real interview with a Google SWE recruiter",
            "max_winners": 3,
        },
    ]
