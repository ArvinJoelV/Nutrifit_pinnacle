from pydantic import BaseModel


class PatientProfile(BaseModel):
    diabetes_type: str = ""
    hba1c: float = 0
    fasting_glucose: float = 0
    post_meal_glucose: float = 0
    hypoglycemia_history: str = "no"
    insulin_usage: str = "no"
    medication_type: str = ""
    diet_preference: str = ""
    medical_condition: str = ""

    @classmethod
    def from_payload(cls, payload: dict | None) -> "PatientProfile":
        payload = payload or {}

        def to_float(value):
            try:
                return float(value or 0)
            except (TypeError, ValueError):
                return 0

        return cls(
            diabetes_type=str(payload.get("diabetes_type") or ""),
            hba1c=to_float(payload.get("hba1c")),
            fasting_glucose=to_float(payload.get("fasting_glucose")),
            post_meal_glucose=to_float(payload.get("post_meal_glucose")),
            hypoglycemia_history=str(payload.get("hypoglycemia_history") or "no"),
            insulin_usage=str(payload.get("insulin_usage") or "no"),
            medication_type=str(payload.get("medication_type") or ""),
            diet_preference=str(payload.get("diet_preference") or ""),
            medical_condition=str(payload.get("medical_condition") or ""),
        )

