"""Unit and integration tests for the Food Portion Estimation Pipeline."""

import os
import sys
import numpy as np

# Ensure backend root is on python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from food_portion.detection.yolo_detector import Detection
from food_portion.segmentation.sam_segmenter import FoodInstance
from food_portion.calibration.scale_estimator import ScaleEstimator, ScaleCalibration
from food_portion.depth.depth_estimator import DepthEstimator, get_depth_stats
from food_portion.geometry.volume_estimator import VolumeEstimator
from food_portion.occlusion.occlusion_detector import OcclusionDetector, bbox_iou
from food_portion.nutrition.density import get_food_density
from food_portion.nutrition.mass_estimator import MassEstimator
from food_portion.uncertainty.confidence import ConfidenceEstimator


def test_bbox_iou():
    box_a = (0, 0, 100, 100)
    box_b = (50, 50, 150, 150)
    iou = bbox_iou(box_a, box_b)
    # Area A = 10000, Area B = 10000, Intersection = 50*50 = 2500, Union = 17500 -> IoU = 2500/17500 = 0.1428
    assert abs(iou - (2500.0 / 17500.0)) < 0.01, f"Expected ~0.143, got {iou}"
    print("PASS: test_bbox_iou")


def test_scale_estimator():
    estimator = ScaleEstimator(default_plate_diameter_cm=25.0)
    # Synthetic image 600x800
    img = np.zeros((600, 800, 3), dtype=np.uint8)
    calib = estimator.estimate(img)
    assert calib.pixels_per_cm > 0
    assert calib.cm_per_pixel > 0
    print(f"PASS: test_scale_estimator (px/cm: {calib.pixels_per_cm:.2f}, cm/px: {calib.cm_per_pixel:.4f})")


def test_depth_estimator():
    depth_est = DepthEstimator()
    img = np.ones((200, 200, 3), dtype=np.uint8) * 128
    depth_map = depth_est.predict(img)
    assert depth_map.shape == (200, 200)

    mask = np.zeros((200, 200), dtype=np.uint8)
    mask[50:150, 50:150] = 1
    stats = get_depth_stats(depth_map, mask)
    assert stats["mean"] > 0
    print(f"PASS: test_depth_estimator (mean depth: {stats['mean']:.2f} cm)")


def test_volume_and_mass_estimation():
    calib = ScaleCalibration(pixels_per_cm=30.0, cm_per_pixel=1.0/30.0, plate_detected=True)
    depth_map = np.ones((300, 300), dtype=np.float32) * 2.5  # 2.5 cm depth

    # Food 1: Plain Rice (Pile category)
    mask_rice = np.zeros((300, 300), dtype=np.uint8)
    mask_rice[50:200, 50:200] = 1  # 150x150 px = 22500 px -> 25 cm^2
    rice_instance = FoodInstance(
        food_class="plain rice",
        bbox=(50, 50, 200, 200),
        visible_mask=mask_rice,
        visible_area_px=22500.0,
        visible_area_cm2=22500.0 / (30.0 ** 2),  # 25 cm^2
        depth_stats={"mean": 2.5, "max": 3.2, "min": 0.5, "std": 0.4},
        detection_confidence=0.88,
        segmentation_confidence=0.90,
    )

    vol_est = VolumeEstimator()
    volume_cm3 = vol_est.estimate(rice_instance, depth_map, calib)
    rice_instance.volume_cm3 = volume_cm3

    mass_est = MassEstimator()
    mass_g = mass_est.predict(rice_instance, calib)

    conf_est = ConfidenceEstimator()
    conf = conf_est.evaluate_instance(rice_instance, calib)

    assert volume_cm3 > 0
    assert mass_g > 0
    assert conf > 0
    assert rice_instance.mass_range_g is not None
    assert rice_instance.mass_range_g[0] < mass_g < rice_instance.mass_range_g[1]

    print(f"PASS: test_volume_and_mass_estimation")
    print(f"      Rice: {volume_cm3:.1f} cm^3, {mass_g:.1f} g, range {rice_instance.mass_range_g}, conf {conf:.2f}")


def test_occlusion_detector():
    calib = ScaleCalibration(pixels_per_cm=30.0, cm_per_pixel=1.0/30.0, plate_detected=True)
    depth_map = np.ones((300, 300), dtype=np.float32) * 2.0

    mask_a = np.zeros((300, 300), dtype=np.uint8)
    mask_a[50:180, 50:180] = 1

    mask_b = np.zeros((300, 300), dtype=np.uint8)
    mask_b[120:250, 120:250] = 1

    inst_a = FoodInstance(
        food_class="plain rice",
        bbox=(50, 50, 180, 180),
        visible_mask=mask_a,
        visible_area_px=float(np.sum(mask_a)),
        depth_stats={"mean": 1.2},
    )

    inst_b = FoodInstance(
        food_class="fried-chicken",
        bbox=(120, 120, 250, 250),
        visible_mask=mask_b,
        visible_area_px=float(np.sum(mask_b)),
        depth_stats={"mean": 3.0},  # Chicken is higher / in front
    )

    occ_detector = OcclusionDetector()
    occ_detector.analyze_scene([inst_a, inst_b], depth_map, pixels_per_cm=30.0)

    assert inst_a.occlusion_probability > 0.0
    assert inst_a.estimated_total_area_cm2 > inst_a.visible_area_cm2
    print(f"PASS: test_occlusion_detector (Rice P_occ: {inst_a.occlusion_probability:.2f}, Visible: {inst_a.visible_area_cm2:.1f} cm^2 -> Recon: {inst_a.estimated_total_area_cm2:.1f} cm^2)")


if __name__ == "__main__":
    test_bbox_iou()
    test_scale_estimator()
    test_depth_estimator()
    test_volume_and_mass_estimation()
    test_occlusion_detector()
    print("\nALL PORTION ESTIMATION UNIT TESTS PASSED!")
