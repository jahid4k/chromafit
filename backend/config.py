import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Testing
    mock_vision: bool = False

    # vLLM
    vllm_host: str = "165.245.143.209"
    vllm_port: int = 8000
    vllm_model: str = "/root/models/qwen2.5-vl-7b"

    # MongoDB
    mongodb_url: str = "mongodb+srv://outfit_projectsjahid4k_db_user:399diWbAEiFd9cJS@outfitcluster0.5obqpwn.mongodb.net/outfit?appName=OutfitCluster0"
    mongodb_db_name: str = "outfit"

    # Cloudinary
    cloudinary_cloud_name: str = "dwk7nwjui"
    cloudinary_api_key: str = "641216839599256"
    cloudinary_api_secret: str = "DlSPVxRzyDPXHK8kHOTpSsnKbP0"
    cloudinary_folder: str = "chromafit"

    # App
    app_name: str = "Chromafit Backend"
    app_env: str = "development"
    log_level: str = "INFO"
    max_images_per_request: int = 10
    max_image_size_mb: int = 5

    @property
    def vllm_base_url(self) -> str:
        return f"http://{self.vllm_host}:{self.vllm_port}/v1"

    @property
    def max_image_size_bytes(self) -> int:
        return self.max_image_size_mb * 1024 * 1024


settings = Settings()