"""RS PRO C100 Edge Node API Server.

Lightweight, high-performance FastAPI service running on the NVIDIA Jetson Nano.
Exposes endpoints for hardware telemetry, 3D portion estimation, and detection.
"""

import io
import time
import logging
import cv2
import numpy as np
import json
from typing import Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, Query, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

try:
    import config
    from hardware_monitor import get_hardware_stats
    from pipeline_runner import EdgePipelineRunner
except ImportError:
    from . import config
    from .hardware_monitor import get_hardware_stats
    from .pipeline_runner import EdgePipelineRunner

logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("edge_node")

app = FastAPI(
    title="NutriFit RS PRO C100 Edge Node",
    description="Edge AI food detection and 3D volumetric estimation service for NVIDIA Jetson Nano.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

runner = EdgePipelineRunner(yolo_model_path=config.YOLO_MODEL_PATH)


@app.on_event("startup")
async def on_startup():
    logger.info("Starting RS PRO C100 Edge Node service on port %d...", config.PORT)
    logger.info("Hardware platform: %s", config.DEVICE)


@app.get("/health")
async def health_check():
    """Health check endpoint returning hardware telemetry."""
    stats = get_hardware_stats()
    stats["status"] = "healthy"
    stats["service"] = "nutrifit-edge-c100"
    stats["models_loaded"] = runner._initialized
    return stats


@app.get("/v1/info")
async def node_info():
    """Returns edge node capability metadata."""
    return {
        "node_name": "RS PRO C100 (NVIDIA Jetson Nano)",
        "capabilities": [
            "yolov8_detection",
            "mobilesam_segmentation",
            "monocular_depth_estimation",
            "volumetric_integration",
            "scale_calibration",
        ],
        "device": config.DEVICE,
        "fp16_supported": config.FP16_ENABLED,
        "max_image_dim": config.MAX_IMAGE_DIM,
    }


@app.post("/v1/portion/process")
async def process_portion(
    file: UploadFile = File(...),
    detections: Optional[str] = Form(None),
):
    """Process an uploaded meal photo through the full 3D food portion pipeline."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image format (JPEG, PNG, WebP)")

    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise HTTPException(status_code=400, detail="Failed to decode image")

        h, w = image.shape[:2]
        # Memory safety: downscale oversized images to max dimension
        if max(h, w) > config.MAX_IMAGE_DIM:
            scale = config.MAX_IMAGE_DIM / max(h, w)
            new_w, new_h = int(w * scale), int(h * scale)
            image = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)

        # Parse upstream detections if provided
        initial_dets = None
        if detections:
            try:
                initial_dets = json.loads(detections)
            except Exception as e:
                logger.warning("Could not parse detections form parameter: %s", e)

        # Run pipeline
        result = runner.process_image(image, initial_detections=initial_dets)
        return JSONResponse(content=result)

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Pipeline processing failed on edge node: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Edge pipeline execution error: {str(exc)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=config.HOST, port=config.PORT, log_level="info")
