from datetime import datetime, timedelta, timezone
import fit_store
from .base import BaseTool, ToolResult


class ActivityContextTool(BaseTool):
    name = "activity_context"

    def run(self, **kwargs) -> ToolResult:
        user_id = kwargs.get("user_id")
        days = kwargs.get("days", 1)
        activity_data = kwargs.get("activity_data")

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

            activity_data = fit_store.get_daily_metrics(user_id, start_date, end_date)

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
                    "intensity_level": "unknown",
                    "calorie_adjustment": 0,
                },
                confidence=1.0,
            )

        total_steps = sum(float(day.get("steps") or 0) for day in activity_data)
        total_calories = sum(float(day.get("calories_burned") or day.get("caloriesBurned") or 0) for day in activity_data)
        
        heart_rates = [float(day.get("avg_heart_rate") or 0) for day in activity_data if float(day.get("avg_heart_rate") or 0) > 0]
        avg_heart_rate = sum(heart_rates) / len(heart_rates) if heart_rates else 0.0
        
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
            "intensity_level": intensity_level,
            "calorie_adjustment": calorie_adjustment,
        }

        return ToolResult(
            ok=True,
            tool=self.name,
            data=data,
            confidence=1.0,
        )
