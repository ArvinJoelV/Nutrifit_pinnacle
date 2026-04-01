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
from zoneinfo import ZoneInfo

FIT_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
FIT_TOKEN_URL = "https://oauth2.googleapis.com/token"
FIT_AGGREGATE_URL = "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate"
FIT_SCOPES = [
    "https://www.googleapis.com/auth/fitness.activity.read",
    "https://www.googleapis.com/auth/fitness.location.read",
    "https://www.googleapis.com/auth/fitness.body.read",
]


class GoogleFitConfigError(Exception):
    pass


def is_google_fit_configured():
    return bool(_client_id() and _client_secret() and _redirect_uri() and _state_secret())


def _client_id():
    return os.getenv("GOOGLE_FIT_CLIENT_ID", "").strip()


def _client_secret():
    return os.getenv("GOOGLE_FIT_CLIENT_SECRET", "").strip()


def _redirect_uri():
    return os.getenv("GOOGLE_FIT_REDIRECT_URI", "http://localhost:9510/api/google-fit/callback").strip()


def get_frontend_redirect():
    return os.getenv("GOOGLE_FIT_FRONTEND_REDIRECT", "http://localhost:5173/settings").strip()


def _state_secret():
    return os.getenv("GOOGLE_FIT_STATE_SECRET", "").strip()


def get_fit_timezone_name():
    raw_value = os.getenv("GOOGLE_FIT_TIMEZONE", os.getenv("APP_TIMEZONE", "Asia/Kolkata"))
    return (raw_value or "Asia/Kolkata").strip().strip("'\"") or "Asia/Kolkata"


def get_fit_timezone():
    original_name = get_fit_timezone_name()
    normalized_name = {
        "Asia/Calcutta": "Asia/Kolkata",
        "Calcutta": "Asia/Kolkata",
        "Kolkata": "Asia/Kolkata",
        "IST": "Asia/Kolkata",
    }.get(original_name, original_name)
    try:
        return ZoneInfo(normalized_name)
    except Exception as exc:
        fixed_offsets = {
            "Asia/Kolkata": timezone(timedelta(hours=5, minutes=30)),
        }
        fallback_tz = fixed_offsets.get(normalized_name)
        if fallback_tz is not None:
            return fallback_tz
        raise GoogleFitConfigError(
            f"Invalid GOOGLE_FIT_TIMEZONE: {original_name}. Try a valid IANA name such as Asia/Kolkata."
        ) from exc


def ensure_google_fit_config():
    if is_google_fit_configured():
        return
    raise GoogleFitConfigError(
        "Google Fit is not configured. Set GOOGLE_FIT_CLIENT_ID, GOOGLE_FIT_CLIENT_SECRET, "
        "GOOGLE_FIT_REDIRECT_URI, and GOOGLE_FIT_STATE_SECRET."
    )


def _urlsafe_b64encode(raw_bytes):
    return base64.urlsafe_b64encode(raw_bytes).decode("utf-8").rstrip("=")


def _urlsafe_b64decode(encoded_text):
    padding = "=" * (-len(encoded_text) % 4)
    return base64.urlsafe_b64decode((encoded_text + padding).encode("utf-8"))


def _sign_state(payload_text):
    return hmac.new(_state_secret().encode("utf-8"), payload_text.encode("utf-8"), hashlib.sha256).hexdigest()


def build_auth_url(user_id):
    ensure_google_fit_config()
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
        "include_granted_scopes": "true",
        "prompt": "consent",
        "scope": " ".join(FIT_SCOPES),
        "state": state,
    }
    return f"{FIT_AUTH_URL}?{urlencode(params)}"


def parse_state(state):
    ensure_google_fit_config()
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


def _http_json(url, method="GET", headers=None, body=None):
    request = Request(url, data=body, headers=headers or {}, method=method)
    try:
        with urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        details = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Google Fit request failed ({exc.code}): {details}") from exc


def exchange_code_for_tokens(code):
    ensure_google_fit_config()
    form = urlencode(
        {
            "code": code,
            "client_id": _client_id(),
            "client_secret": _client_secret(),
            "redirect_uri": _redirect_uri(),
            "grant_type": "authorization_code",
        }
    ).encode("utf-8")
    payload = _http_json(
        FIT_TOKEN_URL,
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        body=form,
    )
    payload["expires_at"] = int(time.time()) + int(payload.get("expires_in", 3600))
    return payload


def refresh_access_token(refresh_token):
    ensure_google_fit_config()
    form = urlencode(
        {
            "client_id": _client_id(),
            "client_secret": _client_secret(),
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }
    ).encode("utf-8")
    payload = _http_json(
        FIT_TOKEN_URL,
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        body=form,
    )
    payload["refresh_token"] = refresh_token
    payload["expires_at"] = int(time.time()) + int(payload.get("expires_in", 3600))
    return payload


def ensure_valid_tokens(tokens):
    if not tokens:
        raise ValueError("No Google Fit tokens found for this user")
    if int(tokens.get("expires_at") or 0) > int(time.time()) + 60:
        return tokens
    refresh_token = tokens.get("refresh_token")
    if not refresh_token:
        raise ValueError("Stored Google Fit token has expired and no refresh token is available")
    return refresh_access_token(refresh_token)


def _extract_number(value):
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, dict):
        for key in ("fpVal", "intVal"):
            if key in value:
                return float(value[key])
    return 0.0


def _utc_date_from_millis(value):
    return datetime.fromtimestamp(int(value) / 1000, tz=timezone.utc).date().isoformat()


def _local_date_from_millis(value, tz):
    return datetime.fromtimestamp(int(value) / 1000, tz=timezone.utc).astimezone(tz).date().isoformat()


def _parse_bucket(bucket, tz):
    start_millis = int(bucket.get("startTimeMillis", 0) or 0)
    end_millis = int(bucket.get("endTimeMillis", 0) or 0)
    data_source_ids = []
    metrics = {
        "activity_date": _local_date_from_millis(start_millis, tz),
        "bucket_start_utc": datetime.fromtimestamp(start_millis / 1000, tz=timezone.utc).isoformat(),
        "bucket_end_utc": datetime.fromtimestamp(end_millis / 1000, tz=timezone.utc).isoformat(),
        "bucket_start_local": datetime.fromtimestamp(start_millis / 1000, tz=timezone.utc).astimezone(tz).isoformat(),
        "bucket_end_local": datetime.fromtimestamp(end_millis / 1000, tz=timezone.utc).astimezone(tz).isoformat(),
        "timezone": getattr(tz, "key", str(tz)),
        "data_source_ids": data_source_ids,
        "steps": 0,
        "calories_burned": 0.0,
        "distance_meters": 0.0,
        "avg_heart_rate": None,
        "max_heart_rate": None,
        "min_heart_rate": None,
        "raw_payload": bucket,
    }

    for dataset in bucket.get("dataset", []):
        source_id = dataset.get("dataSourceId", "")
        if source_id and source_id not in data_source_ids:
            data_source_ids.append(source_id)
        points = dataset.get("point", [])
        values = []
        for point in points:
            values.extend(point.get("value", []))

        if "step_count.delta" in source_id:
            metrics["steps"] += int(sum(_extract_number(value) for value in values))
        elif "calories.expended" in source_id:
            metrics["calories_burned"] = round(
                metrics["calories_burned"] + sum(_extract_number(value) for value in values),
                2,
            )
        elif "distance.delta" in source_id:
            metrics["distance_meters"] = round(
                metrics["distance_meters"] + sum(_extract_number(value) for value in values),
                2,
            )
        elif "heart_rate.summary" in source_id and values:
            parsed = [_extract_number(value) for value in values]
            metrics["avg_heart_rate"] = round(parsed[0], 2) if len(parsed) > 0 else None
            metrics["max_heart_rate"] = round(parsed[1], 2) if len(parsed) > 1 else None
            metrics["min_heart_rate"] = round(parsed[2], 2) if len(parsed) > 2 else None

    return metrics


def _build_aggregate_payload(start_time, end_time, include_heart_rate=True):
    aggregate_by = [
        {"dataTypeName": "com.google.step_count.delta"},
        {"dataTypeName": "com.google.calories.expended"},
        {"dataTypeName": "com.google.distance.delta"},
    ]
    if include_heart_rate:
        aggregate_by.append({"dataTypeName": "com.google.heart_rate.summary"})

    return {
        "startTimeMillis": int(start_time.timestamp() * 1000),
        "endTimeMillis": int(end_time.timestamp() * 1000),
        "aggregateBy": aggregate_by,
        "bucketByTime": {"durationMillis": 86400000},
    }


def fetch_daily_activity(access_token, days=7):
    tz = get_fit_timezone()
    local_now = datetime.now(tz)
    day_count = max(1, int(days))
    local_start = datetime.combine(
        (local_now - timedelta(days=day_count - 1)).date(),
        datetime.min.time(),
        tzinfo=tz,
    )
    start_time = local_start.astimezone(timezone.utc)
    end_time = local_now.astimezone(timezone.utc)
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    try:
        response = _http_json(
            FIT_AGGREGATE_URL,
            method="POST",
            headers=headers,
            body=json.dumps(_build_aggregate_payload(start_time, end_time, include_heart_rate=True)).encode("utf-8"),
        )
    except RuntimeError as exc:
        if "no default datasource found for: com.google.heart_rate.summary" not in str(exc):
            raise
        response = _http_json(
            FIT_AGGREGATE_URL,
            method="POST",
            headers=headers,
            body=json.dumps(_build_aggregate_payload(start_time, end_time, include_heart_rate=False)).encode("utf-8"),
        )

    return [_parse_bucket(bucket, tz) for bucket in response.get("bucket", [])]
