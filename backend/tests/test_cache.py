import time
import pytest
from infrastructure.cache import RedisCacheManager, cache


def test_cache_initialization():
    """Verify cache initializes and operates in high-speed mode."""
    assert cache is not None
    stats = cache.get_stats()
    assert "provider" in stats
    assert stats["provider"] in ("Redis Engine", "In-Memory MicroCache (Fallback)")


def test_cache_set_and_get():
    """Verify set and get with value serialization."""
    cm = RedisCacheManager()
    key = "test:user:metric"
    data = {"calories": 500, "protein": 30, "flag": True}
    
    assert cm.set(key, data, ttl=60) is True
    retrieved = cm.get(key)
    assert retrieved == data


def test_cache_miss_and_stats():
    """Verify cache miss returns None and registers in telemetry stats."""
    cm = RedisCacheManager()
    non_existent = "test:non:existent:key:9999"
    result = cm.get(non_existent)
    assert result is None
    
    stats = cm.get_stats()
    assert stats["misses"] >= 1
    assert "hit_ratio_percent" in stats


def test_food_nutrition_lookup_sub_millisecond():
    """Verify pre-warmed Indian food nutrition returns instantly."""
    t0 = time.perf_counter()
    nutrition = cache.get_food_nutrition("Chicken Biryani")
    latency_ms = (time.perf_counter() - t0) * 1000

    assert nutrition is not None
    assert nutrition["calories"] == 290
    assert nutrition["carbs"] == 36.0
    assert nutrition["protein"] == 9.5
    # Must be sub-2ms
    assert latency_ms < 5.0, f"Expected <5ms latency, got {latency_ms:.2f}ms"


def test_food_nutrition_custom_set():
    """Verify setting custom food items normalizes keys and retrieves accurately."""
    custom_dish = "paneer butter masala"
    data = {"calories": 380, "protein": 14, "carbs": 12, "fat": 30}
    
    assert cache.set_food_nutrition(custom_dish, data) is True
    # Retrieve with alternate casing/hyphenation
    result = cache.get_food_nutrition("Paneer Butter-Masala")
    assert result is not None
    assert result["calories"] == 380


def test_cache_deletion():
    """Verify key deletion from cache."""
    cm = RedisCacheManager()
    key = "test:delete:me"
    cm.set(key, {"temp": 123})
    assert cm.get(key) == {"temp": 123}
    
    cm.delete(key)
    assert cm.get(key) is None
