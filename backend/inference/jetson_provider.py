"""Jetson C100 Inference Provider (compatibility wrapper for EdgeNodeInferenceProvider)."""

from .edge_provider import EdgeNodeInferenceProvider

# JetsonInferenceProvider is an alias for EdgeNodeInferenceProvider
class JetsonInferenceProvider(EdgeNodeInferenceProvider):
    name = "jetson"


__all__ = ["JetsonInferenceProvider", "EdgeNodeInferenceProvider"]
