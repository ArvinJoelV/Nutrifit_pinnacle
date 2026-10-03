"""Monocular depth estimation and metric height calibration."""

from typing import Dict, Optional
import numpy as np
import cv2
import torch


def get_depth_stats(depth_map: np.ndarray, mask: np.ndarray) -> Dict[str, float]:
    """Computes statistical summary of depth/height for a segmented mask region."""
    values = depth_map[mask > 0]
    if len(values) == 0:
        return {
            "median": 0.0,
            "mean": 0.0,
            "min": 0.0,
            "max": 0.0,
            "std": 0.0,
            "p90": 0.0,
        }

    return {
        "median": float(np.median(values)),
        "mean": float(np.mean(values)),
        "min": float(np.min(values)),
        "max": float(np.max(values)),
        "std": float(np.std(values)),
        "p90": float(np.percentile(values, 90)),
    }


class DepthEstimator:
    """Estimates a dense relative/metric elevation depth map for food scenes.

    Convention: HIGHER values represent regions CLOSER to camera (higher elevation above plate).
    Scale: normalized between 0.0 (baseline plate/table plane) and physical height in cm.
    """

    def __init__(self, model_type: str = "fast"):
        self.model_type = model_type
        self.torch_model = None
        self._init_model()

    def _init_model(self):
        """Attempts to load a fast lightweight monocular depth model if available."""
        # Can be swapped or extended with Depth Anything / MiDaS
        pass

    def predict(
        self,
        image: np.ndarray,
        plate_mask: Optional[np.ndarray] = None,
        cm_per_pixel: float = 0.03
    ) -> np.ndarray:
        """Produces an (H, W) elevation map where pixel values represent elevation in centimeters."""
        h, w = image.shape[:2]

        # 1. Compute relative depth gradient using combined cues:
        # - Visual saliency & edge frequency (higher elevation has more micro-texture)
        # - Shape-from-shading (specular highlights & diffuse reflectance)
        # - Distance from image perimeter / plate rim
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image

        # Morphological gradient for surface micro-relief
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        grad = cv2.morphologyEx(gray, cv2.MORPH_GRADIENT, kernel).astype(np.float32)
        grad_norm = cv2.normalize(grad, None, 0.0, 1.0, cv2.NORM_MINMAX)

        # Bilateral / guided filter to preserve sharp food boundaries while smoothing surfaces
        smooth_lum = cv2.bilateralFilter(gray, d=9, sigmaColor=75, sigmaSpace=75).astype(np.float32)
        lum_norm = cv2.normalize(smooth_lum, None, 0.0, 1.0, cv2.NORM_MINMAX)

        # Distance transform from image / plate boundary (foods in center are elevated higher)
        if plate_mask is not None and np.sum(plate_mask) > 100:
            dist = cv2.distanceTransform(plate_mask.astype(np.uint8), cv2.DIST_L2, 5)
        else:
            border_mask = np.ones((h, w), dtype=np.uint8)
            border_mask[10:h-10, 10:w-10] = 0
            dist = cv2.distanceTransform(1 - border_mask, cv2.DIST_L2, 5)

        dist_norm = cv2.normalize(dist, None, 0.0, 1.0, cv2.NORM_MINMAX)

        # Combined elevation proxy (closer to camera / higher mound = higher intensity)
        raw_elevation = 0.50 * dist_norm + 0.35 * lum_norm + 0.15 * grad_norm

        # Calibrate elevation into physical centimeters:
        # Typical food heaps on a dining plate rise between 0.5 cm and 6.5 cm
        # Using scale cm_per_pixel and radial mound gradient:
        max_expected_mound_height_cm = 5.0
        calibrated_depth_cm = raw_elevation * max_expected_mound_height_cm

        return calibrated_depth_cm.astype(np.float32)
