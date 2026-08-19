from pydantic import BaseModel, Field


class MacroTotals(BaseModel):
    calories: float = Field(default=0)
    carbs: float = Field(default=0)
    protein: float = Field(default=0)
    fat: float = Field(default=0)
    fiber: float = Field(default=0)
    sodium: float = Field(default=0)

    @classmethod
    def from_payload(cls, payload: dict | None) -> "MacroTotals":
        payload = payload or {}
        return cls(
            calories=float(payload.get("calories") or 0),
            carbs=float(payload.get("carbs") or 0),
            protein=float(payload.get("protein") or 0),
            fat=float(payload.get("fat") or 0),
            fiber=float(payload.get("fiber") or 0),
            sodium=float(payload.get("sodium") or 0),
        )

    def rounded(self) -> dict:
        return {
            "calories": round(self.calories, 2),
            "carbs": round(self.carbs, 2),
            "protein": round(self.protein, 2),
            "fat": round(self.fat, 2),
            "fiber": round(self.fiber, 2),
            "sodium": round(self.sodium, 2),
        }

