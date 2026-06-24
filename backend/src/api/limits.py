"""Centralized request input-size limits and lightweight content validation.

These guard against memory-exhaustion DoS (huge uploads / frames / text) and
spoofed file types. Values are conservative defaults; tune as needed.
"""

from __future__ import annotations

from fastapi import HTTPException

# ── Size limits ───────────────────────────────────────────────────────────────
MIN_AUDIO_BYTES = 1_000
MAX_AUDIO_BYTES = 25 * 1024 * 1024        # 25 MB
MAX_RESUME_BYTES = 10 * 1024 * 1024       # 10 MB
MAX_DOCUMENT_BYTES = 10 * 1024 * 1024     # 10 MB
MAX_EDITOR_CHARS = 50_000                 # ~50 KB of code/text
MAX_WS_FRAME_CHARS = 4 * 1024 * 1024      # ~4 MB base64 webcam frame
MAX_QUERY_CHARS = 1_000
MAX_JD_CHARS = 20_000                      # job-description text for ATS matching


def enforce_max_bytes(data: bytes, limit: int, label: str = "File") -> None:
    """Raise 413 if `data` exceeds `limit` bytes."""
    if len(data) > limit:
        mb = limit / (1024 * 1024)
        raise HTTPException(413, f"{label} too large (max {mb:.0f} MB)")


# ── Magic-byte sniffing ───────────────────────────────────────────────────────
def looks_like_pdf(data: bytes) -> bool:
    return data[:5] == b"%PDF-"


def looks_like_docx(data: bytes) -> bool:
    # DOCX (and any OOXML) is a ZIP archive: "PK\x03\x04" / "PK\x05\x06" (empty).
    return data[:2] == b"PK"


def validate_resume_bytes(data: bytes) -> None:
    """Validate an uploaded resume actually looks like a PDF or DOCX, not just a
    spoofed extension/content-type."""
    if not (looks_like_pdf(data) or looks_like_docx(data)):
        raise HTTPException(400, "File content does not match a PDF or DOCX")
