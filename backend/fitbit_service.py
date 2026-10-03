"""Google Health API integration service (replaces legacy Fitbit Web API).

Handles OAuth 2.0 Authorization Code flow through Google Cloud and fetches
daily activity data (steps, calories, heart rate, sleep) from the unified
Google Health API v4.

Data is normalised into the same dict format that google_fit_service returns
so downstream consumers (Activity Agent / Tools) work unchanged.

Setup:
    1. Enable the Google Health API at:
       https://console.developers.google.com/apis/library/health.googleapis.com
    2. Create an OAuth 2.0 Client ID at:
       https://console.developers.google.com/apis/credentials
    3. Add test users at:
       https://console.developers.google.com/auth/audience
    4. Add scopes at:
       https://console.developers.google.com/auth/scopes
    5. Set env vars: GOOGLE_HEALTH_CLIENT_ID, GOOGLE_HEALTH_CLIENT_SECRET
"""

import base64
import hashlib
import hmac
import json
import os
import time
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError

# Google OAuth endpoints (standard Google, NOT legacy Fitbit)
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"

# Google Health API v4 base
HEALTH_API_BASE = "https://health.googleapis.com/v4"

# Scopes for the Google Health API
HEALTH_SCOPES = [
    "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly",
    "https://www.googleapis.com/auth/googlehealth.sleep.readonly",
]


class FitbitConfigError(Exception):
    """Raised when Google Health API / Fitbit is not configured."""
    pass


# ---------------------------------------------------------------------------
# Configuration helpers
# ---------------------------------------------------------------------------

def _client_id():
    # Check Google Health first, fall back to Fitbit legacy env vars
    return (os.getenv("GOOGLE_HEALTH_CLIENT_ID", "") or os.getenv("FITBIT_CLIENT_ID", "")).strip()


def _client_secret():
    return (os.getenv("GOOGLE_HEALTH_CLIENT_SECRET", "") or os.getenv("FITBIT_CLIENT_SECRET", "")).strip()


def _redirect_uri():
    return os.getenv("FITBIT_REDIRECT_URI", "http://localhost:9510/api/fitbit/callback").strip()


def get_frontend_redirect():
    return os.getenv("FITBIT_FRONTEND_REDIRECT", "http://localhost:5173/settings").strip()


def _state_secret():
    return os.getenv("FITBIT_STATE_SECRET", os.getenv("GOOGLE_FIT_STATE_SECRET", "")).strip()


def is_fitbit_configured():
    return bool(_client_id() and _client_secret() and _redirect_uri() and _state_secret())


def _ensure_config():
    if is_fitbit_configured():
        return
    raise FitbitConfigError(
        "Google Health API is not configured. Set GOOGLE_HEALTH_CLIENT_ID, "
        "GOOGLE_HEALTH_CLIENT_SECRET in your .env file. "
        "See: https://developers.google.com/health/setup"
    )


# ---------------------------------------------------------------------------
# State signing (mirrors google_fit_service approach)
# ---------------------------------------------------------------------------

def _urlsafe_b64encode(raw_bytes):
    return base64.urlsafe_b64encode(raw_bytes).decode("utf-8").rstrip("=")


def _urlsafe_b64decode(encoded_text):
    padding = "=" * (-len(encoded_text) % 4)
    return base64.urlsafe_b64decode((encoded_text + padding).encode("utf-8"))


def _sign_state(payload_text):
    return hmac.new(
        _state_secret().encode("utf-8"),
        payload_text.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


# ---------------------------------------------------------------------------
# OAuth helpers (using standard Google OAuth 2.0)
# ---------------------------------------------------------------------------

def build_auth_url(user_id):
    """Return the Google OAuth authorization URL for the Google Health API."""
    _ensure_config()
    if not user_id:
        raise ValueError("user_id is required")

    payload = _urlsafe_b64encode(
        json.dumps({"user_id": user_id, "ts": int(time.time())}, separators=(",", ":")).encode("utf-8")
    )
    signature = _sign_state(payload)
    state = f"{payload}.{signature}"

    params = {
        "client_id": _client_id(),
        "redirect_uri": _redirect_uri(),
        "response_type": "code",
        "access_type": "offline",
        "include_granted_scopes": "false",
        "prompt": "consent",
        "scope": " ".join(HEALTH_SCOPES),
        "state": state,
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


def parse_state(state):
    """Verify and decode an OAuth state parameter."""
    _ensure_config()
    if not state or "." not in state:
        raise ValueError("Missing or invalid OAuth state")

    payload, signature = state.rsplit(".", 1)
    expected = _sign_state(payload)
    if not hmac.compare_digest(signature, expected):
        raise ValueError("Invalid OAuth state signature")

    decoded = json.loads(_urlsafe_b64decode(payload).decode("utf-8"))
    if int(time.time()) - int(decoded.get("ts", 0)) > 900:
        raise ValueError("OAuth state has expired")
    return decoded


# ---------------------------------------------------------------------------
# HTTP helper
# ---------------------------------------------------------------------------

def _http_json(url, method="GET", headers=None, body=None, timeout=5):
    req = Request(url, data=body, headers=headers or {}, method=method)
    try:
        with urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except HTTPError as exc:
        details = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Google Health API request failed ({exc.code}): {details}") from exc


# ---------------------------------------------------------------------------
# Token management (standard Google OAuth token exchange)
# ---------------------------------------------------------------------------

def exchange_code_for_tokens(code):
    """Exchange an authorization code for access + refresh tokens."""
    _ensure_config()
    form = urlencode({
        "code": code,
        "client_id": _client_id(),
        "client_secret": _client_secret(),
        "redirect_uri": _redirect_uri(),
        "grant_type": "authorization_code",
    }).encode("utf-8")

    payload = _http_json(
        GOOGLE_TOKEN_URL,
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        body=form,
    )
    payload["expires_at"] = int(time.time()) + int(payload.get("expires_in", 3600))
    return payload


def refresh_access_token(refresh_token):
    """Refresh an expired access token."""
    _ensure_config()
    form = urlencode({
        "client_id": _client_id(),
        "client_secret": _client_secret(),
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }).encode("utf-8")

    payload = _http_json(
        GOOGLE_TOKEN_URL,
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        body=form,
    )
    payload["refresh_token"] = refresh_token
    payload["expires_at"] = int(time.time()) + int(payload.get("expires_in", 3600))
    return payload


def ensure_valid_tokens(tokens):
    """Return valid tokens, refreshing on-demand if needed."""
    if not tokens:
        raise ValueError("No Google Health API tokens found for this user")
    if int(tokens.get("expires_at") or 0) > int(time.time()) + 60:
        return tokens
    refresh_token = tokens.get("refresh_token")
    if not refresh_token:
        raise ValueError("Stored token has expired and no refresh token is available")
    return refresh_access_token(refresh_token)


# ---------------------------------------------------------------------------
# Google Health API v4 — Data fetching
# ---------------------------------------------------------------------------

def _to_date_dict(d):
    if isinstance(d, str):
        parts = [int(p) for p in d.split("-")]
        return {"year": parts[0], "month": parts[1], "day": parts[2]}
    return {"year": d.year, "month": d.month, "day": d.day}


def _daily_roll_up(access_token, data_type, start_date, end_date):
    """Call the dailyRollUp endpoint for a given data type.

    POST https://health.googleapis.com/v4/users/me/dataTypes/{dataType}/dataPoints:dailyRollUp
    """
    url = f"{HEALTH_API_BASE}/users/me/dataTypes/{data_type}/dataPoints:dailyRollUp"
    body = json.dumps({
        "range": {
            "start": {
                "date": _to_date_dict(start_date),
                "time": {"hours": 0, "minutes": 0, "seconds": 0, "nanos": 0},
            },
            "end": {
                "date": _to_date_dict(end_date),
                "time": {"hours": 0, "minutes": 0, "seconds": 0, "nanos": 0},
            },
        },
    }).encode("utf-8")

    try:
        return _http_json(
            url,
            method="POST",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            body=body,
        )
    except RuntimeError:
        return {}


def _normalize_date_str(val):
    if not val:
        return ""
    if isinstance(val, str):
        return val[:10]
    if isinstance(val, dict):
        y = val.get("year", 0)
        m = val.get("month", 0)
        d = val.get("day", 0)
        return f"{y:04d}-{m:02d}-{d:02d}"
    return ""


def _extract_steps_count(entry):
    if not isinstance(entry, dict):
        return 0
    # Google Health API v4 format: steps.countSum
    steps_obj = entry.get("steps")
    if isinstance(steps_obj, dict):
        count_sum = steps_obj.get("countSum", 0)
        if count_sum:
            return int(count_sum)
        return int(steps_obj.get("total", 0) or steps_obj.get("count", 0) or 0)
    if isinstance(steps_obj, (int, float)):
        return int(steps_obj)
    # Fallback: value list or scalar
    val = entry.get("value")
    if isinstance(val, list) and len(val) > 0:
        first = val[0]
        if isinstance(first, dict):
            return int(first.get("intVal", 0) or first.get("fpVal", 0) or 0)
        if isinstance(first, (int, float)):
            return int(first)
    if isinstance(val, (int, float)):
        return int(val)
    return int(entry.get("total", 0) or entry.get("count", 0) or entry.get("countSum", 0) or 0)


def _get_entry_date(entry):
    """Extract date string from a Health API v4 rollupDataPoint or legacy entry."""
    # Health API v4: civilStartTime.date
    cst = entry.get("civilStartTime")
    if isinstance(cst, dict):
        return _normalize_date_str(cst.get("date"))
    # Legacy: date field directly
    return _normalize_date_str(entry.get("date"))


def _extract_distance_meters(entry):
    if not isinstance(entry, dict):
        return 0.0
    dist_obj = entry.get("distance")
    if isinstance(dist_obj, dict):
        mm = dist_obj.get("millimetersSum") or dist_obj.get("countSum") or 0
        return round(float(mm) / 1000.0, 2)
    val = entry.get("value")
    if isinstance(val, (int, float)):
        return round(float(val), 2)
    return 0.0


def _parse_daily_data(date_str, steps_data, heart_data, sleep_data, distance_data=None, active_minutes_data=None):
    """Normalise Google Health API responses into the standard dict format."""

    # Steps
    steps = 0
    for entry in steps_data:
        entry_date = _get_entry_date(entry)
        if entry_date == date_str:
            steps = _extract_steps_count(entry)
            break

    # Distance
    distance_meters = 0.0
    if distance_data:
        for entry in distance_data:
            entry_date = _get_entry_date(entry)
            if entry_date == date_str:
                distance_meters = _extract_distance_meters(entry)
                break
    if distance_meters == 0.0 and steps > 0:
        # Fallback average stride length ~0.762m per step
        distance_meters = round(steps * 0.762, 2)

    # Calories Burned estimation: ~0.045 kcal/step (approx 45 kcal per 1,000 steps for standard adult)
    calories_burned = round(steps * 0.045, 1)

    # Heart rate
    avg_heart_rate = None
    max_heart_rate = None
    min_heart_rate = None
    for entry in heart_data:
        entry_date = _get_entry_date(entry)
        if entry_date == date_str:
            hr = entry.get("heartRate", entry)
            if isinstance(hr, dict):
                avg_heart_rate = float(hr.get("average", 0) or 0) or None
                max_heart_rate = float(hr.get("max", 0) or 0) or None
                min_heart_rate = float(hr.get("min", 0) or 0) or None
            break

    # Sleep
    sleep_minutes = 0
    for entry in sleep_data:
        entry_date = _get_entry_date(entry)
        if entry_date == date_str:
            sleep_val = entry.get("sleep", entry)
            if isinstance(sleep_val, dict):
                sleep_minutes = int(
                    sleep_val.get("totalMinutesAsleep", 0) or
                    sleep_val.get("durationMinutes", 0) or 0
                )
            break

    return {
        "activity_date": date_str,
        "timezone": None,
        "bucket_start_utc": None,
        "bucket_end_utc": None,
        "bucket_start_local": None,
        "bucket_end_local": None,
        "data_source_ids": ["google_health_api:fitbit"],
        "steps": steps,
        "calories_burned": calories_burned,
        "distance_meters": distance_meters,
        "avg_heart_rate": avg_heart_rate,
        "max_heart_rate": max_heart_rate,
        "min_heart_rate": min_heart_rate,
        "sleep_minutes": sleep_minutes,
        "source": "fitbit",
        "raw_payload": {
            "steps_raw": steps_data,
            "heart_raw": heart_data,
            "sleep_raw": sleep_data,
        },
    }


def _is_wearable_step_source(stream_id):
    """Return True if a Google Fitness data source ID belongs to a wearable/Fitbit."""
    s = (stream_id or "").lower()
    # Positive: wearable sync apps or explicit wearable tags
    wearable_keywords = [
        "healthsync", "noisefit", "fitbit", "watch", "wear", "wrist",
        "band", "tracker", "garmin", "polar", "whoop", "amazfit",
        "health_connect", "miband", "galaxy_watch", "pixel_watch",
    ]
    if any(k in s for k in wearable_keywords):
        return True
    return False


def _is_phone_step_source(stream_id):
    """Return True if a Google Fitness data source ID belongs to a phone sensor."""
    s = (stream_id or "").lower()
    phone_keywords = [
        "vivo", "xiaomi", "poco", "samsung", "oneplus", "oppo", "motorola",
        "pixel", "phone", "handset", "pedometer", "step_detector",
        "step_counter", "internal_step", "software_step",
        "estimated_steps", "merge_step", "top_level", "aggregated",
    ]
    return any(k in s for k in phone_keywords)


def _fetch_wearable_steps_via_fitness_api(access_token, days=7):
    """Query Google Fitness API for wearable-only step sources (HealthSync, NoiseFit, etc.).

    Returns a dict mapping date_str -> total_wearable_steps, or None on failure.
    """
    try:
        from urllib.request import Request, urlopen
        from urllib.error import HTTPError
        import json as _json

        headers_auth = {"Authorization": f"Bearer {access_token}"}

        # 1. List all data sources
        req = Request(
            "https://www.googleapis.com/fitness/v1/users/me/dataSources",
            headers=headers_auth,
        )
        with urlopen(req, timeout=10) as resp:
            sources_resp = _json.loads(resp.read().decode("utf-8"))

        all_sources = sources_resp.get("dataSource", [])

        # 2. Filter to wearable step sources only
        wearable_step_ids = []
        for src in all_sources:
            dt_name = src.get("dataType", {}).get("name", "")
            sid = src.get("dataStreamId", "")
            if "step" not in dt_name:
                continue
            if _is_wearable_step_source(sid) and not _is_phone_step_source(sid):
                wearable_step_ids.append(sid)

        if not wearable_step_ids:
            return None  # No wearable sources found

        # 3. Query each wearable source for today's data
        today = datetime.now(timezone.utc).date()
        start_dt = datetime(today.year, today.month, today.day, 0, 0, 0, tzinfo=timezone.utc)
        daily_steps = {}

        for day_offset in range(days):
            target = today - timedelta(days=days - 1 - day_offset)
            daily_steps[target.isoformat()] = 0

        for sid in wearable_step_ids:
            for day_offset in range(days):
                target = today - timedelta(days=days - 1 - day_offset)
                day_start = datetime(target.year, target.month, target.day, 0, 0, 0, tzinfo=timezone.utc)
                day_end = day_start + timedelta(days=1)
                start_ns = int(day_start.timestamp() * 1e9)
                end_ns = int(day_end.timestamp() * 1e9)

                url = f"https://www.googleapis.com/fitness/v1/users/me/dataSources/{sid}/datasets/{start_ns}-{end_ns}"
                try:
                    ds_req = Request(url, headers=headers_auth)
                    with urlopen(ds_req, timeout=10) as ds_resp:
                        ds_data = _json.loads(ds_resp.read().decode("utf-8"))
                    for pt in ds_data.get("point", []):
                        for v in pt.get("value", []):
                            daily_steps[target.isoformat()] += int(v.get("intVal", 0) or 0)
                except Exception:
                    pass

        return daily_steps
    except Exception:
        return None


def fetch_daily_activity(access_token, days=7):
    """Fetch daily activity for the last N days from the Google Health API.

    Returns a list of dicts in the same normalised format as
    google_fit_service.fetch_daily_activity(), but strictly isolates Fitbit
    data and NEVER contaminates with phone accelerometer readings.

    Strategy:
        1. Try Google Health API v4 dailyRollUp (clean Fitbit cloud data).
        2. If that fails (403 DISALLOWED_OAUTH_SCOPES), fall back to
           querying Google Fitness API for WEARABLE-ONLY data sources
           (HealthSync, NoiseFit, etc.) — never phone sensors.
        3. If neither works, return 0 steps honestly.
    """
    today = datetime.now(timezone.utc).date()
    start_date = (today - timedelta(days=days - 1)).isoformat()
    end_date = (today + timedelta(days=1)).isoformat()  # exclusive end

    # --- Attempt 1: Google Health API v4 ---
    steps_resp = _daily_roll_up(access_token, "steps", start_date, end_date)
    steps_data = steps_resp.get("rollupDataPoints", steps_resp.get("dailyRollUp", steps_resp.get("dataPoints", [])))

    if steps_data:
        # Health API v4 worked — use it for all data types
        heart_resp = _daily_roll_up(access_token, "heart-rate", start_date, end_date)
        sleep_resp = _daily_roll_up(access_token, "sleep", start_date, end_date)
        dist_resp = _daily_roll_up(access_token, "distance", start_date, end_date)
        active_resp = _daily_roll_up(access_token, "active-minutes", start_date, end_date)

        heart_data = heart_resp.get("rollupDataPoints", heart_resp.get("dailyRollUp", heart_resp.get("dataPoints", [])))
        sleep_data = sleep_resp.get("rollupDataPoints", sleep_resp.get("dailyRollUp", sleep_resp.get("dataPoints", [])))
        dist_data = dist_resp.get("rollupDataPoints", dist_resp.get("dailyRollUp", dist_resp.get("dataPoints", [])))
        active_data = active_resp.get("rollupDataPoints", active_resp.get("dailyRollUp", active_resp.get("dataPoints", [])))

        results = []
        for offset in range(days):
            target_date = today - timedelta(days=days - 1 - offset)
            date_str = target_date.isoformat()
            results.append(_parse_daily_data(date_str, steps_data, heart_data, sleep_data, dist_data, active_data))
        return results

    # --- Attempt 2: Google Fitness API (wearable sources only) ---
    wearable_steps = _fetch_wearable_steps_via_fitness_api(access_token, days=days)

    results = []
    for offset in range(days):
        target_date = today - timedelta(days=days - 1 - offset)
        date_str = target_date.isoformat()
        steps = 0
        if wearable_steps and date_str in wearable_steps:
            steps = wearable_steps[date_str]

        results.append({
            "activity_date": date_str,
            "timezone": None,
            "bucket_start_utc": None,
            "bucket_end_utc": None,
            "bucket_start_local": None,
            "bucket_end_local": None,
            "data_source_ids": ["google_fitness_api:wearable_only"],
            "steps": steps,
            "calories_burned": round(steps * 0.045, 1),
            "distance_meters": round(steps * 0.762, 2),
            "avg_heart_rate": None,
            "max_heart_rate": None,
            "min_heart_rate": None,
            "sleep_minutes": 0,
            "source": "fitbit",
            "raw_payload": {
                "fallback": "wearable_fitness_api",
                "wearable_steps": wearable_steps,
            },
        })

    return results
