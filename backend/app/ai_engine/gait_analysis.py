import numpy as np
from typing import List, Tuple, Optional
from scipy.signal import find_peaks

class GaitAnalyzer:
    """Analyze gait parameters from pose keypoints."""
    
    # Landmark indices for key joints
    LEFT_ANKLE = 27
    RIGHT_ANKLE = 28
    LEFT_HIP = 23
    RIGHT_HIP = 24
    LEFT_KNEE = 25
    RIGHT_KNEE = 26
    
    def __init__(self, sample_rate: float = 30.0):
        self.sample_rate = sample_rate
        self.frame_duration = 1.0 / sample_rate
    
    def calculate_distance(self, point1: List[float], point2: List[float]) -> float:
        """Calculate Euclidean distance between two 3D points."""
        return np.sqrt(
            (point1[0] - point2[0])**2 + 
            (point1[1] - point2[1])**2 + 
            (point1[2] - point2[2])**2
        )
    
    def detect_gait_cycles(self, keypoints: List[List[List[float]]]) -> List[Tuple[int, int]]:
        """
        Detect gait cycles by analyzing ankle positions.
        Returns list of (start_frame, end_frame) for each stride.
        """
        if len(keypoints) < 10:
            return []
        
        # Extract vertical ankle positions
        ankle_y_sequence = []
        for frame_keypoints in keypoints:
            if len(frame_keypoints) > self.LEFT_ANKLE:
                # Use left ankle Y position (vertical)
                ankle_y = frame_keypoints[self.LEFT_ANKLE][1]
                ankle_y_sequence.append(ankle_y)
        
        if len(ankle_y_sequence) < 10:
            return []
        
        # Find peaks (maximum height of ankle)
        peaks, _ = find_peaks(ankle_y_sequence, distance=10, height=0.1)
        
        # Create gait cycles between consecutive peaks
        gait_cycles = []
        for i in range(len(peaks) - 1):
            gait_cycles.append((int(peaks[i]), int(peaks[i + 1])))
        
        return gait_cycles
    
    def calculate_stride_length(self, keypoints: List[List[List[float]]]) -> Optional[float]:
        """
        Calculate average stride length in normalized units.
        Stride = distance between consecutive same-foot ground contact.
        """
        gait_cycles = self.detect_gait_cycles(keypoints)
        
        if len(gait_cycles) < 2:
            return None
        
        stride_lengths = []
        
        for start, end in gait_cycles:
            if start < len(keypoints) and end < len(keypoints):
                left_ankle_start = keypoints[start][self.LEFT_ANKLE]
                left_ankle_end = keypoints[end][self.LEFT_ANKLE]
                
                stride = self.calculate_distance(left_ankle_start, left_ankle_end)
                stride_lengths.append(stride)
        
        if stride_lengths:
            return np.mean(stride_lengths)
        return None
    
    def calculate_cadence(self, keypoints: List[List[List[float]]]) -> Optional[float]:
        """
        Calculate cadence (steps per minute).
        """
        gait_cycles = self.detect_gait_cycles(keypoints)
        
        if len(gait_cycles) < 1:
            return None
        
        # Total duration in seconds
        total_frames = len(keypoints)
        total_duration = total_frames * self.frame_duration
        
        if total_duration < 1.0:
            return None
        
        # Number of steps
        num_steps = len(gait_cycles)
        
        # Steps per minute
        cadence = (num_steps / total_duration) * 60
        
        return cadence
    
    def calculate_gait_symmetry(self, keypoints: List[List[List[float]]]) -> float:
        """
        Calculate left-right gait symmetry (0-1).
        1.0 = perfectly symmetric, 0.0 = completely asymmetric
        """
        if len(keypoints) < 10:
            return 0.5
        
        left_distances = []
        right_distances = []
        
        # Calculate hip-to-ankle distance for each frame
        for frame_keypoints in keypoints:
            if len(frame_keypoints) > max(self.LEFT_ANKLE, self.RIGHT_ANKLE, self.LEFT_HIP, self.RIGHT_HIP):
                left_distance = self.calculate_distance(
                    frame_keypoints[self.LEFT_HIP],
                    frame_keypoints[self.LEFT_ANKLE]
                )
                right_distance = self.calculate_distance(
                    frame_keypoints[self.RIGHT_HIP],
                    frame_keypoints[self.RIGHT_ANKLE]
                )
                
                left_distances.append(left_distance)
                right_distances.append(right_distance)
        
        if not left_distances or not right_distances:
            return 0.5
        
        left_mean = np.mean(left_distances)
        right_mean = np.mean(right_distances)
        
        # Symmetry ratio (0-1)
        if max(left_mean, right_mean) == 0:
            return 0.5
        
        symmetry = 1.0 - (abs(left_mean - right_mean) / max(left_mean, right_mean))
        return max(0.0, min(1.0, symmetry))
    
    def calculate_bradykinesia_score(self, keypoints: List[List[List[float]]]) -> float:
        """
        Calculate bradykinesia (slowness of movement) score (0-1).
        Based on velocity of movement between frames.
        """
        if len(keypoints) < 5:
            return 0.5
        
        # Calculate movement velocity
        velocities = []
        
        for i in range(1, len(keypoints)):
            frame_velocity = 0.0
            point_count = 0
            
            # Calculate mean velocity across all joints
            for j in range(len(keypoints[i])):
                if j < len(keypoints[i-1]):
                    dist = self.calculate_distance(keypoints[i-1][j], keypoints[i][j])
                    velocity = dist / self.frame_duration
                    frame_velocity += velocity
                    point_count += 1
            
            if point_count > 0:
                frame_velocity /= point_count
                velocities.append(frame_velocity)
        
        if not velocities:
            return 0.5
        
        mean_velocity = np.mean(velocities)
        std_velocity = np.std(velocities)
        
        # Normalized bradykinesia score (0-1)
        # Higher score = more slowness (bradykinesia)
        # Assuming normal velocity range is 0.05-0.5
        normalized_velocity = mean_velocity / 0.5
        bradykinesia_score = 1.0 / (1.0 + normalized_velocity)
        
        return max(0.0, min(1.0, bradykinesia_score))
