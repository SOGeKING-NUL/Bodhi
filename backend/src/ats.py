"""ATS (Applicant Tracking System) scoring.

Two LLM-backed scores used in onboarding:
  - score_resume_quality(): standalone resume-quality / ATS-friendliness score.
  - score_resume_against_jd(): how well the resume matches a job description.

Both are designed to FAIL SOFT — onboarding must succeed even if scoring fails,
so parse errors return a safe default dict (score=None) instead of raising.
"""

from __future__ import annotations

import json
import logging
import re

log = logging.getLogger("bodhi.ats")


def _parse_json(content: str) -> dict | None:
    """Best-effort extraction of a JSON object from an LLM response."""
    content = content.strip()
    content = re.sub(r"^```(?:json)?\s*", "", content)
    content = re.sub(r"\s*```$", "", content)
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        # Fall back to the first {...} block if the model added prose.
        match = re.search(r"\{.*\}", content, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                return None
        return None


def _invoke_json(llm, system: str, user: str) -> dict | None:
    from langchain_core.messages import HumanMessage, SystemMessage

    from src.services.llm import _extract_text

    try:
        response = llm.invoke([SystemMessage(content=system), HumanMessage(content=user)])
        content = _extract_text(
            response.content if hasattr(response, "content") else response
        )
        return _parse_json(content)
    except Exception as e:  # network/LLM failure — fail soft
        log.warning("ATS LLM call failed: %s", e)
        return None


def _clamp_score(value, default=None):
    """Coerce an LLM-provided score into an int in [0, 100]."""
    try:
        return max(0, min(100, int(round(float(value)))))
    except (TypeError, ValueError):
        return default


# ── Resume quality (standalone, no JD) ────────────────────────────────────────
_QUALITY_SYSTEM = (
    "You are a senior technical recruiter and ATS expert. You assess how strong "
    "and ATS-friendly a resume is. Return ONLY valid JSON — no markdown, no preamble."
)

_QUALITY_DIMENSIONS = ("impact", "clarity", "skills_coverage", "ats_readability", "completeness")


def score_resume_quality(profile: dict, raw_text: str, llm) -> dict:
    """Score the resume on its own merits (0-100) with a dimension breakdown.

    Returns a dict with keys: quality_score, breakdown, strengths, improvements.
    Never raises; on failure returns a dict with quality_score=None.
    """
    user = (
        "Assess the following resume for overall quality and ATS-friendliness.\n\n"
        f"RESUME TEXT:\n{raw_text[:6000]}\n\n"
        "Score each dimension 0-100 and give an overall 0-100 score. Return JSON:\n"
        "{\n"
        '  "quality_score": <int 0-100>,\n'
        '  "breakdown": {\n'
        '    "impact": <int>,           // quantified achievements, action verbs\n'
        '    "clarity": <int>,          // structure, readability, conciseness\n'
        '    "skills_coverage": <int>,  // breadth/relevance of skills shown\n'
        '    "ats_readability": <int>,  // parseable sections, standard headings\n'
        '    "completeness": <int>      // contact, experience, education present\n'
        "  },\n"
        '  "strengths": ["<short bullet>", ...],\n'
        '  "improvements": ["<short, actionable bullet>", ...]\n'
        "}\n"
        "Base the assessment only on what's in the resume. Do not invent facts."
    )
    data = _invoke_json(llm, _QUALITY_SYSTEM, user) or {}

    breakdown_raw = data.get("breakdown") or {}
    breakdown = {d: _clamp_score(breakdown_raw.get(d)) for d in _QUALITY_DIMENSIONS}

    overall = _clamp_score(data.get("quality_score"))
    if overall is None:
        # Derive from the breakdown if the model omitted the overall score.
        present = [v for v in breakdown.values() if v is not None]
        overall = int(round(sum(present) / len(present))) if present else None

    return {
        "quality_score": overall,
        "breakdown": breakdown,
        "strengths": (data.get("strengths") or [])[:6],
        "improvements": (data.get("improvements") or [])[:6],
    }


# ── Resume vs Job Description match ────────────────────────────────────────────
_MATCH_SYSTEM = (
    "You are an ATS matching engine. Given a candidate profile and a job "
    "description, compute how well the candidate matches. Return ONLY valid JSON."
)


def score_resume_against_jd(profile: dict, jd_text: str, llm) -> dict:
    """Score resume-vs-JD fit (0-100) with matched/missing skills and a verdict.

    Returns a dict with keys: match_score, matched_skills, missing_skills,
    partial_matches, verdict, summary. Never raises; failure -> match_score=None.
    """
    if not jd_text or not jd_text.strip():
        return {
            "match_score": None,
            "matched_skills": [],
            "missing_skills": [],
            "partial_matches": [],
            "verdict": "unknown",
            "summary": "No job description provided.",
        }

    technical = profile.get("technical_skills") or []
    soft = profile.get("soft_skills") or []
    summary_text = profile.get("professional_summary") or ""

    user = (
        "Compare the candidate to the job description.\n\n"
        f"CANDIDATE TECHNICAL SKILLS: {json.dumps(technical)}\n"
        f"CANDIDATE SOFT SKILLS: {json.dumps(soft)}\n"
        f"CANDIDATE SUMMARY: {summary_text}\n\n"
        f"JOB DESCRIPTION:\n{jd_text[:4000]}\n\n"
        "Return JSON:\n"
        "{\n"
        '  "match_score": <int 0-100>,\n'
        '  "matched_skills": ["skills required by the JD that the candidate has"],\n'
        '  "missing_skills": ["skills the JD requires that the candidate lacks"],\n'
        '  "partial_matches": ["adjacent/transferable skills"],\n'
        '  "verdict": "strong | moderate | weak",\n'
        '  "summary": "<1-2 sentence fit assessment>"\n'
        "}\n"
        "Use only skills/requirements explicitly present. Do not invent."
    )
    data = _invoke_json(llm, _MATCH_SYSTEM, user) or {}

    verdict = str(data.get("verdict", "")).lower().strip()
    if verdict not in ("strong", "moderate", "weak"):
        verdict = "unknown"

    return {
        "match_score": _clamp_score(data.get("match_score")),
        "matched_skills": (data.get("matched_skills") or [])[:25],
        "missing_skills": (data.get("missing_skills") or [])[:25],
        "partial_matches": (data.get("partial_matches") or [])[:25],
        "verdict": verdict,
        "summary": data.get("summary") or "",
    }
