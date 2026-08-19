from .base import AgentContext, AgentResult, BaseAgent


class HealthCoachAgent(BaseAgent):
    name = "health_coach_agent"

    description = "Provides natural language health coaching based on nutrition data and safety warnings"

    def __init__(self, tools):
        self.tools = tools

    def run(self, context: AgentContext) -> AgentResult:
        payload = context.payload
        adjustment = context.tool_outputs.get("adjust_meal_plan") or {}
        planning = context.tool_outputs.get("nutrition_planning") or {}
        meal_plan = context.tool_outputs.get("generate_meal_plan") or {}
        
        # Use adjustment data if available, otherwise fall back to planning data
        remaining_macros = adjustment.get("remaining_macros") or planning.get("daily_macros") or {}
        next_meal_targets = adjustment.get("next_meal_targets") or planning.get("meal_targets") or {}
        recommended_meals = adjustment.get("recommended_meals") or meal_plan.get("meal_plan") or {}
        
        result = self.tools.get("health_coach_explanation").run(
            latest_meal=payload.get("latestMeal") or payload.get("latest_meal"),
            remaining_macros=remaining_macros,
            next_meal_targets=next_meal_targets,
            recommended_meals=recommended_meals,
            warnings=context.warnings,
            intent=context.intent,
        )
        if not result.ok:
            return AgentResult(ok=False, agent=self.name, error=result.error)

        context.tool_outputs["health_coach_explanation"] = result.data
        return AgentResult(ok=True, agent=self.name, data=result.data, message=result.data.get("message", ""))

