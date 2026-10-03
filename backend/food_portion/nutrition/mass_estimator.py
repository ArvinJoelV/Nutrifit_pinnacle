"""Food mass estimation and regression feature extraction."""

from typing import Dict, List, Optional
import numpy as np
from ..segmentation.sam_segmenter import FoodInstance
from ..calibration.scale_estimator import ScaleCalibration
from .density import get_food_density


class MassEstimator:
    """Estimates food portion mass in grams using physics-grounded volume and empirical density."""

    def __init__(self):
        pass

    def predict(
        self,
        instance: FoodInstance,
        calibration: ScaleCalibration,
    ) -> float:
        """Calculates mass in grams for a segmented food instance."""
        volume_cm3 = instance.volume_cm3 or 0.0
        density = get_food_density(instance.food_class)

        raw_mass_g = volume_cm3 * density

        # Apply realistic culinary boundaries (avoid absurd fractions or impossible plate portions)
        mass_g = round(float(np.clip(raw_mass_g, 10.0, 1200.0)), 1)
        instance.mass_g = mass_g
        instance.density_g_cm3 = density
        return mass_g

    def extract_feature_vector(
        self,
        instance: FoodInstance,
        calibration: ScaleCalibration,
        class_to_id_map: Optional[Dict[str, int]] = None
    ) -> List[float]:
        """Extracts numerical features suitable for training or inferencing regression models."""
        food_name = instance.food_class.lower()
        class_id = float((class_to_id_map or {}).get(food_name, 0))

        cm_per_px = calibration.cm_per_pixel
        x1, y1, x2, y2 = instance.bbox
        bbox_w_cm = float((x2 - x1) * cm_per_px)
        bbox_h_cm = float((y2 - y1) * cm_per_px)

        depth_stats = instance.depth_stats or {}
        mean_h = float(depth_stats.get("mean", 1.0))
        max_h = float(depth_stats.get("max", 1.0))

        return [
            class_id,
            float(instance.visible_area_cm2),
            float(instance.estimated_total_area_cm2 or instance.visible_area_cm2),
            float(instance.volume_cm3 or 0.0),
            mean_h,
            max_h,
            float(instance.occlusion_probability),
            bbox_w_cm,
            bbox_h_cm,
        ]
