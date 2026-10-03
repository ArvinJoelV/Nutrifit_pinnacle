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
        logger.info("Initializing Edge Food Portion Pipeline on C100...")

        from food_portion.detection.yolo_detector import FoodDetector
        from food_portion.segmentation.sam_segmenter import FoodSegmenter
        from food_portion.calibration.scale_estimator import ScaleEstimator
        from food_portion.depth.depth_estimator import DepthEstimator
        from food_portion.geometry.volume_estimator import VolumeEstimator
        from food_portion.occlusion.occlusion_detector import OcclusionDetector
        from food_portion.nutrition.mass_estimator import MassEstimator
        from food_portion.uncertainty.confidence import ConfidenceEstimator
        from food_portion.pipeline import FoodPortionPipeline

        detector = FoodDetector(model_path=self.yolo_model_path)
        segmenter = FoodSegmenter()
        scale_estimator = ScaleEstimator()
        depth_estimator = DepthEstimator()
        volume_estimator = VolumeEstimator()
        occlusion_detector = OcclusionDetector()
        mass_estimator = MassEstimator()
        confidence_estimator = ConfidenceEstimator()

        self.pipeline = FoodPortionPipeline(
            detector=detector,
            segmenter=segmenter,
            scale_estimator=scale_estimator,
            depth_estimator=depth_estimator,
            volume_estimator=volume_estimator,
            occlusion_detector=occlusion_detector,
            mass_estimator=mass_estimator,
            confidence_estimator=confidence_estimator,
            gemini_validator=None,  # Validation runs on NutriFit cloud backend
        )

        self._initialized = True
        logger.info("Edge Pipeline initialized in %.2f ms", (time.perf_counter() - t0) * 1000)

    def process_image(self, image_np: np.ndarray, initial_detections: Optional[Any] = None) -> Dict[str, Any]:
        """Execute the 3D physical estimation pipeline on an input image ndarray."""
        if not self._initialized:
            self.initialize()

        t_start = time.perf_counter()
        raw_result = self.pipeline.process(image_np, initial_detections=initial_detections)
        duration_ms = round((time.perf_counter() - t_start) * 1000, 1)

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
