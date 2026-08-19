import time
from pydantic import BaseModel, Field


class AgentContext(BaseModel):
    user_id: str
    intent: str = "meal_logged"
    payload: dict = Field(default_factory=dict)
    tool_outputs: dict = Field(default_factory=dict)
    warnings: list = Field(default_factory=list)
    trace_id: str = ""
    memory: dict = Field(default_factory=dict)
    trace: list = Field(default_factory=list)


class AgentResult(BaseModel):
    ok: bool
    agent: str
    data: dict = Field(default_factory=dict)
    message: str = ""
    warnings: list = Field(default_factory=list)
    error: str | None = None


class BaseAgent:
    name: str = "base_agent"
    description: str = ""

    def run(self, context: AgentContext) -> AgentResult:
        raise NotImplementedError

    def execute(self, context: AgentContext) -> AgentResult:
        start_time = time.time()
        
        try:
            result = self.run(context)
        except Exception as exc:
            result = AgentResult(ok=False, agent=self.name, error=str(exc))
            
        end_time = time.time()
        duration_ms = int((end_time - start_time) * 1000)
        
        context.trace.append({
            "agent": self.name,
            "ok": result.ok,
            "duration_ms": duration_ms,
            "error": result.error
        })
        
        return result

