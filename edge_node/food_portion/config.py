"""Configuration, constants, and empirical physical priors for the Food Portion Estimation System."""

from dataclasses import dataclass, field
from typing import Dict, Tuple

# ---------------------------------------------------------------------------
# Plate & Reference Scale Priors
# ---------------------------------------------------------------------------
DEFAULT_PLATE_DIAMETER_CM: float = 25.0
DEFAULT_BOWL_DIAMETER_CM: float = 14.0
DEFAULT_CUP_DIAMETER_CM: float = 7.5

# ---------------------------------------------------------------------------
# Food Shape Categories
# ---------------------------------------------------------------------------
# Categories define how 3D volume is modeled:
# - 'pile': heaped grains, noodles, salads (V = Area * mean_height * shape_factor)
# - 'flat': breads, pancakes, dosas, rotis (V = Area * thickness)
# - 'liquid': gravies, soups, dals in bowls (V = container cylinder / cone fill)
# - 'pieces': discrete chunks, chicken pieces, eggs, samosas (V = 3D ellipsoid / voxel integration)
FOOD_CATEGORIES: Dict[str, str] = {
    # Piles
    "plain rice": "pile",
    "biriyani": "pile",
    "poha": "pile",
    "french-fries": "pile",
    "bhaji": "pile",
    # Flat
    "dosa": "flat",
    "chapathi": "flat",
    "naan": "flat",
    "poori": "flat",
    "paratha": "flat",
    "aloo paratha": "flat",
    "pav": "flat",
    "pizza": "flat",
    "sandwich": "flat",
    "wheat bread": "flat",
    "white bread": "flat",
    # Liquids / Semi-liquids
    "dal": "liquid",
    "sambar": "liquid",
    "chutney": "liquid",
    "curd": "liquid",
    "tea": "liquid",
    "chole": "liquid",
    "rajma": "liquid",
    "sagu": "liquid",
    "chicken curry": "liquid",
    "paneer butter masala": "liquid",
    "7up": "liquid",
    "fanta": "liquid",
    "mirinda": "liquid",
    "pepsi": "liquid",
    "sprite": "liquid",
    # Pieces / Chunks
    "egg": "pieces",
    "idly": "pieces",
    "vada": "pieces",
    "apple": "pieces",
    "banana": "pieces",
    "mango": "pieces",
    "gulab jamun": "pieces",
    "jalebi": "pieces",
    "laddu": "pieces",
    "pani puri": "pieces",
    "hamburger": "pieces",
    "hot-dog": "pieces",
    "fried-chicken": "pieces",
    "tandoori-chicken": "pieces",
    "icecream": "pieces",
}

# ---------------------------------------------------------------------------
# Shape Factors for Piles (Footprint Area * Mean Height * Shape Factor)
# ---------------------------------------------------------------------------
# Dome / mound profiles typically range from 0.65 (sloped cone) to 0.85 (dense plateau)
SHAPE_FACTORS: Dict[str, float] = {
    "pile": 0.72,
    "plain rice": 0.75,
    "biriyani": 0.70,
    "poha": 0.68,
    "french-fries": 0.62,
    "bhaji": 0.78,
}

# ---------------------------------------------------------------------------
# Default Thickness for Flat Foods (in cm)
# ---------------------------------------------------------------------------
FLAT_FOOD_THICKNESS_CM: Dict[str, float] = {
    "dosa": 0.25,
    "chapathi": 0.25,
    "poori": 0.60,
    "naan": 0.65,
    "paratha": 0.45,
    "aloo paratha": 0.75,
    "pav": 3.80,
    "pizza": 1.20,
    "sandwich": 3.20,
    "wheat bread": 1.40,
    "white bread": 1.40,
}

# ---------------------------------------------------------------------------
# Empirical Preparation Densities (in g / cm^3)
# ---------------------------------------------------------------------------
# Calibrated for typical cooked Indian preparations
FOOD_DENSITIES: Dict[str, float] = {
    # Grains & Piles
    "plain rice": 0.76,
    "biriyani": 0.72,
    "poha": 0.58,
    "french-fries": 0.48,
    "bhaji": 0.92,
    # Breads & Flat
    "dosa": 0.50,
    "chapathi": 0.62,
    "naan": 0.58,
    "poori": 0.46,
    "paratha": 0.68,
    "aloo paratha": 0.75,
    "pav": 0.35,
    "pizza": 0.65,
    "sandwich": 0.45,
    "wheat bread": 0.32,
    "white bread": 0.30,
    # Liquids & Curries
    "dal": 1.04,
    "sambar": 1.03,
    "chutney": 1.08,
    "curd": 1.05,
    "tea": 1.00,
    "chole": 0.95,
    "rajma": 0.96,
    "sagu": 0.98,
    "chicken curry": 1.02,
    "paneer butter masala": 1.01,
    "7up": 1.02,
    "fanta": 1.03,
    "mirinda": 1.03,
    "pepsi": 1.03,
    "sprite": 1.02,
    # Pieces & Meats
    "egg": 1.03,
    "idly": 0.68,
    "vada": 0.55,
    "apple": 0.82,
    "banana": 0.94,
    "mango": 0.88,
    "gulab jamun": 1.12,
    "jalebi": 0.85,
    "laddu": 0.98,
    "pani puri": 0.40,
    "hamburger": 0.55,
    "hot-dog": 0.60,
    "fried-chicken": 0.92,
    "tandoori-chicken": 0.98,
    "icecream": 0.62,
    # Generic fallback
    "food": 0.80,
}

# ---------------------------------------------------------------------------
# Hidden Area Priors by Food Class (initial empirical ratios)
# ---------------------------------------------------------------------------
DEFAULT_HIDDEN_RATIO: Dict[str, float] = {
    "plain rice": 0.15,
    "biriyani": 0.18,
    "tandoori-chicken": 0.25,
    "fried-chicken": 0.28,
    "chicken curry": 0.22,
    "paneer butter masala": 0.20,
    "vegetables": 0.20,
    "salad": 0.25,
    "french-fries": 0.25,
    "dosa": 0.10,
    "chapathi": 0.12,
}
DEFAULT_GENERIC_HIDDEN_RATIO: float = 0.18

# ---------------------------------------------------------------------------
# Uncertainty Weights
# ---------------------------------------------------------------------------
UNCERTAINTY_WEIGHTS = {
    "detection": 0.20,
    "segmentation": 0.20,
    "depth": 0.30,
    "occlusion": 0.30,
}
