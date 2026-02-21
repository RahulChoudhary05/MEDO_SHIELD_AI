import numpy as np
from typing import Optional, Dict, List
from datetime import datetime

class BaselineManager:
    """Manage patient-specific baseline metrics and deviation scoring."""
    
    def __init__(self, required_sessions: int = 7, deviation_threshold: float = 2.5):
        self.required_sessions = required_sessions
        self.deviation_threshold = deviation_threshold
    
    def create_baseline(self, sessions_data: List[Dict]) -> Optional[Dict]:
        """
        Create baseline from multiple sessions.
        
        Args:
            sessions_data: List of session feature dictionaries
            
        Returns:
            Baseline metrics dictionary or None if insufficient data
        """
        if len(sessions_data) < self.required_sessions:
            return None
        
        # Use first N sessions for baseline
        baseline_sessions = sessions_data[:self.required_sessions]
        
        # Extract all metrics
        stride_lengths = []
        cadences = []
        gait_symmetries = []
        tremor_frequencies = []
        tremor_amplitudes = []
        bradykinesia_scores = []
        
        for session in baseline_sessions:
            if session.get("stride_length"):
                stride_lengths.append(session["stride_length"])
            if session.get("cadence"):
                cadences.append(session["cadence"])
            
            gait_symmetries.append(session["gait_symmetry"])
            
            if session.get("tremor_frequency"):
                tremor_frequencies.append(session["tremor_frequency"])
            if session.get("tremor_amplitude"):
                tremor_amplitudes.append(session["tremor_amplitude"])
            
            bradykinesia_scores.append(session["bradykinesia_score"])
        
        # Calculate statistics
        baseline = {
            "stride_length_mean": np.mean(stride_lengths) if stride_lengths else 0.0,
            "stride_length_std": np.std(stride_lengths) if len(stride_lengths) > 1 else 0.0,
            "cadence_mean": np.mean(cadences) if cadences else 0.0,
            "cadence_std": np.std(cadences) if len(cadences) > 1 else 0.0,
            "gait_symmetry_mean": np.mean(gait_symmetries),
            "gait_symmetry_std": np.std(gait_symmetries) if len(gait_symmetries) > 1 else 0.0,
            "tremor_frequency_mean": np.mean(tremor_frequencies) if tremor_frequencies else 0.0,
            "tremor_amplitude_mean": np.mean(tremor_amplitudes) if tremor_amplitudes else 0.0,
            "bradykinesia_mean": np.mean(bradykinesia_scores),
            "bradykinesia_std": np.std(bradykinesia_scores) if len(bradykinesia_scores) > 1 else 0.0,
            "session_count": len(baseline_sessions),
            "last_updated": datetime.utcnow().isoformat(),
            "is_calibrated": True
        }
        
        return baseline
    
    def calculate_deviation_score(self, current_session: Dict, baseline: Dict) -> float:
        """
        Calculate deviation from baseline as z-score.
        
        Args:
            current_session: Current session metrics
            baseline: Baseline metrics
            
        Returns:
            Deviation score (0-10 scale)
        """
        if not baseline or not baseline.get("is_calibrated"):
            return 0.0
        
        deviations = []
        
        # Gait symmetry deviation
        baseline_sym = baseline["gait_symmetry_mean"]
        baseline_sym_std = baseline.get("gait_symmetry_std", 0.05)
        current_sym = current_session["gait_symmetry"]
        
        if baseline_sym_std > 0:
            sym_deviation = abs(current_sym - baseline_sym) / baseline_sym_std
            deviations.append(sym_deviation)
        
        # Bradykinesia deviation
        baseline_brady = baseline["bradykinesia_mean"]
        baseline_brady_std = baseline.get("bradykinesia_std", 0.1)
        current_brady = current_session["bradykinesia_score"]
        
        if baseline_brady_std > 0:
            brady_deviation = abs(current_brady - baseline_brady) / baseline_brady_std
            deviations.append(brady_deviation)
        
        # Stride length deviation
        if current_session.get("stride_length") and baseline.get("stride_length_mean"):
            baseline_stride = baseline["stride_length_mean"]
            baseline_stride_std = baseline.get("stride_length_std", 0.05)
            current_stride = current_session["stride_length"]
            
            if baseline_stride_std > 0:
                stride_deviation = abs(current_stride - baseline_stride) / baseline_stride_std
                deviations.append(stride_deviation)
        
        # Tremor deviation
        if current_session.get("tremor_amplitude") and baseline.get("tremor_amplitude_mean"):
            baseline_tremor = baseline["tremor_amplitude_mean"]
            current_tremor = current_session["tremor_amplitude"]
            
            # Relative change
            if baseline_tremor > 0.001:
                tremor_deviation = abs(current_tremor - baseline_tremor) / baseline_tremor
                deviations.append(tremor_deviation)
        
        if not deviations:
            return 0.0
        
        # Mean z-score scaled to 0-10
        mean_deviation = np.mean(deviations)
        scaled_deviation = min(10.0, mean_deviation)
        
        return scaled_deviation
    
    def classify_risk(self, deviation_score: float, baseline_exists: bool) -> Dict:
        """
        Classify risk level based on deviation score.
        
        Returns:
            Dict with classification, score, and confidence
        """
        if not baseline_exists:
            return {
                "classification": "BASELINE_LEARNING",
                "score": deviation_score,
                "confidence": 0.0,
                "message": "Establishing patient baseline. More data needed."
            }
        
        # Risk thresholds
        LOW_THRESHOLD = 1.5
        MEDIUM_THRESHOLD = 3.0
        
        if deviation_score < LOW_THRESHOLD:
            classification = "LOW"
            confidence = 1.0 - (deviation_score / LOW_THRESHOLD)
        elif deviation_score < MEDIUM_THRESHOLD:
            classification = "MEDIUM"
            confidence = 0.7
        else:
            classification = "HIGH"
            confidence = min(1.0, deviation_score / 5.0)
        
        return {
            "classification": classification,
            "score": deviation_score,
            "confidence": min(1.0, confidence),
            "message": f"Neurological status: {classification} risk detected."
        }
    
    def should_flag_for_review(self, risk_classification: Dict) -> bool:
        """Determine if session should be flagged for clinical review."""
        return risk_classification["classification"] in ["MEDIUM", "HIGH"]
    
    def update_baseline(self, baseline: Dict, new_session: Dict) -> Dict:
        """
        Incrementally update baseline with new session (online learning).
        Uses exponential moving average approach.
        """
        if not baseline.get("is_calibrated"):
            return baseline
        
        alpha = 0.1  # Learning rate for incremental updates
        
        # Update gait symmetry
        baseline["gait_symmetry_mean"] = (
            (1 - alpha) * baseline["gait_symmetry_mean"] + 
            alpha * new_session["gait_symmetry"]
        )
        
        # Update bradykinesia
        baseline["bradykinesia_mean"] = (
            (1 - alpha) * baseline["bradykinesia_mean"] + 
            alpha * new_session["bradykinesia_score"]
        )
        
        # Update stride length if available
        if new_session.get("stride_length") and baseline.get("stride_length_mean"):
            baseline["stride_length_mean"] = (
                (1 - alpha) * baseline["stride_length_mean"] + 
                alpha * new_session["stride_length"]
            )
        
        baseline["last_updated"] = datetime.utcnow().isoformat()
        
        return baseline
