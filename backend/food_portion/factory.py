"""Pipeline Factory and Runtime Switcher for NutriFit.

Enables seamless switching between:
- "legacy": The original FoodPortionPipeline (YOLOv8 + SAM2 + morphological depth heuristic).
- "optimized": The next-gen OptimizedFoodPortionPipeline (HighRecallFoodDetector + Soft-NMS + RANSAC Metric Depth + concurrency).
"""

import os
import logging
from typing import Optional, Any, Union

from .pipeline import FoodPortionPipeline
from .optimized_pipeline import OptimizedFoodPortionPipeline

logger = logging.getLogger("nutrifit.food_portion.factory")

_CURRENT_DEFAULT_MODE = os.getenv("FOOD_PIPELINE_MODE", "optimized").lower()


def get_active_pipeline_mode() -> str:
    """Returns the globally configured active pipeline mode ('legacy' or 'optimized')."""
    return _CURRENT_DEFAULT_MODE


def set_active_pipeline_mode(mode: str) -> str:
    """Dynamically updates the default active pipeline mode at runtime."""
    global _CURRENT_DEFAULT_MODE
    cleaned = mode.strip().lower()
    if cleaned in ("legacy", "v1", "classic", "edge", "edge_node", "c100"):
        _CURRENT_DEFAULT_MODE = "legacy"
    elif cleaned in ("optimized", "v2", "nextgen", "local", "server"):
        _CURRENT_DEFAULT_MODE = "optimized"
    else:
        raise ValueError(f"Unknown pipeline mode '{mode}'. Choose 'local' or 'edge'.")
    logger.info("Default food portion pipeline mode changed to: %s", _CURRENT_DEFAULT_MODE)
    return _CURRENT_DEFAULT_MODE


def get_food_portion_pipeline(
    mode: Optional[str] = None,
    gemini_validator: Optional[Any] = None,
    **kwargs,
) -> Union[FoodPortionPipeline, OptimizedFoodPortionPipeline]:
    """Instantiates and returns either the Edge (Legacy) or Local (Optimized) pipeline instance.
    
    Args:
        mode: Explicit mode ('local', 'edge', 'legacy' or 'optimized'). If None, uses active default.
        gemini_validator: Optional GeminiValidator instance.
        **kwargs: Passed to pipeline constructor.
    """
    target_mode = (mode or _CURRENT_DEFAULT_MODE).strip().lower()

    if target_mode in ("legacy", "v1", "classic", "edge", "edge_node", "c100"):
        logger.info("Initializing FoodPortionPipeline (Edge / Legacy Mode)")
        from .segmentation.sam_segmenter import FoodSegmenter
        if "segmenter" not in kwargs:
            kwargs["segmenter"] = FoodSegmenter(prefer_yolo_seg=False)
        return FoodPortionPipeline(gemini_validator=gemini_validator, **kwargs)
    elif target_mode in ("optimized", "v2", "nextgen", "local", "server"):
        logger.info("Initializing OptimizedFoodPortionPipeline (Local Server Mode with YOLO11-Seg + Depth-Anything-V2)")
        from .segmentation.sam_segmenter import FoodSegmenter
        from .depth.metric_depth_estimator import MetricDepthEstimator
        from .detection.high_recall_detector import HighRecallFoodDetector
        if "detector" not in kwargs:
            kwargs["detector"] = HighRecallFoodDetector()
        if "segmenter" not in kwargs:
            kwargs["segmenter"] = FoodSegmenter(prefer_yolo_seg=True, yolo_seg_model="yolo11s-seg.pt")
        if "depth_estimator" not in kwargs:
            kwargs["depth_estimator"] = MetricDepthEstimator(model_name="depth_anything_v2_small")
        return OptimizedFoodPortionPipeline(gemini_validator=gemini_validator, **kwargs)
    else:
        logger.warning("Unrecognized mode '%s', defaulting to Optimized pipeline", target_mode)
        from .segmentation.sam_segmenter import FoodSegmenter
        from .depth.metric_depth_estimator import MetricDepthEstimator
        from .detection.high_recall_detector import HighRecallFoodDetector
        if "detector" not in kwargs:
            kwargs["detector"] = HighRecallFoodDetector()
        if "segmenter" not in kwargs:
            kwargs["segmenter"] = FoodSegmenter(prefer_yolo_seg=True, yolo_seg_model="yolo11s-seg.pt")
        if "depth_estimator" not in kwargs:
            kwargs["depth_estimator"] = MetricDepthEstimator(model_name="depth_anything_v2_small")
        return OptimizedFoodPortionPipeline(gemini_validator=gemini_validator, **kwargs)
