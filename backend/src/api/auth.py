"""Clerk JWT verification for FastAPI."""

from __future__ import annotations

import os
import logging

import jwt
from typing import Union
from fastapi import Depends, HTTPException, Request, WebSocket
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

logger = logging.getLogger("bodhi.auth")

_security = HTTPBearer(auto_error=False)

# Cache the JWKS (public keys) from Clerk
_jwks_client: jwt.PyJWKClient | None = None


def _get_jwks_client() -> jwt.PyJWKClient:
    """Lazily create a JWKS client pointing to your Clerk instance."""
    global _jwks_client
    if _jwks_client is None:
        clerk_frontend_api = os.getenv("CLERK_FRONTEND_API_URL", "")
        if not clerk_frontend_api:
            raise RuntimeError(
                "CLERK_FRONTEND_API_URL is required "
                "(e.g. https://your-app.clerk.accounts.dev)"
            )
        jwks_url = f"{clerk_frontend_api}/.well-known/jwks.json"
        _jwks_client = jwt.PyJWKClient(jwks_url)
    return _jwks_client


_CLERK_CONFIGURED = bool(os.getenv("CLERK_FRONTEND_API_URL", "").strip())

# The anonymous-auth bypass is OFF by default and must be explicitly enabled for
# local development. This prevents a missing/forgotten CLERK_FRONTEND_API_URL in
# production from silently disabling authentication for the entire API.
_ALLOW_ANONYMOUS = os.getenv("BODHI_ALLOW_ANONYMOUS_AUTH", "").strip().lower() in (
    "1",
    "true",
    "yes",
)


def assert_auth_configured() -> None:
    """Fail fast at startup if auth is neither configured nor explicitly bypassed.

    Call this from the app's startup/lifespan. Without this guard, a deployment
    that forgets CLERK_FRONTEND_API_URL would fall through to anonymous access.
    """
    if not _CLERK_CONFIGURED and not _ALLOW_ANONYMOUS:
        raise RuntimeError(
            "Authentication is not configured. Set CLERK_FRONTEND_API_URL for "
            "production, or set BODHI_ALLOW_ANONYMOUS_AUTH=true to explicitly "
            "allow unauthenticated access in local development."
        )
    if _ALLOW_ANONYMOUS:
        logger.warning(
            "BODHI_ALLOW_ANONYMOUS_AUTH is enabled — all requests run as "
            "'anonymous'. This must NEVER be set in production."
        )


async def verify_clerk_token(
    request: Request = None,
    websocket: WebSocket = None,
) -> dict:
    """Verify the Bearer JWT and return its claims.

    Handles both HTTP Request and WebSocket connections.
    Returns an empty dict if no credentials are provided or Clerk is not configured.
    """
    if not _CLERK_CONFIGURED:
        return {}

    conn = request or websocket
    if not conn:
        return {}

    # Extract token from Authorization header or 'token' query param
    token = None
    auth_header = conn.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.removeprefix("Bearer ")
    elif isinstance(conn, WebSocket):
        token = conn.query_params.get("token")

    if not token:
        return {}

    try:
        signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},
            leeway=60,
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        logger.warning("Invalid JWT: %s", e)
        raise HTTPException(status_code=401, detail="Invalid token")


def require_auth(
    claims: dict = Depends(verify_clerk_token),
) -> str:
    """Require authentication — returns the Clerk user_id (sub claim).

    In development (no CLERK_FRONTEND_API_URL set), returns 'anonymous'
    so endpoints work without a Clerk token.
    In production (Clerk configured), raises 401 if no valid token.
    """
    user_id = claims.get("sub", "")
    if not user_id:
        if not _CLERK_CONFIGURED and _ALLOW_ANONYMOUS:
            # Local dev only — explicitly opted in via BODHI_ALLOW_ANONYMOUS_AUTH.
            logger.debug("Auth bypassed (anonymous mode) — using 'anonymous'")
            return "anonymous"
        raise HTTPException(status_code=401, detail="Authentication required")
    return user_id


def get_current_user_id(
    claims: dict = Depends(verify_clerk_token),
) -> str | None:
    """Optional auth — returns user_id if authenticated, None otherwise."""
    return claims.get("sub") or None


async def authenticate_websocket(websocket: WebSocket) -> str | None:
    """Authenticate a WebSocket handshake before accept().

    Returns the authenticated user_id, or None if authentication fails.
    The caller is responsible for closing the socket when None is returned.
    Mirrors the anonymous-bypass policy of require_auth().
    """
    try:
        claims = await verify_clerk_token(websocket=websocket)
    except HTTPException:
        # Expired/invalid token — treat as unauthenticated.
        return None

    user_id = claims.get("sub", "")
    if user_id:
        return user_id

    if not _CLERK_CONFIGURED and _ALLOW_ANONYMOUS:
        return "anonymous"
    return None
