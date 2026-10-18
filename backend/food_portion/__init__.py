"""Food Portion Estimation System Package."""

from .pipeline import FoodPortionPipeline
from .optimized_pipeline import OptimizedFoodPortionPipeline
from .factory import get_food_portion_pipeline, get_active_pipeline_mode, set_active_pipeline_mode
from .detection.yolo_detector import FoodDetector, Detection
from .detection.high_recall_detector import HighRecallFoodDetector
from .segmentation.sam_segmenter import FoodSegmenter, FoodInstance
from .calibration.scale_estimator import ScaleEstimator, ScaleCalibration
from .depth.depth_estimator import DepthEstimator
from .depth.metric_depth_estimator import MetricDepthEstimator
from .geometry.volume_estimator import VolumeEstimator
from .occlusion.occlusion_detector import OcclusionDetector
from .nutrition.mass_estimator import MassEstimator
from .uncertainty.confidence import ConfidenceEstimator
from .gemini.validator import GeminiValidator

__all__ = [
    "FoodPortionPipeline",
    "OptimizedFoodPortionPipeline",
    "get_food_portion_pipeline",
    "get_active_pipeline_mode",
    "set_active_pipeline_mode",
    "FoodDetector",
    "HighRecallFoodDetector",
    "Detection",
    "FoodSegmenter",
    "FoodInstance",
    "ScaleEstimator",
    "ScaleCalibration",
    "DepthEstimator",
    "MetricDepthEstimator",
    "VolumeEstimator",
    "OcclusionDetector",
    "MassEstimator",
    "ConfidenceEstimator",
    "GeminiValidator",
]
