"""
NVIDIA Jetson C100 Edge AI Inference Server
-------------------------------------------
Lightweight FastAPI edge service meant to run on the NVIDIA Jetson C100 device.
Exposes TensorRT/CUDA-accelerated YOLOv8 detection and SAM2 segmentation endpoints.

Usage on Jetson C100:
    python jetson_server.py --port 9000
"""

import argparse
import base64
import os
import shutil
import time
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

try:
    import cv2
    import numpy as np
    import torch
    from ultralytics import SAM, YOLO
    HAS_VISION_DEPS = True
except ImportError:
    HAS_VISION_DEPS = False

app = FastAPI(title="NutriFit Jetson C100 Edge Inference Server", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model references
yolo_model = None
sam_model = None
DEVICE = "cuda" if HAS_VISION_DEPS and torch.cuda.is_available() else "cpu"

CROP_DIR = "static/cropped_mask"
SAM_OUTPUT_DIR = "static/mask"


def load_models():
    global yolo_model, sam_model
    if not HAS_VISION_DEPS:
        print("[Jetson Server] Warning: Vision dependencies (torch, ultralytics, cv2) not fully available.")
        return

    yolo_path = "models/food_detection_yolov8_model1.pt"
    if not os.path.exists(yolo_path):
        yolo_path = "models/food_detection_yolov8_model.pt"

    print(f"[Jetson Server] Loading YOLO model from {yolo_path} on device={DEVICE}...")
    yolo_model = YOLO(yolo_path)

    sam_path = "sam2_b.pt"
    print(f"[Jetson Server] Loading SAM model from {sam_path} on device={DEVICE}...")
    sam_model = SAM(sam_path)
    print("[Jetson Server] All models loaded successfully on Jetson C100!")


@app.on_event("startup")
def startup_event():
    os.makedirs(CROP_DIR, exist_ok=True)
    os.makedirs(SAM_OUTPUT_DIR, exist_ok=True)
    load_models()


@app.get("/health")
def health():
    gpu_name = torch.cuda.get_device_name(0) if DEVICE == "cuda" else "CPU Mode"
    return {
        "status": "online",
        "device": DEVICE,
        "gpu": gpu_name,
        "hasVisionDeps": HAS_VISION_DEPS,
        "yoloLoaded": yolo_model is not None,
        "samLoaded": sam_model is not None,
    }


@app.post("/detect-segment")
async def detect_segment(file: UploadFile = File(...)):
    if not HAS_VISION_DEPS or yolo_model is None or sam_model is None:
        raise HTTPException(status_code=503, detail="Jetson vision models not initialized")

    start_time = time.time()
    
    # Save uploaded image to temp directory
    temp_dir = "static/jetson_temp"
    os.makedirs(temp_dir, exist_ok=True)
    temp_path = os.path.join(temp_dir, file.filename or "input.jpg")

    with open(temp_path, "wb") as f:
        content = await file.read()
        f.write(content)

    t_preprocess = time.time() - start_time

    # Run YOLO detection
    t0_infer = time.time()
    orig_image = cv2.imread(temp_path)
    results = yolo_model.predict(source=temp_path, conf=0.2, save=False, device=DEVICE)
    
    cropped_paths = []
    segments = []
    mask_count = 0

    for result in results:
        boxes = result.boxes.xyxy
        class_ids = result.boxes.cls.tolist() if result.boxes is not None and result.boxes.cls is not None else []
        confidences = result.boxes.conf.tolist() if result.boxes is not None and result.boxes.conf is not None else []
        names = result.names or {}

        if len(boxes):
            sam_results = sam_model(
                result.orig_img,
                bboxes=boxes,
                verbose=False,
                device=DEVICE,
                save=True,
                project="static",
                name="mask",
                exist_ok=True,
            )

            for sam_result in sam_results:
                masks = sam_result.masks.data.cpu().numpy()
                for i, mask in enumerate(masks):
                    mask_resized = cv2.resize(mask.astype(np.uint8), (orig_image.shape[1], orig_image.shape[0]))
                    masked_img = cv2.bitwise_and(orig_image, orig_image, mask=mask_resized)
                    ys, xs = np.where(mask_resized == 1)
                    if len(xs) > 0 and len(ys) > 0:
                        x_min, x_max = xs.min(), xs.max()
                        y_min, y_max = ys.min(), ys.max()
                        crop = masked_img[y_min:y_max, x_min:x_max]
                        if crop.size == 0:
                            continue

                        output_path = os.path.join(CROP_DIR, f"jetson_crop_{mask_count}.jpg")
                        cv2.imwrite(output_path, crop)
                        cropped_paths.append(output_path)
                        class_id = int(class_ids[i]) if i < len(class_ids) else None
                        label = names.get(class_id, "food") if class_id is not None else "food"
                        confidence = float(confidences[i]) if i < len(confidences) else 0.0

                        # Base64 encode crop for remote clients
                        _, buffer = cv2.imencode(".jpg", crop)
                        b64_crop = base64.b64encode(buffer).decode("utf-8")

                        segments.append(
                            {
                                "path": output_path,
                                "label": str(label),
                                "confidence": round(confidence, 3),
                                "crop_b64": b64_crop,
                            }
                        )
                        mask_count += 1

    t_inference = time.time() - t0_infer
    t_total = time.time() - start_time

    segment_image_path = os.path.join(SAM_OUTPUT_DIR, "image0.jpg")
    if not os.path.exists(segment_image_path):
        segment_image_path = None

    return {
        "ok": True,
        "segments": segments,
        "segmented_image": segment_image_path.replace("\\", "/") if segment_image_path else None,
        "telemetry": {
            "device": DEVICE,
            "preprocess_ms": int(t_preprocess * 1000),
            "inference_ms": int(t_inference * 1000),
            "total_ms": int(t_total * 1000),
            "fps": round(1.0 / t_total, 2) if t_total > 0 else 0,
        },
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="NutriFit Jetson C100 Edge Server")
    parser.add_argument("--host", default="0.0.0.0", help="Host address")
    parser.add_argument("--port", type=int, default=9000, help="Port number")
    args = parser.parse_args()

    uvicorn.run("jetson_server:app", host=args.host, port=args.port, reload=False)
