from typing import List
from .base import BaseAgent

class AgentRegistry:
    def __init__(self):
        self._agents = {}

    def register(self, agent: BaseAgent):
        self._agents[agent.name] = agent
        return agent

    def get(self, name: str) -> BaseAgent:
        if name not in self._agents:
            raise KeyError(f"Agent '{name}' not found in registry")
        return self._agents[name]

    def list_agents(self) -> List[str]:
        return list(self._agents.keys())

    def has(self, name: str) -> bool:
        return name in self._agents
