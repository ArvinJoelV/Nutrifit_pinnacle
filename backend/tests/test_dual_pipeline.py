"""Tests for the Dual-Pipeline Architecture (Legacy vs. Optimized High-Recall & Metric Depth)."""

import os
import sys
import numpy as np
import pytest

from food_portion.factory import (
    get_food_portion_pipeline,
    get_active_pipeline_mode,
    set_active_pipeline_mode,
)
from food_portion.pipeline import FoodPortionPipeline
from food_portion.optimized_pipeline import OptimizedFoodPortionPipeline
from food_portion.depth.metric_depth_estimator import MetricDepthEstimator, fit_plane_ransac
from food_portion.detection.high_recall_detector import HighRecallFoodDetector, soft_nms
from food_portion.detection.yolo_detector import Detection
from app import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_fit_plane_ransac_synthetic():
    """Verify RANSAC plane fitting on known 3D flat surface (Z = 40.0)."""
    # Create 50 synthetic points on a flat plane Z = 40.0 with minor noise
    xs = np.random.uniform(-10.0, 10.0, 50)
    ys = np.random.uniform(-10.0, 10.0, 50)
    zs = 40.0 + np.random.normal(0, 0.05, 50)
    pts = np.column_stack([xs, ys, zs])

    plane = fit_plane_ransac(pts, max_iterations=50, distance_threshold=0.2)
    assert plane is not None
    A, B, C, D = plane
    # Normal should point along Z axis: [0, 0, 1]
    assert abs(C) > 0.90
    assert abs(A) < 0.20
    assert abs(B) < 0.20


def test_metric_depth_elevation_map():
    """Verify MetricDepthEstimator produces non-negative elevations in centimeters."""
    estimator = MetricDepthEstimator()
    dummy_img = np.full((240, 320, 3), 128, dtype=np.uint8)
    # Add a mock circular food mound in center
    cv2_circle = np.zeros((240, 320), dtype=np.uint8)
    cv2_circle[70:170, 110:210] = 255

    elevation_map, meta = estimator.predict_elevation_map(
        dummy_img,
        plate_mask=np.ones((240, 320), dtype=np.uint8),
        cm_per_pixel=0.03,
        food_masks=[cv2_circle],
    )

    assert elevation_map.shape == (240, 320)
    assert np.all(elevation_map >= 0.0)
    assert meta["model"] == "MetricDepthEstimator_RANSAC_3D"
    assert "plane_equation" in meta


def test_soft_nms_preserves_overlapping_different_foods():
    """Verify Soft-NMS keeps overlapping food items of distinct classes (e.g. dal on rice)."""
    # Rice base
    rice_box = (50.0, 50.0, 200.0, 200.0)
    rice_det = Detection(class_name="rice", confidence=0.92, bbox=rice_box)

    # Dal poured over rice with high IoU (> 60%)
    dal_box = (60.0, 60.0, 180.0, 180.0)
    dal_det = Detection(class_name="dal", confidence=0.85, bbox=dal_box)

    results = soft_nms([rice_det, dal_det], sigma=0.5, score_threshold=0.10, preserve_distinct_classes=True)
    # Both rice and dal MUST be retained
    class_names = [d.class_name for d in results]
    assert "rice" in class_names
    assert "dal" in class_names
    assert len(results) == 2


def test_pipeline_factory_switching():
    """Verify factory returns appropriate pipeline instance based on mode."""
    # Reset to default
    set_active_pipeline_mode("optimized")
    assert get_active_pipeline_mode() == "optimized"

    opt_p = get_food_portion_pipeline("optimized")
    assert isinstance(opt_p, OptimizedFoodPortionPipeline)
    assert opt_p.pipeline_mode == "optimized"

    leg_p = get_food_portion_pipeline("legacy")
    assert isinstance(leg_p, FoodPortionPipeline)

    # Test global mode toggle
    set_active_pipeline_mode("legacy")
    assert get_active_pipeline_mode() == "legacy"
    default_p = get_food_portion_pipeline()
    assert isinstance(default_p, FoodPortionPipeline)

    # Restore optimized default
    set_active_pipeline_mode("optimized")
    assert get_active_pipeline_mode() == "optimized"


def test_api_pipeline_config(client):
    """Verify GET and POST /api/pipeline/config."""
    # GET config
    res = client.get("/api/pipeline/config")
    assert res.status_code == 200
    data = res.get_json()
    assert data["ok"] is True
    assert "active_mode" in data
    assert len(data["supported_modes"]) == 2

    # POST switch to legacy
    res_post = client.post("/api/pipeline/config", json={"mode": "legacy"})
    assert res_post.status_code == 200
    assert res_post.get_json()["active_mode"] == "legacy"

    # POST switch back to optimized
    res_post_back = client.post("/api/pipeline/config", json={"mode": "optimized"})
    assert res_post_back.status_code == 200
    assert res_post_back.get_json()["active_mode"] == "optimized"


def test_api_pipeline_config_invalid_mode(client):
    """Verify POST /api/pipeline/config rejects invalid modes with 400 Bad Request."""
    res = client.post("/api/pipeline/config", json={"mode": "invalid_experimental"})
    assert res.status_code == 400
    data = res.get_json()
    assert "error" in data
