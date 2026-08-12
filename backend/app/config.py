import json
from pathlib import Path

from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class CameraConfig(BaseModel):
    id: int
    name: str
    url: str = ""
    counting_line: tuple[float, float, float, float] = (0.1, 0.68, 0.9, 0.68)
    queue_zone: tuple[float, float, float, float] = (0.05, 0.2, 0.9, 0.48)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    model_path: Path = Path("/Users/ahmedbahaa/Downloads/yoloe-26x-seg.pt")
    detection_prompts: str = "semi-trailer truck,tractor-trailer truck,articulated truck"
    confidence: float = Field(default=0.35, ge=0, le=1)
    image_size: int = Field(default=960, ge=320)
    device: str = ""
    jpeg_quality: int = Field(default=82, ge=30, le=100)
    cameras_json: str = '[{"id":1,"name":"Camera 1","url":""},{"id":2,"name":"Camera 2","url":""},{"id":3,"name":"Camera 3","url":""}]'
    camera_config_file: Path = Path("cameras.local.json")

    @property
    def prompts(self) -> list[str]:
        return [prompt.strip() for prompt in self.detection_prompts.split(",") if prompt.strip()]

    @property
    def cameras(self) -> list[CameraConfig]:
        if self.camera_config_file.exists():
            return [CameraConfig.model_validate(item) for item in json.loads(self.camera_config_file.read_text())]
        return [CameraConfig.model_validate(item) for item in json.loads(self.cameras_json)]


settings = Settings()
