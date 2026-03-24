import cv2
import numpy as np
from ultralytics import YOLO, SAM
import os
import shutil

# Initialize Models
yolo_model_path = "models/food_detection_yolov8_model1.pt"
if not os.path.exists(yolo_model_path):
    yolo_model_path = "models/food_detection_yolov8_model.pt"
yolo_model = YOLO(yolo_model_path)
sam_model = SAM("sam2_b.pt")

CROP_DIR = "static/cropped_mask"
SAM_OUTPUT_DIR = "static/mask"

# Ensure clean directory before each run
os.makedirs(CROP_DIR, exist_ok=True)
if os.path.exists(SAM_OUTPUT_DIR):
    shutil.rmtree(SAM_OUTPUT_DIR)
os.makedirs(SAM_OUTPUT_DIR, exist_ok=True)

def _run_segmentation(image_path):
    orig_image = cv2.imread(image_path)
    results = yolo_model.predict(source=image_path, conf=0.2, save=False)

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
                device='cpu',
                save=True,
                project='static',
                name='mask',
                exist_ok=True
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

                        output_path = os.path.join(CROP_DIR, f"crop_{mask_count}.jpg")
                        cv2.imwrite(output_path, crop)
                        cropped_paths.append(output_path)
                        class_id = int(class_ids[i]) if i < len(class_ids) else None
                        label = names.get(class_id, "food") if class_id is not None else "food"
                        confidence = float(confidences[i]) if i < len(confidences) else 0.0
                        segments.append(
                            {
                                "path": output_path,
                                "label": str(label),
                                "confidence": confidence,
                            }
                        )
                        mask_count += 1

    segment_image_path = os.path.join(SAM_OUTPUT_DIR, "image0.jpg")
    if not os.path.exists(segment_image_path):
        segment_image_path = None

    normalized_segment_path = segment_image_path.replace("\\", "/") if segment_image_path else None
    return cropped_paths, segments, normalized_segment_path


def process_image(image_path):
    cropped_paths, _, normalized_segment_path = _run_segmentation(image_path)
    return cropped_paths, normalized_segment_path


def process_image_with_labels(image_path):
    _, segments, normalized_segment_path = _run_segmentation(image_path)
    return segments, normalized_segment_path
