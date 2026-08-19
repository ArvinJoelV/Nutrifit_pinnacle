from meal_recommendation_service import (
    build_ingredient_pools,
    generate_daily_meal_plan,
    load_ingredient_categories,
    load_nutrition_dataset,
    split_daily_macros_into_meal_targets,
)

from .base import BaseTool, ToolResult


class GenerateMealPlanTool(BaseTool):
    name = "generate_meal_plan"

    def run(self, **kwargs) -> ToolResult:
        try:
            daily_macros = kwargs.get("daily_macros") or {}
            top_n = max(1, min(int(kwargs.get("top_n") or 3), 10))

            nutrition_df = load_nutrition_dataset(kwargs.get("nutrition_dataset_path"))
            ingredient_df = load_ingredient_categories(kwargs.get("ingredient_category_dataset_path"))
            ingredient_pools = build_ingredient_pools(ingredient_df)

            meal_targets = split_daily_macros_into_meal_targets(daily_macros)
            meal_plan = generate_daily_meal_plan(
                meal_targets=meal_targets,
                ingredient_pools=ingredient_pools,
                nutrition_df=nutrition_df,
                top_n=top_n
            )

            return ToolResult(
                ok=True,
                tool=self.name,
                data={
                    "daily_macros": daily_macros,
                    "meal_targets": meal_targets,
                    "meal_plan": meal_plan,
                },
                confidence=0.9,
            )
        except Exception as exc:
            return ToolResult(ok=False, tool=self.name, error=str(exc), confidence=0.0)
