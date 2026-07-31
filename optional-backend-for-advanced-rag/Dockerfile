FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/models/huggingface \
    TRANSFORMERS_CACHE=/models/huggingface \
    BATUK_GLINER_MODEL=urchade/gliner_multi_pii-v1

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    file \
    libmagic1 \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-eng \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip setuptools wheel \
  && pip install -r requirements.txt

COPY app ./app
COPY scripts ./scripts

RUN python scripts/download_models.py || true

EXPOSE 8000

CMD ["gunicorn", "app.main:app", "--workers", "2", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "--timeout", "300"]
