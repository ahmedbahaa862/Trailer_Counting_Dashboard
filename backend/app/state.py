from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from threading import RLock
from typing import Any


class DashboardState:
    def __init__(self, cameras: list[Any]) -> None:
        self._lock = RLock()
        self._frames: dict[int, bytes] = {}
        self._state = {
            "type": "dashboard.snapshot",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "cameras": [self._empty_camera(camera) for camera in cameras],
            "traffic": {"day": 0, "dayChange": 0, "month": 0, "monthChange": 0, "utilization": 0},
        }

    @staticmethod
    def _empty_camera(camera: Any) -> dict[str, Any]:
        return {
            "id": camera.id, "name": camera.name, "connected": False,
            "detectedTrucks": 0, "queueCount": 0, "entered": 0, "exited": 0,
            "fps": 0, "detections": [], "error": None,
        }

    def update_camera(self, camera_id: int, **changes: Any) -> None:
        with self._lock:
            camera = next(item for item in self._state["cameras"] if item["id"] == camera_id)
            camera.update(changes)
            self._refresh_traffic()

    def set_frame(self, camera_id: int, frame: bytes) -> None:
        with self._lock:
            self._frames[camera_id] = frame

    def frame(self, camera_id: int) -> bytes | None:
        with self._lock:
            return self._frames.get(camera_id)

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            self._state["timestamp"] = datetime.now(timezone.utc).isoformat()
            return deepcopy(self._state)

    def _refresh_traffic(self) -> None:
        cameras = self._state["cameras"]
        entered = sum(camera["entered"] for camera in cameras)
        exited = sum(camera["exited"] for camera in cameras)
        connected = sum(bool(camera["connected"]) for camera in cameras)
        active = sum(camera["detectedTrucks"] for camera in cameras)
        self._state["traffic"].update({
            "day": entered + exited,
            "month": entered + exited,
            "utilization": min(100, round((active / max(connected * 20, 1)) * 100)),
        })
