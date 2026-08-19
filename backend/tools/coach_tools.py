from .base import BaseTool, ToolResult


class HealthCoachExplanationTool(BaseTool):
    name = "health_coach_explanation"

    def run(self, **kwargs) -> ToolResult:
        remaining_macros = kwargs.get("remaining_macros") or {}
        next_meal_targets = kwargs.get("next_meal_targets") or {}
        warnings = kwargs.get("warnings") or []
        latest_meal = kwargs.get("latest_meal") or {}
        recommended_meals = kwargs.get("recommended_meals") or {}
        intent = kwargs.get("intent", "meal_logged")

        next_meal = next(iter(next_meal_targets.keys()), "")
        meal_type = str(latest_meal.get("type") or "meal").lower()
        carbs_remaining = round(float(remaining_macros.get("carbs") or 0))
        protein_remaining = round(float(remaining_macros.get("protein") or 0))
        calories = round(float(remaining_macros.get("calories") or 0))

        if intent in ("new_user", "plan_request"):
            meal_count = len(next_meal_targets)
            message = (
                f"Your personalized nutrition plan is ready! "
                f"Today's target is {calories} kcal with {carbs_remaining} g carbs and {protein_remaining} g protein, "
                f"split across {meal_count} meal{'s' if meal_count != 1 else ''}."
            )
            if next_meal:
                message += f" Start with {next_meal} for the best balance."
        elif intent == "activity_update":
            message = (
                f"Targets updated based on your activity! "
                f"You now have {calories} kcal remaining with {carbs_remaining} g carbs and {protein_remaining} g protein."
            )
            if next_meal:
                message += f" Next up: {next_meal}."
        else:
            # meal_logged / meal_upload / default
            if next_meal:
                message = (
                    f"I adjusted the rest of today after your {meal_type}. "
                    f"You have about {carbs_remaining} g carbs and {protein_remaining} g protein left, "
                    f"so the next target is focused on {next_meal} with a better macro balance."
                )
            else:
                message = (
                    f"Your {meal_type} is logged and there are no remaining planned meal windows today. "
                    "The estimates are approximate, so use them as guidance rather than exact nutrition truth."
                )

        if warnings:
            warning_msg = warnings[0].get("message", "") if isinstance(warnings[0], dict) else str(warnings[0])
            if warning_msg:
                message += f" Safety note: {warning_msg}"

        return ToolResult(
            ok=True,
            tool=self.name,
            data={"message": message},
            confidence=0.8,
        )

