"""
Deepgram Streaming STT — WebSocket-based real-time transcription.

Uses Deepgram Nova-3 for:
  - Continuous streaming transcription with interim results
  - Server-side endpointing (silence-based end-of-turn detection)
  - utterance_end events for reliable pipeline triggering

This replaces the previous Sarvam STT batch approach for the live interview
WebSocket. The client now streams raw PCM-16 (16 kHz mono) continuously and
Deepgram decides when the speaker has finished — eliminating the client-side
silence-detection / batch-WAV-upload round-trip.

Config is passed via the constructor (with env-driven defaults) so this module
stays decoupled from any global settings singleton.

Deepgram closes the socket after ~10-12s of receiving no data. Bodhi
deliberately stops forwarding mic audio while the interviewer is speaking
(to avoid transcribing its own voice), so without an explicit keepalive the
connection dies during every reply. We ping with {"type": "KeepAlive"}
on an interval and transparently reconnect if the socket drops anyway.
"""

import asyncio
import json
import logging
import os
from typing import Awaitable, Callable, Optional
from urllib.parse import urlencode

import websockets

logger = logging.getLogger("bodhi.services.stt_deepgram")

_KEEPALIVE_INTERVAL_S = 5
_MAX_RECONNECT_ATTEMPTS = 3


class DeepgramStreamingSTT:
    """Stream audio → text via the Deepgram Nova-3 WebSocket API."""

    WS_URL = "wss://api.deepgram.com/v1/listen"

    def __init__(
        self,
        api_key: str,
        *,
        model: Optional[str] = None,
        language: Optional[str] = None,
        endpointing_ms: Optional[int] = None,
        utterance_end_ms: Optional[int] = None,
    ) -> None:
        self.api_key = api_key
        self.model = model or os.getenv("DEEPGRAM_MODEL", "nova-3")
        self.language = language or os.getenv("DEEPGRAM_LANGUAGE", "multi")
        self.endpointing_ms = (
            endpointing_ms
            if endpointing_ms is not None
            else int(os.getenv("DEEPGRAM_ENDPOINTING_MS", "500"))
        )
        self.utterance_end_ms = (
            utterance_end_ms
            if utterance_end_ms is not None
            else int(os.getenv("DEEPGRAM_UTTERANCE_END_MS", "1500"))
        )

        self.ws: Optional["websockets.ClientConnection"] = None
        self._receive_task: Optional[asyncio.Task] = None
        self._keepalive_task: Optional[asyncio.Task] = None
        self._accumulated_transcript: str = ""
        self._on_interim: Optional[Callable] = None
        self._on_final: Optional[Callable] = None
        self._on_utterance_end: Optional[Callable] = None
        self._closing = False
        self._reconnect_attempts = 0

    # ------------------------------------------------------------------ #
    #  Connection lifecycle
    # ------------------------------------------------------------------ #

    async def connect(
        self,
        *,
        on_interim: Optional[Callable[[str], Awaitable[None]]] = None,
        on_final: Optional[Callable[[str], Awaitable[None]]] = None,
        on_utterance_end: Optional[Callable[[str], Awaitable[None]]] = None,
    ) -> None:
        """Open a persistent streaming connection to Deepgram."""
        if not self.api_key:
            raise RuntimeError("DEEPGRAM_API_KEY is not configured")

        # Close any existing connection first
        if self.ws is not None:
            await self.close()

        self._on_interim = on_interim
        self._on_final = on_final
        self._on_utterance_end = on_utterance_end
        self._closing = False
        self._reconnect_attempts = 0
        await self._open_connection()

    async def _open_connection(self) -> None:
        """(Re)establish the websocket plus its receiver/keepalive tasks."""
        if self._keepalive_task is not None:
            self._keepalive_task.cancel()
            self._keepalive_task = None

        params = urlencode({
            "model": self.model,
            "language": self.language,
            "encoding": "linear16",
            "sample_rate": "16000",
            "channels": "1",
            "endpointing": str(self.endpointing_ms),
            "utterance_end_ms": str(self.utterance_end_ms),
            "interim_results": "true",
            "vad_events": "true",
            "smart_format": "true",
            "punctuate": "true",
            "keepalive": "true",
        })
        url = f"{self.WS_URL}?{params}"
        headers = {"Authorization": f"Token {self.api_key}"}

        self.ws = await websockets.connect(
            url,
            additional_headers=headers,
            ping_interval=20,
            ping_timeout=10,
        )
        self._accumulated_transcript = ""

        # Start the background receiver + keepalive sender
        self._receive_task = asyncio.create_task(self._receive_loop())
        self._keepalive_task = asyncio.create_task(self._keepalive_loop())
        logger.info(
            "Deepgram connected  model=%s  lang=%s  endpointing=%dms  utterance_end=%dms",
            self.model,
            self.language,
            self.endpointing_ms,
            self.utterance_end_ms,
        )

    async def close(self) -> None:
        """Close the Deepgram WebSocket and stop the receive/keepalive loops."""
        self._closing = True

        if self._keepalive_task is not None:
            self._keepalive_task.cancel()
            try:
                await self._keepalive_task
            except (asyncio.CancelledError, Exception):
                pass
            self._keepalive_task = None

        if self._receive_task is not None:
            self._receive_task.cancel()
            try:
                await self._receive_task
            except (asyncio.CancelledError, Exception):
                pass
            self._receive_task = None

        if self.ws is not None:
            try:
                await self.ws.close()
            except Exception:
                pass
            self.ws = None

        self._accumulated_transcript = ""
        logger.info("Deepgram STT closed")

    def reset_transcript(self) -> None:
        """Clear accumulated transcript (e.g. on new utterance start)."""
        self._accumulated_transcript = ""

    # ------------------------------------------------------------------ #
    #  Audio streaming
    # ------------------------------------------------------------------ #

    async def send_audio(self, pcm_chunk: bytes) -> None:
        """Forward a raw PCM-16 audio chunk to Deepgram."""
        if self.ws is not None:
            try:
                await self.ws.send(pcm_chunk)
            except Exception:
                pass  # silently drop if connection is closing

    # ------------------------------------------------------------------ #
    #  Keepalive — prevents Deepgram's ~10-12s idle disconnect during
    #  stretches where we intentionally send no audio (Bodhi is speaking).
    # ------------------------------------------------------------------ #

    async def _keepalive_loop(self) -> None:
        try:
            while True:
                await asyncio.sleep(_KEEPALIVE_INTERVAL_S)
                if self.ws is not None:
                    try:
                        await self.ws.send(json.dumps({"type": "KeepAlive"}))
                    except Exception:
                        pass
        except asyncio.CancelledError:
            pass

    # ------------------------------------------------------------------ #
    #  Background receiver
    # ------------------------------------------------------------------ #

    async def _receive_loop(self) -> None:
        """Background task: read Deepgram JSON responses and fire callbacks."""
        try:
            async for msg in self.ws:
                data = json.loads(msg)
                msg_type = data.get("type", "")

                if msg_type == "Results":
                    channel = data.get("channel", {})
                    alternatives = channel.get("alternatives", [])
                    transcript = (
                        alternatives[0].get("transcript", "")
                        if alternatives
                        else ""
                    )
                    is_final = data.get("is_final", False)

                    if transcript:
                        if is_final:
                            # Finalized segment — accumulate
                            self._accumulated_transcript += transcript + " "
                            if self._on_final:
                                await self._on_final(
                                    self._accumulated_transcript.strip()
                                )
                        else:
                            # Interim (partial) result — show in UI
                            interim = self._accumulated_transcript + transcript
                            if self._on_interim:
                                await self._on_interim(interim.strip())

                elif msg_type == "UtteranceEnd":
                    # Deepgram's endpointing detected end-of-turn
                    transcript = self._accumulated_transcript.strip()
                    if transcript:
                        logger.info("STT utterance_end → %s", transcript)
                        if self._on_utterance_end:
                            await self._on_utterance_end(transcript)
                        self._accumulated_transcript = ""

            # Some closures (e.g. Deepgram's own idle timeout) end the async
            # iterator without raising — treat that the same as a dropped
            # connection unless we initiated the close ourselves.
            if not self._closing:
                await self._handle_unexpected_close("stream ended")

        except websockets.exceptions.ConnectionClosed as exc:
            logger.warning("Deepgram WebSocket closed: %s", exc)
            if not self._closing:
                await self._handle_unexpected_close(str(exc))
        except asyncio.CancelledError:
            pass
        except Exception as exc:
            logger.error("Deepgram receive error: %s", exc)
            if not self._closing:
                await self._handle_unexpected_close(str(exc))

    async def _handle_unexpected_close(self, reason: str) -> None:
        """Reconnect transparently so a dropped socket doesn't silently kill
        transcription for the rest of the interview."""
        if self._reconnect_attempts >= _MAX_RECONNECT_ATTEMPTS:
            logger.error(
                "Deepgram reconnect giving up after %d attempts (last reason: %s)",
                self._reconnect_attempts, reason,
            )
            return

        self._reconnect_attempts += 1
        logger.warning(
            "Deepgram reconnecting (attempt %d/%d) after: %s",
            self._reconnect_attempts, _MAX_RECONNECT_ATTEMPTS, reason,
        )
        await asyncio.sleep(0.5)
        try:
            await self._open_connection()
            self._reconnect_attempts = 0  # reset after a clean reconnect
        except Exception as exc:
            logger.error("Deepgram reconnect failed: %s", exc)
