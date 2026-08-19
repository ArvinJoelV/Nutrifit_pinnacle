# NutriFit Agentic AI Implementation Blueprint

## Architecture Principle

Build the intelligence layer independently from clients and hardware.

Agents must not know about React, React Native, Android, Google Fit, Health Connect, Fitbit, Jetson, or any future wearable directly. They communicate only through stable tool interfaces, services, schemas, and application APIs.

This lets the same core system support:

- Stage 1: Agentic AI
- Stage 2: NVIDIA Jetson edge inference
- Stage 3: Mobile application

## Current Project Baseline

The current project already contains several capabilities that can become agent tools:

- Meal image analysis: `backend/app.py`, `backend/detector.py`
- YOLO model assets: `backend/models/food_detection_yolov8_model.pt`, `backend/sam2_b.pt`
- Gemini-based nutrition estimation: `backend/app.py`
- Meal planning and macro redistribution: `backend/meal_recommendation_service.py`
- Google Fit activity ingestion: `backend/google_fit_service.py`, `backend/fit_store.py`
- Eat Effect timeline generation: `backend/grok_timeline_service.py`
- React frontend service calls: `frontend/src/services`
- Frontend diabetes recommendation logic: `frontend/src/services/diabetesRecommendationService.js`

The first technical cleanup should be to make the active backend boundary clear. `backend/app.py` is the main Flask application today, while `backend/fastapi_app.py` looks like an alternate or experimental FastAPI version.

## Final Logical Architecture

```text
Web Client / Mobile Client
        |
        v
Application API
        |
        v
Health Coordinator Agent
        |
        +--> Patient Assessment Agent
        +--> Activity Context Agent
        +--> Meal Analysis Agent
        +--> Nutrition Planning Agent
        +--> Meal Recommendation Agent
        +--> Dynamic Nutrition Adjustment Agent
        +--> Diabetes Safety Agent
        +--> Health Coach Agent
        |
        v
Shared Memory + Tool Registry + Agent Logs
        |
        v
Domain Services / External Providers
```

## Proposed Backend Layout

```text
backend/
  app.py
  agents/
    __init__.py
    base.py
    coordinator.py
    patient_assessment_agent.py
    activity_context_agent.py
    meal_analysis_agent.py
    nutrition_planning_agent.py
    meal_recommendation_agent.py
    dynamic_adjustment_agent.py
    diabetes_safety_agent.py
    health_coach_agent.py
    registry.py
  tools/
    __init__.py
    base.py
    registry.py
    patient_tools.py
    activity_tools.py
    meal_analysis_tools.py
    nutrition_tools.py
    meal_recommendation_tools.py
    safety_tools.py
    coach_tools.py
    memory_tools.py
  schemas/
    __init__.py
    agent.py
    activity.py
    meal.py
    nutrition.py
    patient.py
    safety.py
  memory/
    __init__.py
    store.py
    models.py
  inference/
    __init__.py
    base.py
    local_provider.py
    jetson_provider.py
  workflows/
    __init__.py
    daily_plan_workflow.py
    meal_upload_workflow.py
    dynamic_adjustment_workflow.py
  tests/
```

This layout can be introduced gradually without rewriting the entire backend in one pass.

## Core Data Contracts

### Agent Request

```json
{
  "userId": "user-123",
  "message": "I ate biryani for lunch. Adjust my dinner.",
  "intent": "dynamic_adjustment",
  "context": {
    "date": "2026-08-11",
    "timezone": "Asia/Calcutta"
  }
}
```

### Agent Response

```json
{
  "ok": true,
  "message": "Lunch was carb-heavy, so I adjusted dinner around lean protein and vegetables.",
  "intent": "dynamic_adjustment",
  "cards": [],
  "actions": [],
  "warnings": [],
  "traceId": "agent-run-id"
}
```

### Tool Result

```json
{
  "ok": true,
  "tool": "adjust_meal_plan",
  "data": {},
  "warnings": [],
  "confidence": 0.86,
  "error": null
}
```

## Stage 1: Agentic AI

### Phase 1.1: Agent Infrastructure

Build the reusable foundation.

Deliverables:

- `AgentContext`: shared run state passed between agents.
- `AgentResult`: structured output from every agent.
- `BaseAgent`: common interface for all agents.
- `BaseTool`: common interface for all tools.
- `AgentRegistry`: maps agent names to implementations.
- `ToolRegistry`: maps tool names to callable implementations.
- `MemoryStore`: reads and writes user profile, meal logs, plans, preferences, and run history.
- `AgentRunLogger`: records workflow steps, tool calls, errors, and fallback behavior.

Minimum interface:

```python
class BaseAgent:
    name: str

    def run(self, context: AgentContext) -> AgentResult:
        raise NotImplementedError
```

### Phase 1.2: Health Coordinator Agent

The coordinator is the entry point for agentic workflows.

Responsibilities:

- Understand the user request.
- Classify intent.
- Load user context from memory.
- Select required agents.
- Execute workflow steps.
- Pass outputs between agents.
- Run safety validation before final response.
- Return a client-friendly response.

First supported intents:

- `new_user_plan`
- `activity_update`
- `meal_image_upload`
- `meal_logged`
- `meal_recommendation`
- `nutrition_question`
- `daily_summary`

### Phase 1.3: Patient Assessment Agent

Move patient/profile calculations into an agent.

Responsibilities:

- Interpret profile data.
- Calculate BMI.
- Calculate BMR.
- Calculate TDEE.
- Identify diabetes profile.
- Identify nutrition priorities.
- Produce patient context.

Inputs:

- Age
- Sex
- Height
- Weight
- Goal
- Diabetes status
- HbA1c
- Insulin usage
- Hypoglycemia history
- Food preferences

Outputs:

- Baseline calories
- Macro priorities
- Risk flags
- Planning constraints

### Phase 1.4: Activity Context Agent

Wrap the existing Google Fit pipeline behind a source-independent interface.

Responsibilities:

- Retrieve activity from the activity tool.
- Analyze steps, calories burned, distance, and heart rate.
- Classify activity intensity.
- Calculate nutrition adjustment hints.
- Provide activity context to nutrition planning.

Important rule:

The agent should call `get_activity_context(user_id)`, not `get_google_fit_activity(user_id)`. Google Fit, Health Connect, Fitbit, and manual activity logs should be provider details hidden behind the tool.

### Phase 1.5: Meal Analysis Agent

Convert the current image analysis pipeline into an agent.

Pipeline:

```text
Image
  -> InferenceProvider
  -> YOLO/SAM segmentation
  -> Gemini nutrition estimation
  -> Nutrition database verification
  -> Structured meal analysis
```

Responsibilities:

- Analyze image uploads.
- Estimate food items and macros.
- Attach confidence and uncertainty.
- Ask for portion confirmation when needed.
- Return structured meal data.

Jetson-ready abstraction:

```python
class InferenceProvider:
    def segment_food(self, image_path: str) -> SegmentationResult:
        raise NotImplementedError
```

Initial providers:

- `LocalInferenceProvider`
- `JetsonInferenceProvider` later in Stage 2

### Phase 1.6: Nutrition Planning Agent

Combine patient, activity, diabetes, and goal context.

Responsibilities:

- Calculate daily calories.
- Calculate protein, carbs, fat, and fibre.
- Split daily targets into meal-wise targets.
- Apply diabetes-aware constraints.
- Produce a plan payload reusable by web and mobile.

### Phase 1.7: Meal Recommendation Agent

Wrap `meal_recommendation_service.py`.

Responsibilities:

- Retrieve candidate meals.
- Filter by diabetes tags, preferences, allergies, and available ingredients.
- Match recommendations to macro targets.
- Rank options.
- Generate short explanations.

### Phase 1.8: Dynamic Nutrition Adjustment Agent

Make the current macro redistribution system agentic.

Workflow:

```text
Actual meal
  -> Compare with planned target
  -> Calculate consumed macros
  -> Calculate remaining macros
  -> Redistribute targets across future meals
  -> Generate updated recommendations
```

Responsibilities:

- Adjust upcoming meals after every logged meal.
- Explain why future targets changed.
- Preserve daily goals where reasonable.
- Produce updated meal recommendations.

### Phase 1.9: Diabetes Safety Agent

Dedicated deterministic safety layer.

Responsibilities:

- Validate carbohydrate intake.
- Validate calorie distribution.
- Check high-carb meal risk.
- Check activity plus diabetes risk.
- Detect unsafe advice.
- Add warnings.
- Prevent unsafe recommendations from reaching the user.

This should be rule-first and LLM-second.

Hard boundaries:

- Do not diagnose.
- Do not recommend medication changes.
- Do not guarantee glucose outcomes.
- Do not hide uncertainty in estimated macros.
- Escalate severe symptoms to professional medical help.

### Phase 1.10: Health Coach Agent

LLM-based conversational layer.

Responsibilities:

- Explain outputs from other agents.
- Generate daily summaries.
- Answer nutrition questions.
- Motivate users.
- Explain meal plan adjustments.

Important rule:

The Health Coach explains and communicates decisions. It should not override patient assessment, meal planning, or diabetes safety agents.

### Phase 1.11: Complete Agent Integration

End-to-end workflows to test:

- New user -> personalized nutrition plan.
- Activity update -> adjusted nutrition target.
- Meal upload -> nutrition analysis.
- Meal consumption -> dynamic meal adjustment.
- Meal recommendation -> safety validation -> coaching response.

## Stage 2: Edge AI With NVIDIA Jetson C100

### Goal

Move compute-heavy vision inference to Jetson while keeping the agent architecture unchanged.

### Required Design

Only the inference provider changes.

```text
Meal Analysis Agent
  -> InferenceProvider
  -> LocalInferenceProvider or JetsonInferenceProvider
```

### Jetson Inference API

The Jetson should expose a lightweight service:

```text
POST /segment-food
```

Request:

```json
{
  "imageId": "image-id",
  "imageBytes": "base64 or multipart upload"
}
```

Response:

```json
{
  "ok": true,
  "segments": [
    {
      "label": "rice",
      "confidence": 0.91,
      "imagePath": "segment-path-or-url",
      "bbox": [10, 20, 200, 180]
    }
  ],
  "processingMs": 842
}
```

### Performance Metrics

Track:

- Processing time
- CPU utilization
- GPU utilization
- Memory usage
- Network latency
- Throughput
- Error rate

## Stage 3: Mobile Application

### Goal

Build a mobile client that consumes the same application APIs as the web app.

The mobile app should not contain agent logic.

### Mobile Responsibilities

- Authentication
- User profile
- Dashboard
- Camera capture
- Meal upload
- Meal confirmation
- Nutrition dashboard
- Coach chat
- Activity data submission through Health Connect

### Mobile API Usage

```text
Mobile Client
  -> Application API
  -> Health Coordinator Agent
  -> Existing agents/tools
```

## API Plan

Add these new API endpoints while keeping existing endpoints during migration:

```text
POST /api/agent/message
POST /api/agent/workflows/new-user-plan
POST /api/agent/workflows/analyze-meal
POST /api/agent/workflows/log-meal
POST /api/agent/workflows/activity-sync
GET  /api/agent/runs/:runId
GET  /api/agent/memory/:userId/today
```

Existing endpoints can remain as lower-level service APIs until the frontend moves to the agent layer.

## Development Order

1. Audit active backend and frontend calls.
2. Add schemas for meals, macros, activity, patient profile, safety, and agent responses.
3. Add tool base classes and tool registry.
4. Wrap current services as tools.
5. Add shared memory store.
6. Add agent base classes and registry.
7. Implement Health Coordinator Agent.
8. Implement Patient Assessment Agent.
9. Implement Activity Context Agent.
10. Implement Meal Analysis Agent.
11. Implement Nutrition Planning Agent.
12. Implement Meal Recommendation Agent.
13. Implement Dynamic Nutrition Adjustment Agent.
14. Implement Diabetes Safety Agent.
15. Implement Health Coach Agent.
16. Add `/api/agent/message`.
17. Add workflow endpoints.
18. Add frontend `agentService.js`.
19. Add Coach page.
20. Test end-to-end agent workflows.
21. Add Jetson inference provider.
22. Run edge performance evaluation.
23. Build mobile app against the same APIs.

## MVP Recommendation

Build the first complete agentic slice around dynamic nutrition adjustment:

```text
User logs a meal
  -> Meal Analysis Agent normalizes actual macros
  -> Dynamic Nutrition Adjustment Agent recalculates remaining targets
  -> Meal Recommendation Agent updates future meals
  -> Diabetes Safety Agent validates output
  -> Health Coach Agent explains the change
```

This MVP uses the strongest existing features and proves the architecture without needing Jetson or mobile work yet.

## Success Criteria

Stage 1 is complete when:

- Agents are registered and invoked through the coordinator.
- Current meal analysis, meal planning, activity, and Eat Effect logic are wrapped as tools.
- The frontend can call at least one agentic workflow.
- Meal plans update after logged meals.
- Diabetes safety validation runs before recommendations reach the user.
- Agent runs are logged.
- The same API outputs can be consumed by web and future mobile clients.

Stage 2 is complete when:

- Meal image segmentation can run through the Jetson provider.
- The Meal Analysis Agent does not need code changes to switch providers.
- Performance metrics compare local and Jetson inference.

Stage 3 is complete when:

- Mobile uses the same application APIs.
- Health Connect or another mobile activity source feeds the same Activity Context Agent.
- Coach, meal tracking, meal plans, and nutrition dashboard work without duplicating agent logic.
