from pydantic import BaseModel, Field


class ToolResult(BaseModel):
    ok: bool
    tool: str
    data: dict = Field(default_factory=dict)
    warnings: list = Field(default_factory=list)
    confidence: float | None = None
    error: str | None = None


class BaseTool:
    name: str

    def run(self, **kwargs) -> ToolResult:
        raise NotImplementedError

