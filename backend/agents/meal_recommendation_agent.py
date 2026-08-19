from .base import AgentContext, AgentResult, BaseAgent

class MealRecommendationAgent(BaseAgent):
    name = "meal_recommendation_agent"
    description = "Generates personalized meal recommendations based on nutrition targets from the Indian food database"

    def __init__(self, tools):
        self.tools = tools

    def run(self, context: AgentContext) -> AgentResult:
        payload = context.payload
        memory = context.memory
        
        daily_macros = memory.get("daily_macros") or payload.get("dailyMacros") or payload.get("daily_macros") or {}
        top_n = payload.get("top_n") or payload.get("topN", 3)
        
        tool = self.tools.get("generate_meal_plan")
        if not tool:
            return AgentResult(ok=False, agent=self.name, error="Tool 'generate_meal_plan' not found.")
            
        result = tool.run(daily_macros=daily_macros, top_n=top_n)
        
        if not result.ok:
            return AgentResult(ok=False, agent=self.name, error=result.error)
            
        context.tool_outputs["generate_meal_plan"] = result.data
        
        context.memory["meal_plan"] = result.data.get("meal_plan")
        
        return AgentResult(ok=True, agent=self.name, data=result.data)
