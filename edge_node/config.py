"""RS PRO C100 (NVIDIA Jetson Nano) Edge Node Configuration.

Defines runtime parameters, memory limits, and model paths tailored
for the 4GB unified memory envelope of the Jetson Nano.
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

# Server Network Settings
HOST = os.getenv("EDGE_HOST", "0.0.0.0")
PORT = int(os.getenv("EDGE_PORT", "8000"))

# Hardware & Acceleration
DEVICE = os.getenv("EDGE_DEVICE", "cuda:0")  # cuda:0 for Jetson GPU, cpu fallback
FP16_ENABLED = os.getenv("EDGE_FP16", "true").lower() in ("true", "1", "yes")

# Memory Safety for 4GB Unified RAM (OS + System + GPU)
MAX_IMAGE_DIM = int(os.getenv("EDGE_MAX_IMAGE_DIM", "1280"))
BATCH_SIZE = 1  # Always 1 on edge embedded devices to prevent OOM
ENABLE_GARBAGE_COLLECTION = True

# Model Paths (Supports PyTorch .pt, ONNX, and TensorRT .engine)
MODELS_DIR = BASE_DIR / "models"
BACKEND_MODELS = BASE_DIR.parent / "backend" / "models"


def _resolve_yolo_path():
    env_path = os.getenv("EDGE_YOLO_PATH")
    if env_path and os.path.exists(env_path):
        return env_path
    candidates = [
        MODELS_DIR / "food_detection_yolov8.engine",
        MODELS_DIR / "food_detection_yolov8.pt",
        BACKEND_MODELS / "food_detection_yolov8_model1.pt",
        BACKEND_MODELS / "food_detection_yolov8_model.pt",
    ]
    for c in candidates:
        if c.exists():
            return str(c)
    return str(MODELS_DIR / "food_detection_yolov8.pt")


YOLO_MODEL_PATH = _resolve_yolo_path()
SAM_MODEL_TYPE = os.getenv("EDGE_SAM_TYPE", "mobilesam")  # "mobilesam" | "fastsam" | "sam2"
SAM_MODEL_PATH = os.getenv("EDGE_SAM_PATH", str(MODELS_DIR / "mobile_sam.pt"))
DEPTH_MODEL_PATH = os.getenv("EDGE_DEPTH_PATH", str(MODELS_DIR / "midas_v21_small.onnx"))

# Fallback & Verbosity
DEBUG = os.getenv("EDGE_DEBUG", "false").lower() in ("true", "1", "yes")
LOG_LEVEL = os.getenv("EDGE_LOG_LEVEL", "INFO")
