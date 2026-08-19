import uuid

from schemas.agent import AgentCard, AgentResponse, AgentWarning
from tools import build_default_tool_registry

from .activity_context_agent import ActivityContextAgent
from .base import AgentContext
from .diabetes_safety_agent import DiabetesSafetyAgent
from .dynamic_adjustment_agent import DynamicNutritionAdjustmentAgent
from .health_coach_agent import HealthCoachAgent
from .meal_analysis_agent import MealAnalysisAgent
from .meal_recommendation_agent import MealRecommendationAgent
from .nutrition_planning_agent import NutritionPlanningAgent
from .patient_assessment_agent import PatientAssessmentAgent
from .registry import AgentRegistry


class HealthCoordinatorAgent:
    name = "health_coordinator_agent"

    def __init__(self, tools=None, inference_provider=None, model=None):
        self.tools = tools or build_default_tool_registry()
        self.agent_registry = AgentRegistry()

        # Register all 8 agents into the AgentRegistry
        self.agent_registry.register(PatientAssessmentAgent(self.tools))
        self.agent_registry.register(ActivityContextAgent(self.tools))
        self.agent_registry.register(MealAnalysisAgent(self.tools, inference_provider=inference_provider, model=model))
        self.agent_registry.register(NutritionPlanningAgent(self.tools))
        self.agent_registry.register(MealRecommendationAgent(self.tools))
        self.agent_registry.register(DynamicNutritionAdjustmentAgent(self.tools))
        self.agent_registry.register(DiabetesSafetyAgent(self.tools))
        self.agent_registry.register(HealthCoachAgent(self.tools))

    def run_workflow(self, workflow_name: str, user_id: str, payload: dict) -> AgentResponse:
        """Route to appropriate workflow based on workflow name or intent."""
        workflows = {
            "meal_logged": self.run_meal_logged_workflow,
            "new_user": self.run_new_user_workflow,
            "activity_update": self.run_activity_update_workflow,
            "meal_upload": self.run_meal_upload_workflow,
            "plan_request": self.run_plan_request_workflow,
        }
        handler = workflows.get(workflow_name)
        if not handler:
            return AgentResponse(
                ok=False,
                workflow=workflow_name,
                message=f"Unknown workflow: {workflow_name}. Supported: {list(workflows.keys())}",
            )
        return handler(user_id, payload)

    def _execute_agent_pipeline(self, context: AgentContext, agent_names: list[str]) -> AgentResponse | None:
        """Execute a sequence of agents by name using registry. Returns error AgentResponse if any fails."""
        for name in agent_names:
            agent = self.agent_registry.get(name)
            result = agent.execute(context)
            if not result.ok:
                return AgentResponse(
                    ok=False,
                    workflow=context.intent,
                    message=result.error or f"{name} failed.",
                    traceId=context.trace_id,
                    debug={"failedAgent": name, "trace": context.trace},
                )
        return None

    def run_meal_logged_workflow(self, user_id: str, payload: dict) -> AgentResponse:
        context = AgentContext(
            user_id=user_id,
            intent="meal_logged",
            payload=payload,
            trace_id=uuid.uuid4().hex,
        )

        pipeline = [
            "dynamic_nutrition_adjustment_agent",
            "diabetes_safety_agent",
            "health_coach_agent",
        ]
        err_res = self._execute_agent_pipeline(context, pipeline)
        if err_res:
            return err_res

        adjusted_data = context.tool_outputs.get("adjust_meal_plan") or {}
        coach_output = context.tool_outputs.get("health_coach_explanation") or {}
        warnings = [w if isinstance(w, AgentWarning) else AgentWarning(**w) for w in context.warnings]
        cards = [
            AgentCard(
                type="dynamic_meal_adjustment",
                title="Updated Remaining Meals",
                data={
                    "nextMealTargets": adjusted_data.get("next_meal_targets") or {},
                    "recommendedMeals": adjusted_data.get("recommended_meals") or {},
                },
            )
        ]
        if warnings:
            cards.append(
                AgentCard(
                    type="safety_warnings",
                    title="Safety Notes",
                    data={"warnings": [warning.model_dump() for warning in warnings]},
                )
            )

        return AgentResponse(
            ok=True,
            workflow="meal_logged",
            message=coach_output.get("message", "Meal logged and nutrition targets updated."),
            nutritionState=adjusted_data.get("nutrition_state") or {},
            remainingMacros=adjusted_data.get("remaining_macros") or {},
            nextMealTargets=adjusted_data.get("next_meal_targets") or {},
            recommendedMeals=adjusted_data.get("recommended_meals") or {},
            warnings=warnings,
            cards=cards,
            traceId=context.trace_id,
            debug={"agents": pipeline, "trace": context.trace},
        )

    def run_new_user_workflow(self, user_id: str, payload: dict) -> AgentResponse:
        context = AgentContext(
            user_id=user_id,
            intent="new_user",
            payload=payload,
            trace_id=uuid.uuid4().hex,
        )

        pipeline = [
            "patient_assessment_agent",
            "nutrition_planning_agent",
            "meal_recommendation_agent",
            "diabetes_safety_agent",
            "health_coach_agent",
        ]
        err_res = self._execute_agent_pipeline(context, pipeline)
        if err_res:
            return err_res

        assessment_data = context.tool_outputs.get("patient_assessment") or {}
        planning_data = context.tool_outputs.get("nutrition_planning") or {}
        meal_plan_data = context.tool_outputs.get("generate_meal_plan") or {}
        coach_output = context.tool_outputs.get("health_coach_explanation") or {}
        warnings = [w if isinstance(w, AgentWarning) else AgentWarning(**w) for w in context.warnings]

        cards = [
            AgentCard(
                type="nutrition_plan",
                title="Personalized Daily Plan",
                data={
                    "dailyMacros": planning_data.get("daily_macros") or {},
                    "mealTargets": planning_data.get("meal_targets") or {},
                    "explanations": assessment_data.get("explanations") or {},
                },
            ),
            AgentCard(
                type="meal_recommendations",
                title="Recommended Meals",
                data={"mealPlan": meal_plan_data.get("meal_plan") or {}},
            ),
        ]
        if warnings:
            cards.append(
                AgentCard(
                    type="safety_warnings",
                    title="Safety Notes",
                    data={"warnings": [w.model_dump() for w in warnings]},
                )
            )

        return AgentResponse(
            ok=True,
            workflow="new_user",
            message=coach_output.get("message", "Personalized nutrition plan generated successfully."),
            remainingMacros=planning_data.get("daily_macros") or {},
            nextMealTargets=planning_data.get("meal_targets") or {},
            recommendedMeals=meal_plan_data.get("meal_plan") or {},
            warnings=warnings,
            cards=cards,
            traceId=context.trace_id,
            debug={"agents": pipeline, "trace": context.trace},
        )

    def run_activity_update_workflow(self, user_id: str, payload: dict) -> AgentResponse:
        context = AgentContext(
            user_id=user_id,
            intent="activity_update",
            payload=payload,
            trace_id=uuid.uuid4().hex,
        )

        pipeline = [
            "activity_context_agent",
            "nutrition_planning_agent",
            "dynamic_nutrition_adjustment_agent",
            "diabetes_safety_agent",
            "health_coach_agent",
        ]
        err_res = self._execute_agent_pipeline(context, pipeline)
        if err_res:
            return err_res

        activity_data = context.tool_outputs.get("activity_context") or {}
        adjusted_data = context.tool_outputs.get("adjust_meal_plan") or {}
        coach_output = context.tool_outputs.get("health_coach_explanation") or {}
        warnings = [w if isinstance(w, AgentWarning) else AgentWarning(**w) for w in context.warnings]

        cards = [
            AgentCard(
                type="activity_summary",
                title="Activity Adjustment",
                data=activity_data,
            ),
            AgentCard(
                type="dynamic_meal_adjustment",
                title="Updated Meal Plan",
                data={
                    "nextMealTargets": adjusted_data.get("next_meal_targets") or {},
                    "recommendedMeals": adjusted_data.get("recommended_meals") or {},
                },
            ),
        ]
        if warnings:
            cards.append(
                AgentCard(
                    type="safety_warnings",
                    title="Safety Notes",
                    data={"warnings": [w.model_dump() for w in warnings]},
                )
            )

        return AgentResponse(
            ok=True,
            workflow="activity_update",
            message=coach_output.get("message", "Activity context updated and targets adjusted."),
            nutritionState=adjusted_data.get("nutrition_state") or {},
            remainingMacros=adjusted_data.get("remaining_macros") or {},
            nextMealTargets=adjusted_data.get("next_meal_targets") or {},
            recommendedMeals=adjusted_data.get("recommended_meals") or {},
            warnings=warnings,
            cards=cards,
            traceId=context.trace_id,
            debug={"agents": pipeline, "trace": context.trace},
        )

    def run_meal_upload_workflow(self, user_id: str, payload: dict) -> AgentResponse:
        context = AgentContext(
            user_id=user_id,
            intent="meal_upload",
            payload=payload,
            trace_id=uuid.uuid4().hex,
        )

        pipeline = [
            "meal_analysis_agent",
            "dynamic_nutrition_adjustment_agent",
            "diabetes_safety_agent",
            "health_coach_agent",
        ]
        err_res = self._execute_agent_pipeline(context, pipeline)
        if err_res:
            return err_res

        analysis_data = context.tool_outputs.get("meal_analysis") or {}
        adjusted_data = context.tool_outputs.get("adjust_meal_plan") or {}
        coach_output = context.tool_outputs.get("health_coach_explanation") or {}
        warnings = [w if isinstance(w, AgentWarning) else AgentWarning(**w) for w in context.warnings]

        cards = [
            AgentCard(
                type="meal_analysis",
                title="Detected Food Items",
                data=analysis_data,
            ),
            AgentCard(
                type="dynamic_meal_adjustment",
                title="Adjusted Remaining Plan",
                data={
                    "nextMealTargets": adjusted_data.get("next_meal_targets") or {},
                    "recommendedMeals": adjusted_data.get("recommended_meals") or {},
                },
            ),
        ]
        if warnings:
            cards.append(
                AgentCard(
                    type="safety_warnings",
                    title="Safety Notes",
                    data={"warnings": [w.model_dump() for w in warnings]},
                )
            )

        return AgentResponse(
            ok=True,
            workflow="meal_upload",
            message=coach_output.get("message", "Meal analyzed and nutrition updated."),
            nutritionState=adjusted_data.get("nutrition_state") or {},
            remainingMacros=adjusted_data.get("remaining_macros") or {},
            nextMealTargets=adjusted_data.get("next_meal_targets") or {},
            recommendedMeals=adjusted_data.get("recommended_meals") or {},
            warnings=warnings,
            cards=cards,
            traceId=context.trace_id,
            debug={"agents": pipeline, "trace": context.trace},
        )

    def run_plan_request_workflow(self, user_id: str, payload: dict) -> AgentResponse:
        context = AgentContext(
            user_id=user_id,
            intent="plan_request",
            payload=payload,
            trace_id=uuid.uuid4().hex,
        )

        pipeline = [
            "patient_assessment_agent",
            "activity_context_agent",
            "nutrition_planning_agent",
            "meal_recommendation_agent",
            "diabetes_safety_agent",
            "health_coach_agent",
        ]
        err_res = self._execute_agent_pipeline(context, pipeline)
        if err_res:
            return err_res

        planning_data = context.tool_outputs.get("nutrition_planning") or {}
        meal_plan_data = context.tool_outputs.get("generate_meal_plan") or {}
        coach_output = context.tool_outputs.get("health_coach_explanation") or {}
        warnings = [w if isinstance(w, AgentWarning) else AgentWarning(**w) for w in context.warnings]

        cards = [
            AgentCard(
                type="full_plan",
                title="Complete Nutrition & Activity Plan",
                data={
                    "dailyMacros": planning_data.get("daily_macros") or {},
                    "mealTargets": planning_data.get("meal_targets") or {},
                },
            ),
            AgentCard(
                type="meal_recommendations",
                title="Meal Recommendations",
                data={"mealPlan": meal_plan_data.get("meal_plan") or {}},
            ),
        ]
        if warnings:
            cards.append(
                AgentCard(
                    type="safety_warnings",
                    title="Safety Notes",
                    data={"warnings": [w.model_dump() for w in warnings]},
                )
            )

        return AgentResponse(
            ok=True,
            workflow="plan_request",
            message=coach_output.get("message", "Full daily plan calculated."),
            remainingMacros=planning_data.get("daily_macros") or {},
            nextMealTargets=planning_data.get("meal_targets") or {},
            recommendedMeals=meal_plan_data.get("meal_plan") or {},
            warnings=warnings,
            cards=cards,
            traceId=context.trace_id,
            debug={"agents": pipeline, "trace": context.trace},
        )
