"""
NutriFit Recipe Archetypes and Indian Meal Templates.

Provides authentic Indian culinary meal combinations with component slots,
glycemic indices, and realistic portion bounds for balanced nutrition planning.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class RecipeComponent:
    slot: str                      # e.g. 'staple', 'protein_dal', 'vegetable', 'accompaniment'
    ingredient_key: str            # resolved canonical food name in INDB or ingredient categories
    display_name: str              # friendly user-facing name
    category: str                  # category for portion/macro semantics
    min_portion: float = 0.5       # minimum realistic serving (e.g. 1 roti or 0.5 bowl)
    max_portion: float = 3.0       # maximum realistic serving
    step_size: float = 0.5         # rounding step
    gi: float = 50.0               # Glycemic Index (0-100)


@dataclass
class MealRecipe:
    id: str
    name: str
    meal_type: str                 # 'breakfast', 'lunch', 'dinner', 'snack'
    diet_type: str                 # 'veg', 'non_veg', 'vegan'
    description: str
    components: List[RecipeComponent] = field(default_factory=list)
    is_diabetic_friendly: bool = True
    tags: List[str] = field(default_factory=list)


# Curated Authentic Indian Recipe Catalog mapped to Anuvaad INDB & Indian ingredients
AUTHENTIC_INDIAN_RECIPES: List[MealRecipe] = [
    # ==========================
    # BREAKFAST
    # ==========================
    MealRecipe(
        id="bf_moong_chilla",
        name="Moong Dal Chilla with Mint Chutney & Curd",
        meal_type="breakfast",
        diet_type="veg",
        description="High-protein savory green gram crepes paired with fresh coriander chutney and probiotic curd.",
        components=[
            RecipeComponent(
                slot="staple_protein",
                ingredient_key="Moong dal stuffed cheela/chilla (Moong dal ka cheela/chilla)",
                display_name="Moong Dal Chilla",
                category="protein",
                min_portion=1.0,
                max_portion=3.0,
                step_size=0.5,
                gi=38.0,
            ),
            RecipeComponent(
                slot="accompaniment",
                ingredient_key="Coriander chutney (Hare dhaniye ki chutney)",
                display_name="Mint & Coriander Chutney",
                category="healthy_fat",
                min_portion=0.5,
                max_portion=1.5,
                step_size=0.5,
                gi=25.0,
            ),
            RecipeComponent(
                slot="dairy",
                ingredient_key="curd",
                display_name="Fresh Curd (Dahi)",
                category="dairy",
                min_portion=0.5,
                max_portion=1.5,
                step_size=0.5,
                gi=32.0,
            ),
        ],
        tags=["high_protein", "low_gi", "vegetarian"],
    ),
    MealRecipe(
        id="bf_sprout_poha",
        name="Sprouted Moong Poha with Peanuts & Boiled Egg",
        meal_type="breakfast",
        diet_type="non_veg",
        description="Fiber-rich flattened rice energized with sprouted legumes and farm-fresh boiled egg.",
        components=[
            RecipeComponent(
                slot="staple",
                ingredient_key="Sprouted moong poha",
                display_name="Sprouted Moong Poha",
                category="grain",
                min_portion=1.0,
                max_portion=2.5,
                step_size=0.5,
                gi=48.0,
            ),
            RecipeComponent(
                slot="protein",
                ingredient_key="Boiled egg (Ubla anda)",
                display_name="Boiled Egg",
                category="protein",
                min_portion=1.0,
                max_portion=2.0,
                step_size=1.0,
                gi=0.0,
            ),
        ],
        tags=["balanced", "fiber_rich"],
    ),
    MealRecipe(
        id="bf_idli_sambar",
        name="Steamed Idli with Vegetable Sambar & Coconut Chutney",
        meal_type="breakfast",
        diet_type="veg",
        description="Traditional South Indian steamed fermented rice-lentil cakes with aromatic vegetable lentil stew.",
        components=[
            RecipeComponent(
                slot="staple",
                ingredient_key="Idli",
                display_name="Steamed Idli",
                category="grain",
                min_portion=1.0,
                max_portion=3.0,
                step_size=0.5,
                gi=60.0,
            ),
            RecipeComponent(
                slot="protein_dal",
                ingredient_key="Sambar",
                display_name="Vegetable Sambar",
                category="protein",
                min_portion=1.0,
                max_portion=2.0,
                step_size=0.5,
                gi=42.0,
            ),
            RecipeComponent(
                slot="accompaniment",
                ingredient_key="Coconut chutney (Nariyal ki chutney)",
                display_name="Coconut Chutney",
                category="healthy_fat",
                min_portion=0.5,
                max_portion=1.0,
                step_size=0.5,
                gi=35.0,
            ),
        ],
        tags=["south_indian", "fermented", "vegetarian"],
    ),
    MealRecipe(
        id="bf_besan_chilla",
        name="Besan Veggie Cheela with Curd",
        meal_type="breakfast",
        diet_type="veg",
        description="Chickpea flour savory pancake rich in complex carbs and plant protein.",
        components=[
            RecipeComponent(
                slot="staple_protein",
                ingredient_key="Gram flour chilla/cheela (Besan chilla/cheela)",
                display_name="Besan Chilla",
                category="protein",
                min_portion=1.0,
                max_portion=3.0,
                step_size=0.5,
                gi=35.0,
            ),
            RecipeComponent(
                slot="dairy",
                ingredient_key="curd",
                display_name="Fresh Curd",
                category="dairy",
                min_portion=0.5,
                max_portion=1.5,
                step_size=0.5,
                gi=32.0,
            ),
            RecipeComponent(
                slot="vegetable",
                ingredient_key="Cucumber and yogurt salad (Kheere aur dahi ka salad)",
                display_name="Cucumber Salad",
                category="vegetable",
                min_portion=0.5,
                max_portion=1.0,
                step_size=0.5,
                gi=15.0,
            ),
        ],
        tags=["low_gi", "vegetarian"],
    ),
    MealRecipe(
        id="bf_upma_boiled_egg",
        name="Vegetable Sprouts Upma with Boiled Egg",
        meal_type="breakfast",
        diet_type="non_veg",
        description="Hearty savory semolina and sprouts porridge paired with protein-packed boiled eggs.",
        components=[
            RecipeComponent(
                slot="staple",
                ingredient_key="Sprouts upma",
                display_name="Sprouts Upma",
                category="grain",
                min_portion=1.0,
                max_portion=2.5,
                step_size=0.5,
                gi=52.0,
            ),
            RecipeComponent(
                slot="protein",
                ingredient_key="Boiled egg (Ubla anda)",
                display_name="Boiled Egg",
                category="protein",
                min_portion=1.0,
                max_portion=2.0,
                step_size=1.0,
                gi=0.0,
            ),
        ],
        tags=["balanced"],
    ),

    # ==========================
    # LUNCH
    # ==========================
    MealRecipe(
        id="lu_roti_dal_sabzi",
        name="Whole Wheat Roti with Moong Dal Tadka, Bhindi Sabzi & Raita",
        meal_type="lunch",
        diet_type="veg",
        description="Classic balanced North Indian thali with complex whole grain fiber, tempered yellow lentils, and okra.",
        components=[
            RecipeComponent(
                slot="staple",
                ingredient_key="Chapati/Roti",
                display_name="Whole Wheat Roti",
                category="carb",
                min_portion=1.0,
                max_portion=3.0,
                step_size=0.5,
                gi=52.0,
            ),
            RecipeComponent(
                slot="protein_dal",
                ingredient_key="Washed moong dal (Dhuli moong ki dal)",
                display_name="Yellow Moong Dal Tadka",
                category="protein",
                min_portion=1.0,
                max_portion=2.5,
                step_size=0.5,
                gi=38.0,
            ),
            RecipeComponent(
                slot="vegetable",
                ingredient_key="Okra/Lady's fingers fry (Bhindi sabzi/sabji/subji)",
                display_name="Bhindi Masala Sabzi",
                category="vegetable",
                min_portion=1.0,
                max_portion=2.0,
                step_size=0.5,
                gi=20.0,
            ),
            RecipeComponent(
                slot="accompaniment",
                ingredient_key="Bottle gourd raita (Ghiya/Lauki ka raita)",
                display_name="Lauki Raita",
                category="healthy_fat",
                min_portion=0.5,
                max_portion=1.5,
                step_size=0.5,
                gi=25.0,
            ),
        ],
        tags=["classic_thali", "low_gi", "vegetarian"],
    ),
    MealRecipe(
        id="lu_roti_chicken_sabzi",
        name="Whole Wheat Roti with Chicken Curry, Gajar Methi & Raita",
        meal_type="lunch",
        diet_type="non_veg",
        description="High-protein tender chicken curry accompanied by whole wheat rotis, fenugreek greens, and cool raita.",
        components=[
            RecipeComponent(
                slot="staple",
                ingredient_key="Chapati/Roti",
                display_name="Whole Wheat Roti",
                category="carb",
                min_portion=1.0,
                max_portion=3.0,
                step_size=0.5,
                gi=52.0,
            ),
            RecipeComponent(
                slot="protein",
                ingredient_key="Chicken curry",
                display_name="Homestyle Chicken Curry",
                category="protein",
                min_portion=1.0,
                max_portion=2.5,
                step_size=0.5,
                gi=10.0,
            ),
            RecipeComponent(
                slot="vegetable",
                ingredient_key="Carrot and fenugreek leaves (Gajar methi)",
                display_name="Gajar Methi Sabzi",
                category="vegetable",
                min_portion=1.0,
                max_portion=2.0,
                step_size=0.5,
                gi=22.0,
            ),
            RecipeComponent(
                slot="accompaniment",
                ingredient_key="Cucumber and yogurt salad (Kheere aur dahi ka salad)",
                display_name="Cucumber Raita",
                category="healthy_fat",
                min_portion=0.5,
                max_portion=1.5,
                step_size=0.5,
                gi=20.0,
            ),
        ],
        tags=["high_protein", "non_vegetarian"],
    ),
    MealRecipe(
        id="lu_rice_rajma_salad",
        name="Steamed Rice with Rajma Masala & Kachumber Salad",
        meal_type="lunch",
        diet_type="veg",
        description="Comforting kidney bean curry slow-simmered in aromatic spices, served with portion-controlled rice.",
        components=[
            RecipeComponent(
                slot="staple",
                ingredient_key="Boiled rice (Uble chawal)",
                display_name="Steamed Boiled Rice",
                category="carb",
                min_portion=0.5,
                max_portion=2.0,
                step_size=0.5,
                gi=65.0,
            ),
            RecipeComponent(
                slot="protein_dal",
                ingredient_key="Kidney bean curry (Rajmah curry)",
                display_name="Punjabi Rajma Curry",
                category="protein",
                min_portion=1.0,
                max_portion=2.5,
                step_size=0.5,
                gi=34.0,
            ),
            RecipeComponent(
                slot="vegetable",
                ingredient_key="Cucumber and yogurt salad (Kheere aur dahi ka salad)",
                display_name="Fresh Kachumber Salad",
                category="vegetable",
                min_portion=0.5,
                max_portion=1.5,
                step_size=0.5,
                gi=15.0,
            ),
        ],
        tags=["comfort_food", "vegetarian", "legume_rich"],
    ),
    MealRecipe(
        id="lu_rice_fish_curry",
        name="Steamed Rice with Bengal Fish Curry & Bhindi Fry",
        meal_type="lunch",
        diet_type="non_veg",
        description="Omega-3 rich freshwater fish in light mustard-turmeric gravy, paired with steamed rice and crisp bhindi.",
        components=[
            RecipeComponent(
                slot="staple",
                ingredient_key="Boiled rice (Uble chawal)",
                display_name="Steamed Rice",
                category="carb",
                min_portion=0.5,
                max_portion=2.0,
                step_size=0.5,
                gi=65.0,
            ),
            RecipeComponent(
                slot="protein",
                ingredient_key="Bengal fish curry (Bengali machli curry)",
                display_name="Bengal Fish Curry",
                category="protein",
                min_portion=1.0,
                max_portion=2.5,
                step_size=0.5,
                gi=15.0,
            ),
            RecipeComponent(
                slot="vegetable",
                ingredient_key="Okra/Lady's fingers fry (Bhindi sabzi/sabji/subji)",
                display_name="Bhindi Sabzi",
                category="vegetable",
                min_portion=1.0,
                max_portion=2.0,
                step_size=0.5,
                gi=20.0,
            ),
        ],
        tags=["omega_3", "non_vegetarian"],
    ),
    MealRecipe(
        id="lu_roti_palak_paneer",
        name="Whole Wheat Roti with Palak Paneer & Boondi Raita",
        meal_type="lunch",
        diet_type="veg",
        description="Calcium and iron-loaded tender cottage cheese cubes cooked in blended baby spinach puree.",
        components=[
            RecipeComponent(
                slot="staple",
                ingredient_key="Chapati/Roti",
                display_name="Whole Wheat Roti",
                category="carb",
                min_portion=1.0,
                max_portion=3.0,
                step_size=0.5,
                gi=52.0,
            ),
            RecipeComponent(
                slot="protein",
                ingredient_key="Spinach paneer (Palak paneer)",
                display_name="Palak Paneer",
                category="protein",
                min_portion=1.0,
                max_portion=2.5,
                step_size=0.5,
                gi=28.0,
            ),
            RecipeComponent(
                slot="accompaniment",
                ingredient_key="Bottle gourd raita (Ghiya/Lauki ka raita)",
                display_name="Lauki Raita",
                category="healthy_fat",
                min_portion=0.5,
                max_portion=1.5,
                step_size=0.5,
                gi=25.0,
            ),
        ],
        tags=["high_calcium", "vegetarian"],
    ),

    # ==========================
    # DINNER
    # ==========================
    MealRecipe(
        id="di_khichdi_kadhi",
        name="Light Moong Dal Khichdi with Dahi & Cucumber Salad",
        meal_type="dinner",
        diet_type="veg",
        description="Gentle, easily digestible one-pot grain-lentil khichdi for soothing evening glucose levels.",
        components=[
            RecipeComponent(
                slot="staple_protein",
                ingredient_key="Plain khitchdi (Plain khichri/khichdi)",
                display_name="Moong Dal Khichdi",
                category="carb",
                min_portion=1.0,
                max_portion=2.5,
                step_size=0.5,
                gi=48.0,
            ),
            RecipeComponent(
                slot="dairy",
                ingredient_key="curd",
                display_name="Fresh Probiotic Curd",
                category="dairy",
                min_portion=0.5,
                max_portion=1.5,
                step_size=0.5,
                gi=32.0,
            ),
            RecipeComponent(
                slot="vegetable",
                ingredient_key="Cucumber and yogurt salad (Kheere aur dahi ka salad)",
                display_name="Cucumber Salad",
                category="vegetable",
                min_portion=0.5,
                max_portion=1.5,
                step_size=0.5,
                gi=15.0,
            ),
        ],
        tags=["light_dinner", "easy_digest", "low_gi", "vegetarian"],
    ),
    MealRecipe(
        id="di_roti_chana_salad",
        name="Whole Wheat Roti with Safed Chana Masala & Lauki Raita",
        meal_type="dinner",
        diet_type="veg",
        description="Slow-digesting chickpea curry paired with warm whole grain rotis and cooling gourd raita.",
        components=[
            RecipeComponent(
                slot="staple",
                ingredient_key="Chapati/Roti",
                display_name="Whole Wheat Roti",
                category="carb",
                min_portion=1.0,
                max_portion=2.5,
                step_size=0.5,
                gi=52.0,
            ),
            RecipeComponent(
                slot="protein_dal",
                ingredient_key="Chickpeas curry (Safed channa curry)",
                display_name="Chickpea (Chana) Masala",
                category="protein",
                min_portion=1.0,
                max_portion=2.0,
                step_size=0.5,
                gi=35.0,
            ),
            RecipeComponent(
                slot="accompaniment",
                ingredient_key="Bottle gourd raita (Ghiya/Lauki ka raita)",
                display_name="Lauki Raita",
                category="healthy_fat",
                min_portion=0.5,
                max_portion=1.5,
                step_size=0.5,
                gi=25.0,
            ),
        ],
        tags=["high_fiber", "vegetarian"],
    ),
    MealRecipe(
        id="di_roti_chicken_salad",
        name="Whole Wheat Roti with Tandoori Chicken & Green Salad",
        meal_type="dinner",
        diet_type="non_veg",
        description="Lean spiced grilled chicken paired with fiber-rich roti and garden-fresh cucumber salad.",
        components=[
            RecipeComponent(
                slot="staple",
                ingredient_key="Chapati/Roti",
                display_name="Whole Wheat Roti",
                category="carb",
                min_portion=1.0,
                max_portion=2.5,
                step_size=0.5,
                gi=52.0,
            ),
            RecipeComponent(
                slot="protein",
                ingredient_key="Tandoori chicken",
                display_name="Tandoori Chicken",
                category="protein",
                min_portion=1.0,
                max_portion=2.0,
                step_size=0.5,
                gi=10.0,
            ),
            RecipeComponent(
                slot="vegetable",
                ingredient_key="Cucumber and yogurt salad (Kheere aur dahi ka salad)",
                display_name="Green Cucumber Salad",
                category="vegetable",
                min_portion=0.5,
                max_portion=1.5,
                step_size=0.5,
                gi=15.0,
            ),
        ],
        tags=["lean_protein", "non_vegetarian"],
    ),
    MealRecipe(
        id="di_roti_dal_palak",
        name="Whole Wheat Roti with Arhar Dal Palak & Bhindi Sabzi",
        meal_type="dinner",
        diet_type="veg",
        description="Iron-rich spinach pigeon pea dal combined with fresh whole wheat chapatis and stir-fried bhindi.",
        components=[
            RecipeComponent(
                slot="staple",
                ingredient_key="Chapati/Roti",
                display_name="Whole Wheat Roti",
                category="carb",
                min_portion=1.0,
                max_portion=2.5,
                step_size=0.5,
                gi=52.0,
            ),
            RecipeComponent(
                slot="protein_dal",
                ingredient_key="Arhar with spinach (Arhar dal aur palak)",
                display_name="Dal Palak",
                category="protein",
                min_portion=1.0,
                max_portion=2.0,
                step_size=0.5,
                gi=36.0,
            ),
            RecipeComponent(
                slot="vegetable",
                ingredient_key="Okra/Lady's fingers fry (Bhindi sabzi/sabji/subji)",
                display_name="Bhindi Sabzi",
                category="vegetable",
                min_portion=1.0,
                max_portion=1.5,
                step_size=0.5,
                gi=20.0,
            ),
        ],
        tags=["iron_rich", "vegetarian"],
    ),

    # ==========================
    # SNACK
    # ==========================
    MealRecipe(
        id="sn_moong_chaat",
        name="Sprouted Moong Dal Chaat with Lemon & Herbs",
        meal_type="snack",
        diet_type="veg",
        description="Crisp sprouted green gram seasoned with chaat masala, lemon juice, and fresh herbs.",
        components=[
            RecipeComponent(
                slot="protein_snack",
                ingredient_key="Sprouted moong dal chat",
                display_name="Sprouted Moong Chaat",
                category="protein",
                min_portion=0.5,
                max_portion=2.0,
                step_size=0.5,
                gi=28.0,
            ),
        ],
        tags=["low_gi", "high_fiber", "vegetarian"],
    ),
    MealRecipe(
        id="sn_boiled_egg_cucumber",
        name="Boiled Eggs with Cucumber Salad",
        meal_type="snack",
        diet_type="non_veg",
        description="Pure low-carb protein snack to curb hunger between meals without spiking blood glucose.",
        components=[
            RecipeComponent(
                slot="protein",
                ingredient_key="Boiled egg (Ubla anda)",
                display_name="Boiled Eggs",
                category="protein",
                min_portion=1.0,
                max_portion=2.0,
                step_size=1.0,
                gi=0.0,
            ),
            RecipeComponent(
                slot="vegetable",
                ingredient_key="cucumber",
                display_name="Sliced Cucumber with Chaat Masala",
                category="vegetable",
                min_portion=0.5,
                max_portion=1.5,
                step_size=0.5,
                gi=15.0,
            ),
        ],
        tags=["zero_carb_protein", "non_vegetarian"],
    ),
    MealRecipe(
        id="sn_curd_walnut",
        name="Fresh Curd with Walnuts & Chia",
        meal_type="snack",
        diet_type="veg",
        description="Omega-3 rich walnuts folded into smooth prebiotic curd for sustained satiety.",
        components=[
            RecipeComponent(
                slot="dairy",
                ingredient_key="curd",
                display_name="Fresh Curd (Dahi)",
                category="dairy",
                min_portion=0.5,
                max_portion=1.5,
                step_size=0.5,
                gi=32.0,
            ),
            RecipeComponent(
                slot="healthy_fat",
                ingredient_key="walnuts",
                display_name="Crushed Walnuts",
                category="healthy_fat",
                min_portion=0.5,
                max_portion=1.0,
                step_size=0.5,
                gi=15.0,
            ),
        ],
        tags=["omega_3", "probiotic", "vegetarian"],
    ),
]


def get_recipes_for_meal_type(meal_type: str, diet_type: Optional[str] = None) -> List[MealRecipe]:
    """Retrieve matching recipe archetypes filtered by meal window and optional diet preference."""
    normalized_type = str(meal_type).strip().lower()
    candidates = [r for r in AUTHENTIC_INDIAN_RECIPES if r.meal_type == normalized_type]

    if diet_type:
        normalized_diet = str(diet_type).strip().lower()
        if normalized_diet in ("veg", "vegetarian"):
            candidates = [r for r in candidates if r.diet_type in ("veg", "vegan")]
        elif normalized_diet in ("non_veg", "non-veg", "non_vegetarian"):
            pass

    return candidates
