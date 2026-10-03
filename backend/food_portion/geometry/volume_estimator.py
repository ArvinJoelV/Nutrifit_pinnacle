"""Food-specific 3D volume estimation strategies."""

from abc import ABC, abstractmethod
from typing import Optional
import numpy as np
import cv2
from ..config import (
    FOOD_CATEGORIES,
    SHAPE_FACTORS,
    FLAT_FOOD_THICKNESS_CM,
)
from ..segmentation.sam_segmenter import FoodInstance
from ..calibration.scale_estimator import ScaleCalibration


class BaseVolumeEstimator(ABC):
    @abstractmethod
    def estimate(
        self,
        instance: FoodInstance,
        depth_map: np.ndarray,
        calibration: ScaleCalibration,
    ) -> float:
        """Estimates volume in cubic centimeters (cm^3)."""
        pass


class PileVolumeEstimator(BaseVolumeEstimator):
    """Models piled/heaped foods (rice, biryani, poha, fries, salad).

    Volume = footprint_area_cm2 * mean_height_cm * shape_factor
    """

    def estimate(
        self,
        instance: FoodInstance,
        depth_map: np.ndarray,
        calibration: ScaleCalibration,
    ) -> float:
        food_name = instance.food_class.lower()
        shape_factor = SHAPE_FACTORS.get(food_name, SHAPE_FACTORS.get("pile", 0.72))

        area_cm2 = instance.estimated_total_area_cm2 or instance.visible_area_cm2
        depth_stats = instance.depth_stats or {}
        mean_height_cm = float(depth_stats.get("mean", 1.8))

        # Clamp mean height to physically sensible ranges for dining plates
        mean_height_cm = max(0.8, min(5.5, mean_height_cm))

        volume_cm3 = area_cm2 * mean_height_cm * shape_factor
        return float(max(10.0, volume_cm3))


class FlatFoodVolumeEstimator(BaseVolumeEstimator):
    """Models flat breads, dosas, pancakes, and flat slices.

    Volume = surface_area_cm2 * thickness_cm
    """

    def estimate(
        self,
        instance: FoodInstance,
        depth_map: np.ndarray,
        calibration: ScaleCalibration,
    ) -> float:
        food_name = instance.food_class.lower()
        thickness_cm = FLAT_FOOD_THICKNESS_CM.get(food_name, 0.40)

        area_cm2 = instance.estimated_total_area_cm2 or instance.visible_area_cm2
        volume_cm3 = area_cm2 * thickness_cm
        return float(max(5.0, volume_cm3))


class LiquidVolumeEstimator(BaseVolumeEstimator):
    """Models gravies, dals, curries, sambar, and liquids in bowls.

    Assumes a truncated conical or spherical cap bowl container.
    """

    def estimate(
        self,
        instance: FoodInstance,
        depth_map: np.ndarray,
        calibration: ScaleCalibration,
    ) -> float:
        area_cm2 = instance.estimated_total_area_cm2 or instance.visible_area_cm2

        # Effective radius of the visible liquid pool
        effective_radius_cm = np.sqrt(max(1.0, area_cm2) / np.pi)
        # Depth is typically proportional to container radius (e.g. bowl depth ~ 0.5 - 0.7 * radius)
        estimated_depth_cm = min(4.5, max(1.2, effective_radius_cm * 0.65))

        # Truncated cone / parabolic bowl approximation: V = 0.60 * pi * r^2 * h
        volume_cm3 = 0.60 * np.pi * (effective_radius_cm ** 2) * estimated_depth_cm
        return float(max(15.0, volume_cm3))


class PieceFoodVolumeEstimator(BaseVolumeEstimator):
    """Models piece-based discrete foods (chicken pieces, eggs, idli, fruit, patties).

    Approximated as a triaxial ellipsoid or voxel surface integration.
    """

    def estimate(
        self,
        instance: FoodInstance,
        depth_map: np.ndarray,
        calibration: ScaleCalibration,
    ) -> float:
        mask = instance.visible_mask
        if mask is None or np.sum(mask) == 0:
            return 50.0

        # Fit oriented bounding box to get length & width in pixels
        contours, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return 50.0

        largest_cnt = max(contours, key=cv2.contourArea)
        rect = cv2.minAreaRect(largest_cnt)
        (_, _), (dim1, dim2), _ = rect

        cm_per_px = calibration.cm_per_pixel
        length_cm = max(dim1, dim2) * cm_per_px
        width_cm = max(0.5, min(dim1, dim2) * cm_per_px)

        depth_stats = instance.depth_stats or {}
        height_cm = float(depth_stats.get("max", 0.0) - depth_stats.get("min", 0.0))
        if height_cm < 0.6:
            # Fallback height proportional to width
            height_cm = width_cm * 0.65

        height_cm = min(8.0, max(1.0, height_cm))

        # Triaxial ellipsoid: V = (4/3) * pi * (a/2) * (b/2) * (c/2)
        # Corrected by mask solidity factor
        area_cnt = cv2.contourArea(largest_cnt)
        box_area = max(1.0, dim1 * dim2)
        solidity = min(1.0, max(0.6, area_cnt / box_area))

        volume_cm3 = (4.0 / 3.0) * np.pi * (length_cm / 2.0) * (width_cm / 2.0) * (height_cm / 2.0) * solidity
        return float(max(8.0, volume_cm3))


class VolumeEstimator:
    """Orchestrates category-specific 3D volume estimation."""

    def __init__(self):
        self.strategies = {
            "pile": PileVolumeEstimator(),
            "flat": FlatFoodVolumeEstimator(),
            "liquid": LiquidVolumeEstimator(),
            "pieces": PieceFoodVolumeEstimator(),
        }

    def estimate(
        self,
        instance: FoodInstance,
        depth_map: np.ndarray,
        calibration: ScaleCalibration,
    ) -> float:
        category = FOOD_CATEGORIES.get(instance.food_class.lower(), "pieces")
        instance.shape_category = category
        estimator = self.strategies.get(category, self.strategies["pieces"])
        return estimator.estimate(instance, depth_map, calibration)
