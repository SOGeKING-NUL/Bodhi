"""FastAPI dependency injection helpers.

All shared resources (storage, cache, LLM, graph) live on app.state
and are injected into endpoint functions via Depends().
"""

from __future__ import annotations

from fastapi import Depends, Request

from src.cache import BodhiCache
from src.storage import BodhiStorage
from src.api.auth import require_auth, get_current_user_id  # noqa: F401


from typing import Union
from fastapi import Depends, Request, WebSocket

from src.cache import BodhiCache
from src.storage import BodhiStorage
from src.api.auth import require_auth, get_current_user_id  # noqa: F401


def _get_conn(request: Request = None, websocket: WebSocket = None):
    return request or websocket


def get_storage(conn=Depends(_get_conn)) -> BodhiStorage:
    return conn.app.state.storage


def get_cache(conn=Depends(_get_conn)) -> BodhiCache | None:
    return conn.app.state.cache


def get_graph(conn=Depends(_get_conn)):
    return conn.app.state.graph


def get_sarvam_key(conn=Depends(_get_conn)) -> str:
    return conn.app.state.sarvam_key


def get_llm(conn=Depends(_get_conn)):
    return conn.app.state.llm
