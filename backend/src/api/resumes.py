"""Resume ingestion endpoints — parse and store structured candidate profiles."""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

from src.api.auth import get_current_user_id
from src.api.deps import get_llm, get_storage
from src.api.limits import (
    MAX_JD_CHARS,
    MAX_RESUME_BYTES,
    enforce_max_bytes,
    validate_resume_bytes,
)
from src.storage import BodhiStorage

router = APIRouter(prefix="/api/resumes", tags=["resumes"])

_ALLOWED_EXTENSIONS = (".pdf", ".docx")
_ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


class ResumeUploadResponse(BaseModel):
    user_id: str
    profile: dict


class ProfileResponse(BaseModel):
    user_id: str
    professional_summary: dict


@router.post("/upload", response_model=ResumeUploadResponse, status_code=201)
async def upload_resume(
    file: UploadFile = File(...),
    storage: BodhiStorage = Depends(get_storage),
    llm=Depends(get_llm),
    clerk_user_id: str | None = Depends(get_current_user_id),
):
    """Upload a PDF or DOCX resume. Extracts text, parses it with the LLM into a
    structured profile, and stores the result. Returns the new user_id."""
    from src.document_parser import extract_text_from_file
    from src.resume_parser import parse_resume

    filename = file.filename or ""
    content_type = file.content_type or ""

    if not (
        content_type in _ALLOWED_CONTENT_TYPES
        or any(filename.lower().endswith(ext) for ext in _ALLOWED_EXTENSIONS)
    ):
        raise HTTPException(400, "Only PDF and DOCX files are supported")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(400, "Uploaded file is empty")
    enforce_max_bytes(file_bytes, MAX_RESUME_BYTES, "Resume")
    validate_resume_bytes(file_bytes)

    try:
        raw_text = await asyncio.to_thread(extract_text_from_file, file_bytes, filename)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc

    if not raw_text or len(raw_text.strip()) < 50:
        raise HTTPException(422, "Could not extract meaningful text from the document")

    try:
        profile = await asyncio.to_thread(parse_resume, raw_text, llm)
    except ValueError as exc:
        raise HTTPException(422, f"Resume parsing failed: {exc}") from exc

    # Auto-run ATS quality scoring (fail-soft: never block onboarding on it).
    from src.ats import score_resume_quality
    try:
        profile["ats_quality"] = await asyncio.to_thread(
            score_resume_quality, profile, raw_text, llm
        )
    except Exception:
        profile["ats_quality"] = {
            "quality_score": None, "breakdown": {}, "strengths": [], "improvements": []
        }

    user_id = await asyncio.to_thread(
        storage.create_user_profile,
        raw_text,
        profile,
        clerk_user_id=clerk_user_id,
        file_bytes=file_bytes,
        filename=filename,
    )
    return ResumeUploadResponse(user_id=user_id, profile=profile)


@router.get("/{user_id}", response_model=ProfileResponse)
async def get_resume_profile(
    user_id: str,
    storage: BodhiStorage = Depends(get_storage),
    clerk_user_id: str | None = Depends(get_current_user_id),
):
    """Retrieve a stored candidate profile by user_id (owner only)."""
    row = storage.get_user_profile(user_id)
    if not row:
        raise HTTPException(404, f"Profile '{user_id}' not found")
    # Enforce ownership: only the owning Clerk user may read the profile.
    # Profiles without a recorded owner (local/dev) are left accessible.
    owner = row.get("clerk_user_id")
    if owner not in (None, "", clerk_user_id):
        raise HTTPException(404, f"Profile '{user_id}' not found")
    return ProfileResponse(
        user_id=row["user_id"],
        professional_summary=row["professional_summary"],
    )


class AtsMatchRequest(BaseModel):
    jd_text: str


class AtsMatchResponse(BaseModel):
    match_score: int | None
    matched_skills: list[str]
    missing_skills: list[str]
    partial_matches: list[str]
    verdict: str
    summary: str


@router.post("/{user_id}/ats-match", response_model=AtsMatchResponse)
async def ats_match(
    user_id: str,
    body: AtsMatchRequest,
    storage: BodhiStorage = Depends(get_storage),
    llm=Depends(get_llm),
    clerk_user_id: str | None = Depends(get_current_user_id),
):
    """Score a stored candidate profile against a job description (owner only).

    Returns a 0-100 match score plus matched/missing/partial skills and a verdict.
    """
    if not body.jd_text or not body.jd_text.strip():
        raise HTTPException(400, "jd_text is required")
    if len(body.jd_text) > MAX_JD_CHARS:
        raise HTTPException(413, f"Job description too long (max {MAX_JD_CHARS} characters)")

    row = storage.get_user_profile(user_id)
    if not row:
        raise HTTPException(404, f"Profile '{user_id}' not found")
    owner = row.get("clerk_user_id")
    if owner not in (None, "", clerk_user_id):
        raise HTTPException(404, f"Profile '{user_id}' not found")

    profile = row.get("professional_summary") or {}

    from src.ats import score_resume_against_jd

    result = await asyncio.to_thread(score_resume_against_jd, profile, body.jd_text, llm)
    return AtsMatchResponse(**result)
