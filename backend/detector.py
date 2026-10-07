import cv2
import numpy as np
from ultralytics import YOLO, SAM
import os
import shutil

# Initialize Models
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def _is_lfs_pointer(path):
    if not path or not os.path.exists(path):
        return True
    try:
        with open(path, "rb") as f:
            header = f.read(20)
            return header.startswith(b"version https://")
    except Exception:
        return True

_yolo_instance = None
_sam_instance = None

def get_yolo_model():
    global _yolo_instance
    if _yolo_instance is not None:
        return _yolo_instance
    yolo_model_path = os.path.join(BASE_DIR, "models", "food_detection_yolov8_model1.pt")
    if not os.path.exists(yolo_model_path) or _is_lfs_pointer(yolo_model_path):
        yolo_model_path = os.path.join(BASE_DIR, "models", "food_detection_yolov8_model.pt")
    
    if _is_lfs_pointer(yolo_model_path):
        yolo_model_path = "yolov8n.pt"

    try:
        _yolo_instance = YOLO(yolo_model_path)
    except Exception:
        _yolo_instance = YOLO("yolov8n.pt")
    return _yolo_instance

def get_sam_model():
    global _sam_instance
    if _sam_instance is not None:
        return _sam_instance
    sam_model_path = os.path.join(BASE_DIR, "sam2_b.pt") if os.path.exists(os.path.join(BASE_DIR, "sam2_b.pt")) else "sam2_b.pt"
    if _is_lfs_pointer(sam_model_path):
        sam_model_path = "sam2.1_t.pt"
    try:
        _sam_instance = SAM(sam_model_path)
    except Exception:
        try:
            _sam_instance = SAM("sam2.1_t.pt")
        except Exception:
            _sam_instance = None
    return _sam_instance

class _LazyModelProxy:
    def __init__(self, loader):
        self._loader = loader

    def __call__(self, *args, **kwargs):
        model = self._loader()
        return model(*args, **kwargs) if model else []

    def predict(self, *args, **kwargs):
        model = self._loader()
        return model.predict(*args, **kwargs) if model else []

    def __getattr__(self, name):
        return getattr(self._loader(), name)

yolo_model = _LazyModelProxy(get_yolo_model)
sam_model = _LazyModelProxy(get_sam_model)

CROP_DIR = "static/cropped_mask"
SAM_OUTPUT_DIR = "static/mask"

def _clear_directory_contents(path):
    if not os.path.isdir(path):
        return

    for name in os.listdir(path):
        item_path = os.path.join(path, name)
        try:
            if os.path.isdir(item_path):
                shutil.rmtree(item_path)
            else:
                os.remove(item_path)
        except PermissionError:
            # Windows can briefly lock generated files/folders. The next run can
            # still proceed because Ultralytics writes with exist_ok=True.
            pass


# Ensure output directories exist without deleting the folder itself on startup.
os.makedirs(CROP_DIR, exist_ok=True)
os.makedirs(SAM_OUTPUT_DIR, exist_ok=True)
_clear_directory_contents(SAM_OUTPUT_DIR)

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
