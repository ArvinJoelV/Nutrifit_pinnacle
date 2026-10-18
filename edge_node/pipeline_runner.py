"""Edge Pipeline Runner for RS PRO C100.

Runs the physics-grounded 3D food portion estimation pipeline on-device.
Optimized for the Jetson Nano GPU with hardware acceleration.
"""

import os
import sys
import time
import logging
from typing import Dict, Any, Optional
import cv2
import numpy as np

# Ensure current edge_node dir and backend package can be imported
current_dir = os.path.abspath(os.path.dirname(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)
backend_dir = os.path.abspath(os.path.join(current_dir, "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

logger = logging.getLogger("edge_node.pipeline")


class EdgePipelineRunner:
    """Wraps and executes the 3D food portion pipeline on the RS PRO C100."""

    def __init__(self, yolo_model_path: Optional[str] = None):
        self._initialized = False
        self.pipeline = None
        self.yolo_model_path = yolo_model_path

    def initialize(self):
        """Lazy initialization of models to keep edge startup rapid."""
        if self._initialized:
            return

        t0 = time.perf_counter()
        from food_portion.factory import get_food_portion_pipeline
        self.pipeline = get_food_portion_pipeline(mode=self.pipeline_mode)
        self._initialized = True
        logger.info("Edge Pipeline (%s) initialized in %.2f ms", getattr(self.pipeline, "pipeline_mode", "legacy"), (time.perf_counter() - t0) * 1000)

    def process_image(self, image_np: np.ndarray, initial_detections: Optional[Any] = None) -> Dict[str, Any]:
        """Execute the 3D physical estimation pipeline on an input image ndarray."""
        if not self._initialized:
            self.initialize()

        t_start = time.perf_counter()
        raw_result = self.pipeline.process(image_np, initial_detections=initial_detections)
        duration_ms = round((time.perf_counter() - t_start) * 1000, 1)
        logger.info("Pipeline execution completed in %.1f ms | Total Mass: %.1f g | Items: %d",
                    duration_ms, raw_result.get("total_mass_g", 0.0), len(raw_result.get("items", [])))

        return {
            "success": True,
            "execution_target": "RS PRO C100 (NVIDIA Jetson Nano)",
            "duration_ms": duration_ms,
            "total_mass_g": raw_result.get("total_mass_g", 0.0),
            "items": raw_result.get("items", []),
            "scale_calibration": raw_result.get("scale_calibration", {}),
            "scene_assessment": raw_result.get("scene_assessment", {}),
            "pipeline_trace": raw_result.get("pipeline_trace", []),
            "segmented_image": raw_result.get("segmented_image"),
        }
