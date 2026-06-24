# Use Python 3.10 slim image as base (lightweight, ~120MB)
FROM python:3.10-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies required for CV and ML libraries
# - libglib2.0-0, libgl1, libsm6, libxext6, libxrender1: OpenCV dependencies
# - libgomp1: Required for MediaPipe
# - ffmpeg: Audio processing for STT/TTS
# - curl: Health check endpoint testing
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libgl1 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy and install Python dependencies first (better layer caching)
# If requirements.txt doesn't change, Docker reuses this layer
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY src/ ./src/

# Create non-root user for security best practices
# UID 1000 is standard for first non-root user
RUN useradd -m -u 1000 bodhi && \
    chown -R bodhi:bodhi /app && \
    mkdir -p /home/bodhi/.deepface /home/bodhi/ultralytics && \
    chown -R bodhi:bodhi /home/bodhi

# Switch to non-root user
USER bodhi

# Expose port 8000 for the FastAPI application
EXPOSE 8000

# Health check to ensure container is ready
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application with Gunicorn + Uvicorn worker
# - Single worker: ML models are memory-intensive, scale horizontally instead
# - Timeout 120s: Some CV operations can take time
# - Logs to stdout/stderr for Docker logging
CMD ["gunicorn", "src.api.app:app", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--workers", "1", \
     "--bind", "0.0.0.0:8000", \
     "--timeout", "120", \
     "--keep-alive", "5", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
