from __future__ import annotations

import asyncio
import json
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .config import CameraConfig, settings
from .discovery import DiscoveryUnavailable, discover_onvif_devices
from .state import DashboardState
from .worker import CameraWorker

state = DashboardState(settings.cameras)
workers: list[CameraWorker] = []


def start_workers(cameras: list[CameraConfig]) -> None:
    for camera in cameras:
        state.update_camera(camera.id, name=camera.name)
        worker = CameraWorker(camera, settings, state)
        workers.append(worker)
        worker.start()


def stop_workers() -> None:
    for worker in workers: worker.stop()
    for worker in workers: worker.join(timeout=3)
    workers.clear()


@asynccontextmanager
async def lifespan(_: FastAPI):
    if not settings.model_path.exists():
        raise RuntimeError(f"YOLOE model not found: {settings.model_path}")
    start_workers(settings.cameras)
    yield
    stop_workers()


app = FastAPI(title="Trailer Counting API", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_methods=["GET", "PUT"], allow_headers=["*"])


@app.get("/api/health")
def health():
    return {"status": "ok", "model": str(settings.model_path), "prompts": settings.prompts}


@app.get("/api/dashboard")
def dashboard():
    return state.snapshot()


@app.get("/api/config/cameras")
def get_camera_config():
    return [{**camera.model_dump(), "url": ""} for camera in settings.cameras]


@app.get("/api/discovery/cameras")
def discover_cameras():
    try:
        devices = discover_onvif_devices()
        return {"devices": devices, "protocol": "ONVIF WS-Discovery", "warning": None}
    except DiscoveryUnavailable as error:
        return {"devices": [], "protocol": "ONVIF WS-Discovery", "warning": str(error)}


@app.put("/api/config/cameras")
def put_camera_config(cameras: list[CameraConfig]):
    expected_ids = {camera["id"] for camera in state.snapshot()["cameras"]}
    if {camera.id for camera in cameras} != expected_ids:
        raise HTTPException(status_code=400, detail=f"Camera IDs must be {sorted(expected_ids)}")
    settings.camera_config_file.write_text(json.dumps([camera.model_dump() for camera in cameras], indent=2))
    stop_workers()
    start_workers(cameras)
    return {"status": "saved", "cameras": [{**camera.model_dump(), "url": ""} for camera in cameras]}


@app.get("/api/cameras/{camera_id}/stream")
def camera_stream(camera_id: int):
    if not any(camera.id == camera_id for camera in settings.cameras):
        raise HTTPException(status_code=404, detail="Unknown camera")

    async def frames():
        while True:
            frame = state.frame(camera_id)
            if frame:
                yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + frame + b"\r\n"
            await asyncio.sleep(.04)

    return StreamingResponse(frames(), media_type="multipart/x-mixed-replace; boundary=frame")


@app.websocket("/ws/dashboard")
async def dashboard_socket(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            await websocket.send_json(state.snapshot())
            await asyncio.sleep(.5)
    except (WebSocketDisconnect, RuntimeError):
        return
