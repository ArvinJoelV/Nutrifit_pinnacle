from .base import InferenceProvider
from detector import process_image_with_labels

class LocalInferenceProvider(InferenceProvider):
    name = "local"

    def detect_and_segment(self, image_path: str) -> dict:
        segments, segmented_path = process_image_with_labels(image_path)
        return {
            "segments": segments if segments is not None else [],
            "segmented_image": segmented_path
        }
