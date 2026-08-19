class InferenceProvider:
    name: str = "base"

    def detect_and_segment(self, image_path: str) -> dict:
        """Run detection + segmentation. Returns dict with 'segments' list and 'segmented_image' path."""
        raise NotImplementedError
