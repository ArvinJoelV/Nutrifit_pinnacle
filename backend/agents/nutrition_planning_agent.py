from .base import AgentContext, AgentResult, BaseAgent

class NutritionPlanningAgent(BaseAgent):
    name = "nutrition_planning_agent"
    description = "Combines patient context and activity data to produce a unified daily nutrition plan with per-meal targets"

    def __init__(self, tools):
        self.tools = tools

    def run(self, context: AgentContext) -> AgentResult:
        patient_assessment = context.tool_outputs.get("patient_assessment") or context.memory.get("daily_macros") or {}
        activity_context = context.tool_outputs.get("activity_context") or {}
        diabetes_profile = context.payload.get("diabetes_profile") or {}

        tool = self.tools.get("nutrition_planning")
        if not tool:
            return AgentResult(ok=False, agent=self.name, error="Tool 'nutrition_planning' not found.")

        result = tool.run(
            patient_assessment=patient_assessment,
            activity_context=activity_context,
            diabetes_profile=diabetes_profile
        )

        if not result.ok:
            return AgentResult(ok=False, agent=self.name, error=result.error)

        context.tool_outputs["nutrition_planning"] = result.data

        if not hasattr(context, 'memory') or context.memory is None:
            context.memory = {}
            
        context.memory["daily_macros"] = result.data.get("daily_macros")
        context.memory["meal_targets"] = result.data.get("meal_targets")

        return AgentResult(ok=True, agent=self.name, data=result.data)
