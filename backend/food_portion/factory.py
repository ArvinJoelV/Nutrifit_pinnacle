"""Pipeline Factory and Runtime Switcher for NutriFit.

Enables seamless switching between:
- "legacy" / "edge": The original FoodPortionPipeline (YOLOv8 + SAM2 + morphological depth heuristic).
- "optimized" / "local": The next-gen OptimizedFoodPortionPipeline (HighRecallFoodDetector + Soft-NMS + RANSAC Metric Depth + concurrency).

Includes singleton in-memory caching to eliminate the 20-second model loading delay on every request.
"""

import os
import logging
from typing import Optional, Any, Union

from .pipeline import FoodPortionPipeline
from .optimized_pipeline import OptimizedFoodPortionPipeline

logger = logging.getLogger("nutrifit.food_portion.factory")

_CURRENT_DEFAULT_MODE = os.getenv("FOOD_PIPELINE_MODE", "optimized").lower()

# Singleton in-memory instances to keep PyTorch weights warm across requests
_CACHED_LOCAL_PIPELINE: Optional[OptimizedFoodPortionPipeline] = None
_CACHED_EDGE_PIPELINE: Optional[FoodPortionPipeline] = None


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
    force_new: bool = False,
    **kwargs,
) -> Union[FoodPortionPipeline, OptimizedFoodPortionPipeline]:
    """Instantiates and returns either the Edge (Legacy) or Local (Optimized) pipeline instance.
    
    Reuses in-memory singleton instances so PyTorch weights are loaded once,
    reducing subsequent request latency from ~30s down to ~4-6s.
    
    Args:
        mode: Explicit mode ('local', 'edge', 'legacy' or 'optimized'). If None, uses active default.
        gemini_validator: Optional GeminiValidator instance.
        force_new: If True, forces fresh instantiation.
        **kwargs: Passed to pipeline constructor.
    """
    global _CACHED_LOCAL_PIPELINE, _CACHED_EDGE_PIPELINE
    target_mode = (mode or _CURRENT_DEFAULT_MODE).strip().lower()

    if target_mode in ("legacy", "v1", "classic", "edge", "edge_node", "c100"):
        if not force_new and _CACHED_EDGE_PIPELINE is not None and not kwargs:
            if gemini_validator is not None:
                _CACHED_EDGE_PIPELINE.gemini_validator = gemini_validator
            return _CACHED_EDGE_PIPELINE

        logger.info("Initializing FoodPortionPipeline (Edge / Legacy Mode)")
        from .segmentation.sam_segmenter import FoodSegmenter
        if "segmenter" not in kwargs:
            kwargs["segmenter"] = FoodSegmenter(prefer_yolo_seg=False)
        instance = FoodPortionPipeline(gemini_validator=gemini_validator, **kwargs)
        if not kwargs:
            _CACHED_EDGE_PIPELINE = instance
        return instance

    else:
        # Local / Optimized Pipeline (High-Accuracy Neural Core)
        if not force_new and _CACHED_LOCAL_PIPELINE is not None and not kwargs:
            if gemini_validator is not None:
                _CACHED_LOCAL_PIPELINE.gemini_validator = gemini_validator
            return _CACHED_LOCAL_PIPELINE

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
        instance = OptimizedFoodPortionPipeline(gemini_validator=gemini_validator, **kwargs)
        if not kwargs:
            _CACHED_LOCAL_PIPELINE = instance
        return instance


def warmup_pipelines(preload_edge: bool = False):
    """Pre-warms pipeline weights at server startup to prevent cold-start latency on first user request."""
    logger.info("Pre-warming Optimized Local Food Portion Pipeline weights...")
    try:
        get_food_portion_pipeline("local")
        logger.info("Local Food Portion Pipeline pre-warmed successfully and resident in RAM.")
    except Exception as exc:
        logger.warning("Pipeline pre-warming encountered an error: %s", exc)

    if preload_edge:
        try:
            get_food_portion_pipeline("edge")
        except Exception as exc:
            logger.debug("Edge pipeline preload skipped: %s", exc)
