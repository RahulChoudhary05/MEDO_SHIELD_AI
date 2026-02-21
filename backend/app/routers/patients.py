from fastapi import APIRouter, HTTPException, Depends, status
from bson import ObjectId
from datetime import datetime, timedelta
from typing import List

from app.database import Database, settings
from app.schemas import (
    RegisterRequest, LoginRequest, Token, PatientResponse,
    PatientUpdateRequest, PatientTrendResponse, TrendDataPoint,
    DashboardResponse, DashboardStatistics, LatestSessionInfo
)
from app.auth import (
    get_current_user, get_password_hash, verify_password,
    create_access_token, validate_email, validate_password_strength,
    require_roles
)

router = APIRouter(prefix="/api/patients", tags=["patients"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register_patient(request: RegisterRequest):
    """Register a new patient account."""
    try:
        db = Database.get_db()
        
        # Validate email format
        if not validate_email(request.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email format"
            )
        
        # Validate password strength
        is_valid, error_msg = validate_password_strength(request.password)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
        
        # Check if email already exists
        existing = await db["patients"].find_one({"email": request.email})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered"
            )
        
        # Hash password
        hashed_password = get_password_hash(request.password)
        
        # Create patient document
        user_id = str(ObjectId())
        patient_doc = {
            "user_id": user_id,
            "first_name": request.first_name,
            "last_name": request.last_name,
            "email": request.email,
            "date_of_birth": request.date_of_birth,
            "gender": request.gender,
            "medical_history": None,
            "hashed_password": hashed_password,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await db["patients"].insert_one(patient_doc)
        
        # Create access token
        access_token = create_access_token(
            data={"sub": user_id, "role": "patient"},
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        
        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed. Please try again."
        )


@router.post("/login", response_model=Token)
async def login_patient(credentials: LoginRequest):
    """Authenticate patient and return access token."""
    try:
        db = Database.get_db()
        
        # Find patient by email
        patient = await db["patients"].find_one({"email": credentials.email})
        
        if not patient or not verify_password(credentials.password, patient["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        if not patient.get("is_active"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive"
            )
        
        # Create access token
        access_token = create_access_token(
            data={"sub": patient["user_id"], "role": "patient"},
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        
        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed. Please try again."
        )


@router.get("/me", response_model=PatientResponse)
async def get_current_patient(
    context: dict = Depends(require_roles(["patient"]))
):
    """Get current patient profile."""
    user_id = context["user_id"]
    db = Database.get_db()
    
    patient = await db["patients"].find_one({"user_id": user_id})
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    
    # Handle _id field - might be ObjectId or string in demo mode
    patient_id = str(patient.get("_id", user_id))
    
    return PatientResponse(
        _id=patient_id,
        user_id=patient.get("user_id", user_id),
        first_name=patient.get("first_name", ""),
        last_name=patient.get("last_name", ""),
        email=patient.get("email", ""),
        date_of_birth=patient.get("date_of_birth"),
        gender=patient.get("gender"),
        medical_history=patient.get("medical_history"),
        is_active=patient.get("is_active", True),
        created_at=patient.get("created_at", datetime.utcnow()),
        updated_at=patient.get("updated_at", datetime.utcnow())
    )


@router.get("/trends", response_model=PatientTrendResponse)
async def get_patient_trends(
    context: dict = Depends(require_roles(["patient"])),
    days: int = 30
):
    """Get patient's analysis trends and longitudinal data."""
    db = Database.get_db()
    user_id = context["user_id"]
    
    # Get patient
    patient = await db["patients"].find_one({"user_id": user_id})
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    
    patient_id = str(patient.get("_id", user_id))
    
    # Get baseline
    baseline = await db["baselines"].find_one({"patient_id": patient_id})
    baseline_calibrated = baseline and baseline.get("is_calibrated", False)
    
    # Get sessions within specified days
    start_date = datetime.utcnow() - timedelta(days=days)
    
    sessions = await db["analysis_sessions"].find({
        "patient_id": patient_id,
        "created_at": {"$gte": start_date}
    }).sort("created_at", -1).to_list(100)
    
    trend_data = []
    latest_risk_level = "Unknown"
    last_session_date = None
    
    for index, session in enumerate(sessions):
        # Get risk assessment for this session
        risk = await db["risk_assessments"].find_one({"session_id": str(session.get("_id", ""))})
        
        risk_level = "Unknown"
        if risk:
            risk_level = risk.get("risk_score", {}).get("classification", "Unknown")

        if index == 0:
            latest_risk_level = risk_level
            last_session_date = session.get("created_at")
        
        features = session.get("extracted_features", {})
        
        trend_point = TrendDataPoint(
            date=session.get("created_at", datetime.utcnow()),
            stride_length=features.get("stride_length"),
            cadence=features.get("cadence"),
            gait_symmetry=features.get("gait_symmetry", 0.5),
            tremor_frequency=features.get("tremor_frequency"),
            tremor_amplitude=features.get("tremor_amplitude"),
            bradykinesia_score=features.get("bradykinesia_score", 0.5),
            risk_level=risk_level
        )
        
        trend_data.append(trend_point)
    
    return PatientTrendResponse(
        patient_id=patient_id,
        trends=trend_data,
        total_sessions=len(sessions),
        date_range={
            "start": start_date.isoformat(),
            "end": datetime.utcnow().isoformat()
        },
        baseline_calibrated=bool(baseline_calibrated),
        current_status={
            "sessions_count": len(sessions),
            "latest_risk_level": latest_risk_level,
            "last_session_date": last_session_date
        }
    )

@router.get("/appointment-requests")
async def get_patient_appointment_requests(
    context: dict = Depends(require_roles(["patient"]))
):
    """Get appointment requests for the current patient."""
    db = Database.get_db()
    patient = await db["patients"].find_one({"user_id": context["user_id"]})
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    patient_id = str(patient.get("_id"))
    cursor = db["appointment_requests"].find({"patient_id": patient_id}).sort("created_at", -1)
    requests = []
    async for r in cursor:
        doctor = await db["doctors"].find_one({"_id": ObjectId(r["doctor_id"])})
        requests.append({
            "id": str(r["_id"]),
            "doctor_id": r.get("doctor_id"),
            "doctor_name": f"Dr. {doctor.get('first_name', '')} {doctor.get('last_name', '')}".strip() if doctor else "Doctor",
            "specialty": doctor.get("specialty") if doctor else None,
            "preferred_date": r.get("preferred_date"),
            "preferred_time": r.get("preferred_time"),
            "meeting_mode": r.get("meeting_mode"),
            "message": r.get("message"),
            "status": r.get("status"),
            "appointment_fee": r.get("appointment_fee", 0),
            "created_at": r.get("created_at")
        })

    return {"requests": requests}


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(context: dict = Depends(require_roles(["patient"]))):
    """Get comprehensive patient dashboard data."""
    db = Database.get_db()
    user_id = context["user_id"]
    
    # Get patient
    patient = await db["patients"].find_one({"user_id": user_id})
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    
    patient_id = str(patient.get("_id", user_id))
    
    # Get all sessions
    all_sessions = await db["analysis_sessions"].find({
        "patient_id": patient_id
    }).sort("created_at", -1).to_list(100)
    
    # Calculate statistics
    total_sessions = len(all_sessions)
    
    gait_symmetries = []
    tremor_amplitudes = []
    bradykinesia_scores = []
    latest_risk_level = "Unknown"
    last_session_date = None
    baseline_status = "Not Calibrated"
    
    latest_session_info = None
    recent_sessions_list = []
    
    if all_sessions:
        for i, session in enumerate(all_sessions[:5]):  # Last 5 sessions
            features = session.get("extracted_features", {})
            
            if i == 0:  # Latest session
                last_session_date = session.get("created_at")
            
            gait_sym = features.get("gait_symmetry", 0.5)
            tremor_amp = features.get("tremor_amplitude", 0)
            bradykinesia = features.get("bradykinesia_score", 0.5)
            
            gait_symmetries.append(gait_sym)
            if tremor_amp:
                tremor_amplitudes.append(tremor_amp)
            bradykinesia_scores.append(bradykinesia)
            
            # Get risk for this session
            risk = await db["risk_assessments"].find_one({
                "session_id": str(session.get("_id", ""))
            })
            
            risk_level = "UNKNOWN"
            if risk:
                risk_level = risk.get("risk_score", {}).get("classification", "UNKNOWN")
            
            if i == 0:
                latest_risk_level = risk_level
                latest_session_info = LatestSessionInfo(
                    session_id=str(session.get("_id", "")),
                    date=session.get("created_at", datetime.utcnow()),
                    risk_level=risk_level,
                    gait_symmetry=gait_sym,
                    bradykinesia_score=bradykinesia,
                    notes=None
                )
            
            recent_sessions_list.append(LatestSessionInfo(
                session_id=str(session.get("_id", "")),
                date=session.get("created_at", datetime.utcnow()),
                risk_level=risk_level,
                gait_symmetry=gait_sym,
                bradykinesia_score=bradykinesia,
                notes=None
            ))
    
    # Check baseline
    baseline = await db["baselines"].find_one({"patient_id": patient_id})
    if baseline and baseline.get("is_calibrated"):
        baseline_status = "Calibrated"
    elif total_sessions >= 7:
        baseline_status = "Ready for Calibration"
    
    # Calculate averages
    avg_gait_symmetry = sum(gait_symmetries) / len(gait_symmetries) if gait_symmetries else 0.5
    avg_tremor_amplitude = sum(tremor_amplitudes) / len(tremor_amplitudes) if tremor_amplitudes else 0
    
    statistics = DashboardStatistics(
        total_sessions=total_sessions,
        latest_risk_level=latest_risk_level,
        avg_gait_symmetry=avg_gait_symmetry,
        avg_tremor_amplitude=avg_tremor_amplitude if avg_tremor_amplitude > 0 else None,
        last_session_date=last_session_date,
        baseline_status=baseline_status
    )
    
    patient_response = PatientResponse(
        _id=patient_id,
        user_id=user_id,
        first_name=patient.get("first_name", ""),
        last_name=patient.get("last_name", ""),
        email=patient.get("email", ""),
        date_of_birth=patient.get("date_of_birth"),
        gender=patient.get("gender"),
        medical_history=patient.get("medical_history"),
        is_active=patient.get("is_active", True),
        created_at=patient.get("created_at", datetime.utcnow()),
        updated_at=patient.get("updated_at", datetime.utcnow())
    )
    
    return DashboardResponse(
        patient=patient_response,
        statistics=statistics,
        latest_session=latest_session_info,
        recent_sessions=recent_sessions_list
    )
