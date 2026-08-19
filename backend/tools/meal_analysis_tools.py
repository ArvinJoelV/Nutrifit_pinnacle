import json
import logging
import re
import ast
from PIL import Image
from .base import BaseTool, ToolResult

logger = logging.getLogger(__name__)

MACRO_FALLBACKS = {
    "biryani": {"calories": 290, "protein": 9, "carbs": 36, "fat": 12},
    "bread halwa": {"calories": 280, "protein": 4, "carbs": 38, "fat": 12},
    "tandoori-chicken": {"calories": 220, "protein": 28, "carbs": 3, "fat": 10},
    "chicken fry": {"calories": 260, "protein": 24, "carbs": 4, "fat": 16},
    "chicken 65": {"calories": 300, "protein": 22, "carbs": 10, "fat": 20},
    "egg": {"calories": 78, "protein": 6, "carbs": 1, "fat": 5},
    "sambar": {"calories": 90, "protein": 4, "carbs": 13, "fat": 2},
    "raitha": {"calories": 70, "protein": 3, "carbs": 5, "fat": 4},
    "chutney": {"calories": 60, "protein": 1, "carbs": 6, "fat": 3},
    "dosa": {"calories": 168, "protein": 4, "carbs": 28, "fat": 4},
    "idli": {"calories": 58, "protein": 2, "carbs": 12, "fat": 0.4},
}


def _extract_json_object(text):
    cleaned = re.sub(r"```json|```", "", text or "").strip()
    if not cleaned:
        return {}

    try:
        return json.loads(cleaned)
    except Exception:
        pass

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        candidate = cleaned[start : end + 1]
        try:
            return json.loads(candidate)
        except Exception:
            try:
                return ast.literal_eval(candidate)
            except Exception:
                return {}
    return {}


def _to_float(value):
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        match = re.search(r"-?\d+(\.\d+)?", value)
        return float(match.group()) if match else 0.0
    return 0.0


def _normalize_label(label):
    return (label or "").strip().lower().replace("_", " ")


def _fallback_from_label(label):
    normalized = _normalize_label(label)
    if normalized in MACRO_FALLBACKS:
        fallback = MACRO_FALLBACKS[normalized].copy()
        fallback["name"] = label.replace("-", " ").replace("_", " ").title() or "Detected Food"
        return fallback
    return {"name": label.replace("-", " ").replace("_", " ").title() or "Detected Food", "calories": 140, "protein": 6, "carbs": 16, "fat": 5}


class MealAnalysisTool(BaseTool):
    name = "meal_analysis"

    def run(self, **kwargs) -> ToolResult:
        image_path = kwargs.get("image_path")
        inference_provider = kwargs.get("inference_provider")
        model = kwargs.get("model")

        if not inference_provider:
            from inference.local_provider import LocalInferenceProvider
            inference_provider = LocalInferenceProvider()

        try:
            result = inference_provider.detect_and_segment(image_path)
            segments = result.get("segments", [])
            segmented_path = result.get("segmented_image")
        except Exception as exc:
            return ToolResult(ok=False, tool=self.name, error=str(exc))

        prompt = """
You are an Indian nutrition analysis AI.
Analyze one segmented food-item image and output ONLY one JSON object.
No markdown, no explanation, no code fence.
Schema:
{"name":"Food Name","calories":123,"protein":10,"carbs":20,"fat":5}
If uncertain, estimate realistically and still return numeric macro values.
"""

        items = []
        targets = segments if segments else [{"path": image_path, "label": "food", "confidence": 0.0}]
        for idx, segment in enumerate(targets):
            path = segment.get("path")
            detected_label = segment.get("label", "food")
            normalized_path = path.replace("\\", "/") if path else ""

            item = None
            if model and path:
                try:
                    img = Image.open(path)
                    response = model.generate_content(
                        [prompt, img],
                        generation_config={"response_mime_type": "application/json"},
                    )
                    raw_text = (response.text or "").strip()
                    payload = _extract_json_object(raw_text)

                    model_name = str(payload.get("name", "")).strip()

                    # Skip non-food items identified by Gemini
                    not_food_keywords = ["not a food", "not food", "no food", "non-food", "person", "human", "face", "selfie", "object"]
                    is_not_food = any(kw in model_name.lower() for kw in not_food_keywords)

                    if is_not_food:
                        # Gemini explicitly says this is not food — skip it
                        continue

                    fallback = _fallback_from_label(detected_label)
                    calories = _to_float(payload.get("calories"))
                    protein = _to_float(payload.get("protein", payload.get("proteins")))
                    carbs = _to_float(payload.get("carbs", payload.get("carbohydrates")))
                    fat = _to_float(payload.get("fat", payload.get("fats")))

                    if calories <= 0:
                        calories = fallback["calories"]
                    if protein <= 0:
                        protein = fallback["protein"]
                    if carbs <= 0:
                        carbs = fallback["carbs"]
                    if fat <= 0:
                        fat = fallback["fat"]

                    item = {
                        "id": f"seg-{idx}",
                        "name": model_name if model_name and model_name.lower() != "unknown food" else fallback["name"],
                        "calories": calories,
                        "protein": protein,
                        "carbs": carbs,
                        "fat": fat,
                        "image": normalized_path,
                        "detectedLabel": detected_label,
                        "detectedConfidence": round(float(segment.get("confidence", 0.0)), 3),
                        "rawModelText": raw_text,
                    }
                except Exception as exc:
                    logger.exception("Gemini meal analysis failed")
                    item = None

            if not item:
                fallback = _fallback_from_label(detected_label)
                item = {
                    "id": f"seg-{idx}",
                    "name": fallback["name"],
                    "calories": fallback["calories"],
                    "protein": fallback["protein"],
                    "carbs": fallback["carbs"],
                    "fat": fallback["fat"],
                    "image": normalized_path,
                    "detectedLabel": detected_label,
                    "detectedConfidence": round(float(segment.get("confidence", 0.0)), 3),
                }
            items.append(item)

        totals = {
            "calories": round(sum(item["calories"] for item in items), 2),
            "protein": round(sum(item["protein"] for item in items), 2),
            "carbs": round(sum(item["carbs"] for item in items), 2),
            "fat": round(sum(item["fat"] for item in items), 2),
        }

        return ToolResult(
            ok=True,
            tool=self.name,
            data={
                "items": items,
                "totals": totals,
                "segmentedImage": segmented_path,
                "originalImage": image_path.replace("\\", "/") if image_path else None
            }
        )
