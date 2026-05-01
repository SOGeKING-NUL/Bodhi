import numpy as np
import cv2
from loguru import logger
from dataclasses import dataclass
from typing import Optional, Tuple
from transformers import pipeline

@dataclass
class EmotionAnalysisResult:
    emotion: str = "unknown"
    confidence: float = 0.0

class EmotionAnalyzer:
    """
    Analyzes facial expressions using a lightweight Vision Transformer from Hugging Face.
    We use 'trpakov/vit-face-expression' which is optimized for emotions.
    """

    def __init__(self):
        logger.info("Initializing EmotionAnalyzer (Hugging Face ViT)...")
        try:
            # Load the pipeline for image classification
            # This will download the model (~340MB) on first run and cache it.
            self.classifier = pipeline("image-classification", model="trpakov/vit-face-expression", device=-1)
            logger.info("EmotionAnalyzer ready.")
        except Exception as e:
            logger.error(f"Failed to load EmotionAnalyzer: {e}")
            self.classifier = None

    def analyze(self, frame: np.ndarray, face_bbox: Optional[Tuple[float, float, float, float]]) -> EmotionAnalysisResult:
        """
        Analyzes the emotion of the primary face in the frame.
        face_bbox is expected to be normalized (x_norm, y_norm, w_norm, h_norm).
        """
        if self.classifier is None or face_bbox is None:
            return EmotionAnalysisResult()

        try:
            frame_h, frame_w = frame.shape[:2]
            x_norm, y_norm, w_norm, h_norm = face_bbox

            # Convert normalized coords to pixel coords
            x = int(x_norm * frame_w)
            y = int(y_norm * frame_h)
            w = int(w_norm * frame_w)
            h = int(h_norm * frame_h)

            # Ensure bounding box is within frame limits
            x1 = max(0, x)
            y1 = max(0, y)
            x2 = min(frame_w, x + w)
            y2 = min(frame_h, y + h)

            if x2 <= x1 or y2 <= y1:
                return EmotionAnalysisResult()

            # Crop the face
            face_crop = frame[y1:y2, x1:x2]
            
            # Convert BGR (OpenCV) to RGB (Hugging Face expects RGB PIL images or numpy arrays)
            face_rgb = cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB)

            # Predict emotion
            # The pipeline expects an image. It handles numpy arrays gracefully.
            import PIL.Image
            pil_img = PIL.Image.fromarray(face_rgb)
            results = self.classifier(pil_img)

            if results:
                # results is a list of dicts: [{'label': 'happy', 'score': 0.99}, ...]
                top_result = results[0]
                return EmotionAnalysisResult(
                    emotion=top_result['label'].lower(),
                    confidence=round(top_result['score'], 3)
                )

        except Exception as e:
            logger.error(f"EmotionAnalyzer error: {e}")
            
        return EmotionAnalysisResult()
