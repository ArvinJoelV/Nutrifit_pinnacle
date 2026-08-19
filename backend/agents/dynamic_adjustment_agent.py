from .base import AgentContext, AgentResult, BaseAgent


class DynamicNutritionAdjustmentAgent(BaseAgent):
    name = "dynamic_nutrition_adjustment_agent"

    description = "Dynamically recalculates remaining nutrition targets after a meal is consumed"

    def __init__(self, tools):
        self.tools = tools

    def run(self, context: AgentContext) -> AgentResult:
        payload = context.payload
        # Prioritize memory (from upstream NutritionPlanningAgent) over raw payload
        daily_macros = context.memory.get("daily_macros") or payload.get("dailyMacros") or payload.get("daily_macros")
        consumed_macros = payload.get("consumedMacros") or payload.get("consumed_macros")
        completed_meals = payload.get("completedMeals") or payload.get("completed_meals")
        top_n = payload.get("topN") or payload.get("top_n") or 1
        
        result = self.tools.get("adjust_meal_plan").run(
            daily_macros=daily_macros,
            consumed_macros=consumed_macros,
            completed_meals=completed_meals,
            top_n=top_n,
        )
        if not result.ok:
            return AgentResult(ok=False, agent=self.name, error=result.error)

        context.tool_outputs["adjust_meal_plan"] = result.data
        return AgentResult(ok=True, agent=self.name, data=result.data)

