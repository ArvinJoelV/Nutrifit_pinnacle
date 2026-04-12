import json
import os
import re
import uuid
import ast
from datetime import datetime, timedelta, timezone
from flask import Flask, jsonify, redirect, request
from flask_cors import CORS
from PIL import Image
import google.generativeai as genai
from google.api_core.client_options import ClientOptions

from detector import process_image_with_labels
from dotenv import load_dotenv
from fit_store import get_daily_metrics, get_tokens, init_db, save_daily_metrics, save_tokens
from grok_timeline_service import generate_eat_effect_timeline
from meal_recommendation_service import (
    DailyNutritionState,
    build_ingredient_pools,
    generate_adjusted_meal_plan,
    generate_daily_meal_plan,
    load_ingredient_categories,
    load_nutrition_dataset,
    redistribute_macros,
    split_daily_macros_into_meal_targets,
)
from google_fit_service import (
    GoogleFitConfigError,
    build_auth_url,
    ensure_valid_tokens,
    exchange_code_for_tokens,
    fetch_daily_activity,
    get_fit_timezone,
    get_fit_timezone_name,
    get_frontend_redirect,
    is_google_fit_configured,
    parse_state,
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)
GOOGLE_PROJECT_ID = os.getenv("GOOGLE_PROJECT_ID", "").strip()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "").strip()
if GOOGLE_API_KEY:
    genai.configure(
        api_key=GOOGLE_API_KEY,
        client_options=ClientOptions(
            quota_project_id=GOOGLE_PROJECT_ID   # 🔥 THIS LINE FIXES IT
        )
    )
model = genai.GenerativeModel("gemini-2.5-flash") if GOOGLE_API_KEY else None
print("Model ready:", bool(model))

app = Flask(__name__)
CORS(app)
app.config["UPLOAD_FOLDER"] = "static/uploads"
app.config["CROPPED_FOLDER"] = "static/cropped_mask"
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
os.makedirs(app.config["CROPPED_FOLDER"], exist_ok=True)
init_db()



@app.route("/api/health", methods=["GET"])
def health():
    return jsonify(
        {
            "ok": True,
            "modelReady": bool(model),
            "googleFitReady": is_google_fit_configured(),
            "googleFitTimezone": get_fit_timezone_name(),
        }
    )


def _json_error(message, status=400):
    return jsonify({"error": message}), status


def _parse_days(default=7):
    value = request.args.get("days") if request.method == "GET" else (request.get_json(silent=True) or {}).get("days")
    try:
        return max(1, min(int(value or default), 30))
    except (TypeError, ValueError):
        return default


def _parse_user_id():
    if request.method == "GET":
        return (request.args.get("userId") or "").strip()
    payload = request.get_json(silent=True) or {}
    return str(payload.get("userId") or "").strip()


def _parse_daily_macros(payload):
    daily_macros = payload.get("daily_macros") or {}
    required = ["calories", "carbs", "protein", "fat"]
    missing = [key for key in required if key not in daily_macros]
    if missing:
        raise ValueError(f"daily_macros is missing required keys: {missing}")

    return {key: _to_float(daily_macros.get(key)) for key in required}


def _parse_macro_block(payload, key):
    block = payload.get(key) or {}
    return {
        "calories": _to_float(block.get("calories")),
        "carbs": _to_float(block.get("carbs")),
        "protein": _to_float(block.get("protein")),
        "fat": _to_float(block.get("fat")),
    }


def _normalize_meal_payload(payload):
    meal = payload.get("meal") or {}
    macros = meal.get("macros") or {}
    items = meal.get("items") or []
    normalized_items = []
    for item in items:
        if not isinstance(item, dict):
            continue
        multiplier = _to_float(item.get("multiplier") or 1) or 1.0
        normalized_items.append(
            {
                "name": str(item.get("name") or "Food"),
                "calories": _to_float(item.get("calories")),
                "protein": _to_float(item.get("protein")),
                "carbs": _to_float(item.get("carbs")),
                "fat": _to_float(item.get("fat")),
                "multiplier": multiplier,
            }
        )

    return {
        "id": str(meal.get("id") or ""),
        "type": str(meal.get("type") or "Meal"),
        "time": str(meal.get("time") or ""),
        "timestamp": str(meal.get("timestamp") or ""),
        "totalCalories": _to_float(meal.get("totalCalories") or macros.get("calories")),
        "macros": {
            "calories": _to_float(macros.get("calories") or meal.get("totalCalories")),
            "protein": _to_float(macros.get("protein")),
            "carbs": _to_float(macros.get("carbs")),
            "fat": _to_float(macros.get("fat")),
        },
        "items": normalized_items,
    }


@app.route("/api/google-fit/connect", methods=["POST"])
def google_fit_connect():

    user_id = _parse_user_id()
    if not user_id:
        return _json_error("userId is required", 400)

    try:
        return jsonify({"authUrl": build_auth_url(user_id)})
    except GoogleFitConfigError as exc:
        return _json_error(str(exc), 500)


@app.route("/api/google-fit/callback", methods=["GET"])
def google_fit_callback():
    frontend_redirect = get_frontend_redirect()
    error = request.args.get("error")
    if error:
        return redirect(f"{frontend_redirect}?googleFit=error&reason={error}")

    code = request.args.get("code")
    state = request.args.get("state")
    if not code or not state:
        return _json_error("Missing OAuth code or state", 400)

    try:
        state_payload = parse_state(state)
        user_id = str(state_payload["user_id"])
        tokens = exchange_code_for_tokens(code)
        save_tokens(user_id, tokens)
    except Exception as exc:
        return redirect(f"{frontend_redirect}?googleFit=error&reason={str(exc)}")

    return redirect(f"{frontend_redirect}?googleFit=connected&userId={user_id}")


@app.route("/api/google-fit/sync", methods=["POST"])
def google_fit_sync():

    user_id = _parse_user_id()
    if not user_id:
        return _json_error("userId is required", 400)

    try:
        tokens = get_tokens(user_id)
        valid_tokens = ensure_valid_tokens(tokens)
        if valid_tokens.get("access_token") != tokens.get("access_token") or valid_tokens.get("expires_at") != tokens.get("expires_at"):
            save_tokens(user_id, valid_tokens)
        daily_rows = fetch_daily_activity(valid_tokens["access_token"], days=_parse_days())
        save_daily_metrics(user_id, daily_rows)
        return jsonify({"ok": True, "userId": user_id, "daysSynced": len(daily_rows), "items": daily_rows})
    except GoogleFitConfigError as exc:
        return _json_error(str(exc), 500)
    except Exception as exc:
        return _json_error(str(exc), 500)


@app.route("/api/google-fit/activity", methods=["GET"])
def google_fit_activity():
    user_id = _parse_user_id()
    if not user_id:
        return _json_error("userId is required", 400)

    days = _parse_days(default=1)
    live = (request.args.get("live") or "true").strip().lower() not in {"0", "false", "no"}
    tz = get_fit_timezone()
    rows = []

    if live:
        try:
            tokens = get_tokens(user_id)
            valid_tokens = ensure_valid_tokens(tokens)
            if valid_tokens.get("access_token") != tokens.get("access_token") or valid_tokens.get("expires_at") != tokens.get("expires_at"):
                save_tokens(user_id, valid_tokens)
            daily_rows = fetch_daily_activity(valid_tokens["access_token"], days=days)
            save_daily_metrics(user_id, daily_rows)
            rows = daily_rows
        except GoogleFitConfigError as exc:
            return _json_error(str(exc), 500)
        except Exception as exc:
            return _json_error(str(exc), 500)

    if not rows:
        end_date = datetime.now(tz).date()
        start_date = end_date - timedelta(days=days - 1)
        rows = get_daily_metrics(user_id, start_date.isoformat(), end_date.isoformat())
    else:
        start_date = min(datetime.fromisoformat(row["activity_date"]).date() for row in rows)
        end_date = max(datetime.fromisoformat(row["activity_date"]).date() for row in rows)

    return jsonify(
        {
            "ok": True,
            "userId": user_id,
            "days": days,
            "live": live,
            "timezone": get_fit_timezone_name(),
            "startDate": start_date.isoformat(),
            "endDate": end_date.isoformat(),
            "items": rows,
        }
    )


@app.route("/api/generate-meal-plan", methods=["POST"])
def generate_meal_plan():

    payload = request.get_json(silent=True) or {}

    try:
        daily_macros = _parse_daily_macros(payload)
        top_n = max(1, min(int(payload.get("top_n", 3) or 3), 10))
        nutrition_df = load_nutrition_dataset(payload.get("nutrition_dataset_path"))
        ingredient_df = load_ingredient_categories(payload.get("ingredient_category_dataset_path"))
        ingredient_pools = build_ingredient_pools(ingredient_df)
        meal_targets = split_daily_macros_into_meal_targets(daily_macros)
        meal_plan = generate_daily_meal_plan(
            meal_targets=meal_targets,
            ingredient_pools=ingredient_pools,
            nutrition_df=nutrition_df,
            top_n=top_n,
        )
    except FileNotFoundError as exc:
        return _json_error(str(exc), 404)
    except ValueError as exc:
        return _json_error(str(exc), 400)
    except Exception as exc:
        return _json_error(str(exc), 500)

    return jsonify(
        {
            "daily_macros": daily_macros,
            "meal_targets": meal_targets,
            "meal_plan": meal_plan,
        }
    )


@app.route("/api/adjust-meal-plan", methods=["POST"])
def adjust_meal_plan():

    payload = request.get_json(silent=True) or {}

    try:
        daily_macros = _parse_daily_macros(payload)
        consumed_macros = _parse_macro_block(payload, "consumed_macros")
        completed_meals = [str(meal).strip().lower() for meal in (payload.get("completed_meals") or []) if str(meal).strip()]
        top_n = max(1, min(int(payload.get("top_n", 1) or 1), 10))

        nutrition_df = load_nutrition_dataset(payload.get("nutrition_dataset_path"))
        ingredient_df = load_ingredient_categories(payload.get("ingredient_category_dataset_path"))
        ingredient_pools = build_ingredient_pools(ingredient_df)

        state = DailyNutritionState()
        state.initialize_day(daily_macros)
        state.consumed = consumed_macros
        state.meals_completed = completed_meals
        state.remaining_meal_windows = [
            meal for meal in ["breakfast", "lunch", "dinner", "snack"] if meal not in completed_meals
        ]
        state.calculate_remaining()

        next_meal_targets = redistribute_macros(state.get_remaining_macros(), state.get_remaining_meals())
        recommended_meals = generate_adjusted_meal_plan(
            nutrition_state=state,
            ingredient_pools=ingredient_pools,
            nutrition_df=nutrition_df,
            top_n=top_n,
        )
    except FileNotFoundError as exc:
        return _json_error(str(exc), 404)
    except ValueError as exc:
        return _json_error(str(exc), 400)
    except Exception as exc:
        return _json_error(str(exc), 500)

    return jsonify(
        {
            "nutrition_state": state.to_dict(),
            "remaining_macros": state.get_remaining_macros(),
            "next_meal_targets": next_meal_targets,
            "recommended_meals": recommended_meals,
        }
    )


@app.route("/api/eat-effect-timeline", methods=["POST"])
def eat_effect_timeline():
    payload = request.get_json(silent=True) or {}
    meal = _normalize_meal_payload(payload)

    if meal["totalCalories"] <= 0:
        return _json_error("meal.totalCalories or meal.macros.calories is required", 400)

    try:
        timeline, debug = generate_eat_effect_timeline(meal)
    except Exception as exc:
        return _json_error(str(exc), 500)

    return jsonify(
        {
            "ok": True,
            "mealId": meal["id"],
            "timeline": timeline,
            "debug": debug,
        }
    )


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


@app.route("/api/analyze-meal", methods=["POST"])
def analyze_meal():

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
            app.logger.info(
                "Gemini meal analysis request | segment=%s | label=%s | confidence=%.3f | path=%s",
                idx,
                detected_label,
                float(segment.get("confidence", 0.0)),
                normalized_path,
            )
            response = model.generate_content(
                [prompt, img],
                generation_config={"response_mime_type": "application/json"},
            )
            raw_text = (response.text or "").strip()
            app.logger.info("Gemini raw response | segment=%s | text=%s", idx, raw_text)
            payload = _extract_json_object(raw_text)
            app.logger.info("Gemini parsed response | segment=%s | payload=%s", idx, json.dumps(payload, ensure_ascii=True))

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
            app.logger.info(
                "Meal analysis finalized | segment=%s | item=%s",
                idx,
                json.dumps(
                    {
                        "name": item["name"],
                        "calories": item["calories"],
                        "protein": item["protein"],
                        "carbs": item["carbs"],
                        "fat": item["fat"],
                        "detectedLabel": item["detectedLabel"],
                        "detectedConfidence": item["detectedConfidence"],
                    },
                    ensure_ascii=True,
                ),
            )
        except Exception as exc:
            fallback = _fallback_from_label(detected_label)
            app.logger.exception(
                "Gemini meal analysis failed | segment=%s | label=%s | usingFallback=true",
                idx,
                detected_label,
            )
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
    app.logger.info("Meal analysis totals | totals=%s", json.dumps(totals, ensure_ascii=True))

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
