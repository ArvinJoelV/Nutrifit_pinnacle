from pydantic import BaseModel, Field


class AgentWarning(BaseModel):
    level: str = "info"
    title: str
    message: str
    action: str = ""
    code: str = ""


class AgentCard(BaseModel):
    type: str
    title: str
    data: dict = Field(default_factory=dict)


class AgentAction(BaseModel):
    label: str
    action: str
    payload: dict = Field(default_factory=dict)


class AgentRequest(BaseModel):
    userId: str
    intent: str = "meal_logged"
    payload: dict = Field(default_factory=dict)


class AgentResponse(BaseModel):
    ok: bool
    workflow: str
    message: str = ""
    nutritionState: dict = Field(default_factory=dict)
    remainingMacros: dict = Field(default_factory=dict)
    nextMealTargets: dict = Field(default_factory=dict)
    recommendedMeals: dict = Field(default_factory=dict)
    warnings: list[AgentWarning] = Field(default_factory=list)
    cards: list[AgentCard] = Field(default_factory=list)
    actions: list[AgentAction] = Field(default_factory=list)
    traceId: str = ""
    debug: dict = Field(default_factory=dict)

