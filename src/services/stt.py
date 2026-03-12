"""Saaras V3 Speech-to-Text via Sarvam AI."""

import asyncio
import base64
import tempfile
from pathlib import Path

from sarvamai import SarvamAI
from sarvamai import AsyncSarvamAI


def transcribe_audio_streaming(
    audio_bytes: bytes,
    *,
    api_key: str,
    model: str = "saaras:v3",
    mode: str = "codemix",
    language_code: str = "hi-IN",
) -> str:
    """
    Transcribe using Sarvam streaming API (lower latency than REST).
    Expects WAV, 16kHz, mono.
    """
    async def _run():
        client = AsyncSarvamAI(api_subscription_key=api_key)
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
        async with client.speech_to_text_streaming.connect(
            model=model,
            mode=mode,
            language_code=language_code,
            high_vad_sensitivity=True,
            vad_signals=True,
        ) as ws:
            await ws.transcribe(
                audio=audio_b64,
                encoding="audio/wav",
                sample_rate=16000,
            )
            async for message in ws:
                if isinstance(message, dict):
                    if message.get("type") == "transcript":
                        text = message.get("text") or message.get("transcript")
                        if text:
                            return str(text)
                    continue
                transcript = _extract_transcript(message)
                if transcript:
                    return transcript
        return ""

    return asyncio.run(_run())


def transcribe_audio(
    audio_bytes: bytes,
    *,
    api_key: str,
    model: str = "saaras:v3",
    mode: str = "codemix",
    language_code: str = "hi-IN",
) -> str:
    """
    Transcribe audio bytes to text using Saaras V3.
    Expects WAV format, 16kHz, mono.
    """
    client = SarvamAI(api_subscription_key=api_key)

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        f.write(audio_bytes)
        path = Path(f.name)

    try:
        with open(path, "rb") as audio_file:
            response = client.speech_to_text.transcribe(
                file=audio_file,
                model=model,
                mode=mode,
                language_code=language_code,
            )
        return _extract_transcript(response)
    finally:
        path.unlink(missing_ok=True)


def _extract_transcript(response) -> str:
    """Extract transcript text from Sarvam STT response."""
    if hasattr(response, "transcript"):
        return response.transcript or ""
    if hasattr(response, "text"):
        return response.text or ""
    if isinstance(response, str):
        return response
    if isinstance(response, dict):
        return response.get("transcript", response.get("text", "")) or ""
    return str(response)
