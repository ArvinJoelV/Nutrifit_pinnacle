from .base import AgentContext, AgentResult, BaseAgent


class MealAnalysisAgent(BaseAgent):
    name = "meal_analysis_agent"
    description = "Analyzes food images using computer vision and AI to identify items and estimate nutrition"

    def __init__(self, tools, inference_provider=None, model=None):
        self.tools = tools
        self.inference_provider = inference_provider
        self.model = model

    def run(self, context: AgentContext) -> AgentResult:
        image_path = context.payload.get("image_path") or context.payload.get("imagePath")
        if not image_path:
            return AgentResult(ok=False, agent=self.name, error="Missing image_path in payload")

        tool = self.tools.get("meal_analysis")
        if not tool:
            return AgentResult(ok=False, agent=self.name, error="Tool 'meal_analysis' not found")

        tool_result = tool.run(
            image_path=image_path,
            inference_provider=self.inference_provider,
            model=self.model
        )

        if not tool_result.ok:
            return AgentResult(ok=False, agent=self.name, error=tool_result.error)

        context.tool_outputs["meal_analysis"] = tool_result.data
        # Store detected meal macros in memory for downstream agents
        totals = tool_result.data.get("totals") or {}
        context.memory["latest_meal_macros"] = totals
        return AgentResult(ok=True, agent=self.name, data=tool_result.data)
