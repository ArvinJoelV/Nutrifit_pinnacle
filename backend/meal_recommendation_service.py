import os
import re
from dataclasses import dataclass, field
from difflib import SequenceMatcher, get_close_matches
from itertools import product
from typing import Dict, List, Optional

import pandas as pd


DEFAULT_NUTRITION_DATASET = os.getenv(
    "INDB_NUTRITION_DATASET",
    r"E:\Projects\Nutrifit_pinnacle\backend\Anuvaad_INDB_2024.11.xlsx",
)
DEFAULT_INGREDIENT_CATEGORY_DATASET = os.getenv(
    "INGREDIENT_CATEGORY_DATASET",
    r"E:\Projects\Nutrifit_pinnacle\backend\ingredient_category_dataset_indian.csv",
)


meal_templates = {
    "breakfast": ["grain", "protein", "fruit"],
    "lunch": ["carb", "protein", "vegetable", "healthy_fat"],
    "dinner": ["protein", "vegetable", "carb"],
    "snack": ["carb", "protein"],
}

meal_targets = {
    "breakfast": {"carbs": 50, "protein": 25, "fat": 20, "calories": 550},
    "lunch": {"carbs": 70, "protein": 35, "fat": 30, "calories": 750},
    "dinner": {"carbs": 60, "protein": 30, "fat": 25, "calories": 650},
    "snack": {"carbs": 20, "protein": 10, "fat": 10, "calories": 200},
}

DEFAULT_MEAL_SPLITS = {
    "breakfast": {"calories": 0.25, "carbs": 0.25, "protein": 0.25, "fat": 0.25},
    "lunch": {"calories": 0.35, "carbs": 0.35, "protein": 0.35, "fat": 0.35},
    "dinner": {"calories": 0.30, "carbs": 0.30, "protein": 0.30, "fat": 0.30},
    "snack": {"calories": 0.10, "carbs": 0.10, "protein": 0.10, "fat": 0.10},
}

REDISTRIBUTION_WEIGHTS = {
    ("breakfast",): {"breakfast": 1.0},
    ("lunch",): {"lunch": 1.0},
    ("dinner",): {"dinner": 1.0},
    ("snack",): {"snack": 1.0},
    ("breakfast", "lunch"): {"breakfast": 0.4, "lunch": 0.6},
    ("breakfast", "dinner"): {"breakfast": 0.45, "dinner": 0.55},
    ("breakfast", "snack"): {"breakfast": 0.75, "snack": 0.25},
    ("lunch", "dinner"): {"lunch": 0.6, "dinner": 0.4},
    ("lunch", "snack"): {"lunch": 0.75, "snack": 0.25},
    ("dinner", "snack"): {"dinner": 0.7, "snack": 0.3},
    ("breakfast", "lunch", "dinner"): {"breakfast": 0.25, "lunch": 0.45, "dinner": 0.3},
    ("breakfast", "lunch", "snack"): {"breakfast": 0.25, "lunch": 0.55, "snack": 0.2},
    ("breakfast", "dinner", "snack"): {"breakfast": 0.3, "dinner": 0.5, "snack": 0.2},
    ("lunch", "dinner", "snack"): {"lunch": 0.45, "dinner": 0.35, "snack": 0.2},
    ("breakfast", "lunch", "dinner", "snack"): {"breakfast": 0.25, "lunch": 0.35, "dinner": 0.3, "snack": 0.1},
}

INGREDIENT_ALIASES = {
    "brown_rice": "brown rice",
    "white_rice": "rice",
    "basmati_rice": "basmati rice",
    "whole_wheat_roti": "roti",
    "whole_wheat_flour": "wheat flour",
    "chicken_breast": "chicken",
    "chicken_thigh": "chicken",
    "egg_white": "egg",
    "green_gram": "green gram",
    "kidney_beans": "kidney beans",
    "black_beans": "black beans",
    "split_peas": "split peas",
    "greek_yogurt": "yogurt",
    "soy_milk": "soy milk",
    "fenugreek_leaves": "fenugreek leaves",
    "bell_pepper": "bell pepper",
    "sweet_potato": "sweet potato",
    "green_beans": "green beans",
    "bottle_gourd": "bottle gourd",
    "ridge_gourd": "ridge gourd",
    "bitter_gourd": "bitter gourd",
    "sweet_lime": "sweet lime",
    "olive_oil": "oil",
    "mustard_oil": "mustard oil",
    "coconut_oil": "coconut oil",
    "peanut_butter": "peanut butter",
    "almonds": "almond",
    "walnuts": "walnut",
    "cashews": "cashew",
    "pistachios": "pistachio",
    "peanuts": "peanut",
    "chia_seeds": "chia seed",
    "flax_seeds": "flax seed",
    "pumpkin_seeds": "pumpkin seed",
    "sunflower_seeds": "sunflower seed",
    "berries": "berry",
}

PORTION_OPTIONS_BY_CATEGORY = {
    "grain": [0.5, 1.0, 1.5],
    "carb": [0.5, 1.0, 1.5],
    "protein": [1.0, 1.5, 2.0],
    "vegetable": [1.0, 1.5, 2.0],
    "fruit": [0.5, 1.0, 1.5],
    "healthy_fat": [0.5, 1.0],
    "dairy": [0.5, 1.0, 1.5],
    "legume": [0.5, 1.0, 1.5],
}


@dataclass
class DailyNutritionState:
    daily_target: Dict[str, float] = field(default_factory=lambda: {"calories": 0.0, "carbs": 0.0, "protein": 0.0, "fat": 0.0})
    consumed: Dict[str, float] = field(default_factory=lambda: {"calories": 0.0, "carbs": 0.0, "protein": 0.0, "fat": 0.0})
    remaining: Dict[str, float] = field(default_factory=lambda: {"calories": 0.0, "carbs": 0.0, "protein": 0.0, "fat": 0.0})
    meals_completed: List[str] = field(default_factory=list)
    remaining_meal_windows: List[str] = field(default_factory=lambda: ["breakfast", "lunch", "dinner", "snack"])

    def initialize_day(self, daily_targets: Dict[str, float]) -> Dict[str, object]:
        self.daily_target = {
            "calories": float(daily_targets.get("calories", 0) or 0),
            "carbs": float(daily_targets.get("carbs", 0) or 0),
            "protein": float(daily_targets.get("protein", 0) or 0),
            "fat": float(daily_targets.get("fat", 0) or 0),
        }
        self.consumed = {"calories": 0.0, "carbs": 0.0, "protein": 0.0, "fat": 0.0}
        self.meals_completed = []
        self.remaining_meal_windows = ["breakfast", "lunch", "dinner", "snack"]
        self.calculate_remaining()
        return self.to_dict()

    def update_consumption(self, meal_macros: Dict[str, float], meal_type: Optional[str] = None) -> Dict[str, object]:
        self.consumed["calories"] += float(meal_macros.get("calories", 0) or 0)
        self.consumed["carbs"] += float(meal_macros.get("carbs", 0) or 0)
        self.consumed["protein"] += float(meal_macros.get("protein", 0) or 0)
        self.consumed["fat"] += float(meal_macros.get("fat", 0) or 0)

        if meal_type:
            normalized_meal = normalize_ingredient_name(meal_type)
            if normalized_meal and normalized_meal not in self.meals_completed:
                self.meals_completed.append(normalized_meal)
            self.remaining_meal_windows = [
                meal for meal in ["breakfast", "lunch", "dinner", "snack"] if meal not in self.meals_completed
            ]

        self.calculate_remaining()
        return self.to_dict()

    def calculate_remaining(self) -> Dict[str, float]:
        self.remaining = {
            "calories": round(max(self.daily_target["calories"] - self.consumed["calories"], 0.0), 2),
            "carbs": round(max(self.daily_target["carbs"] - self.consumed["carbs"], 0.0), 2),
            "protein": round(max(self.daily_target["protein"] - self.consumed["protein"], 0.0), 2),
            "fat": round(max(self.daily_target["fat"] - self.consumed["fat"], 0.0), 2),
        }
        self.consumed = {key: round(value, 2) for key, value in self.consumed.items()}
        self.daily_target = {key: round(value, 2) for key, value in self.daily_target.items()}
        return self.remaining

    def get_remaining_macros(self) -> Dict[str, float]:
        return dict(self.remaining)

    def get_remaining_meals(self) -> List[str]:
        return list(self.remaining_meal_windows)

    def to_dict(self) -> Dict[str, object]:
        return {
            "daily_target": dict(self.daily_target),
            "consumed": dict(self.consumed),
            "remaining": dict(self.remaining),
            "meals_completed": list(self.meals_completed),
            "remaining_meal_windows": list(self.remaining_meal_windows),
        }


def normalize_ingredient_name(value: object) -> str:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ""
    return str(value).strip().lower()


def _canonicalize_name(value: object) -> str:
    text = normalize_ingredient_name(value).replace("_", " ")
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _require_columns(frame: pd.DataFrame, required_columns: List[str], dataset_name: str) -> None:
    missing = [column for column in required_columns if column not in frame.columns]
    if missing:
        raise ValueError(f"{dataset_name} is missing required columns: {missing}")


def load_nutrition_dataset(path: Optional[str] = None) -> pd.DataFrame:
    dataset_path = path or DEFAULT_NUTRITION_DATASET
    source_df = pd.read_excel(dataset_path)
    source_df.columns = [str(column).strip().lower() for column in source_df.columns]

    def pick_column(primary: str, fallback: Optional[str] = None, default=0):
        if primary in source_df.columns:
            return source_df[primary]
        if fallback and fallback in source_df.columns:
            return source_df[fallback]
        return pd.Series([default] * len(source_df))

    nutrition_df = pd.DataFrame(
        {
            "food_name": pick_column("food_name", default=""),
            "calories_per_portion": pick_column("unit_serving_energy_kcal", "energy_kcal"),
            "carbs_g": pick_column("unit_serving_carb_g", "carb_g"),
            "protein_g": pick_column("unit_serving_protein_g", "protein_g"),
            "fat_g": pick_column("unit_serving_fat_g", "fat_g"),
            "fiber_g": pick_column("unit_serving_fibre_g", "fibre_g"),
            "sodium_mg": pick_column("unit_serving_sodium_mg", "sodium_mg"),
            "portion_size_g": pick_column("portion_size_g", default=0),
            "serving_size_label": pick_column("servings_unit", default=""),
        }
    )

    nutrition_df["food_name"] = nutrition_df["food_name"].map(normalize_ingredient_name)
    nutrition_df["serving_size_label"] = nutrition_df["serving_size_label"].map(
        lambda value: "" if pd.isna(value) else str(value).strip()
    )
    nutrition_df = nutrition_df[nutrition_df["food_name"] != ""].copy()

    numeric_columns = [
        "calories_per_portion",
        "carbs_g",
        "protein_g",
        "fat_g",
        "fiber_g",
        "sodium_mg",
        "portion_size_g",
    ]
    for column in numeric_columns:
        nutrition_df[column] = pd.to_numeric(nutrition_df[column], errors="coerce")

    return nutrition_df


def load_ingredient_categories(path: Optional[str] = None) -> pd.DataFrame:
    dataset_path = path or DEFAULT_INGREDIENT_CATEGORY_DATASET
    ingredient_df = pd.read_csv(dataset_path)
    ingredient_df.columns = [str(column).strip().lower() for column in ingredient_df.columns]

    required_columns = ["ingredient", "category", "subcategory", "diabetes_tag"]
    _require_columns(ingredient_df, required_columns, "Ingredient category dataset")

    ingredient_df["ingredient"] = ingredient_df["ingredient"].map(normalize_ingredient_name)
    ingredient_df["category"] = ingredient_df["category"].map(normalize_ingredient_name)
    ingredient_df["subcategory"] = ingredient_df["subcategory"].map(normalize_ingredient_name)
    ingredient_df["diabetes_tag"] = ingredient_df["diabetes_tag"].map(normalize_ingredient_name)

    ingredient_df = ingredient_df[ingredient_df["ingredient"] != ""].copy()
    return ingredient_df


def build_ingredient_pools(ingredient_df: pd.DataFrame) -> Dict[str, List[str]]:
    required_columns = ["ingredient", "category"]
    _require_columns(ingredient_df, required_columns, "Ingredient category dataset")

    normalized_df = ingredient_df.copy()
    normalized_df["ingredient"] = normalized_df["ingredient"].map(normalize_ingredient_name)
    normalized_df["category"] = normalized_df["category"].map(normalize_ingredient_name)
    normalized_df = normalized_df[
        (normalized_df["ingredient"] != "") & (normalized_df["category"] != "")
    ].drop_duplicates(subset=["category", "ingredient"])

    grouped = normalized_df.groupby("category")["ingredient"]
    return {category: sorted(values.tolist()) for category, values in grouped}


import random

def generate_meal_candidates(template: List[str], ingredient_pools: Dict[str, List[str]]) -> List[List[str]]:
    normalized_template = [normalize_ingredient_name(category) for category in template]
    category_options = []

    for category in normalized_template:
        ingredients = ingredient_pools.get(category, [])
        if not ingredients:
            return []
        
        # Limit pool to random subset to prevent combinatorial explosion causing 15s hangs
        if len(ingredients) > 10:
            sampled_ingredients = random.sample(ingredients, 10)
        else:
            sampled_ingredients = ingredients
            
        category_options.append(sampled_ingredients)

    candidates = [list(candidate) for candidate in product(*category_options)]
    
    # Shuffle and strongly truncate to keep execution under 1 second
    random.shuffle(candidates)
    return candidates[:150]


def _build_nutrition_lookup(nutrition_df: pd.DataFrame) -> Dict[str, Dict[str, float]]:
    required_columns = [
        "food_name",
        "calories_per_portion",
        "carbs_g",
        "protein_g",
        "fat_g",
        "fiber_g",
        "sodium_mg",
        "portion_size_g",
        "serving_size_label",
    ]
    _require_columns(nutrition_df, required_columns, "Nutrition dataset")

    normalized_df = nutrition_df.copy()
    normalized_df["food_name"] = normalized_df["food_name"].map(normalize_ingredient_name)
    normalized_df = normalized_df[normalized_df["food_name"] != ""].copy()

    aggregated_df = normalized_df.groupby("food_name", as_index=False).agg(
        {
            "calories_per_portion": "mean",
            "carbs_g": "mean",
            "protein_g": "mean",
            "fat_g": "mean",
            "fiber_g": "mean",
            "sodium_mg": "mean",
            "portion_size_g": "mean",
            "serving_size_label": lambda series: next(
                (str(value).strip() for value in series if str(value).strip()),
                "",
            ),
        }
    )

    return {
        row["food_name"]: {
            "calories": float(row["calories_per_portion"] or 0),
            "carbs": float(row["carbs_g"] or 0),
            "protein": float(row["protein_g"] or 0),
            "fat": float(row["fat_g"] or 0),
            "fiber": float(row["fiber_g"] or 0),
            "sodium": float(row["sodium_mg"] or 0),
            "portion_size_g": float(row["portion_size_g"] or 0),
            "serving_size_label": str(row.get("serving_size_label", "") or "").strip(),
        }
        for _, row in aggregated_df.iterrows()
    }


def _filter_ingredient_pools(
    ingredient_pools: Dict[str, List[str]],
    nutrition_lookup: Dict[str, Dict[str, float]],
    resolution_cache: Optional[Dict[str, Optional[str]]] = None,
) -> Dict[str, List[str]]:
    filtered = {}
    for category, ingredients in ingredient_pools.items():
        filtered[category] = [
            ingredient
            for ingredient in ingredients
            if _resolve_ingredient_name(ingredient, nutrition_lookup, resolution_cache=resolution_cache)
        ]
    return filtered


def _score_name_match(query: str, candidate: str) -> float:
    query_words = query.split()
    candidate_words = candidate.split()
    if not query_words or not candidate_words:
        return 0.0

    score = SequenceMatcher(None, query, candidate).ratio()
    overlap = len(set(query_words) & set(candidate_words)) / max(len(set(query_words)), 1)
    score += overlap

    if re.search(rf"\b{re.escape(query)}\b", candidate):
        score += 1.2
    if candidate.startswith(query):
        score += 0.4

    unmatched_penalty = max(len(candidate_words) - len(query_words), 0) * 0.03
    return score - unmatched_penalty


def _resolve_ingredient_name(
    ingredient: str,
    nutrition_lookup: Dict[str, Dict[str, float]],
    resolution_cache: Optional[Dict[str, Optional[str]]] = None,
) -> Optional[str]:
    normalized = normalize_ingredient_name(ingredient)
    if resolution_cache is not None and normalized in resolution_cache:
        return resolution_cache[normalized]

    canonical_query = _canonicalize_name(normalized)
    canonical_map = {_canonicalize_name(name): name for name in nutrition_lookup}

    resolved = None
    if normalized in nutrition_lookup:
        resolved = normalized
    elif canonical_query in canonical_map:
        resolved = canonical_map[canonical_query]
    else:
        alias = INGREDIENT_ALIASES.get(normalized) or INGREDIENT_ALIASES.get(canonical_query.replace(" ", "_"))
        alias_canonical = _canonicalize_name(alias) if alias else ""
        if alias and alias in nutrition_lookup:
            resolved = alias
        elif alias_canonical and alias_canonical in canonical_map:
            resolved = canonical_map[alias_canonical]
        else:
            candidates = []
            search_terms = [canonical_query]
            if alias_canonical:
                search_terms.append(alias_canonical)

            for name in nutrition_lookup:
                candidate_canonical = _canonicalize_name(name)
                for term in search_terms:
                    if not term:
                        continue
                    if re.search(rf"\b{re.escape(term)}\b", candidate_canonical):
                        candidates.append((_score_name_match(term, candidate_canonical), name))
                        break

            if not candidates:
                close_terms = get_close_matches(
                    canonical_query,
                    list(canonical_map.keys()),
                    n=5,
                    cutoff=0.75,
                )
                if alias_canonical:
                    close_terms += get_close_matches(alias_canonical, list(canonical_map.keys()), n=5, cutoff=0.75)
                candidates = [(_score_name_match(canonical_query, term), canonical_map[term]) for term in close_terms]

            if candidates:
                candidates.sort(key=lambda item: item[0], reverse=True)
                resolved = candidates[0][1]

    if resolution_cache is not None:
        resolution_cache[normalized] = resolved
    return resolved


def _build_candidate_entries(template: List[str], ingredients: List[str]) -> List[Dict[str, object]]:
    return [
        {
            "ingredient": normalize_ingredient_name(ingredient),
            "category": normalize_ingredient_name(category),
            "quantity": 1.0,
        }
        for category, ingredient in zip(template, ingredients)
    ]


def _get_portion_options(category: str) -> List[float]:
    return PORTION_OPTIONS_BY_CATEGORY.get(normalize_ingredient_name(category), [0.5, 1.0, 1.5])


def calculate_meal_macros(
    ingredients: List[object],
    nutrition_df: Optional[pd.DataFrame] = None,
    nutrition_lookup: Optional[Dict[str, Dict[str, float]]] = None,
    resolution_cache: Optional[Dict[str, Optional[str]]] = None,
) -> Dict[str, object]:
    nutrition_lookup = nutrition_lookup or _build_nutrition_lookup(nutrition_df)
    ingredient_entries = []
    for item in ingredients:
        if isinstance(item, dict):
            ingredient_entries.append(
                {
                    "ingredient": normalize_ingredient_name(item.get("ingredient")),
                    "category": normalize_ingredient_name(item.get("category")),
                    "quantity": float(item.get("quantity", 1) or 1),
                }
            )
        else:
            ingredient_entries.append(
                {
                    "ingredient": normalize_ingredient_name(item),
                    "category": "",
                    "quantity": 1.0,
                }
            )

    totals = {
        "ingredients": [entry["ingredient"] for entry in ingredient_entries],
        "resolved_ingredients": [],
        "ingredient_details": [],
        "calories": 0.0,
        "carbs": 0.0,
        "protein": 0.0,
        "fat": 0.0,
        "fiber": 0.0,
        "sodium": 0.0,
        "missing_ingredients": [],
    }

    for entry_meta in ingredient_entries:
        ingredient = entry_meta["ingredient"]
        resolved_name = _resolve_ingredient_name(ingredient, nutrition_lookup, resolution_cache=resolution_cache)
        if not resolved_name:
            totals["missing_ingredients"].append(ingredient)
            continue
        totals["resolved_ingredients"].append(resolved_name)
        entry = nutrition_lookup.get(resolved_name)
        if not entry:
            totals["missing_ingredients"].append(ingredient)
            continue
        quantity = round(float(entry_meta.get("quantity", 1) or 1), 2)
        portion_size_g = round(float(entry.get("portion_size_g", 0) or 0), 2)
        serving_size_label = str(entry.get("serving_size_label", "") or "").strip()
        totals["ingredient_details"].append(
            {
                "ingredient": ingredient,
                "category": entry_meta.get("category", ""),
                "matched_food": resolved_name,
                "quantity": quantity,
                "unit": "serving",
                "portion_size_g": round(portion_size_g * quantity, 2) if portion_size_g > 0 else 0,
                "base_portion_size_g": portion_size_g,
                "serving_size_label": serving_size_label,
            }
        )
        totals["calories"] += entry["calories"] * quantity
        totals["carbs"] += entry["carbs"] * quantity
        totals["protein"] += entry["protein"] * quantity
        totals["fat"] += entry["fat"] * quantity
        totals["fiber"] += entry["fiber"] * quantity
        totals["sodium"] += entry["sodium"] * quantity

    for key in ["calories", "carbs", "protein", "fat", "fiber", "sodium"]:
        totals[key] = round(totals[key], 2)

    return totals


def score_meal(meal_macros: Dict[str, float], target_macros: Dict[str, float]) -> float:
    metrics = ["carbs", "protein", "fat", "calories"]
    component_scores = []

    for metric in metrics:
        target_value = float(target_macros.get(metric, 0) or 0)
        actual_value = float(meal_macros.get(metric, 0) or 0)
        if target_value <= 0:
            component_scores.append(0.0)
            continue

        diff_ratio = abs(actual_value - target_value) / target_value
        component_scores.append(max(0.0, 1.0 - diff_ratio))

    if not component_scores:
        return 0.0
    return round(sum(component_scores) / len(component_scores), 4)


def split_daily_macros_into_meal_targets(
    daily_macros: Dict[str, float],
    meal_splits: Optional[Dict[str, Dict[str, float]]] = None,
) -> Dict[str, Dict[str, float]]:
    meal_splits = meal_splits or DEFAULT_MEAL_SPLITS
    normalized_daily_macros = {
        "calories": float(daily_macros.get("calories", 0) or 0),
        "carbs": float(daily_macros.get("carbs", 0) or 0),
        "protein": float(daily_macros.get("protein", 0) or 0),
        "fat": float(daily_macros.get("fat", 0) or 0),
    }

    targets = {}
    for meal_type, ratios in meal_splits.items():
        targets[meal_type] = {
            metric: round(normalized_daily_macros[metric] * float(ratios.get(metric, 0) or 0), 2)
            for metric in normalized_daily_macros
        }

    return targets


def redistribute_macros(
    remaining_macros: Dict[str, float],
    remaining_meals: List[str],
) -> Dict[str, Dict[str, float]]:
    normalized_meals = tuple(sorted(normalize_ingredient_name(meal) for meal in remaining_meals if meal))
    if not normalized_meals:
        return {}

    weights = REDISTRIBUTION_WEIGHTS.get(normalized_meals)
    if not weights:
        default_priority = {"breakfast": 0.25, "lunch": 0.4, "dinner": 0.25, "snack": 0.1}
        total_weight = sum(default_priority.get(meal, 0.25) for meal in normalized_meals)
        weights = {
            meal: round(default_priority.get(meal, 0.25) / total_weight, 4)
            for meal in normalized_meals
        }

    redistributed = {}
    for meal in normalized_meals:
        meal_weight = float(weights.get(meal, 0) or 0)
        redistributed[meal] = {
            "calories": round(float(remaining_macros.get("calories", 0) or 0) * meal_weight, 2),
            "carbs": round(float(remaining_macros.get("carbs", 0) or 0) * meal_weight, 2),
            "protein": round(float(remaining_macros.get("protein", 0) or 0) * meal_weight, 2),
            "fat": round(float(remaining_macros.get("fat", 0) or 0) * meal_weight, 2),
        }

    return redistributed


def generate_adjusted_meal_plan(
    nutrition_state: DailyNutritionState,
    ingredient_pools: Optional[Dict[str, List[str]]] = None,
    nutrition_df: Optional[pd.DataFrame] = None,
    top_n: int = 1,
) -> Dict[str, Dict[str, object]]:
    remaining_macros = nutrition_state.get_remaining_macros()
    remaining_meals = nutrition_state.get_remaining_meals()
    next_meal_targets = redistribute_macros(remaining_macros, remaining_meals)
    if not next_meal_targets:
        return {}

    ingredient_pools = ingredient_pools or build_ingredient_pools(load_ingredient_categories())
    nutrition_df = nutrition_df if nutrition_df is not None else load_nutrition_dataset()

    adjusted_plan = {}
    for meal_type, macro_targets in next_meal_targets.items():
        recommendation_bundle = recommend_meal(
            meal_type=meal_type,
            target_macros=macro_targets,
            ingredient_pools=ingredient_pools,
            nutrition_df=nutrition_df,
            top_n=top_n,
        )
        best = (recommendation_bundle.get("recommendations") or [{}])[0]
        adjusted_plan[meal_type] = {
            "meal_type": meal_type,
            "target_macros": macro_targets,
            "ingredients": best.get("ingredients", []),
            "matchedIngredients": best.get("matchedIngredients", []),
            "ingredientDetails": best.get("ingredientDetails", []),
            "macros": {
                "calories": best.get("calories", 0),
                "carbs": best.get("carbs", 0),
                "protein": best.get("protein", 0),
                "fat": best.get("fat", 0),
                "fiber": best.get("fiber", 0),
                "sodium": best.get("sodium", 0),
            },
            "score": best.get("score", 0),
        }

    return adjusted_plan


def recommend_meal(
    meal_type: str,
    target_macros: Dict[str, float],
    ingredient_pools: Optional[Dict[str, List[str]]] = None,
    nutrition_df: Optional[pd.DataFrame] = None,
    nutrition_lookup: Optional[Dict[str, Dict[str, float]]] = None,
    top_n: int = 3,
) -> Dict[str, object]:
    normalized_meal_type = normalize_ingredient_name(meal_type)
    if normalized_meal_type not in meal_templates:
        raise ValueError(f"Unknown meal type: {meal_type}")

    ingredient_pools = ingredient_pools or build_ingredient_pools(load_ingredient_categories())
    nutrition_df = nutrition_df if nutrition_df is not None else load_nutrition_dataset()
    nutrition_lookup = nutrition_lookup or _build_nutrition_lookup(nutrition_df)
    resolution_cache = {}
    filtered_pools = _filter_ingredient_pools(ingredient_pools, nutrition_lookup, resolution_cache=resolution_cache)

    template = meal_templates[normalized_meal_type]
    candidates = generate_meal_candidates(template, filtered_pools)

    coarse_candidates = []
    for candidate in candidates:
        base_entries = _build_candidate_entries(template, candidate)
        base_macros = calculate_meal_macros(
            base_entries,
            nutrition_lookup=nutrition_lookup,
            resolution_cache=resolution_cache,
        )
        if base_macros["missing_ingredients"]:
            continue
        coarse_candidates.append((score_meal(base_macros, target_macros), candidate))

    coarse_candidates.sort(key=lambda item: item[0], reverse=True)
    shortlisted_candidates = [candidate for _, candidate in coarse_candidates[:40]]

    recommendations = []
    for candidate in shortlisted_candidates:
        base_entries = _build_candidate_entries(template, candidate)
        portion_choices = [_get_portion_options(entry["category"]) for entry in base_entries]
        best_meal_macros = None
        best_score = -1.0

        for multipliers in product(*portion_choices):
            portioned_entries = [
                {
                    **entry,
                    "quantity": multiplier,
                }
                for entry, multiplier in zip(base_entries, multipliers)
            ]
            meal_macros = calculate_meal_macros(
                portioned_entries,
                nutrition_lookup=nutrition_lookup,
                resolution_cache=resolution_cache,
            )
            if meal_macros["missing_ingredients"]:
                continue

            score = score_meal(meal_macros, target_macros)
            if score > best_score:
                best_score = score
                best_meal_macros = meal_macros

        if not best_meal_macros:
            continue

        recommendations.append(
            {
                "ingredients": best_meal_macros["ingredients"],
                "matchedIngredients": best_meal_macros["resolved_ingredients"],
                "ingredientDetails": best_meal_macros["ingredient_details"],
                "calories": best_meal_macros["calories"],
                "carbs": best_meal_macros["carbs"],
                "protein": best_meal_macros["protein"],
                "fat": best_meal_macros["fat"],
                "fiber": best_meal_macros["fiber"],
                "sodium": best_meal_macros["sodium"],
                "score": best_score,
            }
        )

    recommendations.sort(key=lambda item: item["score"], reverse=True)
    return {
        "meal_type": normalized_meal_type,
        "recommendations": recommendations[:top_n],
    }


def generate_daily_meal_plan(
    meal_targets: Dict[str, Dict[str, float]],
    ingredient_pools: Optional[Dict[str, List[str]]] = None,
    nutrition_df: Optional[pd.DataFrame] = None,
    top_n: int = 3,
) -> Dict[str, Dict[str, object]]:
    ingredient_pools = ingredient_pools or build_ingredient_pools(load_ingredient_categories())
    nutrition_df = nutrition_df if nutrition_df is not None else load_nutrition_dataset()
    nutrition_lookup = _build_nutrition_lookup(nutrition_df)
    resolution_cache = {}
    filtered_pools = _filter_ingredient_pools(ingredient_pools, nutrition_lookup, resolution_cache=resolution_cache)

    daily_plan = {}
    for meal_type, target_macros in meal_targets.items():
        daily_plan[normalize_ingredient_name(meal_type)] = recommend_meal(
            meal_type=meal_type,
            target_macros=target_macros,
            ingredient_pools=filtered_pools,
            nutrition_df=nutrition_df,
            nutrition_lookup=nutrition_lookup,
            top_n=top_n,
        )

    return daily_plan
