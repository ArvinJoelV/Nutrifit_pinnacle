"""Hardware monitoring utilities for RS PRO C100 (NVIDIA Jetson Nano).

Reads GPU load, unified memory usage, and thermal zones.
Falls back gracefully when running in emulation or development environments.
"""

import os
import platform
import shutil
import time

_START_TIME = time.time()


def get_hardware_stats() -> dict:
    """Return runtime hardware telemetry."""
    stats = {
        "device": "RS PRO C100 (NVIDIA Jetson Nano)",
        "platform": platform.platform(),
        "uptime_seconds": round(time.time() - _START_TIME, 1),
        "gpu_available": False,
        "gpu_name": "NVIDIA Maxwell (128 CUDA cores)",
        "memory_ram_mb": {},
        "temperature_c": None,
    }

    # Check CUDA availability
    try:
        import torch
        if torch.cuda.is_available():
            stats["gpu_available"] = True
            stats["gpu_name"] = torch.cuda.get_device_name(0)
            stats["vram_allocated_mb"] = round(torch.cuda.memory_allocated(0) / (1024 * 1024), 1)
            stats["vram_reserved_mb"] = round(torch.cuda.memory_reserved(0) / (1024 * 1024), 1)
    except Exception:
        pass

    # System Memory
    try:
        import psutil
        vm = psutil.virtual_memory()
        stats["memory_ram_mb"] = {
            "total": round(vm.total / (1024 * 1024), 1),
            "used": round(vm.used / (1024 * 1024), 1),
            "free": round(vm.available / (1024 * 1024), 1),
            "percent": vm.percent,
        }
    except Exception:
        pass

    # Jetson Thermal Zone
    thermal_path = "/sys/devices/virtual/thermal/thermal_zone0/temp"
    if os.path.exists(thermal_path):
        try:
            with open(thermal_path, "r") as f:
                temp_raw = int(f.read().strip())
                stats["temperature_c"] = round(temp_raw / 1000.0, 1)
        except Exception:
            pass

    return stats
