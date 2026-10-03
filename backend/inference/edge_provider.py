"""Edge Node Inference Provider for NutriFit.

Communicates with the RS PRO C100 (NVIDIA Jetson Nano) microservice over LAN.
Includes health check caching, network timeouts, and seamless fallback to local inference.
"""

import os
import time
import logging
from typing import Dict, Any, Optional
import requests

from .base import InferenceProvider
from .local_provider import LocalInferenceProvider

logger = logging.getLogger("nutrifit.inference.edge")


class EdgeNodeInferenceProvider(InferenceProvider):
    name = "edge_node"

    def __init__(
        self,
        base_url: Optional[str] = None,
        timeout: Optional[float] = None,
        fallback_enabled: Optional[bool] = None,
    ):
        self.base_url = (base_url or os.getenv("EDGE_NODE_URL", "http://localhost:8000")).rstrip("/")
        self.timeout = float(timeout or os.getenv("EDGE_NODE_TIMEOUT_SECONDS", "15"))
        self.fallback_enabled = (
            fallback_enabled
            if fallback_enabled is not None
            else os.getenv("EDGE_NODE_FALLBACK_TO_LOCAL", "true").lower() in ("true", "1", "yes")
        )
        self.local_fallback = LocalInferenceProvider() if self.fallback_enabled else None
        self._last_health_check_time = 0.0
        self._cached_health_status = False
        self._cached_telemetry = {}
        self._health_ttl_seconds = 10.0

    def is_available(self, force_check: bool = False) -> bool:
        """Check if the RS PRO C100 edge service is reachable with caching."""
        now = time.time()
        if not force_check and (now - self._last_health_check_time) < self._health_ttl_seconds:
            return self._cached_health_status

        try:
            resp = requests.get(f"{self.base_url}/health", timeout=2.0)
            if resp.status_code == 200:
                data = resp.json()
                self._cached_health_status = data.get("status") == "healthy"
                self._cached_telemetry = data
            else:
                self._cached_health_status = False
                self._cached_telemetry = {}
        except Exception as exc:
            logger.debug("Edge node at %s unreachable: %s", self.base_url, exc)
            self._cached_health_status = False
            self._cached_telemetry = {}

        self._last_health_check_time = now
        return self._cached_health_status

    def get_telemetry(self) -> Dict[str, Any]:
        """Return the latest cached hardware telemetry from the C100."""
        self.is_available()
        return self._cached_telemetry

    def process_portion(self, image_path: str, detections: Optional[Any] = None) -> Dict[str, Any]:
        """Send meal photo to RS PRO C100 for end-to-end 3D portion estimation."""
        if not self.is_available():
            if self.fallback_enabled:
                logger.warning(
                    "RS PRO C100 edge node (%s) unreachable. Gracefully falling back to local pipeline.",
                    self.base_url
                )
                from food_portion.pipeline import FoodPortionPipeline
                local_pipeline = FoodPortionPipeline()
                res = local_pipeline.process(image_path, initial_detections=detections)
                res["execution_target"] = "Local CPU Fallback"
                return res
            raise RuntimeError(f"Edge node at {self.base_url} is offline and fallback is disabled.")

        t_start = time.perf_counter()
        try:
            with open(image_path, "rb") as img_f:
                files = {"file": (os.path.basename(image_path), img_f, "image/jpeg")}
                data = {}
                if detections:
                    import json
                    data["detections"] = json.dumps(detections)
                resp = requests.post(
                    f"{self.base_url}/v1/portion/process",
                    files=files,
                    data=data,
                    timeout=self.timeout,
                )

            if resp.status_code == 200:
                result = resp.json()
                result["network_latency_ms"] = round((time.perf_counter() - t_start) * 1000 - result.get("duration_ms", 0), 1)
                return result

            raise RuntimeError(f"Edge node returned HTTP {resp.status_code}: {resp.text}")

        except Exception as exc:
            logger.error("Edge node execution error: %s", exc)
            if self.fallback_enabled:
                logger.warning("Falling back to local 3D pipeline after edge node error.")
                from food_portion.pipeline import FoodPortionPipeline
                local_pipeline = FoodPortionPipeline()
                res = local_pipeline.process(image_path)
                res["execution_target"] = "Local CPU Fallback (Edge Error)"
                return res
            raise

    def detect_and_segment(self, image_path: str) -> dict:
        """Fallback to detect_and_segment interface for legacy compatibility."""
        portion_res = self.process_portion(image_path)
        items = portion_res.get("items", [])
        segments = []
        for it in items:
            segments.append({
                "path": it.get("crop_path") or image_path,
                "label": it.get("class_name") or it.get("name") or "food",
                "confidence": it.get("confidence", 0.8),
            })
        return {
            "segments": segments,
            "segmented_image": portion_res.get("segmented_image"),
            "execution_target": portion_res.get("execution_target", "RS PRO C100"),
        }
