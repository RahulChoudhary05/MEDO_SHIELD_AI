import numpy as np
from scipy import signal
from typing import List, Optional, Tuple

class TremorAnalyzer:
    """Analyze tremor from pose keypoint oscillations."""
    
    # Wrist landmarks for tremor detection
    LEFT_WRIST = 15
    RIGHT_WRIST = 16
    LEFT_HAND = 17
    RIGHT_HAND = 18
    
    # Frequency range for Parkinson's tremor (Hz)
    TREMOR_FREQ_MIN = 4.0
    TREMOR_FREQ_MAX = 12.0
    
    def __init__(self, sample_rate: float = 30.0):
        self.sample_rate = sample_rate
        self.nyquist_freq = sample_rate / 2.0
    
    def extract_oscillation_sequence(self, keypoints: List[List[List[float]]], landmark_idx: int) -> np.ndarray:
        """Extract X-Y oscillation magnitude sequence from a landmark."""
        oscillations = []
        
        for frame_keypoints in keypoints:
            if len(frame_keypoints) > landmark_idx:
                landmark = frame_keypoints[landmark_idx]
                # Use magnitude of X-Y displacement
                magnitude = np.sqrt(landmark[0]**2 + landmark[1]**2)
                oscillations.append(magnitude)
        
        return np.array(oscillations)
    
    def calculate_fft_spectrum(self, signal_data: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Calculate FFT spectrum of signal.
        Returns: (frequencies, magnitudes)
        """
        if len(signal_data) < 4:
            return np.array([]), np.array([])
        
        # Apply Hann window to reduce spectral leakage
        windowed_signal = signal_data * signal.hann(len(signal_data))
        
        # Compute FFT
        fft_values = np.fft.fft(windowed_signal)
        magnitudes = np.abs(fft_values) / len(signal_data)
        
        # Only positive frequencies
        frequencies = np.fft.fftfreq(len(signal_data), 1/self.sample_rate)[:len(signal_data)//2]
        magnitudes = magnitudes[:len(signal_data)//2]
        
        return frequencies, magnitudes
    
    def extract_tremor_frequency(self, keypoints: List[List[List[float]]], wrist_idx: int) -> Optional[float]:
        """
        Extract dominant tremor frequency from wrist position.
        Returns frequency in Hz or None if no tremor detected.
        """
        # Extract oscillation sequence
        oscillations = self.extract_oscillation_sequence(keypoints, wrist_idx)
        
        if len(oscillations) < 10:
            return None
        
        # Detrend the signal
        oscillations = signal.detrend(oscillations)
        
        # Calculate FFT
        frequencies, magnitudes = self.calculate_fft_spectrum(oscillations)
        
        if len(frequencies) == 0:
            return None
        
        # Filter to tremor frequency range
        tremor_mask = (frequencies >= self.TREMOR_FREQ_MIN) & (frequencies <= self.TREMOR_FREQ_MAX)
        
        if not np.any(tremor_mask):
            return None
        
        tremor_frequencies = frequencies[tremor_mask]
        tremor_magnitudes = magnitudes[tremor_mask]
        
        if len(tremor_frequencies) == 0:
            return None
        
        # Return frequency with highest magnitude in tremor range
        dominant_idx = np.argmax(tremor_magnitudes)
        return float(tremor_frequencies[dominant_idx])
    
    def extract_tremor_amplitude(self, keypoints: List[List[List[float]]], wrist_idx: int) -> Optional[float]:
        """
        Extract tremor amplitude (magnitude) from wrist position.
        Returns amplitude in normalized units or None.
        """
        oscillations = self.extract_oscillation_sequence(keypoints, wrist_idx)
        
        if len(oscillations) < 5:
            return None
        
        # Detrend
        oscillations = signal.detrend(oscillations)
        
        # Calculate FFT
        frequencies, magnitudes = self.calculate_fft_spectrum(oscillations)
        
        if len(frequencies) == 0:
            return None
        
        # Get magnitude in tremor range
        tremor_mask = (frequencies >= self.TREMOR_FREQ_MIN) & (frequencies <= self.TREMOR_FREQ_MAX)
        
        if not np.any(tremor_mask):
            return 0.0
        
        tremor_magnitudes = magnitudes[tremor_mask]
        amplitude = np.max(tremor_magnitudes)
        
        return float(amplitude)
    
    def detect_resting_tremor(self, keypoints: List[List[List[float]]]) -> Tuple[bool, float]:
        """
        Detect if resting tremor is present.
        Returns: (is_tremor_present, confidence)
        
        Resting tremor characteristics:
        - 4-6 Hz frequency
        - Present at rest (low overall movement)
        """
        # Extract both wrists
        left_oscillations = self.extract_oscillation_sequence(keypoints, self.LEFT_WRIST)
        right_oscillations = self.extract_oscillation_sequence(keypoints, self.RIGHT_WRIST)
        
        if len(left_oscillations) < 10 or len(right_oscillations) < 10:
            return False, 0.0
        
        frequencies_left, magnitudes_left = self.calculate_fft_spectrum(signal.detrend(left_oscillations))
        frequencies_right, magnitudes_right = self.calculate_fft_spectrum(signal.detrend(right_oscillations))
        
        # Check for resting tremor frequency (4-6 Hz)
        resting_freq_min, resting_freq_max = 4.0, 6.0
        
        tremor_mask_left = (frequencies_left >= resting_freq_min) & (frequencies_left <= resting_freq_max)
        tremor_mask_right = (frequencies_right >= resting_freq_min) & (frequencies_right <= resting_freq_max)
        
        confidence = 0.0
        
        if np.any(tremor_mask_left):
            left_amplitude = np.max(magnitudes_left[tremor_mask_left])
            confidence += left_amplitude / 2.0
        
        if np.any(tremor_mask_right):
            right_amplitude = np.max(magnitudes_right[tremor_mask_right])
            confidence += right_amplitude / 2.0
        
        is_present = confidence > 0.05
        
        return is_present, min(1.0, confidence)
    
    def calculate_tremor_score(self, keypoints: List[List[List[float]]]) -> float:
        """
        Calculate overall tremor severity score (0-1).
        """
        tremor_freq_left = self.extract_tremor_frequency(keypoints, self.LEFT_WRIST)
        tremor_freq_right = self.extract_tremor_frequency(keypoints, self.RIGHT_WRIST)
        
        tremor_amp_left = self.extract_tremor_amplitude(keypoints, self.LEFT_WRIST) or 0.0
        tremor_amp_right = self.extract_tremor_amplitude(keypoints, self.RIGHT_WRIST) or 0.0
        
        # Normalize amplitude (assuming max expected is 0.5)
        amp_score = (tremor_amp_left + tremor_amp_right) / 2.0
        amp_score = min(1.0, amp_score / 0.5)
        
        return amp_score
