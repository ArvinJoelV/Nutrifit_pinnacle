"""Plate reference calibration and metric scale estimation."""

from dataclasses import dataclass
from typing import Optional, Tuple, List
import numpy as np
import cv2
from ..config import DEFAULT_PLATE_DIAMETER_CM, DEFAULT_BOWL_DIAMETER_CM


@dataclass
class ScaleCalibration:
    pixels_per_cm: float
    cm_per_pixel: float
    plate_detected: bool
    plate_contour: Optional[np.ndarray] = None
    plate_ellipse: Optional[Tuple[Tuple[float, float], Tuple[float, float], float]] = None
    tilt_ratio: float = 1.0  # minor_axis / major_axis (1.0 = top-down, <1.0 = tilted)
    confidence: float = 0.5


class ScaleEstimator:
    """Estimates physical metric scale (pixels per centimeter) using plate geometry."""

    def __init__(self, default_plate_diameter_cm: float = DEFAULT_PLATE_DIAMETER_CM):
        self.default_plate_diameter_cm = default_plate_diameter_cm

    def estimate(
        self,
        image: np.ndarray,
        container_instances: Optional[List] = None
    ) -> ScaleCalibration:
        """Estimates scale from container instances or geometric plate ellipse detection."""
        h, w = image.shape[:2]
        min_dim = min(h, w)
        max_dim = max(h, w)

        # 1. Check container instances (both plates/thalis and large dining bowls)
        containers = container_instances or []
        for inst in containers:
            is_explicit_plate = any(k in inst.food_class.lower() for k in ["plate", "thali", "tray", "dish"])
            bbox = getattr(inst, "bbox", None)
            bbox_w = (bbox[2] - bbox[0]) if bbox is not None else 0
            bbox_h = (bbox[3] - bbox[1]) if bbox is not None else 0
            max_span = max(bbox_w, bbox_h)

            # A container spanning > 38% of min_dim is the main dining vessel (plate/thali/large bowl)
            is_main_vessel = is_explicit_plate or (max_span > 0.38 * min_dim)
            ref_diameter = self.default_plate_diameter_cm if is_main_vessel else 10.0

            # 1a. Try fitting ellipse on visible container mask
            if inst.visible_mask is not None and np.sum(inst.visible_mask) > 1000:
                calib = self._fit_ellipse_from_mask(inst.visible_mask, h, w, is_plate=is_main_vessel)
                if calib.plate_detected:
                    return calib

            # 1b. Fallback to container bounding box if mask fitting was disrupted by food covering the plate
            if bbox is not None and max_span > 60:
                if min_dim * 0.35 < max_span <= 1.25 * max_dim:
                    px_per_cm = float(np.clip(max_span / ref_diameter, 15.0, 65.0))
                    tilt = float(np.clip(min(bbox_w, bbox_h) / max(1.0, max_span), 0.25, 1.0))
                    return ScaleCalibration(
                        pixels_per_cm=px_per_cm,
                        cm_per_pixel=1.0 / px_per_cm,
                        plate_detected=True,
                        tilt_ratio=tilt,
                        confidence=0.82 if is_main_vessel else 0.70,
                    )

        # 2. Heuristic visual plate detection via edge & contour analysis (finds outer plate boundary)
        calib = self._detect_plate_contour(image)
        if calib.plate_detected:
            return calib

        # 3. Orientation-aware default fallback scale based on typical smartphone dining distance (~35cm height)
        # In casual dining photos:
        # In portrait mode (h > w), the plate typically spans ~78%-85% of image width
        # In landscape mode (w >= h), the plate typically spans ~70%-80% of image height
        estimated_plate_span_px = min_dim * 0.80
        fallback_px = float(np.clip(estimated_plate_span_px / self.default_plate_diameter_cm, 20.0, 50.0))

        return ScaleCalibration(
            pixels_per_cm=fallback_px,
            cm_per_pixel=1.0 / fallback_px,
            plate_detected=False,
            tilt_ratio=0.85,
            confidence=0.45,
        )

    def _fit_ellipse_from_mask(self, mask: np.ndarray, h: int, w: int, is_plate: bool = True) -> ScaleCalibration:
        contours, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return ScaleCalibration(pixels_per_cm=30.0, cm_per_pixel=1/30.0, plate_detected=False)

        largest = max(contours, key=cv2.contourArea)
        min_area = (h * w * 0.10) if is_plate else (h * w * 0.03)
        if len(largest) >= 5 and cv2.contourArea(largest) > min_area:
            try:
                ellipse = cv2.fitEllipse(largest)
                (cx, cy), (d1, d2), angle = ellipse
                major = max(d1, d2)
                minor = min(d1, d2)

                # Check if a container (even if classified as 'bowl' by COCO) is physically the main dining plate
                contour_area = cv2.contourArea(largest)
                is_large_container = (contour_area > (h * w * 0.15)) or (major > 0.35 * min(h, w))

                if is_plate or is_large_container:
                    ref_diameter = self.default_plate_diameter_cm
                    conf = 0.88
                    min_major = 120
                else:
                    ref_diameter = 10.0  # Secondary small katori / dipping bowl
                    conf = 0.75
                    min_major = 60

                # Ensure major axis is geometrically plausible and not a degenerate border arc
                if min_major < major <= 1.25 * max(h, w):
                    px_per_cm = float(np.clip(major / ref_diameter, 8.0, 75.0))
                    tilt = float(np.clip(minor / major, 0.2, 1.0))
                    return ScaleCalibration(
                        pixels_per_cm=px_per_cm,
                        cm_per_pixel=1.0 / px_per_cm,
                        plate_detected=True,
                        plate_contour=largest,
                        plate_ellipse=ellipse,
                        tilt_ratio=tilt,
                        confidence=conf,
                    )
            except Exception:
                pass

        return ScaleCalibration(pixels_per_cm=30.0, cm_per_pixel=1/30.0, plate_detected=False)

    def _detect_plate_contour(self, image: np.ndarray) -> ScaleCalibration:
        h, w = image.shape[:2]
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        blurred = cv2.GaussianBlur(gray, (9, 9), 2)

        # Thresholding with morphological close to close plate borders
        edges = cv2.Canny(blurred, 30, 100)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        closed = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)

        contours, _ = cv2.findContours(closed, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        valid_ellipses = []

        min_area = (h * w) * 0.12  # Plate should cover at least 12% of frame
        max_area = (h * w) * 0.95

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if min_area < area < max_area and len(cnt) >= 5:
                try:
                    ellipse = cv2.fitEllipse(cnt)
                    (cx, cy), (d1, d2), angle = ellipse
                    major = max(d1, d2)
                    minor = min(d1, d2)
                    aspect = minor / major if major > 0 else 0

                    # Realistic dining plate ellipse: center in middle 60% of image, aspect > 0.45
                    if 0.2 * w < cx < 0.8 * w and 0.2 * h < cy < 0.8 * h and aspect > 0.45:
                        valid_ellipses.append((area, ellipse, cnt, major, aspect))
                except Exception:
                    continue

        if valid_ellipses:
            # Pick the largest qualifying ellipse with valid physical geometry
            valid_ellipses.sort(key=lambda x: x[0], reverse=True)
            for _, best_ellipse, best_cnt, major, aspect in valid_ellipses:
                if major <= 1.25 * max(h, w):
                    px_per_cm = float(np.clip(major / self.default_plate_diameter_cm, 8.0, 75.0))
                    return ScaleCalibration(
                        pixels_per_cm=px_per_cm,
                        cm_per_pixel=1.0 / px_per_cm,
                        plate_detected=True,
                        plate_contour=best_cnt,
                        plate_ellipse=best_ellipse,
                        tilt_ratio=float(aspect),
                        confidence=0.78,
                    )

        fallback_px = float(np.clip(w * 0.60 / self.default_plate_diameter_cm, 12.0, 50.0))
        return ScaleCalibration(
            pixels_per_cm=fallback_px,
            cm_per_pixel=1.0 / fallback_px,
            plate_detected=False,
            confidence=0.40,
        )
