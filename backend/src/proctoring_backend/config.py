from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "Proctoring API"
    DEBUG: bool = False
    SECRET_KEY: str = "change-this-in-production"

    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "proctoring_db"

    #react and vite dev servers!!
    ALLOWED_ORIGINS: List[str]=[
        "http://localhost:3000",  
        "http://localhost:5173",   
    ]

    
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    S3_BUCKET_NAME: str = "proctoring-snapshots"


    # camera check and other thresholds
    FRAME_SAMPLE_INTERVAL: int = 3
    IDENTITY_REVERIFY_INTERVAL: int = 30
    FACE_SIMILARITY_THRESHOLD: float = 0.28
    GAZE_DEVIATION_THRESHOLD: float = 30.0
    VIOLATION_AUTO_FLAG_COUNT: int = 5

    # CV model configuration
    FACE_RECOGNITION_MODEL: str = "Facenet512"
    OBJECT_DETECTION_CONFIDENCE: float = 0.55
    YOLO_MODEL_VARIANT: str = "yolov8n"  # nano for local, override to yolov8m on AWS via .env

    # ── Proctoring tuning (all overridable via env) ───────────────────────────
    # Detector sensitivity
    FACE_MIN_DETECTION_CONFIDENCE: float = 0.6
    FACE_CENTER_TOLERANCE: float = 0.32          # higher = more lenient framing
    MULTI_FACE_MIN_CONFIDENCE: float = 0.6       # ignore low-confidence ghost faces

    # Debounce: how many *consecutive* offending frames before we flag a
    # violation. At ~1 FPS these are roughly "seconds". Higher = fewer false
    # positives, slightly slower to react.
    NO_FACE_TRIGGER: int = 2
    GAZE_TRIGGER: int = 3
    FACE_CENTER_TRIGGER: int = 3
    MULTI_FACE_TRIGGER: int = 2
    OBJECT_TRIGGER: int = 2

    class Config:
        env_file=".env"
        env_file_encoding="utf-8"
        extra = "ignore"


settings=Settings()