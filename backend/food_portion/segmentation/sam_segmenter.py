"""SAM / SAM2 segmentation stage for food portion estimation."""

from dataclasses import dataclass, field
from typing import List, Tuple, Optional, Dict, Any
import numpy as np
import cv2
import os
import shutil
import time
try:
    from ultralytics import SAM, YOLO
except ImportError:
    SAM = None
    YOLO = None
from ..detection.yolo_detector import Detection


@dataclass
class FoodInstance:
    food_class: str
    bbox: Tuple[float, float, float, float]
    visible_mask: np.ndarray  # 2D boolean/binary uint8 mask of shape (H, W)

    detection_confidence: float = 0.0
    segmentation_confidence: float = 0.0

    occlusion_probability: float = 0.0

    visible_area_px: float = 0.0
    estimated_total_area_px: Optional[float] = None

    visible_area_cm2: float = 0.0
    estimated_total_area_cm2: Optional[float] = None

    depth_stats: Optional[Dict[str, float]] = None

    volume_cm3: Optional[float] = None
    mass_g: Optional[float] = None

    mass_range_g: Optional[Tuple[float, float]] = None
    confidence: float = 0.0
    shape_category: str = "pieces"
    density_g_cm3: Optional[float] = None
    crop_path: Optional[str] = None
    is_container: bool = False


class FoodSegmenter:
    """Generates instance-level visible masks using YOLO11-Seg (high speed) or SAM2 (baseline)."""

    def __init__(
        self,
        model_path: str = "sam2_b.pt",
        yolo_seg_model: Optional[str] = "yolo11s-seg.pt",
        crop_dir: str = "static/cropped_mask",
        prefer_yolo_seg: bool = True,
    ):
        self.model_path = model_path
        self.yolo_seg_model = yolo_seg_model
        self.crop_dir = crop_dir
        self.prefer_yolo_seg = prefer_yolo_seg
        self.sam = None
        self.yolo_seg = None

        if YOLO is not None and prefer_yolo_seg:
            seg_candidates = [
                yolo_seg_model,
                "yolo11s-seg.pt",
                "yolo11n-seg.pt",
                os.path.join(os.path.dirname(__file__), "..", "..", "..", "yolo11s-seg.pt"),
                os.path.join(os.path.dirname(__file__), "..", "..", "yolo11s-seg.pt"),
            ]
            for cand in seg_candidates:
                if cand and os.path.exists(cand):
                    try:
                        self.yolo_seg = YOLO(cand)
                        break
                    except Exception:
                        continue
            if self.yolo_seg is None:
                try:
                    self.yolo_seg = YOLO("yolo11s-seg.pt")
                except Exception:
                    self.yolo_seg = None

        if self.yolo_seg is None and SAM is not None and os.path.exists(model_path):
            try:
                self.sam = SAM(model_path)
            except Exception:
                self.sam = None
        os.makedirs(self.crop_dir, exist_ok=True)

    def segment(
        self,
        image: np.ndarray,
        detections: List[Detection],
        save_crops: bool = True
    ) -> List[FoodInstance]:
        """Runs single-pass YOLO11-Seg (fast mode) or SAM2 segmentation for all detected bounding boxes."""
        if not detections:
            return []

        h, w = image.shape[:2]

        # 1. High-Speed YOLO11-Seg Instance Mask Extraction (~80-120ms)
        if self.yolo_seg is not None:
            try:
                run_id = int(time.time() * 1000) % 1000000
                seg_res = self.yolo_seg(image, conf=0.10, verbose=False)[0]
                yolo_masks = []
                yolo_boxes = []
                if seg_res.masks is not None and len(seg_res.masks) > 0:
                    raw_masks = seg_res.masks.data.cpu().numpy()
                    raw_boxes = seg_res.boxes.xyxy.cpu().numpy()
                    for m_idx, rm in enumerate(raw_masks):
                        if rm.shape[:2] != (h, w):
                            m_full = cv2.resize(rm.astype(np.uint8), (w, h), interpolation=cv2.INTER_NEAREST)
                        else:
                            m_full = rm.astype(np.uint8)
                        yolo_masks.append(m_full)
                        yolo_boxes.append(raw_boxes[m_idx])

                instances: List[FoodInstance] = []
                for det_idx, det in enumerate(detections):
                    det_box = det.bbox  # (x1, y1, x2, y2)
                    best_mask = None
                    best_iou = 0.0

                    # If detection already has its own mask
                    if det.mask is not None and det.mask.shape[:2] == (h, w):
                        best_mask = det.mask.astype(np.uint8)
                    elif yolo_masks:
                        # Match with highest IoU YOLO11-Seg mask
                        dx1, dy1, dx2, dy2 = det_box
                        d_area = max(1.0, (dx2 - dx1) * (dy2 - dy1))
                        for y_box, y_mask in zip(yolo_boxes, yolo_masks):
                            yx1, yy1, yx2, yy2 = y_box
                            y_area = max(1.0, (yx2 - yx1) * (yy2 - yy1))
                            ix1 = max(dx1, yx1)
                            iy1 = max(dy1, yy1)
                            ix2 = min(dx2, yx2)
                            iy2 = min(dy2, yy2)
                            inter = max(0.0, ix2 - ix1) * max(0.0, iy2 - iy1)
                            iou = inter / (d_area + y_area - inter)
                            if iou > best_iou and iou > 0.20:
                                best_iou = iou
                                best_mask = y_mask.copy()

                    # Fallback to smooth elliptical contour if no YOLO mask matched
                    if best_mask is None or np.sum(best_mask) == 0:
                        best_mask = np.zeros((h, w), dtype=np.uint8)
                        x1, y1, x2, y2 = [int(v) for v in det_box]
                        center = ((x1 + x2) // 2, (y1 + y2) // 2)
                        axes = (max(2, (x2 - x1) // 2), max(2, (y2 - y1) // 2))
                        cv2.ellipse(best_mask, center, axes, 0, 0, 360, 255, -1)

                    # Constrain mask to bounding box margins
                    bx1, by1, bx2, by2 = [int(v) for v in det_box]
                    pad_x = int((bx2 - bx1) * 0.15)
                    pad_y = int((by2 - by1) * 0.15)
                    clip_mask = np.zeros((h, w), dtype=np.uint8)
                    clip_mask[max(0, by1 - pad_y):min(h, by2 + pad_y), max(0, bx1 - pad_x):min(w, bx2 + pad_x)] = 1
                    final_mask = (best_mask > 0) & (clip_mask > 0)
                    final_mask = final_mask.astype(np.uint8)

                    vis_px = float(np.sum(final_mask > 0))

                    # Crop saving for visual confirmation in UI
                    crop_path = None
                    if save_crops and vis_px > 0:
                        ys, xs = np.where(final_mask > 0)
                        if len(xs) > 0 and len(ys) > 0:
                            x_min, x_max = max(0, xs.min()), min(w, xs.max() + 1)
                            y_min, y_max = max(0, ys.min()), min(h, ys.max() + 1)
                            masked_img = cv2.bitwise_and(image, image, mask=final_mask)
                            crop = masked_img[y_min:y_max, x_min:x_max]
                            if crop.size > 0:
                                crop_path = os.path.join(self.crop_dir, f"crop_{run_id}_{det_idx}.jpg")
                                cv2.imwrite(crop_path, crop)
                                crop_path = crop_path.replace("\\", "/")

                    instances.append(
                        FoodInstance(
                            food_class=det.class_name,
                            bbox=det.bbox,
                            visible_mask=final_mask,
                            detection_confidence=det.confidence,
                            segmentation_confidence=0.92 if best_iou > 0.20 else 0.82,
                            visible_area_px=vis_px,
                            crop_path=crop_path,
                            is_container=det.is_container,
                        )
                    )

                if instances:
                    return instances
            except Exception:
                pass

        # 2. Baseline SAM / SAM2 Fallback (~6000ms)
        if self.sam is None:
            instances = []
            for d in detections:
                x1, y1, x2, y2 = [int(v) for v in d.bbox]
                x1, y1 = max(0, x1), max(0, y1)
                x2, y2 = min(w, x2), min(h, y2)
                mask = np.zeros((h, w), dtype=np.uint8)
                center = ((x1 + x2) // 2, (y1 + y2) // 2)
                axes = (max(1, (x2 - x1) // 2), max(1, (y2 - y1) // 2))
                cv2.ellipse(mask, center, axes, 0, 0, 360, 255, -1)
                vis_px = float(np.sum(mask > 0))
                instances.append(
                    FoodInstance(
                        food_class=d.class_name,
                        bbox=d.bbox,
                        visible_mask=mask,
                        visible_area_px=vis_px,
                        detection_confidence=d.confidence,
                        segmentation_confidence=0.85,
                        is_container=d.is_container,
                    )
                )
            return instances

        bboxes = [list(d.bbox) for d in detections]

        sam_results = self.sam(
            image,
            bboxes=bboxes,
            verbose=False,
            device="cpu",
            save=False,
        )

        instances: List[FoodInstance] = []
        mask_idx = 0
        run_id = int(time.time() * 1000) % 1000000

        for r_idx, sam_res in enumerate(sam_results):
            if sam_res.masks is None or sam_res.masks.data is None:
                continue

            masks = sam_res.masks.data.cpu().numpy()

            for i, mask in enumerate(masks):
                det = detections[i] if i < len(detections) else detections[-1]

                # Resize mask back to original image dimensions if needed
                if mask.shape[:2] != (h, w):
                    mask_full = cv2.resize(mask.astype(np.uint8), (w, h), interpolation=cv2.INTER_NEAREST)
                else:
                    mask_full = mask.astype(np.uint8)

                visible_area_px = float(np.sum(mask_full > 0))

                # Create crop if requested
                crop_path = None
                if save_crops and visible_area_px > 0:
                    ys, xs = np.where(mask_full > 0)
                    if len(xs) > 0 and len(ys) > 0:
                        x_min, x_max = max(0, xs.min()), min(w, xs.max() + 1)
                        y_min, y_max = max(0, ys.min()), min(h, ys.max() + 1)
                        masked_img = cv2.bitwise_and(image, image, mask=mask_full)
                        crop = masked_img[y_min:y_max, x_min:x_max]
                        if crop.size > 0:
                            crop_path = os.path.join(self.crop_dir, f"crop_{run_id}_{mask_idx}.jpg")
                            cv2.imwrite(crop_path, crop)
                            crop_path = crop_path.replace("\\", "/")

                # Estimate segmentation confidence from SAM mask quality/compactness
                seg_conf = float(sam_res.masks.conf[i]) if hasattr(sam_res.masks, "conf") and sam_res.masks.conf is not None else 0.85

                instances.append(
                    FoodInstance(
                        food_class=det.class_name,
                        bbox=det.bbox,
                        visible_mask=mask_full,
                        detection_confidence=det.confidence,
                        segmentation_confidence=seg_conf,
                        visible_area_px=visible_area_px,
                        crop_path=crop_path,
                        is_container=det.is_container,
                    )
                )
                mask_idx += 1

        # Fallback if SAM failed to produce any masks
        if not instances and detections:
            for det in detections:
                x1, y1, x2, y2 = [int(v) for v in det.bbox]
                box_mask = np.zeros((h, w), dtype=np.uint8)
                box_mask[max(0, y1):min(h, y2), max(0, x1):min(w, x2)] = 1
                instances.append(
                    FoodInstance(
                        food_class=det.class_name,
                        bbox=det.bbox,
                        visible_mask=box_mask,
                        detection_confidence=det.confidence,
                        segmentation_confidence=0.5,
                        visible_area_px=float((x2 - x1) * (y2 - y1)),
                        is_container=det.is_container,
                    )
                )

        return instances
