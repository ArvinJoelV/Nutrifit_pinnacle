from .base import BaseTool, ToolResult

def _num(value, default=0.0):
    try:
        val = float(value)
        return val if val == val else default
    except (TypeError, ValueError):
        return default

class PatientAssessmentTool(BaseTool):
    name = "patient_assessment"

    def run(self, **kwargs) -> ToolResult:
        patient_profile = kwargs.get("patient_profile") or {}
        active_calories = _num(kwargs.get("active_calories", 0))

        weight = _num(patient_profile.get("weight"), 70)
        height = _num(patient_profile.get("height"), 170)
        age = _num(patient_profile.get("age"), 30)
        is_male = str(patient_profile.get("gender", "")).lower() == "male"
        hba1c = _num(patient_profile.get("hba1c"))
        fasting_glucose = _num(patient_profile.get("fasting_glucose"))
        post_meal_glucose = _num(patient_profile.get("post_meal_glucose"))
        goal = patient_profile.get("goal", "maintain")
        activity_level = patient_profile.get("activity_level", "sedentary")

        bmr = (10 * weight) + (6.25 * height) - (5 * age) + (5 if is_male else -161)

        multipliers = {
            "sedentary": 1.2,
            "light": 1.375,
            "moderate": 1.55,
            "active": 1.725,
            "athlete": 1.9,
            "very_active": 1.9,
        }
        activity_multiplier = multipliers.get(activity_level, 1.2)
        baseline_tdee = round(bmr * activity_multiplier)

        wearable_adj = min(round(active_calories * 0.35), 350) if active_calories > 0 else 0

        goal_adj = -400 if goal == "lose" else (300 if goal == "gain" else 0)

        daily_cal = max(1200, round(baseline_tdee + wearable_adj + goal_adj))

        is_insulin_resistant = hba1c >= 8 or fasting_glucose >= 130 or post_meal_glucose >= 180
        if is_insulin_resistant:
            carb_ratio = 0.40
        elif active_calories >= 250:
            carb_ratio = 0.48
        else:
            carb_ratio = 0.45

        carbs_g = round((daily_cal * carb_ratio) / 4)
        
        protein_factor = 1.5 if goal == "lose" else 1.4
        protein_g = round(weight * protein_factor)

        protein_cal = protein_g * 4
        carb_cal = carbs_g * 4
        remaining_cal = max(daily_cal - carb_cal - protein_cal, 0)
        fat_g = round(remaining_cal / 9)

        fiber_g = max(25, min(35, round(daily_cal / 100)))

        has_hypertension = "hypertension" in str(patient_profile.get("medical_condition", "")).lower()
        sodium = 1500 if has_hypertension else 2300

        sat_fat = round((daily_cal * 0.10) / 9)
        added_sugar = round((daily_cal * 0.05) / 4)

        meal_dist = {
            "breakfast": round(carbs_g * 0.25),
            "lunch": round(carbs_g * 0.35),
            "dinner": round(carbs_g * 0.30),
            "snacks": round(carbs_g * 0.10)
        }

        explanations = {
            "calories": f"BMR {round(bmr)} x activity factor {activity_multiplier} = {baseline_tdee} kcal baseline, plus {wearable_adj} kcal wearable adjustment, then {goal_adj} kcal goal adjustment.",
            "carbs": f"Carbs set at {round(carb_ratio * 100)}% of calories because HbA1c is {hba1c or 'not set'}, fasting glucose is {fasting_glucose or 'not set'}, and post-meal glucose is {post_meal_glucose or 'not set'}.",
            "protein": f"Protein set to {protein_factor} g/kg to support glucose stability and muscle preservation at your current weight of {weight} kg.",
            "fat": f"Fat uses the remaining calories after carbs ({carbs_g} g) and protein ({protein_g} g) are assigned.",
            "fiber": f"Fiber target is {fiber_g} g/day to support slower glucose absorption and satiety.",
            "sodium": f"Sodium limit is {sodium} mg/day{' because hypertension was noted.' if has_hypertension else '.'}"
        }

        data = {
            "bmr": round(bmr),
            "baseline_tdee": baseline_tdee,
            "wearable_adjustment_calories": wearable_adj,
            "dynamic_tdee": baseline_tdee + wearable_adj,
            "target_calories": daily_cal,
            "carb_ratio": carb_ratio,
            "carbs_g": carbs_g,
            "protein_g": protein_g,
            "fat_g": fat_g,
            "fiber_g": fiber_g,
            "sodium_limit_mg": sodium,
            "sat_fat_limit_g": sat_fat,
            "added_sugar_limit_g": added_sugar,
            "meal_distribution": meal_dist,
            "explanations": explanations
        }

        return ToolResult(
            ok=True,
            tool=self.name,
            data=data,
            confidence=1.0
        )
