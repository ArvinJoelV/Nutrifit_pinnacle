from .base import BaseTool, ToolResult
from meal_recommendation_service import split_daily_macros_into_meal_targets

class NutritionPlanningTool(BaseTool):
    name = "nutrition_planning"

    def run(self, **kwargs) -> ToolResult:
        try:
            patient_assessment = kwargs.get("patient_assessment") or {}
            activity_context = kwargs.get("activity_context") or {}
            diabetes_profile = kwargs.get("diabetes_profile") or {}

            # 1. Extract base macros from patient_assessment
            target_calories = patient_assessment.get("target_calories") or patient_assessment.get("calories", 2000)
            carbs_g = patient_assessment.get("carbs_g") or patient_assessment.get("carbs", 250)
            protein_g = patient_assessment.get("protein_g") or patient_assessment.get("protein", 100)
            fat_g = patient_assessment.get("fat_g") or patient_assessment.get("fat", 65)
            fiber_g = patient_assessment.get("fiber_g") or patient_assessment.get("fiber", 30)
            sodium_limit_mg = patient_assessment.get("sodium_limit_mg") or patient_assessment.get("sodium", 2300)
            
            explanations = patient_assessment.get("explanations", {})
            if not isinstance(explanations, dict):
                explanations = {"base": str(explanations)}
            else:
                explanations = dict(explanations)

            # 2. Activity adjustments
            calorie_adjustment = activity_context.get("calorie_adjustment", 0)
            intensity_level = activity_context.get("intensity_level", "light").lower()
            activity_adjustment_applied = False

            if calorie_adjustment > 0:
                activity_adjustment_applied = True
                target_calories += calorie_adjustment
                
                if intensity_level == 'active':
                    carb_ratio = 0.50
                    protein_ratio = 0.25
                    fat_ratio = 0.25
                else:
                    carb_ratio = 0.40
                    protein_ratio = 0.30
                    fat_ratio = 0.30

                extra_carbs = round((calorie_adjustment * carb_ratio) / 4)
                extra_protein = round((calorie_adjustment * protein_ratio) / 4)
                extra_fat = round((calorie_adjustment * fat_ratio) / 9)

                carbs_g += extra_carbs
                protein_g += extra_protein
                fat_g += extra_fat

                explanations["activity_adjustment"] = (
                    f"Added {calorie_adjustment} calories for {intensity_level} activity. "
                    f"Distributed as {extra_carbs}g carbs, {extra_protein}g protein, {extra_fat}g fat."
                )

            # 3. Build daily_macros dict
            daily_macros = {
                "calories": target_calories,
                "carbs": carbs_g,
                "protein": protein_g,
                "fat": fat_g
            }

            # 4. Call split_daily_macros_into_meal_targets
            meal_targets = split_daily_macros_into_meal_targets(daily_macros)

            # 5. Return ToolResult
            data = {
                "daily_macros": daily_macros,
                "meal_targets": meal_targets,
                "fiber_g": fiber_g,
                "sodium_limit_mg": sodium_limit_mg,
                "activity_adjustment_applied": activity_adjustment_applied,
                "explanations": explanations
            }

            return ToolResult(
                ok=True,
                tool=self.name,
                data=data,
                confidence=1.0
            )

        except Exception as e:
            return ToolResult(
                ok=False,
                tool=self.name,
                error=str(e),
                confidence=0.0
            )
