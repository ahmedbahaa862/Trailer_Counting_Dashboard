# Trailer Counting Backend

This service connects CCTV/RTSP streams to YOLOE-26X, ByteTrack, and the React dashboard.

## Requirements

- Python 3.11 or 3.12 (recommended; Python 3.14 is not currently the safe target for the ML stack)
- The supplied `yoloe-26x-seg.pt` checkpoint
- FFmpeg-compatible RTSP access to each CCTV camera
- A CUDA-capable GPU is strongly recommended for the 26X model

The requirements include Ultralytics' CLIP fork because YOLOE uses it to create text-prompt embeddings.

## Setup

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
```

Edit `backend/.env` and set `MODEL_PATH` and `CAMERAS_JSON`. Do not commit RTSP credentials.

For a typical Hikvision main stream, the URL often follows this shape:

```text
rtsp://USER:PASSWORD@CAMERA_IP/Streaming/Channels/101
```

Confirm the exact URL and RTSP permissions in the camera configuration.

## Run

```bash
cd backend
source .venv/bin/activate
python run.py
```

Then run the frontend from the repository root:

```bash
npm run dev
```

Endpoints:

- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/cameras/{camera_id}/stream` (annotated MJPEG)
- `WS /ws/dashboard` (synchronized dashboard snapshots)

## Data flow

```text
RTSP camera
  → YOLOE text prompts
  → ByteTrack persistent IDs
  → queue-zone and counting-line logic
  → annotated MJPEG + JSON state
  → React WebSocket client
```

Counting lines and queue zones use normalized coordinates, so they remain valid when inference resolution changes. For production, calibrate each camera's zone and direction on actual footage. The in-memory totals reset when the backend restarts; persistent reporting should be connected to a database in the next phase.

## Performance note

The implementation creates one tracker/model worker per configured camera to prevent track IDs from leaking between streams. `yoloe-26x-seg.pt` is large, so enable only the cameras the machine can process concurrently. Multi-camera production deployment may require one GPU worker per stream or a dedicated inference scheduler.
