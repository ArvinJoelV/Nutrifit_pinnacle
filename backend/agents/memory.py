from typing import Any, Dict

class SharedMemory:
    def __init__(self):
        self._store: Dict[str, Any] = {}

    def set(self, key: str, value: Any):
        self._store[key] = value

    def get(self, key: str, default: Any = None) -> Any:
        return self._store.get(key, default)

    def has(self, key: str) -> bool:
        return key in self._store

    def all(self) -> Dict[str, Any]:
        return self._store.copy()

    def clear(self):
        self._store.clear()
