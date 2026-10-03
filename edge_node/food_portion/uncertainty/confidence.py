"""Uncertainty quantification and prediction interval calibration."""

from typing import Tuple, Dict, Any, List
import numpy as np
from ..config import UNCERTAINTY_WEIGHTS
from ..segmentation.sam_segmenter import FoodInstance
from ..calibration.scale_estimator import ScaleCalibration


class ConfidenceEstimator:
    """Estimates prediction uncertainty and mass confidence intervals."""

    def __init__(self):
        self.weights = UNCERTAINTY_WEIGHTS

    def evaluate_instance(
        self,
        instance: FoodInstance,
        calibration: ScaleCalibration,
    ) -> float:
        """Computes overall confidence score C in [0, 1] and populates mass_range_g."""
        det_conf = float(instance.detection_confidence or 0.70)
        seg_conf = float(instance.segmentation_confidence or 0.75)
        scale_conf = float(calibration.confidence or 0.60)
        p_occ = float(instance.occlusion_probability or 0.0)

        # Depth consistency proxy: high depth std compared to mean can indicate rough/noisy surface
        depth_stats = instance.depth_stats or {}
        depth_std = depth_stats.get("std", 0.3)
        depth_mean = max(0.5, depth_stats.get("mean", 1.5))
        depth_conf = float(np.clip(1.0 - (depth_std / (depth_mean + 0.5)), 0.3, 0.95))

        uncertainty = (
            self.weights["detection"] * (1.0 - det_conf) +
            self.weights["segmentation"] * (1.0 - seg_conf) +
            self.weights["depth"] * (1.0 - (depth_conf * scale_conf)) +
            self.weights["occlusion"] * p_occ
        )
        uncertainty = float(np.clip(uncertainty, 0.05, 0.85))

        confidence = round(float(np.clip(1.0 - uncertainty, 0.15, 0.95)), 2)
        instance.confidence = confidence

        # Calculate calibrated prediction range [lower_g, upper_g]
        mass = instance.mass_g or 50.0
        margin_pct = max(0.12, min(0.45, uncertainty * 0.75))
        lower_g = max(5, int(round(mass * (1.0 - margin_pct))))
        upper_g = int(round(mass * (1.0 + margin_pct)))

        instance.mass_range_g = (lower_g, upper_g)
        return confidence

    def assess_scene(
        self,
        instances: List[FoodInstance],
        calibration: ScaleCalibration
    ) -> Dict[str, Any]:
        """Assesses overall scene confidence and determines if a better photo is recommended."""
        if not instances:
            return {
                "overall_confidence": 0.0,
                "needs_better_image": True,
                "reason": "No food items clearly identified",
                "instruction": "Please place your food in good lighting and capture the whole plate."
            }

        avg_conf = float(np.mean([inst.confidence for inst in instances]))
        max_occ = float(max([inst.occlusion_probability for inst in instances]))

        needs_better_image = False
        reason = ""
        instruction = ""

        if avg_conf < 0.52:
            needs_better_image = True
            if max_occ > 0.55:
                reason = "Heavy food overlap or occlusion detected"
                instruction = "Take another photo from a higher 45°–60° top-angled viewpoint to see hidden portions."
            elif not calibration.plate_detected:
                reason = "Plate rim not clearly defined"
                instruction = "Ensure the entire circular or rectangular plate edge is visible in the frame."
            else:
                reason = "Low lighting or indistinct food boundaries"
                instruction = "Take a clearer photo with brighter direct lighting."

        return {
            "overall_confidence": round(avg_conf, 2),
            "needs_better_image": needs_better_image,
            "reason": reason,
            "instruction": instruction,
        }
