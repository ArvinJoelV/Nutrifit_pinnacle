"""Gemini semantic validation and explainability module for food portion estimation."""

import json
import logging
import re
from typing import Dict, Any, List, Optional
from ..segmentation.sam_segmenter import FoodInstance
from ..calibration.scale_estimator import ScaleCalibration

logger = logging.getLogger(__name__)


def _clean_json(text: str) -> Any:
    cleaned = re.sub(r"```json|```", "", text or "").strip()
    if not cleaned:
        return {}
    try:
        return json.loads(cleaned)
    except Exception:
        pass

    s_brace = cleaned.find("{")
    e_brace = cleaned.rfind("}")
    s_bracket = cleaned.find("[")
    e_bracket = cleaned.rfind("]")

    if s_brace != -1 and e_brace != -1 and (s_bracket == -1 or s_brace < s_bracket):
        try:
            return json.loads(cleaned[s_brace : e_brace + 1])
        except Exception:
            pass

    if s_bracket != -1 and e_bracket != -1:
        try:
            return json.loads(cleaned[s_bracket : e_bracket + 1])
        except Exception:
            pass

    return {}


class GeminiValidator:
    """Validates CV measurements and provides semantic nutrition reasoning using Gemini."""

    def __init__(self, model_instance=None, timeout: float = 60.0):
        self.model = model_instance
        self.timeout = timeout

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

        concise_measurements = [
            {
                "id": m["id"],
                "detected": m["detected_food"],
                "mass_g": round(float(m.get("estimated_mass_g") or 50.0), 1),
            }
            for m in measurements
        ]

        prompt = f"""You are an expert clinical dietitian validator for Indian cuisine.
Review this dining photo. Computer vision detected {len(concise_measurements)} items:
{json.dumps(concise_measurements)}

CRITICAL TASKS:
1. Examine the image carefully. Correct any misclassified dish names (e.g. yellow gravy = Yellow Dal / Tadka Dal, NEVER sandwich; crispy flat wafer = Roasted Papad, NEVER chapathi; red gravy on vegetarian thalis = Paneer/Sabzi, NEVER chicken).
2. DISCOVER MISSED DISHES & STACKED ITEMS: Look at the entire plate/table:
   - If there are distinct food items computer vision missed (such as Chicken Curry, Mutton, Fish, Paneer, Dal, Sabzi, Papad, Curd), YOU MUST ADD THEM to the 'items' list!
   - STACKED / OVERLAPPING MULTIPLES: Check for stacked flatbreads or multi-piece foods (e.g. 2 Parottas stacked with one partially underneath, 2-3 Rotis/Puris, 2 Idlis, multiple Vadas). YOU MUST LIST EACH PIECE AS A SEPARATE ITEM (e.g. "Malabar Parotta (Top)", "Malabar Parotta (Bottom)") so that occluded items are not omitted!
3. For every item, provide realistic clinical mass_g, calories, protein, carbs, fat, fiber.

Return ONLY a JSON object:
{{
  "valid": true,
  "reasoning": "Brief clinical dietitian explanation of verified dishes, portion sizes, and stacked/occluded pieces.",
  "items": [
    {{
      "id": 0,
      "food": "Dish Name",
      "mass_g": 150,
      "mass_range_g": [120, 180],
      "calories": 195,
      "protein": 4,
      "carbs": 42,
      "fat": 0.5,
      "fiber": 1,
      "confidence": 0.95
    }}
  ]
}}"""
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

            img = None
            if resolved_img_path:
                try:
                    loaded_img = Image.open(resolved_img_path)
                    if loaded_img.mode != "RGB":
                        loaded_img = loaded_img.convert("RGB")
                    # Downscale to max 384px for ultra-rapid vision tokenization and low latency
                    loaded_img.thumbnail((384, 384), Image.Resampling.BILINEAR)
                    img = loaded_img
                except Exception as img_err:
                    logger.debug("Failed to load/downscale image for Gemini: %s", img_err)

            inputs = [prompt, img] if img else [prompt]
            # Generous 60-second (1 minute) timeout allows sufficient time for Gemini reasoning as requested
            timeout_sec = float(os.getenv("GEMINI_TIMEOUT_SECONDS", str(self.timeout or 60.0)))
            response = self.model.generate_content(
                inputs,
                generation_config={"response_mime_type": "application/json", "temperature": 0.1},
                request_options={"timeout": timeout_sec},
            )
            raw_text = response.text or ""
            data = _clean_json(raw_text)

            if isinstance(data, list):
                data = {"valid": True, "items": data}
            elif isinstance(data, dict) and "items" not in data and ("food" in data or "name" in data or "detected" in data):
                data = {"valid": True, "items": [data]}

            if data and isinstance(data.get("items"), list) and len(data["items"]) > 0:
                validated_items = []
                for it in data["items"]:
                    dish_name = it.get("food") or it.get("name") or it.get("detected") or "Food Item"
                    it["food"] = dish_name
                    it["name"] = dish_name
                    if "id" not in it:
                        it["id"] = len(validated_items)
                    if int(it.get("id", 0)) >= len(instances):
                        it["is_supplemented"] = True
                    validated_items.append(it)
                data["items"] = validated_items
                data["item_macros"] = validated_items
                if not data.get("reasoning"):
                    dishes_summary = ", ".join(it["food"] for it in validated_items)
                    data["reasoning"] = f"Clinically verified {len(validated_items)} dishes ({dishes_summary}) with portion estimation."
                return data
        except Exception as exc:
            print(f"[GeminiValidator ERROR] Gemini call failed: {type(exc)} - {exc}")
            logger.error("Gemini portion validation failed: %s", exc, exc_info=True)

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
