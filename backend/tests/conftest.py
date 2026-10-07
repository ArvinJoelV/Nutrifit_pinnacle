"""Pytest configuration and environment bootstrap for NutriFit backend test suite."""

import os
import sys

# Ensure backend root directory is added to sys.path across all platforms
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
