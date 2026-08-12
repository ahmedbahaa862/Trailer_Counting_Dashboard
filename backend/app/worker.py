from __future__ import annotations

import logging
import threading
import time
from collections import defaultdict

import cv2
from ultralytics import YOLOE

from .config import CameraConfig, Settings
from .state import DashboardState

LOGGER = logging.getLogger(__name__)


class CameraWorker(threading.Thread):
    def __init__(self, camera: CameraConfig, config: Settings, state: DashboardState) -> None:
        super().__init__(name=f"camera-{camera.id}", daemon=True)
        self.camera = camera
        self.config = config
        self.state = state
        self.stop_event = threading.Event()
        self.previous_sides: dict[int, float] = {}
        self.counted: set[tuple[int, str]] = set()
        self.entered = 0
        self.exited = 0

    def stop(self) -> None:
        self.stop_event.set()

    def run(self) -> None:
        if not self.camera.url:
            self.state.update_camera(self.camera.id, connected=False, error="Camera URL is not configured")
            return
        try:
            model = YOLOE(str(self.config.model_path))
            model.set_classes(self.config.prompts)
        except Exception as error:
            LOGGER.exception("Unable to initialize YOLOE for %s", self.camera.name)
            self.state.update_camera(self.camera.id, connected=False, error=str(error))
            return

        while not self.stop_event.is_set():
            capture = cv2.VideoCapture(self.camera.url, cv2.CAP_FFMPEG)
            if not capture.isOpened():
                self.state.update_camera(self.camera.id, connected=False, error="Unable to open camera stream")
                capture.release()
                self.stop_event.wait(3)
                continue
            self.state.update_camera(self.camera.id, connected=True, error=None)
            self._process_stream(capture, model)
            capture.release()
            self.state.update_camera(self.camera.id, connected=False)
            self.stop_event.wait(1)

    def _process_stream(self, capture: cv2.VideoCapture, model: YOLOE) -> None:
        last_tick = time.perf_counter()
        smoothed_fps = 0.0
        while not self.stop_event.is_set():
            ok, frame = capture.read()
            if not ok:
                return
            kwargs = {
                "persist": True, "tracker": "bytetrack.yaml", "conf": self.config.confidence,
                "imgsz": self.config.image_size, "verbose": False,
            }
            if self.config.device:
                kwargs["device"] = self.config.device
            result = model.track(frame, **kwargs)[0]
            detections = self._detections(result, frame.shape[1], frame.shape[0])
            self._update_counts(detections)
            queue_count = self._queue_count(detections)
            annotated = result.plot()
            self._draw_regions(annotated)
            now = time.perf_counter()
            instant_fps = 1 / max(now - last_tick, 1e-6)
            smoothed_fps = instant_fps if not smoothed_fps else smoothed_fps * .85 + instant_fps * .15
            last_tick = now
            success, encoded = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, self.config.jpeg_quality])
            if success:
                self.state.set_frame(self.camera.id, encoded.tobytes())
            self.state.update_camera(
                self.camera.id, connected=True, detectedTrucks=len(detections), queueCount=queue_count,
                entered=self.entered, exited=self.exited, fps=round(smoothed_fps, 1), detections=detections, error=None,
            )

    @staticmethod
    def _detections(result: object, width: int, height: int) -> list[dict]:
        boxes = getattr(result, "boxes", None)
        if boxes is None or boxes.id is None:
            return []
        output = []
        for xyxy, confidence, track_id in zip(boxes.xyxy.cpu().tolist(), boxes.conf.cpu().tolist(), boxes.id.int().cpu().tolist()):
            x1, y1, x2, y2 = xyxy
            output.append({
                "trackId": track_id, "label": "semi_trailer", "confidence": round(float(confidence), 3),
                "bbox": [x1 / width, y1 / height, (x2 - x1) / width, (y2 - y1) / height],
            })
        return output

    def _update_counts(self, detections: list[dict]) -> None:
        x1, y1, x2, y2 = self.camera.counting_line
        for detection in detections:
            x, y, width, height = detection["bbox"]
            center_x, center_y = x + width / 2, y + height / 2
            side = (x2 - x1) * (center_y - y1) - (y2 - y1) * (center_x - x1)
            track_id = detection["trackId"]
            previous = self.previous_sides.get(track_id)
            if previous is not None and previous * side < 0:
                direction = "IN" if previous < side else "OUT"
                marker = (track_id, direction)
                if marker not in self.counted:
                    self.counted.add(marker)
                    if direction == "IN": self.entered += 1
                    else: self.exited += 1
            self.previous_sides[track_id] = side

    def _queue_count(self, detections: list[dict]) -> int:
        zx, zy, zw, zh = self.camera.queue_zone
        return sum(zx <= x + width / 2 <= zx + zw and zy <= y + height / 2 <= zy + zh for x, y, width, height in (item["bbox"] for item in detections))

    def _draw_regions(self, frame) -> None:
        height, width = frame.shape[:2]
        x1, y1, x2, y2 = self.camera.counting_line
        cv2.line(frame, (int(x1 * width), int(y1 * height)), (int(x2 * width), int(y2 * height)), (255, 240, 0), 2)
        x, y, w, h = self.camera.queue_zone
        cv2.rectangle(frame, (int(x * width), int(y * height)), (int((x + w) * width), int((y + h) * height)), (0, 220, 255), 2)
