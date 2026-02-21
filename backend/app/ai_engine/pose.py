import mediapipe as mp
import numpy as np
from typing import List, Tuple, Optional

class PoseEstimator:
    """Extract human pose keypoints using MediaPipe."""
    
    def __init__(self):
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            smooth_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        
    def extract_keypoints(self, frame: np.ndarray) -> Optional[Tuple[List[List[float]], float]]:
        """
        Extract 33 pose keypoints from a video frame.
        
        Returns:
            Tuple of (keypoints, confidence) or None if no pose detected
            keypoints: List of 33 [x, y, z] coordinates
            confidence: Mean detection confidence (0-1)
        """
        # Convert BGR to RGB
        frame_rgb = np.asarray(frame)[:, :, ::-1]
        
        # Process frame
        results = self.pose.process(frame_rgb)
        
        if not results.pose_landmarks:
            return None
        
        # Extract keypoints: 33 landmarks
        keypoints = []
        confidences = []
        
        for landmark in results.pose_landmarks.landmark:
            keypoints.append([landmark.x, landmark.y, landmark.z])
            confidences.append(landmark.visibility)
        
        mean_confidence = np.mean(confidences)
        
        return keypoints, mean_confidence
    
    def batch_extract_keypoints(self, frames: List[np.ndarray]) -> List[dict]:
        """
        Extract keypoints from multiple frames.
        
        Returns:
            List of dictionaries with frame_number, keypoints, confidence
        """
        results = []
        for idx, frame in enumerate(frames):
            extraction = self.extract_keypoints(frame)
            if extraction:
                keypoints, confidence = extraction
                results.append({
                    "frame_number": idx,
                    "timestamp": idx / 30.0,  # Assuming 30 FPS
                    "keypoints": keypoints,
                    "confidence": confidence
                })
        
        return results
    
    def get_landmark_names(self) -> List[str]:
        """Get names of all 33 pose landmarks."""
        return [
            "nose", "left_eye_inner", "left_eye", "left_eye_outer",
            "right_eye_inner", "right_eye", "right_eye_outer",
            "left_ear", "right_ear",
            "mouth_left", "mouth_right",
            "left_shoulder", "right_shoulder",
            "left_elbow", "right_elbow",
            "left_wrist", "right_wrist",
            "left_pinky", "right_pinky",
            "left_index", "right_index",
            "left_thumb", "right_thumb",
            "left_hip", "right_hip",
            "left_knee", "right_knee",
            "left_ankle", "right_ankle",
            "left_heel", "right_heel",
            "left_foot_index", "right_foot_index"
        ]
