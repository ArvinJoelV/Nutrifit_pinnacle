from .base import AgentContext, AgentResult, BaseAgent


class DiabetesSafetyAgent(BaseAgent):
    name = "diabetes_safety_agent"
    description = "Enforces deterministic diabetes safety rules on meal and activity data"

    def __init__(self, tools):
        self.tools = tools

    def run(self, context: AgentContext) -> AgentResult:
        payload = context.payload
        # Prioritize memory (from upstream agents) over raw payload
        daily_macros = context.memory.get("daily_macros") or payload.get("dailyMacros") or payload.get("daily_macros")
        result = self.tools.get("diabetes_safety_check").run(
            daily_macros=daily_macros,
            consumed_macros=payload.get("consumedMacros") or payload.get("consumed_macros"),
            latest_meal=payload.get("latestMeal") or payload.get("latest_meal"),
            patient_profile=payload.get("patientProfile") or payload.get("patient_profile"),
            activity=payload.get("activity"),
        )
        if not result.ok:
            return AgentResult(ok=False, agent=self.name, error=result.error)

        context.warnings.extend(result.warnings)
        context.tool_outputs["diabetes_safety_check"] = result.data
        return AgentResult(ok=True, agent=self.name, data=result.data, warnings=result.warnings)

