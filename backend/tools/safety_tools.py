from .base import BaseTool, ToolResult


def _num(value):
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


class DiabetesSafetyCheckTool(BaseTool):
    name = "diabetes_safety_check"

    def run(self, **kwargs) -> ToolResult:
        daily_macros = kwargs.get("daily_macros") or {}
        consumed_macros = kwargs.get("consumed_macros") or {}
        latest_meal = kwargs.get("latest_meal") or {}
        patient_profile = kwargs.get("patient_profile") or {}
        activity = kwargs.get("activity") or {}

        warnings = []
        target_carbs = _num(daily_macros.get("carbs"))
        consumed_carbs = _num(consumed_macros.get("carbs"))
        latest_carbs = _num((latest_meal.get("macros") or {}).get("carbs"))
        latest_protein = _num((latest_meal.get("macros") or {}).get("protein"))
        target_protein = _num(daily_macros.get("protein"))
        consumed_protein = _num(consumed_macros.get("protein"))
        steps = _num(activity.get("steps"))
        calories_burned = _num(activity.get("calories_burned") or activity.get("caloriesBurned"))
        insulin_risk = str(patient_profile.get("insulin_usage") or "no").lower() == "yes"
        hypo_risk = str(patient_profile.get("hypoglycemia_history") or "no").lower() == "yes"

        if target_carbs > 0 and consumed_carbs > target_carbs:
            warnings.append(
                {
                    "level": "warning",
                    "title": "Carbs Above Target",
                    "message": f"Logged carbs are {round(consumed_carbs)} g against a {round(target_carbs)} g daily target.",
                    "action": "Keep upcoming meals lower in fast-digesting carbs and prioritize protein, vegetables, and fiber.",
                    "code": "carbs_above_target",
                }
            )

        if latest_carbs >= 75:
            warnings.append(
                {
                    "level": "warning",
                    "title": "High-Carb Meal Logged",
                    "message": f"This meal contains an estimated {round(latest_carbs)} g carbs.",
                    "action": "Treat the estimate as approximate and monitor your response if you track glucose.",
                    "code": "high_carb_meal",
                }
            )

        if target_protein > 0 and consumed_protein < target_protein * 0.45 and consumed_carbs > target_carbs * 0.6:
            warnings.append(
                {
                    "level": "tip",
                    "title": "Protein Is Lagging",
                    "message": f"Protein is at {round(consumed_protein)} g against a {round(target_protein)} g daily target.",
                    "action": "Use the next meal to bring in dal, paneer, eggs, tofu, yogurt, chicken, or another protein source.",
                    "code": "protein_lagging",
                }
            )

        if (insulin_risk or hypo_risk) and (steps >= 10000 or calories_burned >= 450):
            warnings.append(
                {
                    "level": "warning",
                    "title": "Activity Safety Check",
                    "message": "High activity plus insulin use or hypoglycemia history can increase low-glucose risk.",
                    "action": "Follow your clinician's glucose-monitoring guidance. Do not change medication based on this app.",
                    "code": "activity_hypo_risk",
                }
            )

        return ToolResult(
            ok=True,
            tool=self.name,
            data={"warnings": warnings, "blocked": False},
            warnings=warnings,
            confidence=1,
        )

