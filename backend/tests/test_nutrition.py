import pytest
from tools.patient_assessment_tools import PatientAssessmentTool


def test_mifflin_st_jeor_standard_calculation():
    """Verify BMR and TDEE math for standard profiles."""
    tool = PatientAssessmentTool()
    profile = {
        "weight": 70,
        "height": 175,
        "age": 30,
        "gender": "male",
        "activity_level": "moderate",
        "goal": "maintain",
    }
    result = tool.run(patient_profile=profile)
    assert result.ok is True
    data = result.data

    # BMR for 70kg, 175cm, 30yo male = 10*70 + 6.25*175 - 5*30 + 5 = 700 + 1093.75 - 150 + 5 = 1648.75
    # TDEE moderate (1.55) = round(1648.75 * 1.55) = 2556
    assert 2400 <= data["target_calories"] <= 2700
    assert data["protein_g"] > 90
    assert data["carbs_g"] > 200
    assert data["fat_g"] > 50


def test_diabetes_insulin_resistant_carb_restriction():
    """Verify carb ratio is restricted to 40% when HbA1c >= 8.0 or high fasting glucose."""
    tool = PatientAssessmentTool()
    diabetic_profile = {
        "weight": 80,
        "height": 170,
        "age": 45,
        "gender": "male",
        "hba1c": 8.5,
        "fasting_glucose": 145,
        "activity_level": "sedentary",
        "goal": "lose",
    }
    result = tool.run(patient_profile=diabetic_profile)
    assert result.ok is True
    data = result.data

    # Calorie target should have deficit of -400
    assert data["target_calories"] >= 1200
    # Carb grams must adhere to 40% carb ratio: round((daily_cal * 0.40) / 4)
    expected_carbs = round((data["target_calories"] * 0.40) / 4)
    assert data["carbs_g"] == expected_carbs


def test_wearable_calorie_burn_adjustment():
    """Verify wearable active calories scale the daily target appropriately."""
    tool = PatientAssessmentTool()
    base_profile = {
        "weight": 65,
        "height": 165,
        "age": 28,
        "gender": "female",
        "activity_level": "sedentary",
        "goal": "maintain",
    }

    # Run without active calories
    res_base = tool.run(patient_profile=base_profile, active_calories=0)
    # Run with 400 active calories burned (from Google Fit / Fitbit)
    res_active = tool.run(patient_profile=base_profile, active_calories=400)

    assert res_active.data["target_calories"] > res_base.data["target_calories"]
    # Wearable adjustment cap is min(round(400 * 0.35), 350) = 140
    diff = res_active.data["target_calories"] - res_base.data["target_calories"]
    assert diff == 140


def test_diabetes_safety_check_tool():
    """Verify DiabetesSafetyCheckTool flags high carbs and lagging protein."""
    from tools.safety_tools import DiabetesSafetyCheckTool
    tool = DiabetesSafetyCheckTool()
    
    result = tool.run(
        daily_macros={"carbs": 150, "protein": 100},
        consumed_macros={"carbs": 180, "protein": 20},
        latest_meal={"macros": {"carbs": 85, "protein": 10}},
        patient_profile={"insulin_usage": "yes"},
        activity={"steps": 2000, "calories_burned": 100},
    )
    
    assert result.ok is True
    assert len(result.warnings) >= 2
    codes = [w["code"] for w in result.warnings]
    assert "carbs_above_target" in codes
    assert "high_carb_meal" in codes


def test_activity_context_tool():
    """Verify ActivityContextTool computes intensity levels from wearable metrics."""
    from tools.activity_tools import ActivityContextTool
    tool = ActivityContextTool()

    activity_data = {
        "steps": 10500,
        "calories_burned": 520,
        "distance_meters": 7500,
    }
    result = tool.run(user_id="test_user", activity_data=activity_data)
    assert result.ok is True
    data = result.data
    assert data["total_steps"] == 10500
    assert data["intensity_level"] == "active"
    assert data["calorie_adjustment"] > 0

