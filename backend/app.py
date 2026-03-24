import json
import os
import re
import uuid
import ast
from flask import Flask, jsonify, request
from PIL import Image
import google.generativeai as genai
from detector import process_image_with_labels
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "").strip()
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel("gemini-2.0-flash") if GOOGLE_API_KEY else None

app = Flask(__name__)
app.config["UPLOAD_FOLDER"] = "static/uploads"
app.config["CROPPED_FOLDER"] = "static/cropped_mask"
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
os.makedirs(app.config["CROPPED_FOLDER"], exist_ok=True)


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = os.getenv("ALLOWED_ORIGIN", "*")
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"ok": True, "modelReady": bool(model)})


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


def _normalize_label(label):
    return (label or "").strip().lower().replace("_", " ")


def _fallback_from_label(label):
    normalized = _normalize_label(label)
    if normalized in MACRO_FALLBACKS:
        fallback = MACRO_FALLBACKS[normalized].copy()
        fallback["name"] = label.replace("-", " ").replace("_", " ").title() or "Detected Food"
        return fallback
    return {"name": label.replace("-", " ").replace("_", " ").title() or "Detected Food", "calories": 140, "protein": 6, "carbs": 16, "fat": 5}


@app.route("/api/analyze-meal", methods=["POST", "OPTIONS"])
def analyze_meal():
    if request.method == "OPTIONS":
        return ("", 204)

    if "image" not in request.files or request.files["image"].filename == "":
        return jsonify({"error": "No image uploaded"}), 400

    if not model:
        return jsonify({"error": "GOOGLE_API_KEY is not configured on backend"}), 500

    image_file = request.files["image"]
    ext = os.path.splitext(image_file.filename)[1] or ".jpg"
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    image_path = os.path.join(app.config["UPLOAD_FOLDER"], unique_filename)
    image_file.save(image_path)

    segments, segmented_path = process_image_with_labels(image_path)
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
        path = segment["path"]
        detected_label = segment.get("label", "food")
        normalized_path = path.replace("\\", "/")
        try:
            img = Image.open(path)
            response = model.generate_content(
                [prompt, img],
                generation_config={"response_mime_type": "application/json"},
            )
            raw_text = (response.text or "").strip()
            payload = _extract_json_object(raw_text)

            fallback = _fallback_from_label(detected_label)
            calories = _to_float(payload.get("calories"))
            protein = _to_float(payload.get("protein", payload.get("proteins")))
            carbs = _to_float(payload.get("carbs", payload.get("carbohydrates")))
            fat = _to_float(payload.get("fat", payload.get("fats")))
            model_name = str(payload.get("name", "")).strip()

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
                "error": str(exc),
            }
        items.append(item)

    totals = {
        "calories": round(sum(item["calories"] for item in items), 2),
        "protein": round(sum(item["protein"] for item in items), 2),
        "carbs": round(sum(item["carbs"] for item in items), 2),
        "fat": round(sum(item["fat"] for item in items), 2),
    }

    return jsonify(
        {
            "items": items,
            "totals": totals,
            "segmentedImage": segmented_path,
            "originalImage": image_path.replace("\\", "/"),
        }
    )


if __name__ == "__main__":
    app.run(
        debug=os.getenv("FLASK_DEBUG", "true").lower() == "true",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "9510")),
    )
