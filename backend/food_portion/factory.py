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
    if cleaned in ("legacy", "v1", "classic"):
        _CURRENT_DEFAULT_MODE = "legacy"
    elif cleaned in ("optimized", "v2", "nextgen"):
        _CURRENT_DEFAULT_MODE = "optimized"
    else:
        raise ValueError(f"Unknown pipeline mode '{mode}'. Choose 'legacy' or 'optimized'.")
    logger.info("Default food portion pipeline mode changed to: %s", _CURRENT_DEFAULT_MODE)
    return _CURRENT_DEFAULT_MODE


def get_food_portion_pipeline(
    mode: Optional[str] = None,
    gemini_validator: Optional[Any] = None,
    **kwargs,
) -> Union[FoodPortionPipeline, OptimizedFoodPortionPipeline]:
    """Instantiates and returns either the Legacy or Optimized pipeline instance.
    
    Args:
        mode: Explicit mode ('legacy' or 'optimized'). If None, uses the active default.
        gemini_validator: Optional GeminiValidator instance.
        **kwargs: Passed to pipeline constructor.
    """
    target_mode = (mode or _CURRENT_DEFAULT_MODE).strip().lower()

    if target_mode in ("legacy", "v1", "classic"):
        logger.info("Initializing FoodPortionPipeline (Legacy Mode)")
        return FoodPortionPipeline(gemini_validator=gemini_validator, **kwargs)
    elif target_mode in ("optimized", "v2", "nextgen"):
        logger.info("Initializing OptimizedFoodPortionPipeline (Optimized Mode)")
        return OptimizedFoodPortionPipeline(gemini_validator=gemini_validator, **kwargs)
    else:
        logger.warning("Unrecognized mode '%s', defaulting to Optimized pipeline", target_mode)
        return OptimizedFoodPortionPipeline(gemini_validator=gemini_validator, **kwargs)
