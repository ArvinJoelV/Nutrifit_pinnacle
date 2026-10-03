"""SAM / SAM2 segmentation stage for food portion estimation."""

from dataclasses import dataclass, field
from typing import List, Tuple, Optional, Dict, Any
import numpy as np
import cv2
import os
import shutil
import time
try:
    from ultralytics import SAM
except ImportError:
    SAM = None
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
    """Generates instance-level visible masks using SAM / SAM2."""

    def __init__(self, model_path: str = "sam2_b.pt", crop_dir: str = "static/cropped_mask"):
        self.model_path = model_path
        self.crop_dir = crop_dir
        self.sam = None
        if SAM is not None and os.path.exists(model_path):
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
        """Runs SAM segmentation for all detected bounding boxes."""
        if not detections:
            return []

        h, w = image.shape[:2]

        if self.sam is None:
            instances: List[FoodInstance] = []
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

        h, w = image.shape[:2]
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
