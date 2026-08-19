from pydantic import BaseModel


class ActivityContext(BaseModel):
    steps: float = 0
    calories_burned: float = 0
    distance_meters: float = 0
    avg_heart_rate: float = 0
    activity_date: str = ""
    source: str = "unknown"

    @classmethod
    def from_payload(cls, payload: dict | None) -> "ActivityContext":
        payload = payload or {}
        return cls(
            steps=float(payload.get("steps") or 0),
            calories_burned=float(payload.get("calories_burned") or payload.get("caloriesBurned") or 0),
            distance_meters=float(payload.get("distance_meters") or 0),
            avg_heart_rate=float(payload.get("avg_heart_rate") or 0),
            activity_date=str(payload.get("activity_date") or ""),
            source=str(payload.get("source") or "unknown"),
        )

