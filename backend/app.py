import json
import os
import re
import uuid
import ast
import time
from datetime import datetime, timedelta, timezone
from flask import Flask, jsonify, redirect, request
from flask_cors import CORS
from PIL import Image
import google.generativeai as genai
from google.api_core.client_options import ClientOptions

from agents import HealthCoordinatorAgent
from detector import process_image_with_labels
from dotenv import load_dotenv
from fit_store import get_daily_metrics, get_fitbit_tokens, get_tokens, init_db, save_daily_metrics, save_fitbit_tokens, save_tokens
from fitbit_service import (
    FitbitConfigError,
    build_auth_url as fitbit_build_auth_url,
    ensure_valid_tokens as fitbit_ensure_valid_tokens,
    exchange_code_for_tokens as fitbit_exchange_code_for_tokens,
    fetch_daily_activity as fitbit_fetch_daily_activity,
    get_frontend_redirect as fitbit_get_frontend_redirect,
    is_fitbit_configured,
    parse_state as fitbit_parse_state,
)
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
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite").strip()
model = genai.GenerativeModel(GEMINI_MODEL) if GOOGLE_API_KEY else None
print("Model ready:", bool(model))

app = Flask(__name__)
CORS(app)
app.config["UPLOAD_FOLDER"] = "static/uploads"
app.config["CROPPED_FOLDER"] = "static/cropped_mask"
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
os.makedirs(app.config["CROPPED_FOLDER"], exist_ok=True)
init_db()
agent_coordinator = HealthCoordinatorAgent(model=model)

@app.after_request
def add_no_cache_headers(response):
    if response is not None and hasattr(response, "headers"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify(
        {
            "ok": True,
            "modelReady": bool(model),
            "googleFitReady": is_google_fit_configured(),
            "fitbitReady": is_fitbit_configured(),
            "googleFitTimezone": get_fit_timezone_name(),
        }
    )


@app.route("/api/edge-node/status", methods=["GET"])
def edge_node_status():
    from inference.edge_provider import EdgeNodeInferenceProvider
    load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)
    provider = EdgeNodeInferenceProvider()
    available = provider.is_available()
    telemetry = provider.get_telemetry()
    return jsonify(
        {
            "ok": True,
            "enabled": os.getenv("EDGE_NODE_ENABLED", "false").lower() in ("true", "1", "yes"),
            "connected": available,
            "url": provider.base_url,
            "telemetry": telemetry,
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
    if ":5174" in frontend_redirect:
        frontend_redirect = frontend_redirect.replace(":5174", ":5173")
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


# ---------------------------------------------------------------------------
# Fitbit API routes
# ---------------------------------------------------------------------------

@app.route("/api/fitbit/connect", methods=["POST"])
def fitbit_connect():
    user_id = _parse_user_id()
    if not user_id:
        return _json_error("userId is required", 400)
    try:
        return jsonify({"authUrl": fitbit_build_auth_url(user_id)})
    except FitbitConfigError as exc:
        return _json_error(str(exc), 500)


@app.route("/api/fitbit/callback", methods=["GET"])
def fitbit_callback():
    frontend_redirect = fitbit_get_frontend_redirect()
    if ":5174" in frontend_redirect:
        frontend_redirect = frontend_redirect.replace(":5174", ":5173")
    error = request.args.get("error")
    if error:
        return redirect(f"{frontend_redirect}?fitbit=error&reason={error}")

    code = request.args.get("code")
    state = request.args.get("state")
    if not code or not state:
        return _json_error("Missing OAuth code or state", 400)

    try:
        state_payload = fitbit_parse_state(state)
        user_id = str(state_payload["user_id"])
        tokens = fitbit_exchange_code_for_tokens(code)
        save_fitbit_tokens(user_id, tokens)
    except Exception as exc:
        return redirect(f"{frontend_redirect}?fitbit=error&reason={str(exc)}")

    return redirect(f"{frontend_redirect}?fitbit=connected&userId={user_id}")


@app.route("/api/fitbit/sync", methods=["POST"])
def fitbit_sync():
    user_id = _parse_user_id()
    if not user_id:
        return _json_error("userId is required", 400)

    days = _parse_days()
    daily_rows = None

    # Try Fitbit (Google Health) token
    try:
        tokens = get_fitbit_tokens(user_id)
        if tokens:
            valid_tokens = fitbit_ensure_valid_tokens(tokens)
            if valid_tokens.get("access_token") != tokens.get("access_token") or valid_tokens.get("expires_at") != tokens.get("expires_at"):
                save_fitbit_tokens(user_id, valid_tokens)
            daily_rows = fitbit_fetch_daily_activity(valid_tokens["access_token"], days=days)
    except Exception:
        pass

    if not daily_rows:
        return _json_error("Could not fetch Fitbit data. Please reconnect your Fitbit.", 500)

    save_daily_metrics(user_id, daily_rows)
    return jsonify({"ok": True, "userId": user_id, "daysSynced": len(daily_rows), "source": "fitbit", "items": daily_rows})


@app.route("/api/fitbit/activity", methods=["GET"])
def fitbit_activity():
    user_id = _parse_user_id()
    if not user_id:
        return _json_error("userId is required", 400)

    days = _parse_days(default=1)
    live = (request.args.get("live") or "true").strip().lower() not in {"0", "false", "no"}
    rows = []

    if live:
        # Check if user has connected Fitbit tokens
        try:
            tokens = get_fitbit_tokens(user_id)
            if tokens:
                valid_tokens = fitbit_ensure_valid_tokens(tokens)
                if valid_tokens.get("access_token") != tokens.get("access_token") or valid_tokens.get("expires_at") != tokens.get("expires_at"):
                    save_fitbit_tokens(user_id, valid_tokens)
                daily_rows = fitbit_fetch_daily_activity(valid_tokens["access_token"], days=days)
                save_daily_metrics(user_id, daily_rows)
                rows = daily_rows
        except Exception:
            pass

    if not rows:
        end_date = datetime.now(timezone.utc).date()
        start_date = end_date - timedelta(days=days - 1)
        rows = get_daily_metrics(user_id, start_date.isoformat(), end_date.isoformat(), source="fitbit")
    else:
        start_date = min(datetime.fromisoformat(row["activity_date"]).date() for row in rows)
        end_date = max(datetime.fromisoformat(row["activity_date"]).date() for row in rows)

    return jsonify({
        "ok": True,
        "userId": user_id,
        "days": days,
        "source": "fitbit",
        "startDate": start_date.isoformat(),
        "endDate": end_date.isoformat(),
        "items": rows,
    })


@app.route("/api/wearable/activity", methods=["GET"])
def wearable_activity():
    """Unified wearable activity endpoint.
    Prioritizes Fitbit if the user has connected Fitbit.
    Falls back to Google Fit only if Fitbit is not connected.
    """
    user_id = _parse_user_id()
    if not user_id:
        return _json_error("userId is required", 400)

    fitbit_tokens = get_fitbit_tokens(user_id)
    if fitbit_tokens:
        return fitbit_activity()
    return google_fit_activity()


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


@app.route("/api/agent/workflows/log-meal", methods=["POST"])
def agent_log_meal_workflow():
    payload = request.get_json(silent=True) or {}
    user_id = str(payload.get("userId") or payload.get("user_id") or "").strip()
    if not user_id:
        return _json_error("userId is required", 400)

    daily_macros = payload.get("dailyMacros") or payload.get("daily_macros") or {}
    consumed_macros = payload.get("consumedMacros") or payload.get("consumed_macros") or {}
    missing_daily = [key for key in ["calories", "carbs", "protein", "fat"] if key not in daily_macros]
    missing_consumed = [key for key in ["calories", "carbs", "protein", "fat"] if key not in consumed_macros]
    if missing_daily:
        return _json_error(f"dailyMacros is missing required keys: {missing_daily}", 400)
    if missing_consumed:
        return _json_error(f"consumedMacros is missing required keys: {missing_consumed}", 400)

    try:
        response = agent_coordinator.run_meal_logged_workflow(user_id=user_id, payload=payload)
    except Exception as exc:
        return _json_error(str(exc), 500)

    status = 200 if response.ok else 500
    return jsonify(response.model_dump()), status


@app.route("/api/agent/workflows/new-user", methods=["POST"])
def agent_new_user_workflow():
    payload = request.get_json(silent=True) or {}
    user_id = str(payload.get("userId") or payload.get("user_id") or "").strip()
    if not user_id:
        return _json_error("userId is required", 400)

    try:
        response = agent_coordinator.run_new_user_workflow(user_id=user_id, payload=payload)
    except Exception as exc:
        return _json_error(str(exc), 500)

    status = 200 if response.ok else 500
    return jsonify(response.model_dump()), status


@app.route("/api/agent/workflows/activity-update", methods=["POST"])
def agent_activity_update_workflow():
    payload = request.get_json(silent=True) or {}
    user_id = str(payload.get("userId") or payload.get("user_id") or "").strip()
    if not user_id:
        return _json_error("userId is required", 400)

    try:
        response = agent_coordinator.run_activity_update_workflow(user_id=user_id, payload=payload)
    except Exception as exc:
        return _json_error(str(exc), 500)

    status = 200 if response.ok else 500
    return jsonify(response.model_dump()), status


@app.route("/api/agent/workflows/meal-upload", methods=["POST"])
def agent_meal_upload_workflow():
    payload = request.get_json(silent=True) or {}
    user_id = str(payload.get("userId") or payload.get("user_id") or "").strip()
    if not user_id:
        return _json_error("userId is required", 400)

    try:
        response = agent_coordinator.run_meal_upload_workflow(user_id=user_id, payload=payload)
    except Exception as exc:
        return _json_error(str(exc), 500)

    status = 200 if response.ok else 500
    return jsonify(response.model_dump()), status


@app.route("/api/agent/workflows/plan-request", methods=["POST"])
def agent_plan_request_workflow():
    payload = request.get_json(silent=True) or {}
    user_id = str(payload.get("userId") or payload.get("user_id") or "").strip()
    if not user_id:
        return _json_error("userId is required", 400)

    try:
        response = agent_coordinator.run_plan_request_workflow(user_id=user_id, payload=payload)
    except Exception as exc:
        return _json_error(str(exc), 500)

    status = 200 if response.ok else 500
    return jsonify(response.model_dump()), status


@app.route("/api/agent/workflows/<workflow_name>", methods=["POST"])
def agent_generic_workflow(workflow_name):
    payload = request.get_json(silent=True) or {}
    user_id = str(payload.get("userId") or payload.get("user_id") or "").strip()
    if not user_id:
        return _json_error("userId is required", 400)

    try:
        response = agent_coordinator.run_workflow(workflow_name=workflow_name, user_id=user_id, payload=payload)
    except Exception as exc:
        return _json_error(str(exc), 500)

    status = 200 if response.ok else 500
    return jsonify(response.model_dump()), status



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
    return MACRO_FALLBACKS.get(normalized, {"name": label, "calories": 200, "protein": 5, "carbs": 20, "fat": 5})


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

    # 1. Try Physics-Grounded 3D Food Portion Pipeline
    try:
        from food_portion.pipeline import FoodPortionPipeline
        from food_portion.gemini.validator import GeminiValidator

        edge_enabled = os.getenv("EDGE_NODE_ENABLED", "false").lower() in ("true", "1", "yes")
        pipeline_res = None

        if edge_enabled:
            try:
                from inference.edge_provider import EdgeNodeInferenceProvider
                edge_provider = EdgeNodeInferenceProvider()
                if edge_provider.is_available():
                    app.logger.info("Executing 3D portion pipeline on RS PRO C100 Edge Node...")
                    local_dets = None
                    try:
                        from food_portion.detection.yolo_detector import FoodDetector
                        det_engine = FoodDetector()
                        raw_dets = det_engine.predict(image_path)
                        if raw_dets:
                            local_dets = [
                                {
                                    "class_name": d.class_name,
                                    "confidence": float(d.confidence),
                                    "bbox": [float(v) for v in d.bbox],
                                    "is_container": bool(d.is_container),
                                }
                                for d in raw_dets
                            ]
                    except Exception as det_err:
                        app.logger.debug("Local pre-detection skipped: %s", det_err)

                    edge_raw = edge_provider.process_portion(image_path, detections=local_dets)
                    if edge_raw and edge_raw.get("items"):
                        t_gem_start = time.perf_counter()
                        # Run semantic & macro validation with Gemini
                        gemini_val = GeminiValidator(model_instance=model)
                        val_res = gemini_val.validate(edge_raw.get("items", []), edge_raw.get("scale_calibration"), image_path)
                        t_gem_dur = (time.perf_counter() - t_gem_start) * 1000

                        val_items = val_res.get("items") or val_res.get("item_macros") or []
                        gemini_items_by_id = {}
                        gemini_items_by_name = {}
                        for gitm in val_items:
                            if "id" in gitm:
                                try:
                                    gemini_items_by_id[int(gitm["id"])] = gitm
                                except Exception:
                                    pass
                            gemini_items_by_name[gitm.get("food", "").lower()] = gitm

                        merged_items = []
                        used_gemini_ids = set()

                        for idx, e_item in enumerate(edge_raw.get("items", [])):
                            # Find matching gemini item by id, name, or position
                            g_match = gemini_items_by_id.get(idx)
                            if not g_match:
                                g_match = gemini_items_by_name.get(e_item.get("food", "").lower()) or gemini_items_by_name.get(e_item.get("name", "").lower())
                            if not g_match and idx < len(val_items) and id(val_items[idx]) not in used_gemini_ids:
                                g_match = val_items[idx]

                            if g_match:
                                used_gemini_ids.add(id(g_match))
                            else:
                                g_match = {}

                            refined_name = g_match.get("food") or g_match.get("name") or e_item.get("name") or e_item.get("food", "Food Item")
                            mass = float(g_match.get("mass_g") or e_item.get("mass_g") or 50.0)
                            cals = int(g_match.get("calories") or e_item.get("calories") or round(mass * 1.5))

                            merged_item = dict(e_item)
                            merged_item.update({
                                "name": refined_name,
                                "food": refined_name,
                                "mass_g": mass,
                                "mass_range_g": g_match.get("mass_range_g") or e_item.get("mass_range_g") or [int(mass * 0.8), int(mass * 1.2)],
                                "calories": cals,
                                "protein": g_match.get("protein", e_item.get("protein", int(round(mass * 0.07)))),
                                "carbs": g_match.get("carbs", e_item.get("carbs", int(round(mass * 0.22)))),
                                "fat": g_match.get("fat", e_item.get("fat", int(round(mass * 0.04)))),
                                "fiber": g_match.get("fiber", e_item.get("fiber", 1)),
                                "confidence": g_match.get("confidence") or e_item.get("confidence", 0.85),
                                "is_supplemented": False,
                            })
                            merged_items.append(merged_item)

                        # Supplement any extra items detected by Gemini that CV missed (e.g. gravies/curries/meats)
                        for g_extra in val_items:
                            if id(g_extra) in used_gemini_ids:
                                continue
                            if g_extra.get("is_supplemented") or (isinstance(g_extra.get("id"), int) and g_extra["id"] >= len(edge_raw.get("items", []))):
                                extra_name = g_extra.get("food") or g_extra.get("name") or "Side Dish"
                                extra_mass = float(g_extra.get("mass_g") or 60.0)
                                extra_cals = int(g_extra.get("calories") or round(extra_mass * 1.5))
                                merged_items.append({
                                    "name": extra_name,
                                    "food": extra_name,
                                    "mass_g": extra_mass,
                                    "mass_range_g": g_extra.get("mass_range_g") or [int(extra_mass * 0.8), int(extra_mass * 1.2)],
                                    "visible_area_cm2": 0.0,
                                    "estimated_total_area_cm2": 0.0,
                                    "estimated_volume_cm3": 0.0,
                                    "occlusion_probability": 0.0,
                                    "confidence": g_extra.get("confidence", 0.85),
                                    "calories": extra_cals,
                                    "protein": g_extra.get("protein", int(round(extra_mass * 0.05))),
                                    "carbs": g_extra.get("carbs", int(round(extra_mass * 0.15))),
                                    "fat": g_extra.get("fat", int(round(extra_mass * 0.03))),
                                    "fiber": g_extra.get("fiber", 1),
                                    "image": None,
                                    "multiplier": 1.0,
                                    "is_supplemented": True,
                                })

                        edge_raw["items"] = merged_items
                        edge_raw["gemini_validation"] = val_res
                        edge_raw["totalCalories"] = sum(it.get("calories", 0) for it in merged_items)
                        edge_raw["total_mass_g"] = sum(it.get("mass_g", 0) for it in merged_items)
                        edge_raw["execution_target"] = "⚡ RS PRO C100 (Edge GPU)"

                        # Append Stage 9 to pipeline_trace if trace exists
                        if "pipeline_trace" in edge_raw and isinstance(edge_raw["pipeline_trace"], list):
                            clean_trace = [s for s in edge_raw["pipeline_trace"] if s.get("stage") != 9]
                            clean_trace.append({
                                "stage": 9,
                                "name": "Gemini Semantic & Macro Validation",
                                "file": "backend/food_portion/gemini/validator.py",
                                "class": "GeminiValidator",
                                "function": "validate(items, scale_calibration, image_path)",
                                "duration_ms": round(t_gem_dur, 1),
                                "input": {"validated_items_count": len(edge_raw.get("items", []))},
                                "output": {
                                    "valid": val_res.get("valid", True),
                                    "reasoning": val_res.get("reasoning", ""),
                                    "item_macros": val_items,
                                },
                            })
                            edge_raw["pipeline_trace"] = clean_trace
                        edge_raw["pipeline_duration_ms"] = round(edge_raw.get("duration_ms", 0.0) + t_gem_dur, 1)
                        pipeline_res = edge_raw
            except Exception as edge_exc:
                app.logger.warning("Edge node execution failed, falling back to local pipeline: %s", edge_exc)

        if pipeline_res is None:
            portion_pipeline = FoodPortionPipeline(gemini_validator=GeminiValidator(model_instance=model))
            pipeline_res = portion_pipeline.process(image_path, gemini_model=model)

        p_items = pipeline_res.get("items", [])
        if p_items:
            app.logger.info("FoodPortionPipeline successfully processed %d items", len(p_items))
            return jsonify({
                "items": p_items,
                "totalCalories": pipeline_res.get("totalCalories", sum(it.get("calories", 0) for it in p_items)),
                "total_mass_g": pipeline_res.get("total_mass_g", sum(it.get("mass_g", 0) for it in p_items)),
                "scale_calibration": pipeline_res.get("scale_calibration"),
                "scene_assessment": pipeline_res.get("scene_assessment"),
                "gemini_validation": pipeline_res.get("gemini_validation"),
                "segmentedImage": pipeline_res.get("segmentedImage") or pipeline_res.get("segmented_image"),
                "originalImage": image_path.replace("\\", "/"),
                "pipeline_trace": pipeline_res.get("pipeline_trace", []),
                "pipeline_duration_ms": pipeline_res.get("pipeline_duration_ms") or pipeline_res.get("duration_ms", 0.0),
                "execution_target": pipeline_res.get("execution_target", "Local Pipeline"),
            })
    except Exception as exc:
        app.logger.warning("FoodPortionPipeline failed, continuing with legacy fallback: %s", exc)

    # 2. Legacy fallback
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
        item = None
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

            # Skip non-food items identified by Gemini
            not_food_keywords = ["not a food", "not food", "no food", "non-food", "person", "human", "face", "selfie", "object"]
            if any(kw in model_name.lower() for kw in not_food_keywords):
                app.logger.info("Gemini identified non-food item | segment=%s | name=%s — skipping", idx, model_name)
                continue

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
        
        if item is not None:
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
