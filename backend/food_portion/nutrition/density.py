"""Empirical food densities for mass conversion."""

from typing import Optional
from ..config import FOOD_DENSITIES


def get_food_density(food_class: str, default_density: float = 0.80) -> float:
    """Returns empirical density (g/cm^3) for a given food preparation."""
    cleaned = (food_class or "").strip().lower().replace("_", " ").replace("-", " ")

    # Direct match
    if cleaned in FOOD_DENSITIES:
        return FOOD_DENSITIES[cleaned]

    # Partial / sub-string match
    for key, density in FOOD_DENSITIES.items():
        if key in cleaned or cleaned in key:
            return density

    return default_density
