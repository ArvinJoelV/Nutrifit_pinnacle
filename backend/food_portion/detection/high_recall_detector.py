"""High-Recall Food Detector with Soft-NMS and Container Slicing (SAHI).

Solves the multi-dish and Indian thali occlusion problem:
1. Runs full-image primary pass with class-aware Soft-NMS to preserve overlapping dishes (rice + dal).
2. Performs container-guided high-resolution slicing (SAHI): plate, bowl, and thali regions are
   inspected with sub-threshold sensitivity (conf=0.08) to detect small sides, garnishes,
   pickles, and condiments.
3. Completely backward-compatible with the standard FoodDetector interface.
"""

from typing import List, Tuple, Dict, Any, Optional
import numpy as np
import cv2
import os
import logging

from .yolo_detector import FoodDetector, Detection

logger = logging.getLogger("nutrifit.food_portion.high_recall")


def compute_iou(box1: Tuple[float, float, float, float], box2: Tuple[float, float, float, float]) -> float:
    """Computes Intersection over Union (IoU) between two bounding boxes (x1, y1, x2, y2)."""
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])

    inter_w = max(0.0, x2 - x1)
    inter_h = max(0.0, y2 - y1)
    inter_area = inter_w * inter_h

    area1 = max(1e-6, (box1[2] - box1[0]) * (box1[3] - box1[1]))
    area2 = max(1e-6, (box2[2] - box2[0]) * (box2[3] - box2[1]))
    union_area = area1 + area2 - inter_area

    return float(inter_area / union_area)


def soft_nms(
    detections: List[Detection],
    sigma: float = 0.5,
    score_threshold: float = 0.08,
    preserve_distinct_classes: bool = True,
) -> List[Detection]:
    """Applies Gaussian Soft-NMS to prevent premature suppression of overlapping foods."""
    if not detections:
        return []

    # Separate containers (plates, bowls) from food items
    containers = [d for d in detections if d.is_container]
    foods = [d for d in detections if not d.is_container]

    if len(foods) <= 1:
        return detections

    # Sort foods by confidence descending
    sorted_foods = sorted(foods, key=lambda d: d.confidence, reverse=True)
    kept_foods: List[Detection] = []

    while sorted_foods:
        best = sorted_foods.pop(0)
        kept_foods.append(best)

        remaining: List[Detection] = []
        for d in sorted_foods:
            iou = compute_iou(best.bbox, d.bbox)
            if iou > 0.0:
                # If distinct classes overlap (e.g. dal on rice, or pickle in thali),
                # apply milder decay so we don't discard the smaller or composite food
                if preserve_distinct_classes and d.class_name != best.class_name:
                    decay = np.exp(-(iou * iou) / (sigma * 1.5))
                else:
                    decay = np.exp(-(iou * iou) / sigma)

                decayed_conf = d.confidence * float(decay)
                if decayed_conf >= score_threshold:
                    d.confidence = round(decayed_conf, 3)
                    remaining.append(d)
            else:
                remaining.append(d)

        sorted_foods = sorted(remaining, key=lambda d: d.confidence, reverse=True)

    return containers + kept_foods


class HighRecallFoodDetector(FoodDetector):
    """Next-generation high-recall food detector with SAHI container slicing and Soft-NMS."""

    def __init__(self, model_path: Optional[str] = None):
        super().__init__(model_path=model_path)
        self.conf_threshold_primary = 0.18
        self.conf_threshold_slicing = 0.08

    def predict(self, image_path_or_array: Any) -> List[Detection]:
        """Detects food items with high recall, capturing small side items and overlapping layers."""
        # 1. Base detector pass
        base_detections = super().predict(image_path_or_array, conf_threshold=self.conf_threshold_primary)

        # 2. Extract image array
        if isinstance(image_path_or_array, str):
            image = cv2.imread(image_path_or_array)
        else:
            image = image_path_or_array

        if image is None or self.model is None:
            return base_detections

        h, w = image.shape[:2]
        containers = [d for d in base_detections if d.is_container]

        # 3. Container-Guided High-Resolution Slicing (SAHI)
        sliced_detections: List[Detection] = []
        for c in containers:
            cx1, cy1, cx2, cy2 = [int(v) for v in c.bbox]
            cx1 = max(0, cx1)
            cy1 = max(0, cy1)
            cx2 = min(w, cx2)
            cy2 = min(h, cy2)

            crop_w = cx2 - cx1
            crop_h = cy2 - cy1
            if crop_w < 60 or crop_h < 60:
                continue

            container_crop = image[cy1:cy2, cx1:cx2]

            try:
                # Sub-threshold inference inside the container region
                crop_results = self.model.predict(
                    source=container_crop,
                    conf=self.conf_threshold_slicing,
                    save=False,
                    verbose=False,
                )

                for res in crop_results:
                    boxes = res.boxes
                    if boxes is None or len(boxes) == 0:
                        continue
                    names = res.names or {}
                    for i in range(len(boxes)):
                        cls_id = int(boxes.cls[i])
                        conf = float(boxes.conf[i])
                        bx1, by1, bx2, by2 = boxes.xyxy[i].tolist()
                        class_name = names.get(cls_id, f"item_{cls_id}").strip().lower()

                        # Map crop coordinates back to full image coordinate space
                        global_bbox = (
                            float(cx1 + bx1),
                            float(cy1 + by1),
                            float(cx1 + bx2),
                            float(cy1 + by2),
                        )

                        sliced_detections.append(
                            Detection(
                                class_name=class_name,
                                confidence=conf,
                                bbox=global_bbox,
                                is_container=False,
                            )
                        )
            except Exception as exc:
                logger.debug("Container slicing exception: %s", exc)

        # 4. Merge base detections with sliced detections
        all_detections = base_detections + sliced_detections

        # 5. Apply Class-Aware Soft-NMS to deduplicate identical boxes while preserving distinct food layers
        refined_detections = soft_nms(
            all_detections,
            sigma=0.5,
            score_threshold=0.10,
            preserve_distinct_classes=True,
        )

        logger.info(
            "HighRecallFoodDetector: Initial=%d, Sliced=%d, Final Refined=%d",
            len(base_detections),
            len(sliced_detections),
            len(refined_detections),
        )
        return refined_detections
