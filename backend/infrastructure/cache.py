import os
import json
import time
import logging
from typing import Any, Dict, Optional

logger = logging.getLogger("nutrifit.infrastructure.cache")

# Default common Indian meals to pre-warm the cache
COMMON_INDIAN_MEALS = {
    "chicken biryani": {
        "calories": 290, "protein": 9.5, "carbs": 36.0, "fat": 12.0, "fiber": 1.5,
        "serving": "1 plate (250g)", "glycemic_index": "medium", "category": "rice_dish"
    },
    "biryani": {
        "calories": 290, "protein": 9.0, "carbs": 36.0, "fat": 12.0, "fiber": 1.5,
        "serving": "1 plate (250g)", "glycemic_index": "medium", "category": "rice_dish"
    },
    "roti": {
        "calories": 104, "protein": 3.1, "carbs": 17.5, "fat": 2.4, "fiber": 2.8,
        "serving": "1 piece (40g)", "glycemic_index": "medium", "category": "bread"
    },
    "chapati": {
        "calories": 104, "protein": 3.1, "carbs": 17.5, "fat": 2.4, "fiber": 2.8,
        "serving": "1 piece (40g)", "glycemic_index": "medium", "category": "bread"
    },
    "idli": {
        "calories": 58, "protein": 2.1, "carbs": 12.2, "fat": 0.4, "fiber": 0.8,
        "serving": "1 piece (50g)", "glycemic_index": "medium", "category": "breakfast"
    },
    "dal": {
        "calories": 140, "protein": 8.0, "carbs": 18.0, "fat": 3.5, "fiber": 4.5,
        "serving": "1 bowl (150g)", "glycemic_index": "low", "category": "lentil"
    },
    "dal tadka": {
        "calories": 160, "protein": 7.5, "carbs": 17.0, "fat": 6.5, "fiber": 4.0,
        "serving": "1 bowl (150g)", "glycemic_index": "low", "category": "lentil"
    },
    "dosa": {
        "calories": 168, "protein": 3.9, "carbs": 28.4, "fat": 4.2, "fiber": 1.1,
        "serving": "1 medium (80g)", "glycemic_index": "medium", "category": "breakfast"
    },
    "paneer tikka": {
        "calories": 240, "protein": 14.0, "carbs": 5.0, "fat": 18.0, "fiber": 1.2,
        "serving": "1 portion (150g)", "glycemic_index": "low", "category": "appetizer"
    },
    "tandoori chicken": {
        "calories": 220, "protein": 28.0, "carbs": 3.0, "fat": 10.0, "fiber": 0.5,
        "serving": "1 piece (150g)", "glycemic_index": "low", "category": "poultry"
    },
    "tandoori-chicken": {
        "calories": 220, "protein": 28.0, "carbs": 3.0, "fat": 10.0, "fiber": 0.5,
        "serving": "1 piece (150g)", "glycemic_index": "low", "category": "poultry"
    },
    "chicken 65": {
        "calories": 300, "protein": 22.0, "carbs": 10.0, "fat": 20.0, "fiber": 0.8,
        "serving": "1 plate (150g)", "glycemic_index": "medium", "category": "poultry"
    },
    "chicken fry": {
        "calories": 260, "protein": 24.0, "carbs": 4.0, "fat": 16.0, "fiber": 0.5,
        "serving": "1 portion (140g)", "glycemic_index": "low", "category": "poultry"
    },
    "sambar": {
        "calories": 90, "protein": 4.2, "carbs": 13.0, "fat": 2.1, "fiber": 3.2,
        "serving": "1 cup (150ml)", "glycemic_index": "low", "category": "curry"
    },
    "raitha": {
        "calories": 70, "protein": 3.2, "carbs": 5.4, "fat": 3.8, "fiber": 0.4,
        "serving": "1 cup (100g)", "glycemic_index": "low", "category": "condiment"
    },
    "chutney": {
        "calories": 60, "protein": 1.1, "carbs": 6.0, "fat": 3.4, "fiber": 1.2,
        "serving": "2 tbsp (30g)", "glycemic_index": "low", "category": "condiment"
    },
    "bread halwa": {
        "calories": 280, "protein": 4.0, "carbs": 38.0, "fat": 12.0, "fiber": 1.0,
        "serving": "1 portion (100g)", "glycemic_index": "high", "category": "dessert"
    },
    "egg": {
        "calories": 78, "protein": 6.3, "carbs": 0.6, "fat": 5.3, "fiber": 0.0,
        "serving": "1 whole egg (50g)", "glycemic_index": "zero", "category": "protein"
    },
    "white rice": {
        "calories": 130, "protein": 2.7, "carbs": 28.2, "fat": 0.3, "fiber": 0.4,
        "serving": "1 cup cooked (100g)", "glycemic_index": "high", "category": "grain"
    },
    "brown rice": {
        "calories": 111, "protein": 2.6, "carbs": 23.0, "fat": 0.9, "fiber": 1.8,
        "serving": "1 cup cooked (100g)", "glycemic_index": "medium", "category": "grain"
    },
}


class RedisCacheManager:
    """Enterprise Redis caching service with transparent local In-Memory TTL fallback.
    
    Provides sub-millisecond food nutrition & dataset query caching for high-load workloads.
    """

    def __init__(self, redis_url: Optional[str] = None):
        self.redis_url = redis_url or os.getenv("REDIS_URL", "").strip()
        self.client = None
        self.is_connected = False
        self._memory_store: Dict[str, Dict[str, Any]] = {}
        self._hits = 0
        self._misses = 0

        if self.redis_url:
            self._initialize_connection()
        else:
            logger.info("REDIS_URL not configured. Operating with local high-speed In-Memory TTL Cache.")
        self.warm_cache(COMMON_INDIAN_MEALS)

    def _initialize_connection(self):
        try:
            import redis
            client = redis.from_url(
                self.redis_url,
                socket_timeout=1.0,
                socket_connect_timeout=1.0,
                decode_responses=True,
            )
            client.ping()
            self.client = client
            self.is_connected = True
            logger.info("Connected to Redis instance at %s", self.redis_url)
        except Exception as exc:
            self.client = None
            self.is_connected = False
            logger.info(
                "Redis server not reached (%s). Operating with local high-speed In-Memory TTL Cache.",
                exc
            )

    def _clean_memory_key(self, key: str):
        if key in self._memory_store:
            entry = self._memory_store[key]
            if entry.get("expires_at") and entry["expires_at"] < time.time():
                del self._memory_store[key]

    def get(self, key: str) -> Optional[Any]:
        t0 = time.perf_counter()
        if self.is_connected and self.client:
            try:
                raw = self.client.get(key)
                if raw is not None:
                    self._hits += 1
                    val = json.loads(raw)
                    return val
                self._misses += 1
                return None
            except Exception as exc:
                logger.debug("Redis get error for %s: %s. Falling back to memory.", key, exc)

        # In-memory fallback
        self._clean_memory_key(key)
        entry = self._memory_store.get(key)
        if entry:
            self._hits += 1
            return entry.get("value")

        self._misses += 1
        return None

    def set(self, key: str, value: Any, ttl: int = 86400) -> bool:
        serialized = json.dumps(value)
        if self.is_connected and self.client:
            try:
                self.client.setex(key, ttl, serialized)
                return True
            except Exception as exc:
                logger.debug("Redis set error for %s: %s. Falling back to memory.", key, exc)

        # In-memory fallback
        self._memory_store[key] = {
            "value": value,
            "expires_at": time.time() + ttl if ttl > 0 else None,
            "created_at": time.time(),
        }
        return True

    def delete(self, key: str) -> bool:
        if self.is_connected and self.client:
            try:
                self.client.delete(key)
            except Exception:
                pass
        self._memory_store.pop(key, None)
        return True

    # High-level Food Nutrition Specific Methods
    def get_food_nutrition(self, food_name: str) -> Optional[Dict[str, Any]]:
        """Look up nutrition macros for a food item with sub-2ms response time."""
        normalized = (food_name or "").strip().lower().replace("-", " ")
        key = f"food:nutrition:{normalized}"
        return self.get(key)

    def set_food_nutrition(self, food_name: str, nutrition: Dict[str, Any], ttl: int = 86400 * 7) -> bool:
        """Store food item macros in Redis String key."""
        normalized = (food_name or "").strip().lower().replace("-", " ")
        key = f"food:nutrition:{normalized}"
        return self.set(key, nutrition, ttl=ttl)

    def warm_cache(self, items: Dict[str, Dict[str, Any]]):
        """Warm the cache with common Indian recipes and foods."""
        count = 0
        for name, data in items.items():
            self.set_food_nutrition(name, data)
            count += 1
        logger.debug("Warmed nutrition cache with %d items.", count)

    def get_stats(self) -> Dict[str, Any]:
        """Telemetry stats for Redis cache hits, misses, and active provider."""
        total_queries = self._hits + self._misses
        hit_ratio = round((self._hits / total_queries * 100), 1) if total_queries > 0 else 0.0
        return {
            "provider": "Redis Engine" if self.is_connected else "In-Memory MicroCache (Fallback)",
            "connected": self.is_connected,
            "redis_url": self.redis_url if self.is_connected else None,
            "hits": self._hits,
            "misses": self._misses,
            "total_queries": total_queries,
            "hit_ratio_percent": hit_ratio,
            "cached_keys_count": len(self._memory_store) if not self.is_connected else "managed_by_redis",
        }


# Singleton instance
cache = RedisCacheManager()
