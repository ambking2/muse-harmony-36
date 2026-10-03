# Muse Harmony — Shazam recognition service

This is a small Python service that runs ShazamIO outside the Cloudflare Worker. ShazamIO depends on Python/Rust wheels and cannot be imported directly into the TypeScript Worker.

## Run locally

Requires Python 3.10+.

```bash
cd services/shazam
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate
pip install -r requirements.txt
```

Set a private shared key before starting the service:

```bash
# PowerShell
$env:SHAZAM_API_KEY = "replace-with-a-long-random-secret"
$env:ALLOWED_ORIGINS = "https://muse-harmony-36.ambking.workers.dev"
uvicorn main:app --host 0.0.0.0 --port 8000
```

Health check: `GET http://localhost:8000/health`

Recognition: send `POST /api/recognize` as multipart form data with an `audio` file and the `X-Muse-Shazam-Key` header.

Example:

```bash
curl -X POST http://localhost:8000/api/recognize \
  -H "X-Muse-Shazam-Key: replace-with-a-long-random-secret" \
  -F "audio=@sample.mp3"
```

The response is normalized to `matched`, `title`, `artist`, `cover`, `url`, and Shazam's track id. An unmatched recording returns `{"matched": false}`.

## Production architecture

Deploy this folder as a separate Python web service. Keep `SHAZAM_API_KEY` private and configure `ALLOWED_ORIGINS` with the Muse Harmony origin. The Cloudflare Worker must proxy browser uploads to this service and add the shared key server-side; never put the key in browser code.

The current Cloudflare project does not contain a Python runtime. The service is deliberately isolated so it can be deployed independently without changing the existing music player or its API routes. Once its public HTTPS URL is available, add the Worker-side proxy and the microphone UI.

## Limits and notes

- Maximum upload size: 12 MB.
- The endpoint accepts audio MIME types and `application/octet-stream`.
- ShazamIO queries Shazam's service; it does not search Muse Harmony's private catalogue directly.
- Recognition depends on network access and Shazam's upstream service. The library is free/open source, but this is not an SLA-backed or guaranteed-free Shazam API.
