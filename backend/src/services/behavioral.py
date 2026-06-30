"""Per-turn speech metrics: speaking rate, filler rate, confidence, tone."""

from __future__ import annotations

import re

from src.services.sentiment import analyze_tone

# Ideal interview pace in words/min; below = too slow, above = rushed.
WPM_IDEAL_LO = 130
WPM_IDEAL_HI = 170
WPM_SLOW = 100
WPM_FAST = 185

_SENTIMENT = {
    "confident": "positive",
    "enthusiastic": "positive",
    "neutral": "neutral",
    "hesitant": "negative",
    "nervous": "negative",
}


def _word_count(text: str) -> int:
    return len([w for w in re.sub(r"[^\w\s]", " ", text).split() if w])


def _confidence_score(wpm: float, filler_rate: float, words: int, hedges: int) -> int:
    """0-100 score from pace, fillers, answer length and hedging."""
    score = 70.0
    score -= min(25.0, filler_rate * 2.0)

    if WPM_IDEAL_LO <= wpm <= WPM_IDEAL_HI:
        score += 15.0
    elif wpm == 0:
        pass
    elif wpm < WPM_SLOW or wpm > WPM_FAST:
        score -= 10.0
    else:
        score += 5.0

    if words >= 40:
        score += 10.0
    elif words < 12:
        score -= 15.0

    score -= hedges * 4.0
    return max(0, min(100, round(score)))


def compute_speech_behavioral(transcript: str, duration_sec: float) -> dict:
    """Metrics for one answer: emotion, sentiment, wpm, filler_rate, confidence, flags."""
    transcript = (transcript or "").strip()
    res = analyze_tone(transcript)

    wc = _word_count(transcript)
    if duration_sec and duration_sec > 0.5:
        wpm = round(wc / duration_sec * 60.0)
    else:
        wpm = round(res.speaking_rate_wpm)

    flags: list[str] = []
    if res.filler_rate > 8:
        flags.append("high_filler_rate")
    if wpm > WPM_FAST:
        flags.append("speaking_too_fast")
    if 0 < wpm < WPM_SLOW:
        flags.append("speaking_too_slow")
    if res.hedge_count >= 3:
        flags.append("excessive_hedging")
    if wc < 12:
        flags.append("answer_too_short")

    return {
        "emotion": res.emotion,
        "sentiment": _SENTIMENT.get(res.emotion, "neutral"),
        "speaking_rate_wpm": int(wpm),
        "filler_rate": round(res.filler_rate, 1),
        "confidence_score": _confidence_score(wpm, res.filler_rate, wc, res.hedge_count),
        "flags": flags,
    }
