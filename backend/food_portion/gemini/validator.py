"""Gemini semantic validation and explainability module for food portion estimation."""

import json
import logging
import re
from typing import Dict, Any, List, Optional
from ..segmentation.sam_segmenter import FoodInstance
from ..calibration.scale_estimator import ScaleCalibration

logger = logging.getLogger(__name__)


def _clean_json(text: str) -> Dict[str, Any]:
    cleaned = re.sub(r"```json|```", "", text or "").strip()
    if not cleaned:
        return {}
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        candidate = cleaned[start : end + 1]
        try:
            return json.loads(candidate)
        except Exception:
            pass
    try:
        return json.loads(cleaned)
    except Exception:
        return {}


class GeminiValidator:
    """Validates CV measurements and provides semantic nutrition reasoning using Gemini."""

    def __init__(self, model_instance=None):
        self.model = model_instance

    def validate(
        self,
        instances: List[FoodInstance],
        calibration: ScaleCalibration,
        image_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """Validates physically measured geometry and extracts calibrated nutrition."""
        measurements = []
        for idx, inst in enumerate(instances):
            if isinstance(inst, dict):
                measurements.append({
                    "id": idx,
                    "detected_food": inst.get("food_class") or inst.get("name", "food"),
                    "visible_area_cm2": round(float(inst.get("visible_area_cm2", 0.0)), 1),
                    "estimated_total_area_cm2": round(float(inst.get("estimated_total_area_cm2") or inst.get("visible_area_cm2", 0.0)), 1),
                    "estimated_volume_cm3": round(float(inst.get("estimated_volume_cm3") or inst.get("volume_cm3") or 0.0), 1),
                    "estimated_mass_g": float(inst.get("mass_g") or 0.0),
                    "mass_range_g": list(inst.get("mass_range_g") or [40, 60]),
                    "occlusion_probability": float(inst.get("occlusion_probability", 0.0)),
                    "confidence": float(inst.get("confidence", 0.8)),
                })
            else:
                measurements.append({
                    "id": idx,
                    "detected_food": inst.food_class,
                    "visible_area_cm2": round(inst.visible_area_cm2, 1),
                    "estimated_total_area_cm2": round(inst.estimated_total_area_cm2 or inst.visible_area_cm2, 1),
                    "estimated_volume_cm3": round(inst.volume_cm3 or 0.0, 1),
                    "estimated_mass_g": inst.mass_g,
                    "mass_range_g": list(inst.mass_range_g) if inst.mass_range_g else [40, 60],
                    "occlusion_probability": inst.occlusion_probability,
                    "confidence": inst.confidence,
                })

        if not self.model:
            # Offline fallback when model is not available
            fallback_items = []
            for m in measurements:
                food_name = m.get("detected_food", "food")
                mass = float(m.get("estimated_mass_g") or 50.0)
                fallback_items.append({
                    "id": m.get("id", 0),
                    "food": food_name.replace("-", " ").replace("_", " ").title(),
                    "name": food_name.replace("-", " ").replace("_", " ").title(),
                    "mass_g": mass,
                    "mass_range_g": m.get("mass_range_g") or [int(mass * 0.8), int(mass * 1.2)],
                    "calories": int(round(mass * 1.5)),
                    "protein": int(round(mass * 0.07)),
                    "carbs": int(round(mass * 0.22)),
                    "fat": int(round(mass * 0.04)),
                    "fiber": 1,
                    "confidence": m.get("confidence", 0.7),
                    "is_supplemented": False,
                })
            return {
                "valid": True,
                "items": fallback_items,
                "item_macros": fallback_items,
                "reasoning": "Physics-based geometry measurement computed without LLM overrides.",
            }

        px_per_cm = (
            calibration.get("pixels_per_cm", 10.0)
            if isinstance(calibration, dict)
            else getattr(calibration, "pixels_per_cm", 10.0)
        )
        plate_det = (
            calibration.get("plate_detected", False)
            if isinstance(calibration, dict)
            else getattr(calibration, "plate_detected", False)
        )

        prompt = f"""
You are an expert clinical dietitian and computer vision validator.
The CV pipeline has physically measured food volume, reference scale, depth elevation, and occlusion for a meal:

Detected Plate: {round(px_per_cm, 1)} px/cm (detected: {plate_det})
Physical Measurements:
{json.dumps(measurements, indent=2)}

Tasks:
1. IDENTIFY AUTHENTIC DISHES WITH HIGH VISUAL FIDELITY:
   Examine the image and check each item's detected label. If an item was misclassified (e.g. papad misclassified as chapathi, parotta misclassified as naan) or has a generic name (e.g. "curry / sabzi", "pickle / chutney"), REFINE and CORRECT the "food" name to the exact authentic dish name visible in the image (e.g., "Roasted Papad", "Palak Paneer", "Aloo Gobi / Cauliflower Sabzi", "Mango Pickle", "Yellow Dal", "Plain Rice", "Aloo Paratha / Roti").

   CRITICAL INDIAN CUISINE & VEGETARIAN FIDELITY RULE:
   In authentic Indian meals and Thalis (containing Dal, Rice, Roti/Paratha, Papad, and Pickle):
   - Red/orange spiced curries with chunks/cubes are almost always VEGETARIAN:
     * Cubes in spiced gravy/masala = PANEER (e.g. "Palak Paneer", "Kadai Paneer", "Paneer Bhurji"), NOT chicken!
     * Cauliflower florets or potato pieces = ALOO GOBI or VEGETABLE SABZI, NOT chicken!
     * Dark seasoned condiment in a small bowl = MANGO PICKLE or SPICY CHUTNEY, NOT meat!
     * Yellow lentil soup in a small bowl = YELLOW DAL / DAL TADKA, NOT sandwich or bread!
   - Generic object detectors often mislabel red/orange vegetarian gravies as "tandoori-chicken" or "fried-chicken". DO NOT classify dishes as chicken or poultry unless actual chicken bones or meat fibers are visibly unmistakable. On vegetarian thalis, identify curries by their true vegetarian ingredients.

2. CONTAINER FIDELITY & EXACT ITEM MATCHING:
   - Match each physically detected item by its exact integer "id" (0 to {len(instances) - 1}).
   - The detected physical items ({len(instances)}) correspond to the distinct bowls and plate portions.
   - Do NOT add redundant or hallucinated items if all physical bowls and plate regions are already accounted for.

3. VERIFY ESTIMATED MASS:
   Check if the physically estimated grams match reality for the visual portion on the plate. If the CV pipeline under- or over-estimated the portion, adjust "mass_g" to the realistic serving mass.

4. Compute exact macronutrients (calories, protein, carbs, fat, fiber) tailored specifically to the grams of each item.
5. Provide a brief 1-2 sentence clinical nutrition explanation.

Output ONLY a JSON object:
{{
  "valid": true,
  "items": [
    {{
      "id": 0,
      "food": "Accurate Dish Name",
      "mass_g": 180,
      "mass_range_g": [160, 205],
      "calories": 240,
      "protein": 6,
      "carbs": 48,
      "fat": 2,
      "fiber": 2,
      "confidence": 0.85,
      "is_supplemented": false
    }}
  ],
  "reasoning": "Brief explanation of meal composition and physical scale validation."
}}
"""
        try:
            import os
            from PIL import Image
            resolved_img_path = None
            if image_path:
                candidates = [
                    image_path,
                    os.path.abspath(image_path),
                    os.path.join(os.path.dirname(__file__), "..", "..", image_path),
                    os.path.join(os.path.dirname(__file__), "..", "..", "..", image_path),
                    os.path.join(os.path.dirname(__file__), "..", "..", "..", "static", "uploads", os.path.basename(image_path)),
                    os.path.join(os.path.dirname(__file__), "..", "..", "static", "uploads", os.path.basename(image_path)),
                ]
                for p in candidates:
                    if p and os.path.exists(p) and os.path.isfile(p):
                        resolved_img_path = p
                        break
            img = Image.open(resolved_img_path) if resolved_img_path else None
            inputs = [prompt, img] if img else [prompt]
            response = self.model.generate_content(inputs)
            data = _clean_json(response.text)
            if data and "items" in data and isinstance(data["items"], list):
                # Ensure each item has both "name" and "food" populated
                for it in data["items"]:
                    dish_name = it.get("food") or it.get("name") or "Food Item"
                    it["food"] = dish_name
                    it["name"] = dish_name
                data["item_macros"] = data["items"]
                return data
        except Exception as exc:
            logger.warning(f"Gemini portion validation failed, using raw physics measurements: {exc}")

        fallback_items = []
        for m in measurements:
            food_name = m.get("detected_food", "food")
            mass = float(m.get("estimated_mass_g") or 50.0)
            fallback_items.append({
                "id": m.get("id", 0),
                "food": food_name.replace("-", " ").replace("_", " ").title(),
                "name": food_name.replace("-", " ").replace("_", " ").title(),
                "mass_g": mass,
                "mass_range_g": m.get("mass_range_g") or [int(mass * 0.8), int(mass * 1.2)],
                "calories": int(round(mass * 1.5)),
                "protein": int(round(mass * 0.07)),
                "carbs": int(round(mass * 0.22)),
                "fat": int(round(mass * 0.04)),
                "fiber": 1,
                "confidence": m.get("confidence", 0.7),
                "is_supplemented": False,
            })
        return {
            "valid": True,
            "items": fallback_items,
            "item_macros": fallback_items,
            "reasoning": "Measured physical volume and density applied.",
        }
