import os
import logging
import subprocess
import tempfile
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from shazamio import Shazam

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("muse-shazam")

MAX_AUDIO_BYTES = 12 * 1024 * 1024
API_KEY = os.getenv("SHAZAM_API_KEY", "")
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(
    title="Muse Harmony Shazam Recognition",
    version="0.2.0",
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["content-type", "x-muse-shazam-key"],
)

def require_api_key(provided: str | None) -> None:
    if not API_KEY:
        raise HTTPException(status_code=503, detail="Recognition service is not configured")
    if not provided or provided != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

def normalize_result(payload: dict) -> dict:
    track = payload.get("track") or {}
    if not track:
        return {"matched": False}

    images = track.get("images") or {}
    sections = track.get("sections") or []
    metadata = []
    for section in sections:
        if section.get("type") == "SONG":
            metadata = section.get("metadata") or []
            break

    extra = {
        item.get("title", "").strip().lower(): item.get("text", "")
        for item in metadata
        if isinstance(item, dict)
    }

    return {
        "matched": True,
        "provider": "shazam",
        "shazamId": str(track.get("key") or ""),
        "title": track.get("title") or "",
        "artist": track.get("subtitle") or "",
        "album": extra.get("album", ""),
        "releaseDate": extra.get("released", ""),
        "cover": images.get("coverart") or images.get("coverarthq") or "",
        "url": track.get("url") or "",
        "genres": track.get("genres", {}).get("primary", ""),
    }

def convert_to_wav(data: bytes) -> bytes:
    with tempfile.TemporaryDirectory() as tmp:
        source = os.path.join(tmp, "input.webm")
        target = os.path.join(tmp, "output.wav")

        with open(source, "wb") as file:
            file.write(data)

        process = subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                source,
                "-ac",
                "1",
                "-ar",
                "44100",
                "-sample_fmt",
                "s16",
                target,
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=15,
            check=False,
        )

        if process.returncode != 0:
            logger.error("ffmpeg conversion failed: %s", process.stderr.decode(errors="replace"))
            raise HTTPException(status_code=422, detail="Could not decode audio")

        with open(target, "rb") as file:
            return file.read()

@app.get("/health")
async def health():
    return {"ok": True, "service": "muse-shazam"}

@app.post("/api/recognize")
async def recognize(
    audio: UploadFile = File(...),
    x_muse_shazam_key: str | None = Header(default=None),
):
    require_api_key(x_muse_shazam_key)

    content_type = (audio.content_type or "").lower()
    if not (content_type.startswith("audio/") or content_type == "application/octet-stream"):
        raise HTTPException(status_code=415, detail="Upload an audio file")

    data = await audio.read(MAX_AUDIO_BYTES + 1)
    if not data:
        raise HTTPException(status_code=400, detail="Audio file is empty")
    if len(data) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Audio file exceeds the 12 MB limit")

    try:
        wav_data = convert_to_wav(data)

        async with Shazam() as shazam:
            result = await shazam.recognize(wav_data)

        return normalize_result(result)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Shazam recognition failed")
        raise HTTPException(
            status_code=502,
            detail="Could not recognize this audio right now",
        ) from None
