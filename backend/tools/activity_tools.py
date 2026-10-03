from datetime import datetime, timedelta, timezone

import fit_store
from .base import BaseTool, ToolResult


class ActivityContextTool(BaseTool):
    name = "activity_context"

    def run(self, **kwargs) -> ToolResult:
        user_id = kwargs.get("user_id")
        days = kwargs.get("days", 1)
        activity_data = kwargs.get("activity_data")
        source_used = "payload"

        # If no activity data was passed in the request, try to fetch it
        # from connected wearable services: Fitbit first, then Google Fit.
        if activity_data is None:
            if not user_id:
                return ToolResult(
                    ok=False,
                    tool=self.name,
                    error="user_id is required when activity_data is not provided",
                )

            today = datetime.now(timezone.utc).date()
            start_date = (today - timedelta(days=days - 1)).isoformat()
            end_date = today.isoformat()

            # --- Priority 1: Fitbit ---
            fitbit_tokens = fit_store.get_fitbit_tokens(user_id)
            if fitbit_tokens:
                try:
                    from fitbit_service import ensure_valid_tokens as fb_ensure, fetch_daily_activity as fb_fetch
                    valid_tokens = fb_ensure(fitbit_tokens)
                    if valid_tokens.get("access_token") != fitbit_tokens.get("access_token"):
                        fit_store.save_fitbit_tokens(user_id, valid_tokens)
                    activity_data = fb_fetch(valid_tokens["access_token"], days=days)
                    source_used = "fitbit"
                except Exception:
                    activity_data = fit_store.get_daily_metrics(user_id, start_date, end_date, source="fitbit")
                    source_used = "fitbit" if activity_data else "none"

            # --- Priority 2: Google Fit (only if Fitbit is NOT connected) ---
            if activity_data is None and not fitbit_tokens:
                activity_data = fit_store.get_daily_metrics(user_id, start_date, end_date)
                if activity_data:
                    source_used = "google_fit"
                else:
                    source_used = "none"

        if isinstance(activity_data, dict):
            activity_data = [activity_data]
        elif not isinstance(activity_data, list):
            activity_data = []

        if not activity_data:
            return ToolResult(
                ok=True,
                tool=self.name,
                data={
                    "total_steps": 0,
                    "avg_daily_steps": 0,
                    "total_calories_burned": 0.0,
                    "avg_daily_calories_burned": 0.0,
                    "avg_heart_rate": 0.0,
                    "sleep_minutes": 0,
                    "intensity_level": "unknown",
                    "calorie_adjustment": 0,
                    "source": source_used,
                },
                confidence=1.0,
            )

        total_steps = sum(float(day.get("steps") or 0) for day in activity_data)
        total_calories = sum(float(day.get("calories_burned") or day.get("caloriesBurned") or 0) for day in activity_data)
        
        heart_rates = [float(day.get("avg_heart_rate") or 0) for day in activity_data if float(day.get("avg_heart_rate") or 0) > 0]
        avg_heart_rate = sum(heart_rates) / len(heart_rates) if heart_rates else 0.0

        total_sleep = sum(int(day.get("sleep_minutes") or 0) for day in activity_data)
        
        num_days = len(activity_data)
        avg_daily_steps = total_steps / num_days
        avg_daily_calories = total_calories / num_days

        if avg_daily_steps < 4000:
            intensity_level = "sedentary"
        elif avg_daily_steps < 7500:
            intensity_level = "light"
        elif avg_daily_steps < 10000:
            intensity_level = "moderate"
        else:
            intensity_level = "active"

        calorie_adjustment = min(round(avg_daily_calories * 0.35), 350)

        data = {
            "total_steps": total_steps,
            "avg_daily_steps": avg_daily_steps,
            "total_calories_burned": total_calories,
            "avg_daily_calories_burned": avg_daily_calories,
            "avg_heart_rate": avg_heart_rate,
            "sleep_minutes": total_sleep,
            "intensity_level": intensity_level,
            "calorie_adjustment": calorie_adjustment,
            "source": source_used,
        }

        return ToolResult(
            ok=True,
            tool=self.name,
            data=data,
            confidence=1.0,
        )
