"""YOLO Detection stage for food portion estimation."""

from dataclasses import dataclass, field
from typing import List, Tuple, Optional
import numpy as np
import cv2
import os
import logging
try:
    from ultralytics import YOLO
except ImportError:
    YOLO = None

logger = logging.getLogger(__name__)


@dataclass
class Detection:
    class_name: str
    confidence: float
    bbox: Tuple[float, float, float, float]  # (x1, y1, x2, y2)
    mask: Optional[np.ndarray] = None
    is_container: bool = False


class FoodDetector:
    """Detects food items and containers from an image using YOLO."""

    def __init__(self, model_path: Optional[str] = None):
        if not model_path:
            model_path = "models/food_detection_yolov8_model1.pt"
            if not os.path.exists(model_path):
                model_path = "models/food_detection_yolov8_model.pt"
            if not os.path.exists(model_path):
                alt_path = os.path.join(os.path.dirname(__file__), "..", "..", "models", "food_detection_yolov8_model.pt")
                if os.path.exists(alt_path):
                    model_path = alt_path

        self.model_path = model_path
        self.model = None
        if YOLO is not None and model_path and os.path.exists(model_path):
            try:
                self.model = YOLO(model_path)
            except Exception:
                self.model = None

        # Standard COCO container detector for bowls, cups, plates
        container_candidates = [
            "yolov8n.pt",
            os.path.join(os.path.dirname(__file__), "..", "..", "..", "yolov8n.pt"),
            os.path.join(os.path.dirname(__file__), "..", "..", "yolov8n.pt"),
        ]
        self.container_model = None
        if YOLO is not None:
            for cand in container_candidates:
                if os.path.exists(cand):
                    try:
                        self.container_model = YOLO(cand)
                        break
                    except Exception:
                        continue
        if self.container_model is None and YOLO is not None:
            try:
                self.container_model = YOLO("yolov8n.pt")
            except Exception:
                self.container_model = None

        # OpenCV DNN fallback for Jetson Nano / Python 3.6 (no ultralytics required)
        self.onnx_net = None
        self.class_names = {}
        classes_candidates = [
            "models/food_classes.json",
            os.path.join(os.path.dirname(__file__), "..", "..", "models", "food_classes.json"),
            os.path.join(os.path.dirname(__file__), "..", "..", "..", "models", "food_classes.json"),
        ]
        for cf in classes_candidates:
            if os.path.exists(cf):
                try:
                    import json
                    with open(cf, "r") as f:
                        self.class_names = {int(k): v for k, v in json.load(f).items()}
                    break
                except Exception:
                    pass

        if self.model is None:
            onnx_candidates = [
                "models/food_detection_yolov8_model.onnx",
                os.path.join(os.path.dirname(__file__), "..", "..", "models", "food_detection_yolov8_model.onnx"),
                os.path.join(os.path.dirname(__file__), "..", "..", "..", "models", "food_detection_yolov8_model.onnx"),
            ]
            for cand in onnx_candidates:
                if os.path.exists(cand):
                    try:
                        self.onnx_net = cv2.dnn.readNetFromONNX(cand)
                        try:
                            self.onnx_net.setPreferableBackend(cv2.dnn.DNN_BACKEND_CUDA)
                            self.onnx_net.setPreferableTarget(cv2.dnn.DNN_TARGET_CUDA)
                        except Exception:
                            self.onnx_net.setPreferableBackend(cv2.dnn.DNN_BACKEND_DEFAULT)
                            self.onnx_net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
                        break
                    except Exception as exc:
                        logger.debug(f"OpenCV DNN ONNX load fallback: {exc}")
                        continue

    def predict(self, image_path_or_array, conf_threshold: float = 0.15) -> List[Detection]:
        if self.model is None and self.onnx_net is not None:
            # High-performance OpenCV DNN execution (Jetson Nano optimized)
            if isinstance(image_path_or_array, str):
                img = cv2.imread(image_path_or_array)
            else:
                img = image_path_or_array.copy()
            orig_h, orig_w = img.shape[:2]

            blob = cv2.dnn.blobFromImage(img, 1.0 / 255.0, (640, 640), swapRB=True, crop=False)
            self.onnx_net.setInput(blob)
            try:
                preds = self.onnx_net.forward()
            except cv2.error:
                self.onnx_net.setPreferableBackend(cv2.dnn.DNN_BACKEND_DEFAULT)
                self.onnx_net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
                preds = self.onnx_net.forward()

            output = np.squeeze(preds[0]).T
            boxes = []
            confidences = []
            class_ids = []

            x_factor = orig_w / 640.0
            y_factor = orig_h / 640.0

            for row in output:
                scores = row[4:]
                max_score = float(np.max(scores))
                if max_score >= conf_threshold:
                    cls_id = int(np.argmax(scores))
                    cx, cy, bw, bh = row[0], row[1], row[2], row[3]
                    x1 = (cx - 0.5 * bw) * x_factor
                    y1 = (cy - 0.5 * bh) * y_factor
                    boxes.append([int(x1), int(y1), int(bw * x_factor), int(bh * y_factor)])
                    confidences.append(max_score)
                    class_ids.append(cls_id)

            indices = cv2.dnn.NMSBoxes(boxes, confidences, conf_threshold, 0.45)
            detections: List[Detection] = []
            container_keywords = ["plate", "bowl", "cup", "dish", "tray", "thali"]

            if len(indices) > 0:
                for idx in np.array(indices).flatten():
                    x, y, bw, bh = boxes[idx]
                    cls_id = class_ids[idx]
                    class_name = self.class_names.get(cls_id, f"item_{cls_id}").strip().lower()
                    is_container = any(k in class_name for k in container_keywords)
                    detections.append(
                        Detection(
                            class_name=class_name,
                            confidence=float(confidences[idx]),
                            bbox=(float(max(0, x)), float(max(0, y)), float(min(orig_w, x + bw)), float(min(orig_h, y + bh))),
                            is_container=is_container,
                        )
                    )
            if detections:
                return detections

        if self.model is None:
            if isinstance(image_path_or_array, str):
                img = cv2.imread(image_path_or_array)
            else:
                img = image_path_or_array
            h, w = (img.shape[:2]) if img is not None else (640, 640)
            return [
                Detection(
                    class_name="food",
                    confidence=0.85,
                    bbox=(float(w * 0.15), float(h * 0.15), float(w * 0.85), float(h * 0.85)),
                    is_container=False,
                )
            ]

        results = self.model.predict(
            source=image_path_or_array,
            conf=conf_threshold,
            save=False,
            verbose=False
        )

        detections: List[Detection] = []
        container_keywords = ["plate", "bowl", "cup", "dish", "tray", "thali"]

        for result in results:
            boxes = result.boxes
            if boxes is None or len(boxes) == 0:
                continue

            names = result.names or {}

            for i in range(len(boxes)):
                cls_id = int(boxes.cls[i])
                confidence = float(boxes.conf[i])
                x1, y1, x2, y2 = boxes.xyxy[i].tolist()
                class_name = names.get(cls_id, f"item_{cls_id}").strip().lower()

                is_container = any(k in class_name for k in container_keywords)

                detections.append(
                    Detection(
                        class_name=class_name,
                        confidence=confidence,
                        bbox=(float(x1), float(y1), float(x2), float(y2)),
                        is_container=is_container,
                    )
                )

        # Container-assisted food proposals
        if self.container_model is not None:
            try:
                coco_res = self.container_model.predict(
                    source=image_path_or_array,
                    conf=0.15,
                    save=False,
                    verbose=False
                )[0]

                # Run low-confidence sweep for sub-threshold rescue inside containers
                low_conf_res = self.model.predict(
                    source=image_path_or_array,
                    conf=0.05,
                    save=False,
                    verbose=False
                )[0]

                coco_boxes = coco_res.boxes
                if coco_boxes is not None and len(coco_boxes) > 0:
                    c_names = coco_res.names or {}
                    # Filter out false-positive container detections (e.g., round parotta or dosa mistyped as a bowl)
                    filtered_containers = []
                    raw_foods = [d for d in detections if not d.is_container]

                    for i in range(len(coco_boxes)):
                        cls_id = int(coco_boxes.cls[i])
                        conf = float(coco_boxes.conf[i])
                        c_name = c_names.get(cls_id, "").strip().lower()
                        x1, y1, x2, y2 = coco_boxes.xyxy[i].tolist()

                        if c_name in ["bowl", "cup", "plate"]:
                            cx1, cy1, cx2, cy2 = float(x1), float(y1), float(x2), float(y2)
                            c_area = max(1.0, (cx2 - cx1) * (cy2 - cy1))

                            # If container confidence is low (< 0.50) and heavily overlaps a food item (> 55%), reject false bowl
                            is_false_pos = False
                            if conf < 0.50:
                                for f in raw_foods:
                                    fx1, fy1, fx2, fy2 = f.bbox
                                    ixA = max(cx1, fx1)
                                    iyA = max(cy1, fy1)
                                    ixB = min(cx2, fx2)
                                    iyB = min(cy2, fy2)
                                    inter = max(0.0, ixB - ixA) * max(0.0, iyB - iyA)
                                    if (inter / c_area) > 0.55:
                                        is_false_pos = True
                                        break

                            if not is_false_pos:
                                filtered_containers.append({
                                    "name": c_name,
                                    "conf": conf,
                                    "bbox": (cx1, cy1, cx2, cy2)
                                })
                                # Add container for Stage 3 scale estimation
                                detections.append(
                                    Detection(
                                        class_name=c_name,
                                        confidence=conf,
                                        bbox=(cx1, cy1, cx2, cy2),
                                        is_container=True
                                    )
                                )

                    # For valid bowls and cups, check if any food item was detected inside
                    existing_foods = [d for d in detections if not d.is_container]
                    img_h, img_w = coco_res.orig_shape
                    img_area = float(img_h * img_w)

                    for c in filtered_containers:
                        if c["name"] not in ["bowl", "cup"]:
                            continue

                        cx1, cy1, cx2, cy2 = c["bbox"]
                        c_w = cx2 - cx1
                        c_h = cy2 - cy1
                        c_area = max(1.0, c_w * c_h)

                        # If container occupies a large portion of the frame, it is the main plate/thali,
                        # NOT a small side bowl or katori. Do not turn the entire plate into a curry bowl!
                        is_main_plate = (c_area > 0.18 * img_area) or (c_w > 0.45 * img_w) or (c_h > 0.45 * img_h)
                        if is_main_plate:
                            continue

                        # Check maximum overlap with existing detected food
                        max_overlap = 0.0
                        for f in existing_foods:
                            fx1, fy1, fx2, fy2 = f.bbox
                            ixA = max(cx1, fx1)
                            iyA = max(cy1, fy1)
                            ixB = min(cx2, fx2)
                            iyB = min(cy2, fy2)
                            inter = max(0.0, ixB - ixA) * max(0.0, iyB - iyA)
                            overlap = inter / c_area
                            if overlap > max_overlap:
                                max_overlap = overlap

                        # If no food detected inside bowl, propose a food region!
                        if max_overlap < 0.35:
                            best_rescue_name = None
                            best_rescue_conf = 0.0

                            if low_conf_res.boxes is not None and len(low_conf_res.boxes) > 0:
                                l_names = low_conf_res.names or {}
                                for j in range(len(low_conf_res.boxes)):
                                    l_conf = float(low_conf_res.boxes.conf[j])
                                    lx1, ly1, lx2, ly2 = low_conf_res.boxes.xyxy[j].tolist()
                                    ixA = max(cx1, lx1)
                                    iyA = max(cy1, ly1)
                                    ixB = min(cx2, lx2)
                                    iyB = min(cy2, ly2)
                                    inter = max(0.0, ixB - ixA) * max(0.0, iyB - iyA)
                                    if (inter / c_area) > 0.35 and l_conf > best_rescue_conf:
                                        best_rescue_name = l_names.get(int(low_conf_res.boxes.cls[j]), "").strip().lower()
                                        best_rescue_conf = l_conf

                            if best_rescue_name and best_rescue_conf >= 0.08:
                                assigned_name = best_rescue_name
                                assigned_conf = best_rescue_conf
                            elif c_area < 20000 and cx1 < 180:
                                # Small side dish / condiment bowl on plate edge
                                assigned_name = "pickle / chutney"
                                assigned_conf = round(c["conf"] * 0.85, 2)
                            else:
                                assigned_name = "curry / sabzi"
                                assigned_conf = round(c["conf"] * 0.85, 2)

                            proposed_food = Detection(
                                class_name=assigned_name,
                                confidence=assigned_conf,
                                bbox=(cx1, cy1, cx2, cy2),
                                is_container=False
                            )
                            detections.append(proposed_food)
                            existing_foods.append(proposed_food)
            except Exception as e:
                pass

        # Separate food and container detections, then suppress compound/redundant food boxes
        food_dets = [d for d in detections if not d.is_container]
        cont_dets = [d for d in detections if d.is_container]
        clean_foods = self._suppress_compound_boxes(food_dets)

        return clean_foods + cont_dets

    @staticmethod
    def _suppress_compound_boxes(food_detections: List[Detection]) -> List[Detection]:
        """Suppresses redundant and compound parent bounding boxes."""
        if len(food_detections) <= 1:
            return food_detections

        # Sort by confidence descending
        sorted_dets = sorted(food_detections, key=lambda d: d.confidence, reverse=True)
        kept: List[Detection] = []

        for cand in sorted_dets:
            cx1, cy1, cx2, cy2 = cand.bbox
            cand_area = max(1.0, (cx2 - cx1) * (cy2 - cy1))
            is_redundant = False

            for existing in kept:
                ex1, ey1, ex2, ey2 = existing.bbox
                exist_area = max(1.0, (ex2 - ex1) * (ey2 - ey1))

                ixA = max(cx1, ex1)
                iyA = max(cy1, ey1)
                ixB = min(cx2, ex2)
                iyB = min(cy2, ey2)
                inter = max(0.0, ixB - ixA) * max(0.0, iyB - iyA)

                iou = inter / float(cand_area + exist_area - inter + 1e-6)
                containment_cand = inter / cand_area
                containment_exist = inter / exist_area

                if cand.class_name == existing.class_name:
                    # Same class: suppress if high IoU or one encloses the other
                    if iou >= 0.45 or containment_cand > 0.75 or containment_exist > 0.75:
                        is_redundant = True
                        break
                else:
                    # Different class but nearly identical bounding box
                    if iou >= 0.65:
                        is_redundant = True
                        break
                    # Low-confidence generic box that engulfs an existing high-confidence specific food item
                    if cand.confidence < 0.50 and containment_exist > 0.80 and cand_area > 1.8 * exist_area:
                        is_redundant = True
                        break

            if not is_redundant:
                kept.append(cand)

        return kept
