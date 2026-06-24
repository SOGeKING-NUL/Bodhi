"""FastAPI application — entry point for the Bodhi HTTP server."""

from __future__ import annotations

import os
from contextlib import asynccontextmanager

# Set TensorFlow environment variables BEFORE any imports
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")  # Suppress TF warnings
os.environ.setdefault("CUDA_VISIBLE_DEVICES", "-1")  # Force CPU usage
os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")  # Disable oneDNN warnings

import redis
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

# Configure logging for Bodhi debug output
import logging
import warnings

# Suppress TensorFlow and related warnings
warnings.filterwarnings('ignore', category=FutureWarning)
warnings.filterwarnings('ignore', category=DeprecationWarning)
warnings.filterwarnings('ignore', message='.*CUDA.*')
warnings.filterwarnings('ignore', message='.*GPU.*')
warnings.filterwarnings('ignore', message='.*CuDNN.*')

logging.basicConfig(level=logging.INFO)
logging.getLogger("bodhi").setLevel(logging.DEBUG)

# Suppress TensorFlow logs
logging.getLogger("tensorflow").setLevel(logging.ERROR)
logging.getLogger("absl").setLevel(logging.ERROR)


@asynccontextmanager
async def lifespan(app: FastAPI):
    from src.storage import BodhiStorage
    from src.cache import BodhiCache
    from src.services.llm import create_llm
    from src.graph import build_interview_graph, create_durable_checkpointer
    from src.api.auth import assert_auth_configured
    from loguru import logger

    # Fail fast if auth is neither configured nor explicitly bypassed.
    assert_auth_configured()

    db_url = os.getenv("DATABASE_URL", "")
    if not db_url:
        raise RuntimeError("DATABASE_URL is required for the API server")

    storage = BodhiStorage(db_url)
    storage.init_tables()
    app.state.storage = storage

    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    try:
        logger.info(f"Attempting to connect to Redis at: {redis_url}")
        cache = BodhiCache(redis_url)
        logger.info("✓ Redis connection successful and verified")
    except redis.ConnectionError as e:
        logger.error(f"✗ Redis connection failed: {e}")
        logger.error(f"  Redis URL: {redis_url}")
        logger.error(f"  Please ensure Redis server is running:")
        logger.error(f"    - Windows: Start Redis service or run 'redis-server'")
        logger.error(f"    - Check if port 6379 is accessible")
        logger.error(f"    - Verify firewall settings")
        cache = None
    except Exception as e:
        logger.error(f"✗ Redis initialization error: {type(e).__name__}: {e}")
        logger.error(f"  Redis URL: {redis_url}")
        import traceback
        logger.error(traceback.format_exc())
        cache = None
    app.state.cache = cache

    google_key = os.getenv("GOOGLE_API_KEY", "")
    llm = create_llm(api_key=google_key, model="gemini-3.1-flash-lite-preview")
    app.state.llm = llm
    # Durable interview state (falls back to in-memory if deps/DB unavailable).
    checkpointer = create_durable_checkpointer(db_url)
    app.state.graph = build_interview_graph(llm, checkpointer=checkpointer)
    app.state.sarvam_key = os.getenv("SARVAM_API_KEY", "")
    app.state.deepgram_key = os.getenv("DEEPGRAM_API_KEY", "")
    app.state.tts_sample_rate = int(os.getenv("SARVAM_TTS_SAMPLE_RATE", "22050"))

    # ── Initialize Proctoring CV Models ──────────────────────────────────────
    # Each model loads independently so one failure (e.g. emotion model download)
    # doesn't disable the entire proctoring pipeline. The whole block can be
    # disabled with PROCTORING_ENABLED=false — useful when the native CV stack
    # (mediapipe/tensorflow) segfaults in a given environment, which would
    # otherwise crash the worker (a SIGSEGV can't be caught by try/except).
    _proctoring_enabled = os.getenv("PROCTORING_ENABLED", "true").strip().lower() in (
        "1", "true", "yes",
    )
    if not _proctoring_enabled:
        logger.warning("Proctoring disabled via PROCTORING_ENABLED=false")
        for _attr in ("face_detector", "gaze_analyzer", "object_detector", "emotion_analyzer"):
            setattr(app.state, _attr, None)
        _factories = {}
    else:
        logger.info("Loading proctoring CV models...")
        try:
            from src.proctoring_backend.services.proctoring.face_detection import FaceDetector
            from src.proctoring_backend.services.proctoring.gaze_analysis import GazeAnalyzer
            from src.proctoring_backend.services.proctoring.object_detection import ObjectDetector
            from src.proctoring_backend.services.proctoring.emotion_analysis import EmotionAnalyzer
            _factories = {
                "face_detector": FaceDetector,
                "gaze_analyzer": GazeAnalyzer,
                "object_detector": ObjectDetector,
                "emotion_analyzer": EmotionAnalyzer,
            }
        except Exception as e:
            logger.warning(f"⚠ Proctoring dependencies unavailable: {e}")
            _factories = {}

    for _attr in ("face_detector", "gaze_analyzer", "object_detector", "emotion_analyzer"):
        _factory = _factories.get(_attr)
        if _factory is None:
            setattr(app.state, _attr, None)
            continue
        try:
            setattr(app.state, _attr, _factory())
            logger.info(f"✓ {_attr} loaded")
        except Exception as e:
            logger.warning(f"⚠ {_attr} failed to load: {e}")
            setattr(app.state, _attr, None)

    _core_ok = all(
        getattr(app.state, a, None) is not None
        for a in ("face_detector", "gaze_analyzer", "object_detector")
    )
    logger.info(
        "Proctoring core models %s; emotion %s",
        "ready" if _core_ok else "UNAVAILABLE",
        "ready" if getattr(app.state, "emotion_analyzer", None) else "disabled",
    )

    # ── Initialize Behavioral Models ─────────────────────────────────────────
    if not _proctoring_enabled:
        logger.warning("Behavioral models skipped (PROCTORING_ENABLED=false)")
    else:
        logger.info("Loading behavioral analysis models...")
        try:
            from src.behavioral_analysis.services.speech_service import load_models as load_speech_models
            from src.behavioral_analysis.services.posture_service import load_models as load_posture_models
            load_speech_models()
            load_posture_models()
            logger.info("✓ Behavioral models loaded successfully")
        except Exception as e:
            logger.warning(f"⚠ Behavioral models failed to load: {e}")

    yield

    storage.close()


app = FastAPI(
    title="Bodhi API",
    description="Voice-first AI Mock Interviewer — HTTP API",
    version="1.0.0",
    lifespan=lifespan,
)

# Allowed origins are read from BODHI_ALLOWED_ORIGINS (comma-separated).
# A wildcard "*" combined with allow_credentials=True is invalid per the CORS
# spec and is rejected by browsers, so we require an explicit allowlist.
_origins_env = os.getenv("BODHI_ALLOWED_ORIGINS", "").strip()
_allowed_origins = (
    [o.strip() for o in _origins_env.split(",") if o.strip()]
    if _origins_env
    else ["http://localhost:3000", "http://localhost:5173"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "X-Bodhi-Text",
        "X-Bodhi-Phase",
        "X-Bodhi-End",
        "X-Bodhi-Session",
        "X-Bodhi-Transcript",
        "X-Bodhi-Curriculum",
        "X-Bodhi-Sentiment",
    ],
)

# Per-client rate limiting (no-op if slowapi is absent or disabled via env).
from src.api.ratelimit import setup_rate_limiting

setup_rate_limiting(app)

from src.api.roles import router as roles_router
from src.api.companies import router as companies_router
from src.api.documents import router as documents_router
from src.api.interviews import router as interviews_router
from src.api.audio import router as audio_router
from src.api.proctoring import router as proctoring_router
from src.api.resumes import router as resumes_router
from src.api.users import router as users_router

app.include_router(roles_router)
app.include_router(companies_router)
app.include_router(documents_router)
app.include_router(interviews_router)
app.include_router(audio_router)
app.include_router(proctoring_router)
app.include_router(resumes_router)
app.include_router(users_router)


@app.get("/health")
@app.get("/api/health")
async def health():
    models = {
        name: getattr(app.state, name, None) is not None
        for name in ("face_detector", "gaze_analyzer", "object_detector", "emotion_analyzer")
    }
    # Core proctoring needs face + gaze + object; emotion is an optional enhancer.
    proctoring_enabled = all(
        models[m] for m in ("face_detector", "gaze_analyzer", "object_detector")
    )
    return {
        "status": "ok",
        "proctoring_enabled": proctoring_enabled,
        "proctoring_models": models,
    }
