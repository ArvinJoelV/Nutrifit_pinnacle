from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from meal_recommendation_service import (
    DailyNutritionState,
    build_ingredient_pools,
    generate_adjusted_meal_plan,
    generate_daily_meal_plan,
    load_ingredient_categories,
    load_nutrition_dataset,
    redistribute_macros,
    split_daily_macros_into_meal_targets,
)


app = FastAPI(title="NutriFit Meal Plan API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
nutrition_state = DailyNutritionState()


class DailyMacrosRequest(BaseModel):
    daily_macros: Dict[str, float] = Field(
        ...,
        description="Daily macro totals. Expected keys: calories, carbs, protein, fat.",
    )
    top_n: int = Field(default=3, ge=1, le=10)
    nutrition_dataset_path: Optional[str] = None
    ingredient_category_dataset_path: Optional[str] = None


class MealLogRequest(BaseModel):
    meal_type: str = Field(..., description="Meal window to mark completed.")
    detected_macros: Dict[str, float] = Field(
        ...,
        description="Detected meal macros. Expected keys: calories, carbs, protein, fat.",
    )
    top_n: int = Field(default=1, ge=1, le=10)
    nutrition_dataset_path: Optional[str] = None
    ingredient_category_dataset_path: Optional[str] = None


@app.get("/health")
def health() -> Dict[str, bool]:
    return {"ok": True}


@app.post("/generate-meal-plan")
def generate_meal_plan(request: DailyMacrosRequest) -> Dict[str, Any]:
    required_metrics = {"calories", "carbs", "protein", "fat"}
    missing_metrics = sorted(metric for metric in required_metrics if metric not in request.daily_macros)
    if missing_metrics:
        raise HTTPException(
            status_code=400,
            detail=f"daily_macros is missing required keys: {missing_metrics}",
        )

    try:
        nutrition_df = load_nutrition_dataset(request.nutrition_dataset_path)
        ingredient_df = load_ingredient_categories(request.ingredient_category_dataset_path)
        ingredient_pools = build_ingredient_pools(ingredient_df)
        targets = split_daily_macros_into_meal_targets(request.daily_macros)
        nutrition_state.initialize_day(request.daily_macros)
        meal_plan = generate_daily_meal_plan(
            meal_targets=targets,
            ingredient_pools=ingredient_pools,
            nutrition_df=nutrition_df,
            top_n=request.top_n,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {
        "daily_macros": request.daily_macros,
        "meal_targets": targets,
        "meal_plan": meal_plan,
    }


@app.post("/log-meal")
def log_meal(request: MealLogRequest) -> Dict[str, Any]:
    required_metrics = {"calories", "carbs", "protein", "fat"}
    missing_metrics = sorted(metric for metric in required_metrics if metric not in request.detected_macros)
    if missing_metrics:
        raise HTTPException(
            status_code=400,
            detail=f"detected_macros is missing required keys: {missing_metrics}",
        )

    if not any(nutrition_state.daily_target.values()):
        raise HTTPException(
            status_code=400,
            detail="Daily nutrition state is not initialized. Call /generate-meal-plan first.",
        )

    try:
        nutrition_df = load_nutrition_dataset(request.nutrition_dataset_path)
        ingredient_df = load_ingredient_categories(request.ingredient_category_dataset_path)
        ingredient_pools = build_ingredient_pools(ingredient_df)

        updated_state = nutrition_state.update_consumption(
            meal_macros=request.detected_macros,
            meal_type=request.meal_type,
        )
        next_meal_targets = redistribute_macros(
            nutrition_state.get_remaining_macros(),
            nutrition_state.get_remaining_meals(),
        )
        recommended_meals = generate_adjusted_meal_plan(
            nutrition_state=nutrition_state,
            ingredient_pools=ingredient_pools,
            nutrition_df=nutrition_df,
            top_n=request.top_n,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {
        "nutrition_state": updated_state,
        "remaining_macros": nutrition_state.get_remaining_macros(),
        "next_meal_targets": next_meal_targets,
        "recommended_meals": recommended_meals,
    }
