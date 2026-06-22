"""Rate limiting via slowapi (global default limit per client IP).

Applied as middleware so all HTTP routes are covered without per-endpoint
decorators. Degrades gracefully: if slowapi isn't installed or is disabled via
env, the app still runs unthrottled (with a warning).

Tuning (env):
  RATE_LIMIT_ENABLED       — "true"/"false" (default true)
  RATE_LIMIT_DEFAULT       — e.g. "120/minute" (default)
  RATE_LIMIT_STORAGE_URI   — e.g. "redis://redis:6379" for multi-worker; the
                             default "memory://" is per-process only.
"""

from __future__ import annotations

import logging
import os

from fastapi import FastAPI

log = logging.getLogger("bodhi.ratelimit")


def setup_rate_limiting(app: FastAPI) -> None:
    enabled = os.getenv("RATE_LIMIT_ENABLED", "true").strip().lower() in (
        "1",
        "true",
        "yes",
    )
    if not enabled:
        log.warning("Rate limiting disabled via RATE_LIMIT_ENABLED.")
        return

    try:
        from slowapi import Limiter
        from slowapi.errors import RateLimitExceeded
        from slowapi.middleware import SlowAPIMiddleware
        from slowapi.util import get_remote_address
        from starlette.responses import JSONResponse
    except ImportError:
        log.warning("slowapi not installed; rate limiting disabled.")
        return

    default_limit = os.getenv("RATE_LIMIT_DEFAULT", "120/minute")
    storage_uri = os.getenv("RATE_LIMIT_STORAGE_URI", "memory://")

    limiter = Limiter(
        key_func=get_remote_address,
        default_limits=[default_limit],
        storage_uri=storage_uri,
        headers_enabled=True,
    )
    app.state.limiter = limiter

    async def _handler(request, exc):  # noqa: ANN001
        return JSONResponse(
            status_code=429,
            content={"detail": "Rate limit exceeded. Please slow down."},
        )

    app.add_exception_handler(RateLimitExceeded, _handler)
    app.add_middleware(SlowAPIMiddleware)
    log.info(
        "Rate limiting enabled (default=%s, storage=%s).", default_limit, storage_uri
    )
