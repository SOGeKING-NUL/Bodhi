import mediapipe as mp
import numpy as np
import cv2
from loguru import logger
from dataclasses import dataclass
from typing import Optional, Tuple
import urllib.request
import os

_MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
_MODEL_PATH = os.path.join(os.path.dirname(__file__), "face_landmarker.task")


@dataclass
class GazeAnalysisResult:
    is_looking_at_screen: bool
    gaze_direction: str
    horizontal_deviation: float
    vertical_deviation: float
    head_pose: Optional[Tuple[float, float, float]] = None  # (pitch, yaw, roll) in degrees
    attention_score: float = 1.0


class GazeAnalyzer:
    """
    Analyzes gaze direction and head pose using MediaPipe FaceLandmarker (Tasks API).

    Uses 3D facial landmarks to estimate head pose (pitch, yaw, roll)
    as a proxy for gaze direction.
    """

    YAW_THRESHOLD = 30.0
    PITCH_THRESHOLD = 25.0

    # Face Mesh landmark indices used for PnP head pose estimation
    NOSE_TIP = 4
    CHIN = 152
    LEFT_EYE_OUTER = 263
    RIGHT_EYE_OUTER = 33
    LEFT_MOUTH = 287
    RIGHT_MOUTH = 57

    # Eye/Iris landmark indices for true gaze tracking
    RIGHT_EYE_INNER = 133
    RIGHT_IRIS_CENTER = 468
    LEFT_EYE_INNER = 362
    LEFT_IRIS_CENTER = 473

    FACE_3D_MODEL = np.array([
        [0.0, 0.0, 0.0],
        [0.0, -330.0, -65.0],
        [-225.0, 170.0, -135.0],
        [225.0, 170.0, -135.0],
        [-150.0, -150.0, -125.0],
        [150.0, -150.0, -125.0],
    ], dtype=np.float64)

    def __init__(self):
        logger.info("Initializing GazeAnalyzer (MediaPipe Tasks)...")
        self._ensure_model()

        BaseOptions = mp.tasks.BaseOptions
        FaceLandmarker = mp.tasks.vision.FaceLandmarker
        FaceLandmarkerOptions = mp.tasks.vision.FaceLandmarkerOptions
        VisionRunningMode = mp.tasks.vision.RunningMode

        options = FaceLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=_MODEL_PATH),
            running_mode=VisionRunningMode.IMAGE,
            num_faces=1,
            min_face_detection_confidence=0.6,
            min_tracking_confidence=0.6,
        )
        self._face_landmarker = FaceLandmarker.create_from_options(options)
        logger.info("GazeAnalyzer ready.")

    def _ensure_model(self):
        if not os.path.exists(_MODEL_PATH):
            logger.info("Downloading face landmarker model (~5 MB)...")
            urllib.request.urlretrieve(_MODEL_URL, _MODEL_PATH)
            logger.info("Face landmarker model downloaded.")

    def analyze(self, frame: np.ndarray) -> GazeAnalysisResult:
        try:
            frame_h, frame_w = frame.shape[:2]
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)

            result = self._face_landmarker.detect(mp_image)

            if not result.face_landmarks:
                return self._default_result()

            landmarks = result.face_landmarks[0]  # list of NormalizedLandmark

            image_points = np.array([
                self._landmark_to_pixel(landmarks[self.NOSE_TIP], frame_w, frame_h),
                self._landmark_to_pixel(landmarks[self.CHIN], frame_w, frame_h),
                self._landmark_to_pixel(landmarks[self.LEFT_EYE_OUTER], frame_w, frame_h),
                self._landmark_to_pixel(landmarks[self.RIGHT_EYE_OUTER], frame_w, frame_h),
                self._landmark_to_pixel(landmarks[self.LEFT_MOUTH], frame_w, frame_h),
                self._landmark_to_pixel(landmarks[self.RIGHT_MOUTH], frame_w, frame_h),
            ], dtype=np.float64)

            focal_length = frame_w
            camera_matrix = np.array([
                [focal_length, 0, frame_w / 2],
                [0, focal_length, frame_h / 2],
                [0, 0, 1],
            ], dtype=np.float64)
            dist_coeffs = np.zeros((4, 1), dtype=np.float64)

            success, rotation_vec, _ = cv2.solvePnP(
                self.FACE_3D_MODEL,
                image_points,
                camera_matrix,
                dist_coeffs,
                flags=cv2.SOLVEPNP_ITERATIVE,
            )

            if not success:
                return self._default_result()

            rotation_mat, _ = cv2.Rodrigues(rotation_vec)
            pitch, yaw, roll = self._rotation_matrix_to_euler(rotation_mat)

            # Iris Tracking
            iris_horizontal_deviation = self._calculate_iris_deviation(landmarks)

            # Combine head pose yaw with iris deviation
            # Head pose yaw is typically -45 to 45 degrees. Iris deviation is around -0.5 to 0.5.
            # We scale iris deviation to degrees to roughly match yaw.
            combined_yaw = yaw + (iris_horizontal_deviation * 60.0)

            gaze_direction = self._classify_gaze(combined_yaw, pitch)
            is_looking_at_screen = (
                abs(combined_yaw) <= self.YAW_THRESHOLD and
                abs(pitch) <= self.PITCH_THRESHOLD
            )

            yaw_score = max(0.0, 1.0 - abs(combined_yaw) / (self.YAW_THRESHOLD * 2))
            pitch_score = max(0.0, 1.0 - abs(pitch) / (self.PITCH_THRESHOLD * 2))
            attention_score = round((yaw_score + pitch_score) / 2, 3)

            return GazeAnalysisResult(
                is_looking_at_screen=is_looking_at_screen,
                gaze_direction=gaze_direction,
                horizontal_deviation=round(float(combined_yaw), 2),
                vertical_deviation=round(float(pitch), 2),
                head_pose=(round(float(pitch), 2), round(float(yaw), 2), round(float(roll), 2)),
                attention_score=attention_score,
            )

        except Exception as e:
            logger.error(f"GazeAnalyzer error: {e}")
            return self._default_result()

    def _landmark_to_pixel(self, landmark, frame_w: int, frame_h: int) -> Tuple[float, float]:
        return (landmark.x * frame_w, landmark.y * frame_h)

    def _rotation_matrix_to_euler(self, R: np.ndarray) -> Tuple[float, float, float]:
        sy = np.sqrt(R[0, 0] ** 2 + R[1, 0] ** 2)
        singular = sy < 1e-6

        if not singular:
            pitch = np.degrees(np.arctan2(R[2, 1], R[2, 2]))
            yaw   = np.degrees(np.arctan2(-R[2, 0], sy))
            roll  = np.degrees(np.arctan2(R[1, 0], R[0, 0]))
        else:
            pitch = np.degrees(np.arctan2(-R[1, 2], R[1, 1]))
            yaw   = np.degrees(np.arctan2(-R[2, 0], sy))
            roll  = 0.0

        return pitch, yaw, roll

    def _calculate_iris_deviation(self, landmarks) -> float:
        """
        Calculates the horizontal deviation of the irises relative to the eyes.
        Returns a value from roughly -0.5 (looking left) to +0.5 (looking right).
        """
        try:
            # Right eye
            r_inner_x = landmarks[self.RIGHT_EYE_INNER].x
            r_outer_x = landmarks[self.RIGHT_EYE_OUTER].x
            r_iris_x = landmarks[self.RIGHT_IRIS_CENTER].x
            r_width = abs(r_outer_x - r_inner_x)
            r_ratio = (r_iris_x - min(r_inner_x, r_outer_x)) / r_width if r_width > 0 else 0.5

            # Left eye
            l_inner_x = landmarks[self.LEFT_EYE_INNER].x
            l_outer_x = landmarks[self.LEFT_EYE_OUTER].x
            l_iris_x = landmarks[self.LEFT_IRIS_CENTER].x
            l_width = abs(l_outer_x - l_inner_x)
            l_ratio = (l_iris_x - min(l_inner_x, l_outer_x)) / l_width if l_width > 0 else 0.5

            # Average ratio (0.5 means looking straight, <0.5 right, >0.5 left relative to camera)
            avg_ratio = (r_ratio + l_ratio) / 2.0
            deviation = (avg_ratio - 0.5) * 2.0  # Scale to -1.0 to 1.0
            return deviation
        except Exception:
            return 0.0

    def _classify_gaze(self, yaw: float, pitch: float) -> str:
        if abs(yaw) <= self.YAW_THRESHOLD and abs(pitch) <= self.PITCH_THRESHOLD:
            return "center"
        if abs(yaw) > abs(pitch):
            return "right" if yaw > 0 else "left"
        return "down" if pitch > 0 else "up"

    def _default_result(self) -> GazeAnalysisResult:
        return GazeAnalysisResult(
            is_looking_at_screen=False,
            gaze_direction="unknown",
            horizontal_deviation=0.0,
            vertical_deviation=0.0,
            attention_score=0.0,
        )

    def close(self):
        self._face_landmarker.close()
