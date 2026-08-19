from .activity_tools import ActivityContextTool
from .coach_tools import HealthCoachExplanationTool
from .meal_analysis_tools import MealAnalysisTool
from .meal_generation_tools import GenerateMealPlanTool
from .meal_recommendation_tools import AdjustMealPlanTool
from .patient_assessment_tools import PatientAssessmentTool
from .nutrition_planning_tools import NutritionPlanningTool
from .safety_tools import DiabetesSafetyCheckTool


class ToolRegistry:
    def __init__(self):
        self._tools = {}

    def register(self, tool):
        self._tools[tool.name] = tool
        return tool

    def get(self, name):
        if name not in self._tools:
            raise KeyError(f"Tool is not registered: {name}")
        return self._tools[name]

    def has(self, name):
        return name in self._tools


def build_default_tool_registry():
    registry = ToolRegistry()
    registry.register(AdjustMealPlanTool())
    registry.register(DiabetesSafetyCheckTool())
    registry.register(HealthCoachExplanationTool())
    registry.register(PatientAssessmentTool())
    registry.register(ActivityContextTool())
    registry.register(MealAnalysisTool())
    registry.register(NutritionPlanningTool())
    registry.register(GenerateMealPlanTool())
    return registry


