from pydantic import BaseModel, Field

from .nutrition import MacroTotals


class MealItem(BaseModel):
    name: str = "Food"
    calories: float = 0
    protein: float = 0
    carbs: float = 0
    fat: float = 0
    multiplier: float = 1


class MealLog(BaseModel):
    id: str = ""
    type: str = "Snack"
    time: str = ""
    timestamp: str = ""
    totalCalories: float = 0
    macros: MacroTotals = Field(default_factory=MacroTotals)
    items: list[MealItem] = Field(default_factory=list)

    @classmethod
    def from_payload(cls, payload: dict | None) -> "MealLog":
        payload = payload or {}
        macros = MacroTotals.from_payload(payload.get("macros"))
        items = [MealItem(**item) for item in payload.get("items", []) if isinstance(item, dict)]
        return cls(
            id=str(payload.get("id") or ""),
            type=str(payload.get("type") or "Snack"),
            time=str(payload.get("time") or ""),
            timestamp=str(payload.get("timestamp") or ""),
            totalCalories=float(payload.get("totalCalories") or macros.calories or 0),
            macros=macros,
            items=items,
        )

