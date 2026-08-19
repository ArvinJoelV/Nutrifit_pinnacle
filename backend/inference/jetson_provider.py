import logging
import os
import requests

from .base import InferenceProvider
from .local_provider import LocalInferenceProvider

logger = logging.getLogger(__name__)


class JetsonInferenceProvider(InferenceProvider):
    name = "jetson"

    def __init__(self, endpoint_url: str | None = None, fallback_to_local: bool = True, timeout: int = 10):
        self.endpoint_url = endpoint_url or os.getenv("JETSON_INFERENCE_URL", "http://localhost:9000/detect-segment")
        self.fallback_to_local = fallback_to_local
        self.timeout = timeout
        self._local_fallback = LocalInferenceProvider()

    def detect_and_segment(self, image_path: str) -> dict:
        """Sends image to Jetson C100 Edge server via HTTP POST. Fallbacks to local inference if unreachable."""
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image not found at path: {image_path}")

        try:
            logger.info("Sending image to Jetson C100 Edge Server at %s...", self.endpoint_url)
            with open(image_path, "rb") as img_file:
                files = {"file": (os.path.basename(image_path), img_file, "image/jpeg")}
                response = requests.post(self.endpoint_url, files=files, timeout=self.timeout)

            if response.status_code == 200:
                data = response.json()
                segments = data.get("segments", [])
                segmented_image = data.get("segmented_image")
                telemetry = data.get("telemetry", {})
                logger.info(
                    "Jetson C100 inference success | fps=%.2f | total_ms=%d",
                    telemetry.get("fps", 0),
                    telemetry.get("total_ms", 0),
                )
                return {
                    "segments": segments,
                    "segmented_image": segmented_image,
                    "provider": "jetson",
                    "telemetry": telemetry,
                }

            logger.warning("Jetson server returned HTTP %d: %s", response.status_code, response.text)
        except Exception as exc:
            logger.warning("Failed to reach Jetson C100 Edge Server (%s): %s", self.endpoint_url, str(exc))

        if self.fallback_to_local:
            logger.info("Executing graceful fallback to LocalInferenceProvider...")
            result = self._local_fallback.detect_and_segment(image_path)
            result["provider"] = "local_fallback"
            return result

        raise RuntimeError(f"Jetson C100 edge inference failed and fallback is disabled.")
