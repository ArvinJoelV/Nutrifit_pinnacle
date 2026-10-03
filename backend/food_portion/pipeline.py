import time
import os
import cv2
import numpy as np
from dataclasses import dataclass
from typing import Dict, Any, List, Optional

from .detection.yolo_detector import FoodDetector, Detection
from .segmentation.sam_segmenter import FoodSegmenter, FoodInstance
from .calibration.scale_estimator import ScaleEstimator, ScaleCalibration
from .depth.depth_estimator import DepthEstimator, get_depth_stats
from .geometry.volume_estimator import VolumeEstimator
from .occlusion.occlusion_detector import OcclusionDetector
from .nutrition.mass_estimator import MassEstimator
from .uncertainty.confidence import ConfidenceEstimator
from .gemini.validator import GeminiValidator


@dataclass
class PortionPipelineResult:
    items: List[Dict[str, Any]]
    total_mass_g: float
    total_calories: float
    scale_calibration: Dict[str, Any]
    scene_assessment: Dict[str, Any]
    gemini_validation: Dict[str, Any]
    segmented_image: Optional[str] = None
    pipeline_trace: Optional[List[Dict[str, Any]]] = None


class FoodPortionPipeline:
    """End-to-end 3D Food Portion and Mass Estimation Pipeline with full debug tracing."""

    def __init__(
        self,
        detector: Optional[FoodDetector] = None,
        segmenter: Optional[FoodSegmenter] = None,
        scale_estimator: Optional[ScaleEstimator] = None,
        depth_estimator: Optional[DepthEstimator] = None,
        volume_estimator: Optional[VolumeEstimator] = None,
        occlusion_detector: Optional[OcclusionDetector] = None,
        mass_estimator: Optional[MassEstimator] = None,
        confidence_estimator: Optional[ConfidenceEstimator] = None,
        gemini_validator: Optional[GeminiValidator] = None,
    ):
        self.detector = detector or FoodDetector()
        self.segmenter = segmenter or FoodSegmenter()
        self.scale_estimator = scale_estimator or ScaleEstimator()
        self.depth_estimator = depth_estimator or DepthEstimator()
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
    ) -> Dict[str, Any]:
        """Executes the full physical measurement pipeline on an input image with structured tracing."""
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
        print(" 🍽️  [NUTRIFIT 3D FOOD PORTION PIPELINE] Starting full physical estimation...")
        print(f"    Image Source: {image_path or 'numpy ndarray'} | Resolution: {w}x{h}")
        print("=" * 80)

        # ---------------------------------------------------------------------
        # 1. Food and Container Localization (YOLO)
        # ---------------------------------------------------------------------
        from .detection.yolo_detector import Detection
        if initial_detections:
            detections = []
            for item in initial_detections:
                if isinstance(item, Detection):
                    detections.append(item)
                elif isinstance(item, dict):
                    bbox = item.get("bbox") or item.get("bbox_xyxy") or (0, 0, w, h)
                    detections.append(
                        Detection(
                            class_name=item.get("class_name", "food"),
                            confidence=float(item.get("confidence", 0.8)),
                            bbox=tuple(float(v) for v in bbox),
                            is_container=bool(item.get("is_container", False)),
                        )
                    )
            t_detect = 0.0
        else:
            t0 = time.perf_counter()
            detections = self.detector.predict(image)
            t_detect = (time.perf_counter() - t0) * 1000

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
        print(f"\n▶ [1/9] YOLOv8 Localization | {t_detect:.1f}ms")
        print(f"  File: backend/food_portion/detection/yolo_detector.py | Func: FoodDetector.predict()")
        print(f"  Detected ({len(detections)}): {det_summary}")

        trace.append({
            "stage": 1,
            "name": "YOLOv8 Detection & Localization",
            "file": "backend/food_portion/detection/yolo_detector.py",
            "class": "FoodDetector",
            "function": "predict(image)",
            "duration_ms": round(t_detect, 1),
            "input": {"image_dimensions": f"{w}x{h} px"},
            "output": {
                "detected_count": len(detections),
                "items": detection_records,
            },
        })

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

        mask_summary = [f"{i['food_class']} ({i['visible_pixels']} px)" for i in instance_records]
        print(f"\n▶ [2/9] SAM2 Instance Segmentation | {t_seg:.1f}ms")
        print(f"  File: backend/food_portion/segmentation/sam_segmenter.py | Func: FoodSegmenter.segment()")
        print(f"  Segmented Masks ({len(instances)}): {mask_summary}")

        trace.append({
            "stage": 2,
            "name": "SAM2 Instance Segmentation",
            "file": "backend/food_portion/segmentation/sam_segmenter.py",
            "class": "FoodSegmenter",
            "function": "segment(image, detections)",
            "duration_ms": round(t_seg, 1),
            "input": {"detections_count": len(detections)},
            "output": {
                "segmented_count": len(instances),
                "instances": instance_records,
            },
        })

        # ---------------------------------------------------------------------
        # 3. Metric Scale Calibration (Plate diameter & perspective)
        # ---------------------------------------------------------------------
        t0 = time.perf_counter()
        container_instances = [inst for inst in instances if inst.is_container]
        calibration = self.scale_estimator.estimate(image, container_instances)
        t_calib = (time.perf_counter() - t0) * 1000

        print(f"\n▶ [3/9] Metric Scale & Perspective Calibration | {t_calib:.1f}ms")
        print(f"  File: backend/food_portion/calibration/scale_estimator.py | Func: ScaleEstimator.estimate()")
        print(f"  Scale: {calibration.pixels_per_cm:.2f} px/cm | cm/px: {calibration.cm_per_pixel:.4f} | Tilt: {calibration.tilt_ratio:.2f} | Plate Detected: {calibration.plate_detected}")

        trace.append({
            "stage": 3,
            "name": "Scale & Perspective Calibration",
            "file": "backend/food_portion/calibration/scale_estimator.py",
            "class": "ScaleEstimator",
            "function": "estimate(image, container_instances)",
            "duration_ms": round(t_calib, 1),
            "input": {"containers_detected": len(container_instances)},
            "output": {
                "pixels_per_cm": round(calibration.pixels_per_cm, 2),
                "cm_per_pixel": round(calibration.cm_per_pixel, 4),
                "plate_detected": calibration.plate_detected,
                "tilt_ratio": round(calibration.tilt_ratio, 2),
                "confidence": round(calibration.confidence, 2),
                "reference_method": "plate_contour_ellipse" if calibration.plate_detected else "prior_camera_calibration",
            },
        })

        # Separate food instances from container instances
        food_instances = [inst for inst in instances if not inst.is_container]
        if not food_instances and instances:
            food_instances = instances

        # ---------------------------------------------------------------------
        # 4. Monocular Elevation Depth Mapping
        # ---------------------------------------------------------------------
        t0 = time.perf_counter()
        depth_map = self.depth_estimator.predict(
            image,
            plate_mask=None,
            cm_per_pixel=calibration.cm_per_pixel
        )

        depth_records = []
        for inst in food_instances:
            inst.depth_stats = get_depth_stats(depth_map, inst.visible_mask)
            depth_records.append({
                "food_class": inst.food_class,
                "mean_elevation_cm": round(float(inst.depth_stats.get("mean_depth", 0.0)), 2),
                "max_elevation_cm": round(float(inst.depth_stats.get("max_depth", 0.0)), 2),
                "std_elevation_cm": round(float(inst.depth_stats.get("std_depth", 0.0)), 2),
            })
        t_depth = (time.perf_counter() - t0) * 1000

        elev_summary = [f"{d['food_class']}: max={d['max_elevation_cm']}cm" for d in depth_records]
        print(f"\n▶ [4/9] Monocular Elevation Depth Profiling | {t_depth:.1f}ms")
        print(f"  File: backend/food_portion/depth/depth_estimator.py | Func: DepthEstimator.predict() + get_depth_stats()")
        print(f"  Depth Map Shape: {depth_map.shape} | Elevation: {elev_summary}")

        trace.append({
            "stage": 4,
            "name": "Monocular Elevation Depth Mapping",
            "file": "backend/food_portion/depth/depth_estimator.py",
            "class": "DepthEstimator",
            "function": "predict(image) -> get_depth_stats()",
            "duration_ms": round(t_depth, 1),
            "input": {"depth_scale_cm_per_px": round(calibration.cm_per_pixel, 4)},
            "output": {
                "depth_map_dimensions": f"{depth_map.shape[1]}x{depth_map.shape[0]}",
                "instances_elevation": depth_records,
            },
        })

        # ---------------------------------------------------------------------
        # 5. Occlusion Analysis & Hidden Surface Reconstruction
        # ---------------------------------------------------------------------
        t0 = time.perf_counter()
        self.occlusion_detector.analyze_scene(
            food_instances,
            depth_map,
            pixels_per_cm=calibration.pixels_per_cm
        )
        t_occl = (time.perf_counter() - t0) * 1000

        occlusion_records = [
            {
                "food_class": inst.food_class,
                "visible_area_cm2": round(float(inst.visible_area_cm2), 1),
                "estimated_total_area_cm2": round(float(inst.estimated_total_area_cm2 or inst.visible_area_cm2), 1),
                "occlusion_probability": round(float(inst.occlusion_probability), 2),
                "reconstruction_factor": round(float((inst.estimated_total_area_cm2 or inst.visible_area_cm2) / max(inst.visible_area_cm2, 0.01)), 2),
            }
            for inst in food_instances
        ]

        occl_summary = [f"{o['food_class']}: P_occ={o['occlusion_probability']}, vis={o['visible_area_cm2']}cm² -> tot={o['estimated_total_area_cm2']}cm²" for o in occlusion_records]
        print(f"\n▶ [5/9] Occlusion Analysis & 3D Reconstruction | {t_occl:.1f}ms")
        print(f"  File: backend/food_portion/occlusion/occlusion_detector.py | Func: OcclusionDetector.analyze_scene()")
        print(f"  Occlusion Results: {occl_summary}")

        trace.append({
            "stage": 5,
            "name": "Occlusion Analysis & Surface Reconstruction",
            "file": "backend/food_portion/occlusion/occlusion_detector.py",
            "class": "OcclusionDetector",
            "function": "analyze_scene(food_instances, depth_map, pixels_per_cm)",
            "duration_ms": round(t_occl, 1),
            "input": {"items_evaluated": len(food_instances)},
            "output": {
                "occlusion_metrics": occlusion_records,
            },
        })

        # ---------------------------------------------------------------------
        # 6. Category-Specific 3D Volumetric Integration
        # ---------------------------------------------------------------------
        t0 = time.perf_counter()
        volume_records = []
        for inst in food_instances:
            vol = self.volume_estimator.estimate(inst, depth_map, calibration)
            inst.volume_cm3 = vol
            shape_cat = getattr(inst, "shape_category", None) or "pieces"
            volume_records.append({
                "food_class": inst.food_class,
                "shape_category": shape_cat,
                "volume_cm3": round(float(vol), 1),
            })
        t_vol = (time.perf_counter() - t0) * 1000

        vol_summary = [f"{v['food_class']} ({v['shape_category']}) = {v['volume_cm3']} cm³" for v in volume_records]
        print(f"\n▶ [6/9] 3D Volumetric Integration | {t_vol:.1f}ms")
        print(f"  File: backend/food_portion/geometry/volume_estimator.py | Func: VolumeEstimator.estimate()")
        print(f"  Calculated Volumes: {vol_summary}")

        trace.append({
            "stage": 6,
            "name": "3D Volumetric Integration",
            "file": "backend/food_portion/geometry/volume_estimator.py",
            "class": "VolumeEstimator",
            "function": "estimate(instance, depth_map, calibration)",
            "duration_ms": round(t_vol, 1),
            "input": {"shape_strategies": ["PileVolumeEstimator", "FlatFoodVolumeEstimator", "LiquidVolumeEstimator", "PieceFoodVolumeEstimator"]},
            "output": {
                "volumes": volume_records,
            },
        })

        # ---------------------------------------------------------------------
        # 7. Empirical Density & Mass Calculation
        # ---------------------------------------------------------------------
        t0 = time.perf_counter()
        mass_records = []
        for inst in food_instances:
            self.mass_estimator.predict(inst, calibration)
            density_val = getattr(inst, "density_g_cm3", None) or 0.0
            mass_records.append({
                "food_class": inst.food_class,
                "density_g_cm3": round(float(density_val), 3),
                "volume_cm3": round(float(inst.volume_cm3 or 0.0), 1),
                "calculated_mass_g": round(float(inst.mass_g or 0.0), 1),
            })
        t_mass = (time.perf_counter() - t0) * 1000

        mass_summary = [f"{m['food_class']}: {m['calculated_mass_g']}g (ρ={m['density_g_cm3']}g/cm³)" for m in mass_records]
        print(f"\n▶ [7/9] Food Density & Mass Estimation | {t_mass:.1f}ms")
        print(f"  File: backend/food_portion/nutrition/mass_estimator.py | Func: MassEstimator.predict()")
        print(f"  Mass Results: {mass_summary}")

        trace.append({
            "stage": 7,
            "name": "Food Density & Mass Estimation",
            "file": "backend/food_portion/nutrition/mass_estimator.py",
            "class": "MassEstimator",
            "function": "predict(instance, calibration)",
            "duration_ms": round(t_mass, 1),
            "input": {"density_table": "backend/food_portion/config.py (FOOD_DENSITIES)"},
            "output": {
                "mass_estimates": mass_records,
            },
        })

        # ---------------------------------------------------------------------
        # 8. Uncertainty Quantification & Prediction Range
        # ---------------------------------------------------------------------
        t0 = time.perf_counter()
        uncertainty_records = []
        for inst in food_instances:
            self.confidence_estimator.evaluate_instance(inst, calibration)
            uncertainty_records.append({
                "food_class": inst.food_class,
                "confidence_score": round(float(inst.confidence), 2),
                "mass_prediction_interval_g": list(inst.mass_range_g) if inst.mass_range_g else [],
            })

        scene_assessment = self.confidence_estimator.assess_scene(food_instances, calibration)
        t_conf = (time.perf_counter() - t0) * 1000

        pred_summary = [f"{u['food_class']}: [{u['mass_prediction_interval_g'][0]}-{u['mass_prediction_interval_g'][1]}]g (conf={u['confidence_score']})" for u in uncertainty_records]
        print(f"\n▶ [8/9] Uncertainty Quantification & Prediction Intervals | {t_conf:.1f}ms")
        print(f"  File: backend/food_portion/uncertainty/confidence.py | Func: ConfidenceEstimator.evaluate_instance() + assess_scene()")
        print(f"  Prediction Intervals: {pred_summary}")
        print(f"  Scene Assessment: needs_better_image={scene_assessment.get('needs_better_image')} (overall_conf={scene_assessment.get('overall_confidence')})")

        trace.append({
            "stage": 8,
            "name": "Uncertainty Quantification & Prediction Intervals",
            "file": "backend/food_portion/uncertainty/confidence.py",
            "class": "ConfidenceEstimator",
            "function": "evaluate_instance() + assess_scene()",
            "duration_ms": round(t_conf, 1),
            "input": {"confidence_alpha": 0.90},
            "output": {
                "instances_uncertainty": uncertainty_records,
                "scene_assessment": scene_assessment,
            },
        })

        # ---------------------------------------------------------------------
        # 9. Gemini Semantic Validation & Clinical Macros
        # ---------------------------------------------------------------------
        t0 = time.perf_counter()
        if gemini_model:
            self.gemini_validator.model = gemini_model

        gemini_result = self.gemini_validator.validate(
            food_instances,
            calibration,
            image_path=image_path
        )
        t_gem = (time.perf_counter() - t0) * 1000

        print(f"\n▶ [9/9] Gemini Semantic Validation | {t_gem:.1f}ms")
        print(f"  File: backend/food_portion/gemini/validator.py | Func: GeminiValidator.validate()")
        print(f"  Valid: {gemini_result.get('valid')} | Reasoning: {gemini_result.get('reasoning', '')[:90]}...")

        trace.append({
            "stage": 9,
            "name": "Gemini Semantic & Macro Validation",
            "file": "backend/food_portion/gemini/validator.py",
            "class": "GeminiValidator",
            "function": "validate(food_instances, calibration, image_path)",
            "duration_ms": round(t_gem, 1),
            "input": {"validated_items_count": len(food_instances)},
            "output": {
                "valid": gemini_result.get("valid", True),
                "reasoning": gemini_result.get("reasoning", ""),
                "item_macros": gemini_result.get("items", []),
            },
        })

        # Assemble final structured payload
        processed_items = []
        gemini_items = gemini_result.get("items", [])

        # Build maps by id and by name
        gemini_items_by_id = {}
        gemini_items_by_name = {}
        for item in gemini_items:
            if "id" in item:
                try:
                    gemini_items_by_id[int(item["id"])] = item
                except Exception:
                    pass
            gemini_items_by_name[item.get("food", "").lower()] = item

        total_mass = 0.0
        total_calories = 0.0
        used_gemini_items = set()

        for idx, inst in enumerate(food_instances):
            mass = inst.mass_g or 50.0

            # Match Gemini item by id first, then fallback to name or positional index
            gem_item = gemini_items_by_id.get(idx)
            if not gem_item:
                gem_item = gemini_items_by_name.get(inst.food_class.lower())
            if not gem_item and idx < len(gemini_items) and id(gemini_items[idx]) not in used_gemini_items:
                gem_item = gemini_items[idx]
            if not gem_item:
                gem_item = {}
            else:
                used_gemini_items.add(id(gem_item))

            # If Gemini validated/refined the mass plausibly, use it
            if gem_item.get("mass_g") and 5 <= float(gem_item["mass_g"]) <= 1500:
                mass = round(float(gem_item["mass_g"]), 1)

            total_mass += mass

            cals = gem_item.get("calories")
            if cals is None:
                cals = int(round(mass * 1.5))

            total_calories += cals

            # Prefer Gemini refined dish name if available
            display_name = gem_item.get("food") or inst.food_class.replace("-", " ").replace("_", " ").title()

            processed_items.append({
                "name": display_name,
                "food": display_name,
                "mass_g": mass,
                "mass_range_g": gem_item.get("mass_range_g") or (list(inst.mass_range_g) if inst.mass_range_g else [int(mass*0.8), int(mass*1.2)]),
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

        # Append any supplemented items detected by Gemini that CV missed (e.g. curries, meats, gravies)
        for g_item in gemini_items:
            if id(g_item) in used_gemini_items:
                continue
            is_supp = g_item.get("is_supplemented", False)
            g_id = g_item.get("id")
            if is_supp or (isinstance(g_id, int) and g_id >= len(food_instances)) or len(food_instances) == 0:
                s_mass = float(g_item.get("mass_g") or 100.0)
                s_cals = int(g_item.get("calories") or round(s_mass * 1.5))
                total_mass += s_mass
                total_calories += s_cals
                s_name = g_item.get("food") or "Side Dish"
                processed_items.append({
                    "name": s_name,
                    "food": s_name.lower(),
                    "mass_g": s_mass,
                    "mass_range_g": g_item.get("mass_range_g") or [int(s_mass * 0.8), int(s_mass * 1.2)],
                    "visible_area_cm2": 0.0,
                    "estimated_total_area_cm2": 0.0,
                    "estimated_volume_cm3": 0.0,
                    "occlusion_probability": 0.0,
                    "confidence": g_item.get("confidence") or 0.85,
                    "calories": s_cals,
                    "protein": g_item.get("protein", int(round(s_mass * 0.08))),
                    "carbs": g_item.get("carbs", int(round(s_mass * 0.15))),
                    "fat": g_item.get("fat", int(round(s_mass * 0.05))),
                    "fiber": g_item.get("fiber", 1),
                    "image": None,
                    "multiplier": 1.0,
                    "is_supplemented": True,
                })

        mask_path = "static/mask/image0.jpg"
        segmented_image = mask_path.replace("\\", "/") if os.path.exists(mask_path) else None

        total_pipeline_time = (time.perf_counter() - pipeline_start_t) * 1000

        print("\n" + "=" * 80)
        print(f" ✔ [PIPELINE COMPLETE] Total Time: {total_pipeline_time:.1f}ms")
        print(f"   Items: {len(processed_items)} | Total Mass: {total_mass:.1f}g | Total Calories: {total_calories:.0f} kcal")
        print("=" * 80 + "\n")

        return {
            "items": processed_items,
            "total_mass_g": round(total_mass, 1),
            "totalCalories": round(total_calories),
            "scale_calibration": {
                "pixels_per_cm": round(calibration.pixels_per_cm, 2),
                "cm_per_pixel": round(calibration.cm_per_pixel, 4),
                "plate_detected": calibration.plate_detected,
                "tilt_ratio": round(calibration.tilt_ratio, 2),
                "confidence": round(calibration.confidence, 2),
            },
            "scene_assessment": scene_assessment,
            "gemini_validation": {
                "valid": gemini_result.get("valid", True),
                "reasoning": gemini_result.get("reasoning", ""),
            },
            "segmentedImage": segmented_image,
            "pipeline_trace": trace,
            "pipeline_duration_ms": round(total_pipeline_time, 1),
        }
