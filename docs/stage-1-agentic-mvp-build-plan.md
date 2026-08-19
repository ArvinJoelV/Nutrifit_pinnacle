# Stage 1 Agentic AI MVP Build Plan

## MVP Scope

Implement the first complete agentic workflow:

```text
Logged meal
  -> Dynamic nutrition adjustment
  -> Meal recommendation update
  -> Diabetes safety validation
  -> Health coach explanation
```

This slice is the best first target because the repo already has most required pieces:

- Meal macro data from image or manual logging.
- Meal plan generation and redistribution in `backend/meal_recommendation_service.py`.
- Activity data in `backend/google_fit_service.py`.
- Existing frontend diabetes guidance logic that can become backend safety rules.
- LLM-based explanation patterns in `backend/grok_timeline_service.py`.

## Step 1: Add Shared Schemas

Create:

```text
backend/schemas/
  __init__.py
  agent.py
  meal.py
  nutrition.py
  patient.py
  activity.py
  safety.py
```

Minimum models:

- `MacroTotals`
- `MealItem`
- `MealLog`
- `NutritionTarget`
- `DailyNutritionContext`
- `PatientProfile`
- `ActivityContext`
- `SafetyWarning`
- `AgentRequest`
- `AgentResponse`
- `AgentCard`
- `AgentAction`

Goal:

Every agent and tool should exchange typed data instead of raw nested dictionaries.

## Step 2: Add Tool Interfaces

Create:

```text
backend/tools/
  __init__.py
  base.py
  registry.py
```

Minimum:

```python
class ToolResult(BaseModel):
    ok: bool
    tool: str
    data: dict = {}
    warnings: list = []
    confidence: float | None = None
    error: str | None = None
```

Tool interface:

```python
class BaseTool:
    name: str

    def run(self, **kwargs) -> ToolResult:
        raise NotImplementedError
```

## Step 3: Wrap Existing Services As Tools

Create:

```text
backend/tools/meal_recommendation_tools.py
backend/tools/activity_tools.py
backend/tools/safety_tools.py
backend/tools/coach_tools.py
backend/tools/memory_tools.py
```

Initial tools:

- `GenerateMealPlanTool`
- `AdjustMealPlanTool`
- `GetActivityContextTool`
- `DiabetesSafetyCheckTool`
- `HealthCoachExplanationTool`
- `GetTodayNutritionContextTool`
- `SaveAgentRunTool`

Implementation detail:

Start by wrapping existing functions. Avoid changing the behavior of `meal_recommendation_service.py` during the first pass.

## Step 4: Add Agent Interfaces

Create:

```text
backend/agents/
  __init__.py
  base.py
  registry.py
```

Minimum:

```python
class AgentContext(BaseModel):
    user_id: str
    intent: str
    payload: dict = {}
    memory: dict = {}
    tool_outputs: dict = {}
    warnings: list = []
```

```python
class AgentResult(BaseModel):
    ok: bool
    agent: str
    data: dict = {}
    message: str = ""
    warnings: list = []
    error: str | None = None
```

## Step 5: Implement Three MVP Agents

Create:

```text
backend/agents/dynamic_adjustment_agent.py
backend/agents/diabetes_safety_agent.py
backend/agents/health_coach_agent.py
```

### Dynamic Nutrition Adjustment Agent

Responsibilities:

- Accept daily macros, consumed macros, completed meals, and latest meal.
- Call `AdjustMealPlanTool`.
- Return remaining macros and updated meal recommendations.

### Diabetes Safety Agent

Responsibilities:

- Accept patient profile, meals, activity, and nutrition plan.
- Run deterministic checks.
- Return warnings and blocked recommendations when needed.

Initial rules:

- Warn when carbs consumed exceed target.
- Warn when a single meal is unusually high in carbs.
- Warn when protein is low late in the day.
- Warn when high activity plus insulin/hypoglycemia history may need extra care.
- Never suggest medication changes.

### Health Coach Agent

Responsibilities:

- Explain the adjusted plan.
- Include uncertainty language for estimated meal macros.
- Include safety warnings from the Diabetes Safety Agent.
- Avoid overriding structured recommendations.

## Step 6: Implement Coordinator

Create:

```text
backend/agents/coordinator.py
```

MVP supported workflow:

```text
meal_logged
```

Flow:

1. Normalize request payload.
2. Load today context.
3. Run Dynamic Nutrition Adjustment Agent.
4. Run Diabetes Safety Agent.
5. Run Health Coach Agent.
6. Save agent run log.
7. Return structured response.

## Step 7: Add Flask Agent Endpoint

Add to `backend/app.py`:

```text
POST /api/agent/workflows/log-meal
```

Request:

```json
{
  "userId": "user-123",
  "dailyMacros": {
    "calories": 2200,
    "carbs": 250,
    "protein": 130,
    "fat": 70
  },
  "consumedMacros": {
    "calories": 900,
    "carbs": 130,
    "protein": 35,
    "fat": 28
  },
  "completedMeals": ["breakfast", "lunch"],
  "latestMeal": {
    "type": "lunch",
    "totalCalories": 620,
    "macros": {
      "calories": 620,
      "carbs": 88,
      "protein": 22,
      "fat": 18
    },
    "items": []
  },
  "patientProfile": {},
  "activity": {}
}
```

Response:

```json
{
  "ok": true,
  "workflow": "meal_logged",
  "message": "Lunch used more of your carb budget, so dinner has been adjusted...",
  "nutritionState": {},
  "remainingMacros": {},
  "recommendedMeals": {},
  "warnings": [],
  "cards": [],
  "traceId": "..."
}
```

## Step 8: Add Frontend Service

Create:

```text
frontend/src/services/agentService.js
```

Function:

```javascript
export const runMealLoggedWorkflow = async (payload, { signal } = {}) => {}
```

The frontend can then migrate one flow at a time from direct service calls to agent workflow calls.

## Step 9: First Integration Point

Best first frontend integration:

```text
ConfirmMealPage.jsx
```

After the user confirms a meal:

1. Save/log the meal using current local flow.
2. Call `/api/agent/workflows/log-meal`.
3. Show updated meal recommendations and coach explanation.

## Step 10: Tests

Backend tests should cover:

- Dynamic adjustment with normal meal.
- Dynamic adjustment after high-carb meal.
- Safety warning when carbs exceed target.
- Safety warning for high activity plus insulin/hypoglycemia risk.
- Coach response includes safety warning text.
- Coordinator returns stable response shape.

## Out Of Scope For MVP

Do not build these first:

- Jetson provider.
- Mobile app.
- Full chat memory.
- Streaming responses.
- Full FastAPI migration.
- Autonomous multi-step planner.

Those are valuable later, but the first milestone should prove one useful agentic workflow end to end.

## Completion Criteria

The MVP is complete when:

- `/api/agent/workflows/log-meal` works.
- Existing meal recommendation logic is called through a tool.
- The dynamic adjustment agent updates remaining meals.
- Diabetes safety runs before the response returns.
- The coach agent explains the adjustment.
- The frontend has a service function ready to call the workflow.
