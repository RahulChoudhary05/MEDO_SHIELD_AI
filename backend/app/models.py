from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError(f"Invalid ObjectId: {v}")
        return ObjectId(v)

    def __repr__(self):
        return f"ObjectId('{self}'"


# =====================
# User/Patient Models
# =====================

class PatientBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    medical_history: Optional[str] = None

class PatientCreate(PatientBase):
    password: str = Field(..., min_length=8)
    user_id: str

class Patient(PatientBase):
    id: Optional[PyObjectId] = Field(alias="_id")
    user_id: str
    created_at: datetime
    updated_at: datetime
    hashed_password: str
    is_active: bool = True

    class Config:
        populate_by_name = True


# =====================
# Pose & Feature Models
# =====================

class PoseKeypoint(BaseModel):
    x: float
    y: float
    z: float
    visibility: float

class PoseFrame(BaseModel):
    frame_number: int
    timestamp: float
    keypoints: List[List[float]]  # 33 keypoints x [x, y, z]
    confidence: float

class SessionFeatures(BaseModel):
    stride_length: Optional[float] = None
    cadence: Optional[float] = None
    gait_symmetry: float
    tremor_frequency: Optional[float] = None
    tremor_amplitude: Optional[float] = None
    bradykinesia_score: float
    deviation_from_baseline: Optional[float] = None


# =====================
# Analysis Session Models
# =====================

class AnalysisSessionCreate(BaseModel):
    patient_id: str
    video_duration: float
    frame_count: int
    pose_frames: List[PoseFrame]

class AnalysisSession(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id")
    patient_id: str
    video_duration: float
    frame_count: int
    pose_frames: List[PoseFrame]
    extracted_features: SessionFeatures
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True


# =====================
# Baseline Models
# =====================

class BaselineMetrics(BaseModel):
    stride_length_mean: float
    stride_length_std: float
    cadence_mean: float
    cadence_std: float
    gait_symmetry_mean: float
    tremor_frequency_mean: float
    tremor_amplitude_mean: float
    session_count: int
    last_updated: datetime

class Baseline(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id")
    patient_id: str
    metrics: BaselineMetrics
    is_calibrated: bool

    class Config:
        populate_by_name = True


# =====================
# Risk Assessment Models
# =====================

class RiskScore(BaseModel):
    score: float
    classification: str  # Low, Medium, High
    confidence: float
    components: dict

class RiskAssessment(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id")
    patient_id: str
    session_id: str
    risk_score: RiskScore
    clinical_notes: Optional[str] = None
    flagged_for_review: bool = False
    created_at: datetime

    class Config:
        populate_by_name = True


# =====================
# Auth Models
# =====================

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    user_id: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# =====================
# Response Models
# =====================

class PatientResponse(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    first_name: str
    last_name: str
    email: str
    created_at: datetime

    class Config:
        populate_by_name = True

class SessionResponse(BaseModel):
    id: str = Field(alias="_id")
    patient_id: str
    features: SessionFeatures
    created_at: datetime
    risk_classification: Optional[str] = None

    class Config:
        populate_by_name = True

class TrendDataPoint(BaseModel):
    date: datetime
    gait_symmetry: float
    tremor_frequency: Optional[float]
    bradykinesia_score: float
    risk_level: str

class PatientTrendResponse(BaseModel):
    patient_id: str
    baseline_calibrated: bool
    trend_data: List[TrendDataPoint]
    current_status: dict
