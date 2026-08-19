from .base import AgentContext, AgentResult, BaseAgent


class ActivityContextAgent(BaseAgent):
    name = "activity_context_agent"
    description = "Retrieves and analyzes user activity data to provide context for nutrition planning"

    def __init__(self, tools):
        self.tools = tools

    def run(self, context: AgentContext) -> AgentResult:
        user_id = context.user_id
        payload = context.payload
        
        activity_data = payload.get("activity") or payload.get("activity_data")

        result = self.tools.get("activity_context").run(
            user_id=user_id,
            activity_data=activity_data,
        )

        if not result.ok:
            return AgentResult(ok=False, agent=self.name, error=result.error)

        context.tool_outputs["activity_context"] = result.data
        context.memory["calorie_adjustment"] = result.data.get("calorie_adjustment")
        context.memory["intensity_level"] = result.data.get("intensity_level")

        return AgentResult(ok=True, agent=self.name, data=result.data)
