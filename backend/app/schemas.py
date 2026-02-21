from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


# =====================
# Authentication Schemas
# =====================

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)


class RegisterRequest(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[str] = None


# =====================
# Patient Schemas
# =====================

class PatientResponse(BaseModel):
    id: str = Field(..., alias="_id")
    user_id: str
    first_name: str
    last_name: str
    email: str
    date_of_birth: Optional[str]
    gender: Optional[str]
    medical_history: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True


class PatientUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    medical_history: Optional[str] = None


# =====================
# Pose & Feature Schemas
# =====================

class PoseKeypoint(BaseModel):
    x: float
    y: float
    z: float
    visibility: float


class PoseFrame(BaseModel):
    frame_number: int
    timestamp: float
    keypoints: List[List[float]]
    confidence: float


class SessionFeatures(BaseModel):
    stride_length: Optional[float] = None
    cadence: Optional[float] = None
    gait_symmetry: float
    tremor_frequency: Optional[float] = None
    tremor_amplitude: Optional[float] = None
    bradykinesia_score: float
    deviation_from_baseline: Optional[float] = None
    risk_score: Optional[float] = None
    risk_level: Optional[str] = None


# =====================
# Analysis Session Schemas
# =====================

class AnalysisSessionCreate(BaseModel):
    video_duration: float = Field(..., gt=0)
    frame_count: int = Field(..., gt=0)
    pose_frames: List[PoseFrame] = Field(..., min_items=1)


class SessionResponse(BaseModel):
    id: str = Field(..., alias="_id")
    patient_id: str
    video_duration: float
    frame_count: int
    extracted_features: SessionFeatures
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True


class RiskAssessment(BaseModel):
    session_id: str
    risk_score: float
    risk_level: str
    confidence: float
    factors: dict
    recommendations: List[str]


class AnalysisSessionResponse(BaseModel):
    """Response model for analysis session upload with risk assessment and recommendations."""
    id: str
    patient_id: str
    session_id: str
    video_duration: float
    frame_count: int
    extracted_features: SessionFeatures
    risk_score: float
    risk_level: str
    recommendations: List[str] = []
    analysis_summary: str
    created_at: str
    success: bool = True


# =====================
# Baseline Schemas
# =====================

class BaselineResponse(BaseModel):
    patient_id: str
    sessions_count: int
    created_at: datetime
    updated_at: datetime
    is_trained: bool
    mean_stride_length: Optional[float]
    mean_cadence: Optional[float]
    mean_gait_symmetry: Optional[float]


# =====================
# Patient History/Trends
# =====================

class TrendDataPoint(BaseModel):
    date: datetime
    stride_length: Optional[float] = None
    cadence: Optional[float] = None
    gait_symmetry: float
    tremor_frequency: Optional[float] = None
    tremor_amplitude: Optional[float] = None
    bradykinesia_score: float
    risk_level: Optional[str] = "Unknown"


class PatientTrendResponse(BaseModel):
    patient_id: str
    trends: List[TrendDataPoint]
    total_sessions: int
    date_range: dict  # {"start": datetime, "end": datetime}
    baseline_calibrated: Optional[bool] = False
    current_status: Optional[dict] = None


# =====================
# Dashboard Schemas
# =====================

class DashboardStatistics(BaseModel):
    total_sessions: int
    latest_risk_level: str
    avg_gait_symmetry: float
    avg_tremor_amplitude: Optional[float]
    last_session_date: Optional[datetime]
    baseline_status: str


class LatestSessionInfo(BaseModel):
    session_id: str
    date: datetime
    risk_level: str
    gait_symmetry: float
    bradykinesia_score: float
    notes: Optional[str]


class DashboardResponse(BaseModel):
    patient: PatientResponse
    statistics: DashboardStatistics
    latest_session: Optional[LatestSessionInfo]
    recent_sessions: List[LatestSessionInfo]


# =====================
# Error Response Schemas
# =====================

class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None
    status_code: int


# =====================
# Doctor & Medical Schemas
# =====================

class DoctorRegisterRequest(BaseModel):
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    email: EmailStr
    password: str = Field(..., min_length=8)
    license_number: str = Field(..., min_length=1)
    specialty: str = Field(..., min_length=1)
    clinic_name: Optional[str] = None
    appointment_fee: Optional[float] = Field(default=0, ge=0)


class DoctorLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)


class DoctorResponse(BaseModel):
    id: str = Field(..., alias="_id")
    doctor_id: str
    first_name: str
    last_name: str
    email: str
    specialty: str
    clinic_name: Optional[str]
    license_number: str
    appointment_fee: Optional[float] = None
    is_active: bool
    created_at: datetime

    class Config:
        populate_by_name = True


class DoctorUpdateRequest(BaseModel):
    clinic_name: Optional[str] = None
    appointment_fee: Optional[float] = Field(default=None, ge=0)


class Medication(BaseModel):
    name: str
    dosage: str
    frequency: str
    time_slots: List[str] = []  # e.g., ["09:00", "21:00"]
    duration_days: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    side_effects: Optional[List[str]] = None
    contraindications: Optional[List[str]] = None
    notes: Optional[str] = None


class MedicationReminder(BaseModel):
    patient_id: str
    medications: List[Medication]
    next_reminder_time: Optional[datetime] = None
    last_taken: Optional[datetime] = None
    adherence_rate: float = 0.0  # 0-100%


class MedicationRecommendationRequest(BaseModel):
    patient_id: str
    symptoms: Optional[List[str]] = None
    conditions: Optional[List[str]] = None
    age: Optional[int] = None
    preview_only: bool = False


class HealthRiskAssessment(BaseModel):
    patient_id: str
    risk_date: datetime
    disease_risk_score: float  # 0-100
    disease_risk_level: str  # Low, Moderate, High, Critical
    risk_factors: List[str]
    recommendations: List[str]
    lab_results: Optional[dict] = None
    wearable_metrics: Optional[dict] = None
    next_screening_date: Optional[datetime] = None


class AIReport(BaseModel):
    id: str = Field(..., alias="_id")
    patient_id: str
    report_type: str  # "Monthly Summary", "Risk Analysis", etc.
    generated_by_ai: str  # Model used (GPT, Gemini, etc.)
    content: str
    key_findings: List[str]
    recommendations: List[str]
    created_at: datetime

    class Config:
        populate_by_name = True


class AIConversationMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime


class Notification(BaseModel):
    id: str = Field(..., alias="_id")
    patient_id: str
    title: str
    message: str
    category: str
    is_read: bool
    created_at: datetime

    class Config:
        populate_by_name = True


class PatientDoctorAssignment(BaseModel):
    patient_id: str
    doctor_id: str
    assigned_at: datetime
    is_active: bool
    notes: Optional[str] = None
