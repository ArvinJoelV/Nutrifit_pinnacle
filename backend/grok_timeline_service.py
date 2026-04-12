import json
import logging
import os
from typing import Any, Dict, List, Tuple

from groq import Groq


DEFAULT_GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile").strip() or "llama-3.3-70b-versatile"
LOGGER = logging.getLogger("nutrifit.grok_timeline")
if not LOGGER.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("[%(asctime)s] %(levelname)s in %(name)s: %(message)s"))
    LOGGER.addHandler(handler)
LOGGER.setLevel(logging.INFO)


TIMELINE_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "hero": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "title": {"type": "string"},
                "subtitle": {"type": "string"},
                "metabolicMood": {"type": "string"},
                "confidenceLabel": {"type": "string"},
            },
            "required": ["title", "subtitle", "metabolicMood", "confidenceLabel"],
        },
        "energyCurve": {"type": "array", "items": {"type": "number"}},
        "glucoseCurve": {"type": "array", "items": {"type": "number"}},
        "cravings": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "level": {"type": "string", "enum": ["Low", "Medium", "High"]},
                "time": {"type": "string"},
                "reason": {"type": "string"},
            },
            "required": ["level", "time", "reason"],
        },
        "sleepImpact": {"type": "number"},
        "digestionHours": {"type": "number"},
        "highlights": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "label": {"type": "string"},
                    "value": {"type": "string"},
                    "tone": {"type": "string", "enum": ["emerald", "amber", "rose", "cyan", "violet"]},
                },
                "required": ["label", "value", "tone"],
            },
        },
        "timeline": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "offsetMinutes": {"type": "number"},
                    "phase": {"type": "string"},
                    "headline": {"type": "string"},
                    "body": {"type": "string"},
                    "tone": {"type": "string", "enum": ["emerald", "amber", "rose", "cyan", "violet"]},
                    "impactScore": {"type": "number"},
                    "microSignals": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["offsetMinutes", "phase", "headline", "body", "tone", "impactScore", "microSignals"],
            },
        },
        "coachNote": {"type": "string"},
    },
    "required": [
        "hero",
        "energyCurve",
        "glucoseCurve",
        "cravings",
        "sleepImpact",
        "digestionHours",
        "highlights",
        "timeline",
        "coachNote",
    ],
}


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def _safe_float(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _meal_name(meal_payload: Dict[str, Any]) -> str:
    items = meal_payload.get("items") or []
    names = [str(item.get("name") or "").strip() for item in items if str(item.get("name") or "").strip()]
    if not names:
        return str(meal_payload.get("type") or "Meal").strip() or "Meal"
    preview = ", ".join(names[:3])
    if len(names) > 3:
        preview += "..."
    return preview


def _format_offset(offset_minutes: float) -> str:
    if offset_minutes <= 0:
        return "Now"
    if offset_minutes < 60:
        return f"+{int(round(offset_minutes))} min"
    hours = offset_minutes / 60
    if abs(hours - round(hours)) < 0.15:
        return f"+{int(round(hours))}h"
    return f"+{hours:.1f}h"


def _derive_fallback_timeline(meal_payload: Dict[str, Any]) -> Dict[str, Any]:
    macros = meal_payload.get("macros") or {}
    calories = _safe_float(meal_payload.get("totalCalories") or macros.get("calories"))
    carbs = _safe_float(macros.get("carbs"))
    protein = _safe_float(macros.get("protein"))
    fat = _safe_float(macros.get("fat"))

    energy_peak = _clamp(48 + (carbs * 0.22) + (protein * 0.08) - (fat * 0.03), 40, 92)
    energy_curve = [
        52,
        round(_clamp(energy_peak, 42, 95), 1),
        round(_clamp(energy_peak - (fat * 0.08), 40, 88), 1),
        round(_clamp(48 + (protein * 0.06) - (carbs * 0.03), 35, 76), 1),
        round(_clamp(42 + (protein * 0.04) - (fat * 0.02), 32, 68), 1),
    ]
    glucose_peak = _clamp(50 + (carbs * 0.35) - (protein * 0.1), 42, 96)
    glucose_curve = [
        48,
        round(glucose_peak, 1),
        round(_clamp(glucose_peak - (protein * 0.18) - (fat * 0.05), 44, 84), 1),
        round(_clamp(52 + (carbs * 0.05), 42, 72), 1),
        round(_clamp(46 + (fat * 0.02) - (carbs * 0.04), 34, 64), 1),
    ]

    digestion_hours = round(_clamp(2.5 + (fat / 18) + (protein / 40), 2.2, 6.5), 1)
    sleep_impact = round(_clamp(82 - (fat * 0.28) - (carbs * 0.12) + (protein * 0.08), 42, 91), 0)

    cravings_score = carbs - protein - (fat * 0.25)
    if cravings_score > 22:
        cravings_level = "High"
    elif cravings_score > 8:
        cravings_level = "Medium"
    else:
        cravings_level = "Low"

    meal_name = _meal_name(meal_payload)
    timeline = [
        {
            "offsetMinutes": 0,
            "phase": "Arrival",
            "headline": f"{meal_name} starts a fast fuel wave",
            "body": "Glucose is beginning to rise as the fastest-digesting carbs enter circulation, while protein and fat shape how sharp the climb feels.",
            "tone": "cyan",
            "impactScore": round(_clamp(glucose_peak, 45, 95), 0),
            "microSignals": ["Taste satisfaction peaks", "Early fullness forms", "Energy feels immediate"],
        },
        {
            "offsetMinutes": 45,
            "phase": "Peak",
            "headline": "Your highest-response window lands here",
            "body": "This is the most likely moment for noticeable energy lift and the biggest blood-sugar swing from this meal.",
            "tone": "amber" if cravings_level != "Low" else "emerald",
            "impactScore": round(_clamp(glucose_peak + 3, 50, 98), 0),
            "microSignals": ["Energy crest", "Focus may sharpen", "Hydration matters most"],
        },
        {
            "offsetMinutes": 120,
            "phase": "Cruise",
            "headline": "Protein and fiber take over the pacing",
            "body": "The initial surge cools off and the meal shifts into steadier release, which decides whether you feel sustained or slightly foggy.",
            "tone": "emerald" if protein >= carbs * 0.4 else "violet",
            "impactScore": round(_clamp(58 + protein * 0.35 - carbs * 0.1, 38, 88), 0),
            "microSignals": ["Satiety holds", "Mood stabilizes", "Snack impulse starts forming"],
        },
        {
            "offsetMinutes": round(digestion_hours * 60),
            "phase": "Afterglow",
            "headline": "The meal is nearly metabolically cleared",
            "body": "This is where recovery, cravings, and next-meal hunger become visible. A balanced meal leaves a softer landing; a carb-heavy meal can leave a sharper drop.",
            "tone": "rose" if cravings_level == "High" else "emerald",
            "impactScore": round(_clamp(46 + calories / 30 - protein * 0.2, 35, 82), 0),
            "microSignals": ["Hunger signal returns", "Recovery window opens", "Next-meal timing matters"],
        },
    ]

    return {
        "hero": {
            "title": "Your body reads this meal like a curve, not a calorie count",
            "subtitle": "This preview translates the next few hours into a clean metabolic timeline, from first lift to late landing.",
            "metabolicMood": "Steady release" if cravings_level == "Low" else "Fast spike profile" if cravings_level == "High" else "Mixed-response window",
            "confidenceLabel": "Heuristic fallback",
        },
        "energyCurve": energy_curve,
        "glucoseCurve": glucose_curve,
        "cravings": {
            "level": cravings_level,
            "time": _format_offset(digestion_hours * 60),
            "reason": "The carb-to-protein balance suggests how quickly satiety may fade after the first energy wave.",
        },
        "sleepImpact": sleep_impact,
        "digestionHours": digestion_hours,
        "highlights": [
            {"label": "Peak window", "value": _format_offset(45), "tone": "cyan"},
            {"label": "Digestion", "value": f"{digestion_hours}h", "tone": "violet"},
            {"label": "Cravings risk", "value": cravings_level, "tone": "amber" if cravings_level != "Low" else "emerald"},
        ],
        "timeline": timeline,
        "coachNote": "Pairing this meal with a short walk or extra protein would usually soften the late drop and make the timeline steadier.",
    }


def _normalize_timeline(payload: Dict[str, Any], fallback: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(payload, dict):
        return fallback

    normalized = fallback.copy()
    normalized["hero"] = {**fallback["hero"], **(payload.get("hero") or {})}
    normalized["coachNote"] = str(payload.get("coachNote") or fallback["coachNote"])
    normalized["sleepImpact"] = round(_clamp(_safe_float(payload.get("sleepImpact") or fallback["sleepImpact"]), 0, 100), 0)
    normalized["digestionHours"] = round(_clamp(_safe_float(payload.get("digestionHours") or fallback["digestionHours"]), 1.5, 8.0), 1)

    for curve_key in ("energyCurve", "glucoseCurve"):
        curve = payload.get(curve_key)
        if isinstance(curve, list) and curve:
            normalized[curve_key] = [round(_clamp(_safe_float(point), 0, 100), 1) for point in curve[:5]]
            while len(normalized[curve_key]) < 5:
                normalized[curve_key].append(normalized[curve_key][-1])

    cravings = payload.get("cravings") or {}
    if isinstance(cravings, dict):
        normalized["cravings"] = {
            "level": cravings.get("level") if cravings.get("level") in {"Low", "Medium", "High"} else fallback["cravings"]["level"],
            "time": str(cravings.get("time") or fallback["cravings"]["time"]),
            "reason": str(cravings.get("reason") or fallback["cravings"]["reason"]),
        }

    highlights = payload.get("highlights")
    if isinstance(highlights, list) and highlights:
        normalized["highlights"] = [
            {
                "label": str(item.get("label") or "Signal"),
                "value": str(item.get("value") or ""),
                "tone": item.get("tone") if item.get("tone") in {"emerald", "amber", "rose", "cyan", "violet"} else "cyan",
            }
            for item in highlights[:4]
            if isinstance(item, dict)
        ] or fallback["highlights"]

    timeline = payload.get("timeline")
    if isinstance(timeline, list) and timeline:
        normalized["timeline"] = [
            {
                "offsetMinutes": round(_safe_float(item.get("offsetMinutes")), 0),
                "phase": str(item.get("phase") or "Phase"),
                "headline": str(item.get("headline") or "Body response"),
                "body": str(item.get("body") or ""),
                "tone": item.get("tone") if item.get("tone") in {"emerald", "amber", "rose", "cyan", "violet"} else "cyan",
                "impactScore": round(_clamp(_safe_float(item.get("impactScore")), 0, 100), 0),
                "microSignals": [str(signal) for signal in (item.get("microSignals") or [])[:3] if str(signal).strip()],
            }
            for item in timeline[:5]
            if isinstance(item, dict)
        ] or fallback["timeline"]

    return normalized


def _build_prompt(meal_payload: Dict[str, Any]) -> str:
    meal_type = str(meal_payload.get("type") or "Meal")
    timestamp = str(meal_payload.get("timestamp") or meal_payload.get("time") or "")
    macros = meal_payload.get("macros") or {}
    items = meal_payload.get("items") or []
    item_lines = []
    for item in items[:8]:
        multiplier = _safe_float(item.get("multiplier") or 1)
        item_lines.append(
            f"- {item.get('name') or 'Food'} | calories={round(_safe_float(item.get('calories')) * multiplier, 1)} | protein={round(_safe_float(item.get('protein')) * multiplier, 1)} | carbs={round(_safe_float(item.get('carbs')) * multiplier, 1)} | fat={round(_safe_float(item.get('fat')) * multiplier, 1)}"
        )

    return (
        "You are NutriFit's signature metabolic forecaster. "
        "Turn this meal into a premium, vivid but responsible hour-by-hour Eat Effect timeline. "
        "Do not diagnose disease or overclaim certainty. "
        "Be specific about energy, glucose pacing, satiety, cravings, and digestion. "
        "Return ONLY valid JSON. No markdown, no explanation.\n\n"
        f"Meal type: {meal_type}\n"
        f"Logged at: {timestamp}\n"
        f"Total calories: {round(_safe_float(meal_payload.get('totalCalories') or macros.get('calories')), 1)}\n"
        f"Macros: protein={round(_safe_float(macros.get('protein')), 1)}g, carbs={round(_safe_float(macros.get('carbs')), 1)}g, fat={round(_safe_float(macros.get('fat')), 1)}g\n"
        "Items:\n"
        + ("\n".join(item_lines) if item_lines else "- Unknown meal")
        + "\n\n"
        "Return a JSON object with these keys exactly: hero, energyCurve, glucoseCurve, cravings, sleepImpact, digestionHours, highlights, timeline, coachNote. "
        "hero must contain title, subtitle, metabolicMood, confidenceLabel. "
        "cravings must contain level, time, reason. "
        "highlights must be an array of objects with label, value, tone. "
        "timeline must contain 4 or 5 stages over the next few hours. Each stage must contain offsetMinutes, phase, headline, body, tone, impactScore, microSignals. "
        "The timeline should feel elegant and time-anchored: describe what happens now, during the rise, at the main response window, during stabilization, and at the late landing. "
        "Each timeline body should be insight-rich and concise, written like a premium product feature rather than generic nutrition advice. "
        "Use phrases that make the experience unique: talk about pacing, release profile, late landing, steadiness, and appetite rebound. "
        "Make highlights feel useful and time-based, not generic labels. "
        "Make coachNote a polished bottom summary of the whole meal arc in 2 to 3 sentences. "
        "Use tones only from: emerald, amber, rose, cyan, violet. "
        "Ensure energyCurve and glucoseCurve each have exactly 5 numeric points from now to +4h, scored 0-100."
    )


def _candidate_models() -> List[str]:
    configured = (os.getenv("GROQ_MODEL") or "").strip()
    models = [
        configured,
        "llama-3.3-70b-versatile",
        "mixtral-8x7b-32768",
        "llama3-8b-8192",
    ]
    seen = set()
    ordered = []
    for model in models:
        if model and model not in seen:
            seen.add(model)
            ordered.append(model)
    return ordered


def _get_groq_client() -> Groq:
    api_key = (os.getenv("GROQ_API_KEY") or "").strip()
    if not api_key:
        raise ValueError("Missing GROQ_API_KEY.")
    return Groq(api_key=api_key)


def _extract_json_object(raw_text: str) -> Dict[str, Any]:
    text = (raw_text or "").strip()
    if not text:
        raise ValueError("Empty model output.")
    try:
        return json.loads(text)
    except Exception:
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            candidate = text[start:end + 1]
            try:
                return json.loads(candidate)
            except Exception:
                LOGGER.error("RAW OUTPUT: %s", text)
                raise ValueError("Invalid JSON from model")
        LOGGER.error("RAW OUTPUT: %s", text)
        raise ValueError("Invalid JSON from model")


def _call_groq(prompt: str, model_name: str = "llama-3.3-70b-versatile") -> str:
    client = _get_groq_client()
    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You generate structured, polished metabolic forecast timelines for meal tracking applications. "
                        "Return ONLY valid JSON. No markdown, no explanation."
                    ),
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            temperature=0.35,
            max_tokens=1800,
        )
        return response.choices[0].message.content or ""
    except Exception as exc:
        LOGGER.exception("Groq API Error | model=%s | error=%s", model_name, exc)
        raise


def _call_groq_model(meal_payload: Dict[str, Any], model_name: str) -> Dict[str, Any]:
    prompt = _build_prompt(meal_payload)
    LOGGER.info(
        "Eat Effect Groq request starting | model=%s | meal=%s | calories=%s | items=%s",
        model_name,
        meal_payload.get("type"),
        meal_payload.get("totalCalories"),
        len(meal_payload.get("items") or []),
    )
    raw_output = _call_groq(prompt, model_name)
    if not raw_output:
        LOGGER.error("Eat Effect Groq returned empty content | model=%s", model_name)
        raise ValueError("Groq returned an empty timeline response.")
    LOGGER.info("Eat Effect Groq request succeeded | model=%s | response_chars=%s", model_name, len(raw_output))
    return _extract_json_object(raw_output)


def generate_eat_effect_timeline(meal_payload: Dict[str, Any]) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    fallback = _derive_fallback_timeline(meal_payload)
    api_key = (os.getenv("GROQ_API_KEY") or "").strip()
    debug = {
        "provider": "groq",
        "usedApi": False,
        "usedFallback": True,
        "configuredModel": os.getenv("GROQ_MODEL", "").strip() or DEFAULT_GROQ_MODEL,
        "attemptedModels": [],
        "error": "",
    }

    if not api_key:
        result = fallback
        result["hero"]["confidenceLabel"] = "Fallback preview"
        debug["error"] = "Missing GROQ_API_KEY."
        LOGGER.warning("Eat Effect Groq skipped | reason=%s", debug["error"])
        return result, debug

    last_error = None
    for model_name in _candidate_models():
        debug["attemptedModels"].append(model_name)
        try:
            model_payload = _call_groq_model(meal_payload, model_name)
            debug["apiPath"] = "groq.chat.completions"
            normalized = _normalize_timeline(model_payload, fallback)
            normalized["hero"]["confidenceLabel"] = "Groq-powered forecast"
            debug["usedApi"] = True
            debug["usedFallback"] = False
            debug["model"] = model_name
            debug["error"] = ""
            LOGGER.info("Eat Effect Groq finalized | model=%s | fallback=%s", model_name, debug["usedFallback"])
            return normalized, debug
        except Exception as exc:
            last_error = str(exc)
            LOGGER.exception("Eat Effect Groq failed | model=%s | error=%s", model_name, exc)

    result = fallback
    result["hero"]["confidenceLabel"] = "Fallback preview"
    debug["error"] = last_error or "Unknown Groq error."
    LOGGER.warning("Eat Effect Groq fell back after all model attempts | error=%s", debug["error"])
    return result, debug
