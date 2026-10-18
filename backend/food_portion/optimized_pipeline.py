"""Optimized Food Portion and 3D Mass Estimation Pipeline (V2).

Next-generation high-speed, high-accuracy dietary vision pipeline:
1. High-Recall Detection: Uses HighRecallFoodDetector with Soft-NMS and SAHI container slicing
   to capture all dishes, micro-sides, garnishes, and overlapping foods.
2. Concurrent Execution: Runs neural metric depth and high-recall detection in parallel
   via worker threads to halve latency.
3. RANSAC 3D Surface Fitting: Calculates physical food elevation h(x, y) relative to the
   underlying dining plate / table plane, eliminating camera tilt and perspective skew.
4. Preserves full schema compatibility with FoodPortionPipeline for seamless runtime switching.
"""

import time
import os
import cv2
import numpy as np
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from typing import Dict, Any, List, Optional, Callable

from .detection.high_recall_detector import HighRecallFoodDetector
from .detection.yolo_detector import Detection
from .segmentation.sam_segmenter import FoodSegmenter, FoodInstance
from .calibration.scale_estimator import ScaleEstimator, ScaleCalibration
from .depth.metric_depth_estimator import MetricDepthEstimator
from .depth.depth_estimator import get_depth_stats
from .geometry.volume_estimator import VolumeEstimator
from .occlusion.occlusion_detector import OcclusionDetector
from .nutrition.mass_estimator import MassEstimator
from .uncertainty.confidence import ConfidenceEstimator
from .gemini.validator import GeminiValidator


class OptimizedFoodPortionPipeline:
    """High-speed, high-accuracy concurrent 3D food portion pipeline."""

    pipeline_mode: str = "optimized"
    pipeline_version: str = "2.0-high-recall-metric-depth"

    def __init__(
        self,
        detector: Optional[HighRecallFoodDetector] = None,
        segmenter: Optional[FoodSegmenter] = None,
        scale_estimator: Optional[ScaleEstimator] = None,
        depth_estimator: Optional[MetricDepthEstimator] = None,
        volume_estimator: Optional[VolumeEstimator] = None,
        occlusion_detector: Optional[OcclusionDetector] = None,
        mass_estimator: Optional[MassEstimator] = None,
        confidence_estimator: Optional[ConfidenceEstimator] = None,
        gemini_validator: Optional[GeminiValidator] = None,
    ):
        self.detector = detector or HighRecallFoodDetector()
        self.segmenter = segmenter or FoodSegmenter()
        self.scale_estimator = scale_estimator or ScaleEstimator()
        self.depth_estimator = depth_estimator or MetricDepthEstimator()
        self.volume_estimator = volume_estimator or VolumeEstimator()
        self.occlusion_detector = occlusion_detector or OcclusionDetector()
        self.mass_estimator = mass_estimator or MassEstimator()
        self.confidence_estimator = confidence_estimator or ConfidenceEstimator()
        self.gemini_validator = gemini_validator or GeminiValidator()

    def process(
        self,
        image_input: Any,
        gemini_model: Optional[Any] = None,
        initial_detections: Optional[List[Any]] = None,
        progress_callback: Optional[Callable[[Dict[str, Any]], None]] = None,
    ) -> Dict[str, Any]:
        """Executes the optimized concurrent physical measurement pipeline."""
        pipeline_start_t = time.perf_counter()
        trace: List[Dict[str, Any]] = []

        if isinstance(image_input, str):
            image_path = image_input
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Could not read image from {image_path}")
        elif isinstance(image_input, np.ndarray):
            image_path = None
            image = image_input
        else:
            raise TypeError("image_input must be a file path string or numpy ndarray")

        h, w = image.shape[:2]

        print("\n" + "=" * 80)
        print(" 🚀 [NUTRIFIT OPTIMIZED PIPELINE V2] High-Recall & Metric 3D Depth Active")
        print(f"    Image Source: {image_path or 'numpy ndarray'} | Resolution: {w}x{h}")
        print("=" * 80)

        # ---------------------------------------------------------------------
        # CONCURRENT STAGE 1 & 2: Parallel Detection & Metric Depth Estimation
        # ---------------------------------------------------------------------
        t_parallel_start = time.perf_counter()

        def _run_detection_task():
            if initial_detections:
                dets = []
                for item in initial_detections:
                    if isinstance(item, Detection):
                        dets.append(item)
                    elif isinstance(item, dict):
                        bbox = item.get("bbox") or item.get("bbox_xyxy") or (0, 0, w, h)
                        dets.append(
                            Detection(
                                class_name=item.get("class_name", "food"),
                                confidence=float(item.get("confidence", 0.8)),
                                bbox=tuple(float(v) for v in bbox),
                                is_container=bool(item.get("is_container", False)),
                            )
                        )
                return dets
            return self.detector.predict(image)

        def _run_depth_task():
            return self.depth_estimator.predict_raw_depth(image)

        with ThreadPoolExecutor(max_workers=2) as executor:
            future_det = executor.submit(_run_detection_task)
            future_depth = executor.submit(_run_depth_task)

            detections = future_det.result()
            raw_depth_map = future_depth.result()

        t_parallel_ms = (time.perf_counter() - t_parallel_start) * 1000

        detection_records = [
            {
                "class_name": d.class_name,
                "confidence": round(float(d.confidence), 3),
                "bbox_xyxy": [int(v) for v in d.bbox],
                "is_container": d.is_container,
            }
            for d in detections
        ]

        det_summary = [f"{d['class_name']} ({d['confidence']})" for d in detection_records]
        print(f"\n▶ [1/9] Concurrent High-Recall Detection & Raw Depth | {t_parallel_ms:.1f}ms")
        print(f"  Detected ({len(detections)}): {det_summary}")

        trace.append({
            "stage": 1,
            "name": "Concurrent High-Recall Detection & Depth Prior",
            "file": "backend/food_portion/detection/high_recall_detector.py",
            "class": "HighRecallFoodDetector",
            "function": "concurrent_predict()",
            "duration_ms": round(t_parallel_ms, 1),
            "input": {"image_dimensions": f"{w}x{h} px"},
            "output": {
                "detected_count": len(detections),
                "items": detection_records,
                "parallel_execution": True,
            },
        })
        if progress_callback:
            try:
                progress_callback({
                    "stage": 1,
                    "name": "High-Recall Food Detection (Parallel)",
                    "duration_ms": round(t_parallel_ms, 1),
                    "details": {"detected_count": len(detections), "items": [d["class_name"] for d in detection_records]},
                })
            except Exception:
                pass

        # ---------------------------------------------------------------------
        # 2. Instance Mask Extraction (SAM / SAM2)
        # ---------------------------------------------------------------------
        t0 = time.perf_counter()
        instances = self.segmenter.segment(image, detections)
        t_seg = (time.perf_counter() - t0) * 1000

        instance_records = [
            {
                "food_class": inst.food_class,
                "visible_pixels": int(inst.visible_mask.sum()) if inst.visible_mask is not None else 0,
                "crop_path": inst.crop_path,
                "is_container": inst.is_container,
            }
            for inst in instances
        ]

        trace.append({
            "stage": 2,
            "name": "Instance Mask Extraction",
            "file": "backend/food_portion/segmentation/sam_segmenter.py",
            "class": "FoodSegmenter",
            "function": "segment(image, detections)",
            "duration_ms": round(t_seg, 1),
            "input": {"detections_count": len(detections)},
            "output": {"segmented_count": len(instances), "instances": instance_records},
        })
        if progress_callback:
            try:
                progress_callback({
                    "stage": 2,
                    "name": "Instance Segmentation",
                    "duration_ms": round(t_seg, 1),
                    "details": {"segmented_count": len(instances)},
                })
            except Exception:
                pass

        # ---------------------------------------------------------------------
        # 3. Metric Scale Calibration
        # ---------------------------------------------------------------------
        t0 = time.perf_counter()
        container_instances = [inst for inst in instances if inst.is_container]
        calibration = self.scale_estimator.estimate(image, container_instances)
        t_calib = (time.perf_counter() - t0) * 1000

        trace.append({
            "stage": 3,
            "name": "Scale & Perspective Calibration",
            "file": "backend/food_portion/calibration/scale_estimator.py",
            "class": "ScaleEstimator",
            "duration_ms": round(t_calib, 1),
            "output": {
                "pixels_per_cm": round(calibration.pixels_per_cm, 2),
                "cm_per_pixel": round(calibration.cm_per_pixel, 4),
                "plate_detected": calibration.plate_detected,
            },
        })

        food_instances = [inst for inst in instances if not inst.is_container]
        if not food_instances and instances:
            food_instances = instances

        # ---------------------------------------------------------------------
        # 4. RANSAC 3D Plane Fitting & Elevation Depth Mapping
        # ---------------------------------------------------------------------
        t0 = time.perf_counter()
        plate_mask = container_instances[0].visible_mask if container_instances else None
        food_masks = [inst.visible_mask for inst in food_instances if inst.visible_mask is not None]

        elevation_map, plane_meta = self.depth_estimator.predict_elevation_map(
            image,
            plate_mask=plate_mask,
            cm_per_pixel=calibration.cm_per_pixel,
            food_masks=food_masks,
        )
        t_depth = (time.perf_counter() - t0) * 1000

        depth_records = []
        for inst in food_instances:
            inst.depth_stats = get_depth_stats(elevation_map, inst.visible_mask)
            depth_records.append({
                "food_class": inst.food_class,
                "mean_elevation_cm": round(float(inst.depth_stats.get("mean_depth", 0.0)), 2),
                "max_elevation_cm": round(float(inst.depth_stats.get("max_depth", 0.0)), 2),
            })

        print(f"\n▶ [4/9] RANSAC 3D Surface Fitting & Metric Elevation | {t_depth:.1f}ms")
        print(f"  Plane Fitted: {plane_meta.get('plane_fitted')} | Max Elevation: {plane_meta.get('max_elevation_cm')} cm")

        trace.append({
            "stage": 4,
            "name": "RANSAC 3D Surface Fitting & Metric Elevation",
            "file": "backend/food_portion/depth/metric_depth_estimator.py",
            "class": "MetricDepthEstimator",
            "function": "predict_elevation_map()",
            "duration_ms": round(t_depth, 1),
            "output": {
                "plane_fitted": plane_meta.get("plane_fitted"),
                "plane_equation": plane_meta.get("plane_equation"),
                "max_elevation_cm": plane_meta.get("max_elevation_cm"),
                "instances_elevation": depth_records,
            },
        })
        if progress_callback:
            try:
                progress_callback({
                    "stage": 4,
                    "name": "RANSAC 3D Surface Elevation",
                    "duration_ms": round(t_depth, 1),
                    "details": {"plane_fitted": plane_meta.get("plane_fitted"), "max_elevation_cm": plane_meta.get("max_elevation_cm")},
                })
            except Exception:
                pass

        # ---------------------------------------------------------------------
        # 5. Occlusion Detection & Reconstruction
        # ---------------------------------------------------------------------
        t0 = time.perf_counter()
        food_instances = self.occlusion_detector.analyze_scene(
            food_instances,
            elevation_map,
            pixels_per_cm=calibration.pixels_per_cm,
        )
        t_occl = (time.perf_counter() - t0) * 1000

        trace.append({
            "stage": 5,
            "name": "Occlusion Analysis & Surface Reconstruction",
            "file": "backend/food_portion/occlusion/occlusion_detector.py",
            "class": "OcclusionDetector",
            "duration_ms": round(t_occl, 1),
            "output": {"items_evaluated": len(food_instances)},
        })

        # ---------------------------------------------------------------------
        # 6. Category-Specific 3D Volumetric Integration
        # ---------------------------------------------------------------------
        t0 = time.perf_counter()
        volume_records = []
        for inst in food_instances:
            vol = self.volume_estimator.estimate(inst, elevation_map, calibration)
            inst.volume_cm3 = vol
            shape_cat = getattr(inst, "shape_category", None) or "pieces"
            volume_records.append({
                "food_class": inst.food_class,
                "shape_category": shape_cat,
                "volume_cm3": round(float(vol), 1),
            })
        t_vol = (time.perf_counter() - t0) * 1000

        trace.append({
            "stage": 6,
            "name": "3D Volumetric Integration",
            "file": "backend/food_portion/geometry/volume_estimator.py",
            "class": "VolumeEstimator",
            "duration_ms": round(t_vol, 1),
            "output": {"volumes": volume_records},
        })

        # ---------------------------------------------------------------------
        # 7. Mass & Macro Estimation
        # ---------------------------------------------------------------------
        t0 = time.perf_counter()
        mass_records = []
        for inst in food_instances:
            mass, mass_range = self.mass_estimator.estimate(inst)
            inst.mass_g = mass
            inst.mass_range_g = mass_range
            mass_records.append({
                "food_class": inst.food_class,
                "mass_g": round(float(mass), 1),
                "mass_range_g": [round(float(v), 1) for v in mass_range],
            })
        t_mass = (time.perf_counter() - t0) * 1000

        trace.append({
            "stage": 7,
            "name": "Mass & Density Estimation",
            "file": "backend/food_portion/nutrition/mass_estimator.py",
            "class": "MassEstimator",
            "duration_ms": round(t_mass, 1),
            "output": {"masses": mass_records},
        })

        # ---------------------------------------------------------------------
        # 8. Uncertainty & Scene Assessment
        # ---------------------------------------------------------------------
        t0 = time.perf_counter()
        for inst in food_instances:
            inst.confidence = self.confidence_estimator.evaluate_instance(inst, calibration)
        scene_assessment = self.confidence_estimator.assess_scene(food_instances, calibration)
        t_conf = (time.perf_counter() - t0) * 1000

        trace.append({
            "stage": 8,
            "name": "Uncertainty Quantification",
            "file": "backend/food_portion/uncertainty/confidence.py",
            "class": "ConfidenceEstimator",
            "duration_ms": round(t_conf, 1),
            "output": {"scene_assessment": scene_assessment},
        })

        # ---------------------------------------------------------------------
        # 9. Gemini Validation & Synthesis
        # ---------------------------------------------------------------------
        t0 = time.perf_counter()
        if gemini_model:
            self.gemini_validator.model = gemini_model

        gemini_result = self.gemini_validator.validate(
            food_instances,
            calibration,
            image_path=image_path,
        )
        t_gem = (time.perf_counter() - t0) * 1000

        trace.append({
            "stage": 9,
            "name": "Gemini Clinical Validation",
            "file": "backend/food_portion/gemini/validator.py",
            "class": "GeminiValidator",
            "duration_ms": round(t_gem, 1),
            "output": {
                "valid": gemini_result.get("valid", True),
                "item_macros": gemini_result.get("items", []),
            },
        })

        # Assemble output payload identical to legacy pipeline
        processed_items = []
        gemini_items = gemini_result.get("items", [])
        gemini_items_by_id = {int(it["id"]): it for it in gemini_items if "id" in it}
        gemini_items_by_name = {it.get("food", "").lower(): it for it in gemini_items}

        total_mass = 0.0
        total_calories = 0.0
        used_gemini_items = set()

        for idx, inst in enumerate(food_instances):
            mass = inst.mass_g or 50.0
            gem_item = gemini_items_by_id.get(idx) or gemini_items_by_name.get(inst.food_class.lower())
            if not gem_item and idx < len(gemini_items) and id(gemini_items[idx]) not in used_gemini_items:
                gem_item = gemini_items[idx]
            if not gem_item:
                gem_item = {}
            else:
                used_gemini_items.add(id(gem_item))

            if gem_item.get("mass_g") and 5 <= float(gem_item["mass_g"]) <= 1500:
                mass = round(float(gem_item["mass_g"]), 1)

            total_mass += mass
            cals = gem_item.get("calories")
            if cals is None:
                cals = int(round(mass * 1.5))
            total_calories += cals

            display_name = gem_item.get("food") or inst.food_class.replace("-", " ").replace("_", " ").title()

            processed_items.append({
                "name": display_name,
                "food": display_name,
                "mass_g": mass,
                "mass_range_g": gem_item.get("mass_range_g") or (list(inst.mass_range_g) if inst.mass_range_g else [int(mass * 0.8), int(mass * 1.2)]),
                "visible_area_cm2": round(inst.visible_area_cm2, 1),
                "estimated_total_area_cm2": round(inst.estimated_total_area_cm2 or inst.visible_area_cm2, 1),
                "estimated_volume_cm3": round(inst.volume_cm3 or 0.0, 1),
                "occlusion_probability": inst.occlusion_probability,
                "confidence": gem_item.get("confidence") or inst.confidence,
                "calories": cals,
                "protein": gem_item.get("protein", int(round(mass * 0.07))),
                "carbs": gem_item.get("carbs", int(round(mass * 0.22))),
                "fat": gem_item.get("fat", int(round(mass * 0.04))),
                "fiber": gem_item.get("fiber", 1),
                "image": inst.crop_path,
                "multiplier": 1.0,
            })

        for g_item in gemini_items:
            if id(g_item) in used_gemini_items:
                continue
            m = float(g_item.get("mass_g") or 75.0)
            cals = int(g_item.get("calories") or round(m * 1.5))
            total_mass += m
            total_calories += cals
            g_name = g_item.get("food", "Additional Side")
            processed_items.append({
                "name": g_name,
                "food": g_name,
                "mass_g": m,
                "mass_range_g": g_item.get("mass_range_g", [int(m * 0.8), int(m * 1.2)]),
                "visible_area_cm2": 0.0,
                "estimated_total_area_cm2": 0.0,
                "estimated_volume_cm3": 0.0,
                "occlusion_probability": 0.5,
                "confidence": float(g_item.get("confidence", 0.7)),
                "calories": cals,
                "protein": int(g_item.get("protein", round(m * 0.05))),
                "carbs": int(g_item.get("carbs", round(m * 0.20))),
                "fat": int(g_item.get("fat", round(m * 0.03))),
                "fiber": int(g_item.get("fiber", 1)),
                "image": None,
                "multiplier": 1.0,
            })

        pipeline_total_ms = (time.perf_counter() - pipeline_start_t) * 1000
        print(f"\n✅ [OPTIMIZED PIPELINE COMPLETE] {len(processed_items)} items | {total_mass:.1f}g | {total_calories:.0f} kcal in {pipeline_total_ms:.1f}ms")

        # Save segmented visualization overlay
        segmented_image_path = None
        seg_dir = "static/mask"
        os.makedirs(seg_dir, exist_ok=True)
        seg_file = os.path.join(seg_dir, f"opt_seg_{int(time.time()*1000)}.jpg")
        try:
            overlay = image.copy()
            for inst in instances:
                if inst.visible_mask is not None and np.sum(inst.visible_mask) > 0:
                    color = (0, 255, 0) if inst.is_container else (0, 165, 255)
                    overlay[inst.visible_mask > 0] = cv2.addWeighted(
                        overlay[inst.visible_mask > 0], 0.65,
                        np.full_like(overlay[inst.visible_mask > 0], color), 0.35, 0
                    )
            cv2.imwrite(seg_file, overlay)
            segmented_image_path = seg_file.replace("\\", "/")
        except Exception:
            segmented_image_path = None

        return {
            "items": processed_items,
            "total_mass_g": round(total_mass, 1),
            "total_calories": round(total_calories, 0),
            "scale_calibration": {
                "pixels_per_cm": round(calibration.pixels_per_cm, 2),
                "cm_per_pixel": round(calibration.cm_per_pixel, 4),
                "plate_detected": calibration.plate_detected,
                "tilt_ratio": round(calibration.tilt_ratio, 2),
                "confidence": round(calibration.confidence, 2),
            },
            "scene_assessment": scene_assessment,
            "gemini_validation": gemini_result,
            "segmented_image": segmented_image_path,
            "pipeline_trace": trace,
            "pipeline_mode": self.pipeline_mode,
            "pipeline_version": self.pipeline_version,
            "pipeline_total_ms": round(pipeline_total_ms, 1),
            "plane_meta": plane_meta,
        }
