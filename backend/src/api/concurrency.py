"""Async helpers for running blocking I/O off the event loop with a hard timeout.

These wrap third-party SDK calls (STT/TTS/embeddings) whose own timeout support
is inconsistent. On timeout we surface a 504 so a single hung upstream cannot
pin a request (or, via the event loop, the whole worker) indefinitely.
"""

from __future__ import annotations

import asyncio
import os

from fastapi import HTTPException

STT_TIMEOUT_SEC = float(os.getenv("STT_TIMEOUT_SEC", "60"))
TTS_TIMEOUT_SEC = float(os.getenv("TTS_TIMEOUT_SEC", "60"))
EMBED_TIMEOUT_SEC = float(os.getenv("EMBED_TIMEOUT_SEC", "30"))


async def run_blocking(func, *args, timeout: float, label: str = "Operation", **kwargs):
    """Run blocking `func(*args, **kwargs)` in a thread, bounded by `timeout`s.

    Raises HTTPException(504) on timeout. Note: the underlying thread cannot be
    forcibly cancelled, but the request returns promptly instead of hanging.
    """
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(func, *args, **kwargs), timeout
        )
    except asyncio.TimeoutError:
        raise HTTPException(504, f"{label} timed out. Please try again.")
