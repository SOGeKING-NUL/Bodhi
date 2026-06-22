FROM python:3.10-slim

# System deps for OpenCV, DeepFace, and MediaPipe
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libgl1 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (layer cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY src/ ./src/

# Pre-download CV model weights at build time so the first request isn't slow
# and startup doesn't depend on network reachability to the model CDNs.
# Caches live under /app so they survive the later chown to the non-root user
# (the default ~/.cache would belong to root and be unreadable by 'bodhi').
ARG YOLO_MODEL=yolov8n.pt
ENV YOLO_MODEL_VARIANT=yolov8n \
    HF_HOME=/app/.cache/huggingface \
    YOLO_CONFIG_DIR=/app/.cache/ultralytics \
    MPLCONFIGDIR=/app/.cache/matplotlib
RUN python -c "from ultralytics import YOLO; YOLO('${YOLO_MODEL}')" && \
    python -c "from transformers import pipeline; pipeline('image-classification', model='trpakov/vit-face-expression', device=-1)" && \
    python -c "import urllib.request, os; \
p='src/proctoring_backend/services/proctoring/blaze_face_short_range.tflite'; \
url='https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite'; \
(os.path.exists(p) or urllib.request.urlretrieve(url, p))"

# Non-root user for security
RUN useradd -m -u 1000 bodhi && chown -R bodhi:bodhi /app
USER bodhi

EXPOSE 8000

# Single uvicorn worker — the app loads heavy CV models once at startup.
# Scale horizontally (multiple containers) rather than vertically (more workers).
CMD ["gunicorn", "src.api.app:app", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--workers", "1", \
     "--bind", "0.0.0.0:8000", \
     "--timeout", "120", \
     "--keep-alive", "5", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
