from .base import AgentContext, AgentResult, BaseAgent

class PatientAssessmentAgent(BaseAgent):
    name = "patient_assessment_agent"
    description = "Interprets patient profile and calculates personalized nutrition targets"

    def __init__(self, tools):
        self.tools = tools

    def run(self, context: AgentContext) -> AgentResult:
        payload = context.payload
        patient_profile = payload.get("patient_profile") or payload.get("patientProfile") or {}
        active_calories = payload.get("active_calories") or payload.get("activeCalories") or 0
        
        tool = self.tools.get("patient_assessment")
        if not tool:
            return AgentResult(ok=False, agent=self.name, error="Tool 'patient_assessment' not found.")
            
        result = tool.run(patient_profile=patient_profile, active_calories=active_calories)
        
        if not result.ok:
            return AgentResult(ok=False, agent=self.name, error=result.error)
            
        context.tool_outputs["patient_assessment"] = result.data
        
        # Ensure memory dict exists and update it
        if not hasattr(context, 'memory') or context.memory is None:
            context.memory = {}
            
        context.memory["daily_macros"] = {
            "calories": result.data["target_calories"],
            "carbs": result.data["carbs_g"],
            "protein": result.data["protein_g"],
            "fat": result.data["fat_g"]
        }
        context.memory["meal_distribution"] = result.data["meal_distribution"]
        
        return AgentResult(ok=True, agent=self.name, data=result.data)
