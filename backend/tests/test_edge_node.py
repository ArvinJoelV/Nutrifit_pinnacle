"""Tests for RS PRO C100 Edge Node Integration & Fallback Mechanism."""

import os
import sys
import unittest

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from inference.edge_provider import EdgeNodeInferenceProvider
from inference.local_provider import LocalInferenceProvider


class TestEdgeNodeProvider(unittest.TestCase):

    def test_edge_provider_initialization(self):
        """Verify EdgeNodeInferenceProvider initializes with default & custom settings."""
        provider = EdgeNodeInferenceProvider(
            base_url="http://192.168.1.150:8000",
            timeout=10.0,
            fallback_enabled=True,
        )
        self.assertEqual(provider.name, "edge_node")
        self.assertEqual(provider.base_url, "http://192.168.1.150:8000")
        self.assertEqual(provider.timeout, 10.0)
        self.assertTrue(provider.fallback_enabled)
        self.assertIsInstance(provider.local_fallback, LocalInferenceProvider)

    def test_edge_provider_offline_detection(self):
        """Verify is_available() returns False when edge node is not running on a dummy port."""
        dummy_provider = EdgeNodeInferenceProvider(
            base_url="http://127.0.0.1:59999",  # non-existent port
            timeout=1.0,
        )
        self.assertFalse(dummy_provider.is_available(force_check=True))
        self.assertEqual(dummy_provider.get_telemetry(), {})


if __name__ == "__main__":
    unittest.main()
