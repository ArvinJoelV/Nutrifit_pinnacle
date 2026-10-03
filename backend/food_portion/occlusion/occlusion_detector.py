"""Multi-signal occlusion detection and hidden-area reconstruction."""

from typing import List, Tuple
import numpy as np
import cv2
from ..config import DEFAULT_HIDDEN_RATIO, DEFAULT_GENERIC_HIDDEN_RATIO
from ..segmentation.sam_segmenter import FoodInstance


def bbox_iou(box_a: Tuple[float, float, float, float], box_b: Tuple[float, float, float, float]) -> float:
    """Computes Intersection-over-Union between two bounding boxes."""
    ax1, ay1, ax2, ay2 = box_a
    bx1, by1, bx2, by2 = box_b

    ix1 = max(ax1, bx1)
    iy1 = max(ay1, by1)
    ix2 = min(ax2, bx2)
    iy2 = min(ay2, by2)

    iw = max(0.0, ix2 - ix1)
    ih = max(0.0, iy2 - iy1)
    intersection = iw * ih

    area_a = max(0.0, ax2 - ax1) * max(0.0, ay2 - ay1)
    area_b = max(0.0, bx2 - bx1) * max(0.0, by2 - by1)
    union = area_a + area_b - intersection

    if union <= 0.0:
        return 0.0
    return float(intersection / union)


class OcclusionDetector:
    """Detects visual occlusions between food instances using geometry, contours, and depth."""

    def analyze_scene(
        self,
        instances: List[FoodInstance],
        depth_map: np.ndarray,
        pixels_per_cm: float = 30.0,
    ):
        """Analyzes all pairs of instances, computes occlusion probability, and updates hidden areas."""
        n = len(instances)
        if n == 0:
            return

        # Ensure visible areas in cm^2 are populated first
        for inst in instances:
            inst.visible_area_cm2 = inst.visible_area_px / (pixels_per_cm ** 2)

        if n == 1:
            instances[0].occlusion_probability = 0.0
            instances[0].estimated_total_area_px = instances[0].visible_area_px
            instances[0].estimated_total_area_cm2 = instances[0].visible_area_cm2
            return

        # Kernel for morphological boundary dilation
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))

        for i in range(n):
            inst_a = instances[i]
            max_p_occ = 0.0
            twin_reconstructed_px = None
            is_top_twin = False

            for j in range(n):
                if i == j:
                    continue

                inst_b = instances[j]

                # 1. Bounding box IoU
                iou = bbox_iou(inst_a.bbox, inst_b.bbox)
                if iou < 0.02:
                    continue  # Disjoint objects cannot occlude each other

                # Check if this pair represents identical or batch items (e.g. 2 parottas, 2 rotis, 2 idlis)
                same_class = (inst_a.food_class.lower() == inst_b.food_class.lower())
                is_batch = any(k in inst_a.food_class.lower() for k in ["parotta", "paratha", "naan", "roti", "chapathi", "dosa", "idli", "vada", "puri", "poori", "pancake", "cutlet"])
                is_twin_candidate = (same_class or is_batch) and (inst_b.visible_area_px > 0)

                mask_a = inst_a.visible_mask
                mask_b = inst_b.visible_mask
                if mask_a is None or mask_b is None:
                    continue

                # Directional Twin-Item Asymmetry:
                # When identical circular/flat items overlap:
                # - The item with the larger continuous visible disk is in FRONT / on top.
                # - The smaller item is occluded underneath.
                if is_twin_candidate:
                    dilated_b = cv2.dilate(mask_b.astype(np.uint8), kernel)
                    has_contact = bool(np.any(np.logical_and(mask_a > 0, dilated_b > 0)))
                    if iou > 0.04 or has_contact:
                        if inst_a.visible_area_px >= inst_b.visible_area_px * 1.05:
                            # inst_a is on top of inst_b! inst_b CANNOT occlude inst_a.
                            is_top_twin = True
                            continue  # Skip applying occlusion to the top item from this twin
                        elif inst_b.visible_area_px > inst_a.visible_area_px * 1.05:
                            # inst_a is occluded underneath inst_b!
                            area_ratio = inst_a.visible_area_px / inst_b.visible_area_px
                            twin_p_occ = float(np.clip(1.0 - area_ratio + 0.15, 0.35, 0.90))
                            max_p_occ = max(max_p_occ, twin_p_occ)
                            candidate_px = inst_b.visible_area_px * 0.98
                            if twin_reconstructed_px is None or candidate_px > twin_reconstructed_px:
                                twin_reconstructed_px = candidate_px
                            continue

                # 2. Mask contour boundary contact for heterogeneous items
                dilated_b = cv2.dilate(mask_b.astype(np.uint8), kernel)
                boundary_contact = np.logical_and(mask_a > 0, dilated_b > 0)
                contact_len = np.sum(boundary_contact)

                perimeter_a = max(10, cv2.arcLength(cv2.findContours(mask_a.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)[0][0], True)) if np.sum(mask_a) > 0 else 100
                boundary_score = float(np.clip(contact_len / (perimeter_a * 0.5), 0.0, 1.0))

                # 3. Relative depth ordering (higher elevation = closer to camera / in front)
                stats_a = inst_a.depth_stats or {}
                stats_b = inst_b.depth_stats or {}

                mean_z_a = float(stats_a.get("mean_depth") or stats_a.get("mean") or 0.0)
                mean_z_b = float(stats_b.get("mean_depth") or stats_b.get("mean") or 0.0)

                # Depth difference: if B is higher than A, B is likely in front of A
                depth_diff = float(np.clip((mean_z_b - mean_z_a) / 1.5, 0.0, 1.0)) if (mean_z_b > 0 and mean_z_a > 0) else 0.0

                # 4. Mask interaction / direct overlap (if any)
                overlap_px = np.sum(np.logical_and(mask_a > 0, mask_b > 0))
                mask_interaction = float(overlap_px / max(1.0, inst_a.visible_area_px))

                # Combined multi-signal score
                p_occ = (
                    0.35 * iou +
                    0.35 * boundary_score +
                    0.20 * depth_diff +
                    0.10 * mask_interaction
                )
                p_occ = float(np.clip(p_occ, 0.0, 1.0))

                if p_occ > max_p_occ:
                    max_p_occ = p_occ

            # If this item was identified as the top unoccluded twin and has no other external occluders:
            if is_top_twin and max_p_occ < 0.15:
                max_p_occ = 0.0

            inst_a.occlusion_probability = round(max_p_occ, 2)

            # Reconstruct hidden area
            if twin_reconstructed_px is not None and twin_reconstructed_px > inst_a.visible_area_px:
                reconstructed_px = twin_reconstructed_px
            elif max_p_occ > 0.05:
                food_class = inst_a.food_class.lower()
                base_hidden_prior = DEFAULT_HIDDEN_RATIO.get(food_class, DEFAULT_GENERIC_HIDDEN_RATIO)
                effective_hidden_ratio = min(0.60, base_hidden_prior * (1.5 * max_p_occ))
                reconstructed_px = inst_a.visible_area_px / max(0.40, 1.0 - effective_hidden_ratio)
            else:
                reconstructed_px = inst_a.visible_area_px

            inst_a.estimated_total_area_px = float(reconstructed_px)
            inst_a.estimated_total_area_cm2 = float(reconstructed_px / (pixels_per_cm ** 2))
