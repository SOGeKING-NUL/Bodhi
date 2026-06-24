"""Standalone STT and TTS utility endpoints."""

from __future__ import annotations

import asyncio
import base64

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from src.api.concurrency import STT_TIMEOUT_SEC, TTS_TIMEOUT_SEC, run_blocking
from src.api.deps import get_sarvam_key
from src.api.limits import MAX_AUDIO_BYTES, MIN_AUDIO_BYTES, enforce_max_bytes
from src.api.models import STTResponse, TTSRequest, TTSResponse

router = APIRouter(prefix="/api/audio", tags=["audio"])


@router.post("/stt", response_model=STTResponse)
async def speech_to_text(
    file: UploadFile = File(...),
    sarvam_key: str = Depends(get_sarvam_key),
):
    """Upload a WAV file and get the transcription back."""
    if not sarvam_key:
        raise HTTPException(500, "SARVAM_API_KEY not configured")

    audio_bytes = await file.read()
    enforce_max_bytes(audio_bytes, MAX_AUDIO_BYTES, "Audio")
    if not audio_bytes or len(audio_bytes) < MIN_AUDIO_BYTES:
        raise HTTPException(400, "Audio file too small or empty")

    from src.services.stt import transcribe_audio

    transcript = await run_blocking(
        transcribe_audio,
        audio_bytes, api_key=sarvam_key, model="saaras:v3", language_code="en-IN",
        timeout=STT_TIMEOUT_SEC, label="Transcription",
    )
    transcript = (transcript or "").strip()
    if not transcript:
        raise HTTPException(422, "Could not transcribe audio")

    return STTResponse(transcript=transcript)


@router.post("/tts", response_model=TTSResponse)
async def text_to_speech(
    body: TTSRequest,
    sarvam_key: str = Depends(get_sarvam_key),
):
    """Convert text to speech, return base64-encoded audio."""
    if not sarvam_key:
        raise HTTPException(500, "SARVAM_API_KEY not configured")

    if not body.text.strip():
        raise HTTPException(400, "Text cannot be empty")

    from src.services.tts import text_to_speech_bytes

    audio_bytes = await run_blocking(
        text_to_speech_bytes,
        body.text,
        api_key=sarvam_key,
        target_language_code=body.target_language_code,
        speaker=body.speaker,
        timeout=TTS_TIMEOUT_SEC, label="Speech synthesis",
    )
    audio_b64 = base64.b64encode(audio_bytes).decode()

    return TTSResponse(audio_b64=audio_b64)
