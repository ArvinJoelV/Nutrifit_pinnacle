from meal_recommendation_service import (
    DailyNutritionState,
    build_ingredient_pools,
    generate_adjusted_meal_plan,
    load_ingredient_categories,
    load_nutrition_dataset,
    redistribute_macros,
)

from .base import BaseTool, ToolResult


class AdjustMealPlanTool(BaseTool):
    name = "adjust_meal_plan"

    def run(self, **kwargs) -> ToolResult:
        try:
            daily_macros = kwargs.get("daily_macros") or {}
            consumed_macros = kwargs.get("consumed_macros") or {}
            completed_meals = [
                str(meal).strip().lower()
                for meal in (kwargs.get("completed_meals") or [])
                if str(meal).strip()
            ]
            top_n = max(1, min(int(kwargs.get("top_n") or 1), 10))

            nutrition_df = load_nutrition_dataset(kwargs.get("nutrition_dataset_path"))
            ingredient_df = load_ingredient_categories(kwargs.get("ingredient_category_dataset_path"))
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

            return ToolResult(
                ok=True,
                tool=self.name,
                data={
                    "nutrition_state": state.to_dict(),
                    "remaining_macros": state.get_remaining_macros(),
                    "next_meal_targets": next_meal_targets,
                    "recommended_meals": recommended_meals,
                },
                confidence=0.9,
            )
        except Exception as exc:
            return ToolResult(ok=False, tool=self.name, error=str(exc), confidence=0)

