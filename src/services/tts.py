"""Bulbul V3 Text-to-Speech via Sarvam AI."""

import base64
import io

import sounddevice as sd
import soundfile as sf
from sarvamai import SarvamAI


def text_to_speech_bytes(
    text: str,
    *,
    api_key: str,
    model: str = "bulbul:v3",
    target_language_code: str = "hi-IN",
    speaker: str = "shubh",
) -> bytes:
    """
    Convert text to speech audio bytes using Bulbul V3.
    Returns raw PCM/WAV bytes suitable for playback.
    """
    client = SarvamAI(api_subscription_key=api_key)

    response = client.text_to_speech.convert(
        text=text,
        target_language_code=target_language_code,
        model=model,
        speaker=speaker,
    )

    audio_b64 = _extract_audio(response)
    return base64.b64decode(audio_b64)


def play_audio(audio_bytes: bytes) -> None:
    """Play audio bytes using sounddevice. Assumes WAV format from Bulbul."""
    data, sample_rate = sf.read(io.BytesIO(audio_bytes))
    sd.play(data, sample_rate)
    sd.wait()


def speak(
    text: str,
    *,
    api_key: str,
    model: str = "bulbul:v3",
    target_language_code: str = "hi-IN",
    speaker: str = "shubh",
    play: bool = True,
) -> bytes:
    """
    Convert text to speech and optionally play it.
    Returns audio bytes.
    """
    audio_bytes = text_to_speech_bytes(
        text=text,
        api_key=api_key,
        model=model,
        target_language_code=target_language_code,
        speaker=speaker,
    )
    if play:
        play_audio(audio_bytes)
    return audio_bytes


def _extract_audio(response) -> str:
    """Extract base64 audio from Sarvam TTS response. Response has audios: [base64...]."""
    if hasattr(response, "audios") and response.audios:
        return response.audios[0]
    if hasattr(response, "audio"):
        return response.audio
    if isinstance(response, dict):
        audios = response.get("audios", [])
        if audios:
            return audios[0]
        return response.get("audio", "")
    return ""
