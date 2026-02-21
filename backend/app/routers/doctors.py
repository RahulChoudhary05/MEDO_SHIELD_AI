from fastapi import APIRouter, HTTPException, Depends, status
from bson import ObjectId
from datetime import datetime, timedelta
from typing import List, Optional
from app.database import Database, settings
from app.schemas import (
    DoctorRegisterRequest, DoctorLoginRequest, DoctorResponse, DoctorUpdateRequest, PatientResponse,
    HealthRiskAssessment, Medication, MedicationReminder,
    PatientDoctorAssignment, Token
)
from app.auth import get_current_user, create_access_token, verify_password, get_password_hash, require_roles

router = APIRouter(prefix="/api/doctors", tags=["doctors"])

@router.post("/register", response_model=Token)
async def register_doctor(doctor_data: DoctorRegisterRequest):
    """Register a new doctor."""
    db = Database.get_db()
    
    # Check if email exists
    existing = await db["doctors"].find_one({"email": doctor_data.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create doctor record
    doctor_doc = {
        "doctor_id": f"DOC-{ObjectId()}",
        "first_name": doctor_data.first_name,
        "last_name": doctor_data.last_name,
        "email": doctor_data.email,
        "password_hash": get_password_hash(doctor_data.password),
        "specialty": doctor_data.specialty,
        "clinic_name": doctor_data.clinic_name,
        "license_number": doctor_data.license_number,
        "appointment_fee": doctor_data.appointment_fee or 0,
        "is_active": True,
        "patients_count": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db["doctors"].insert_one(doctor_doc)
    doctor_id = str(result.inserted_id)
    
    # Create access token
    access_token = create_access_token(
        data={"sub": doctor_id, "role": "doctor"}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.post("/login", response_model=Token)
async def login_doctor(credentials: DoctorLoginRequest):
    """Login doctor."""
    db = Database.get_db()
    
    doctor = await db["doctors"].find_one({"email": credentials.email})
    if not doctor or not verify_password(credentials.password, doctor.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    if not doctor.get("is_active"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Doctor account is inactive"
        )
    
    access_token = create_access_token(
        data={"sub": str(doctor["_id"]), "role": "doctor"}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.get("/profile", response_model=DoctorResponse)
async def get_doctor_profile(context: dict = Depends(require_roles(["doctor"]))):
    """Get doctor's profile."""
    db = Database.get_db()
    user_id = context["user_id"]
    
    doctor = await db["doctors"].find_one({"_id": ObjectId(user_id)})
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )
    
    return DoctorResponse(
        id=str(doctor["_id"]),
        doctor_id=doctor["doctor_id"],
        first_name=doctor["first_name"],
        last_name=doctor["last_name"],
        email=doctor["email"],
        specialty=doctor["specialty"],
        clinic_name=doctor.get("clinic_name"),
        license_number=doctor["license_number"],
        appointment_fee=doctor.get("appointment_fee", 0),
        is_active=doctor["is_active"],
        created_at=doctor["created_at"]
    )


@router.put("/profile", response_model=DoctorResponse)
async def update_doctor_profile(
    update: DoctorUpdateRequest,
    context: dict = Depends(require_roles(["doctor"]))
):
    """Update doctor's profile settings (appointment fee, clinic name)."""
    db = Database.get_db()
    user_id = context["user_id"]

    payload = {k: v for k, v in update.dict().items() if v is not None}
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No profile fields to update"
        )

    payload["updated_at"] = datetime.utcnow()
    await db["doctors"].update_one({"_id": ObjectId(user_id)}, {"$set": payload})

    doctor = await db["doctors"].find_one({"_id": ObjectId(user_id)})
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    return DoctorResponse(
        id=str(doctor["_id"]),
        doctor_id=doctor["doctor_id"],
        first_name=doctor["first_name"],
        last_name=doctor["last_name"],
        email=doctor["email"],
        specialty=doctor["specialty"],
        clinic_name=doctor.get("clinic_name"),
        license_number=doctor["license_number"],
        appointment_fee=doctor.get("appointment_fee", 0),
        is_active=doctor["is_active"],
        created_at=doctor["created_at"]
    )


@router.get("/directory")
async def get_doctor_directory(context: dict = Depends(require_roles(["patient", "doctor"]))):
    """List doctors for patients to request appointments."""
    db = Database.get_db()
    cursor = db["doctors"].find({"is_active": True}).sort("created_at", -1)
    doctors = []
    async for d in cursor:
        doctors.append({
            "id": str(d["_id"]),
            "name": f"Dr. {d.get('first_name', '')} {d.get('last_name', '')}".strip(),
            "specialty": d.get("specialty", ""),
            "clinic_name": d.get("clinic_name"),
            "appointment_fee": d.get("appointment_fee", 0),
            "rating": d.get("rating", 4.6),
            "experience": d.get("experience", ""),
            "bio": d.get("bio", ""),
            "available": True,
        })
    return {"doctors": doctors}


@router.post("/requests")
async def create_doctor_request(
    request: dict,
    context: dict = Depends(require_roles(["patient"]))
):
    """Patient sends an appointment request to a doctor."""
    db = Database.get_db()
    patient = await db["patients"].find_one({"user_id": context["user_id"]})
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    doctor_id = request.get("doctorId")
    if not doctor_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="doctorId is required")

    doctor = await db["doctors"].find_one({"_id": ObjectId(doctor_id)})
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    doc = {
        "doctor_id": doctor_id,
        "patient_id": str(patient.get("_id")),
        "preferred_date": request.get("preferredDate"),
        "preferred_time": request.get("preferredTime"),
        "meeting_mode": request.get("meetingMode"),
        "message": request.get("message", ""),
        "status": "pending",
        "appointment_fee": doctor.get("appointment_fee", 0),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    result = await db["appointment_requests"].insert_one(doc)

    # Notify doctor
    await db["doctor_notifications"].insert_one({
        "doctor_id": doctor_id,
        "title": "New appointment request",
        "message": f"New request from {patient.get('first_name', 'Patient')} {patient.get('last_name', '')}".strip(),
        "category": "appointment",
        "is_read": False,
        "created_at": datetime.utcnow()
    })

    return {"success": True, "request_id": str(result.inserted_id)}


@router.get("/appointment-requests")
async def get_appointment_requests(context: dict = Depends(require_roles(["doctor"]))):
    """Doctor fetches appointment requests."""
    db = Database.get_db()
    doctor_id = context["user_id"]

    cursor = db["appointment_requests"].find({"doctor_id": doctor_id}).sort("created_at", -1)
    requests = []
    async for r in cursor:
        patient = await db["patients"].find_one({"_id": ObjectId(r["patient_id"])})
        requests.append({
            "id": str(r["_id"]),
            "patient_id": r["patient_id"],
            "patient_name": f"{patient.get('first_name', '')} {patient.get('last_name', '')}".strip() if patient else "Patient",
            "patient_email": patient.get("email") if patient else None,
            "preferred_date": r.get("preferred_date"),
            "preferred_time": r.get("preferred_time"),
            "meeting_mode": r.get("meeting_mode"),
            "message": r.get("message"),
            "status": r.get("status"),
            "appointment_fee": r.get("appointment_fee", 0),
            "created_at": r.get("created_at")
        })

    return {"requests": requests}


@router.post("/appointment-requests/{request_id}/accept")
async def accept_appointment_request(
    request_id: str,
    context: dict = Depends(require_roles(["doctor"]))
):
    """Doctor accepts appointment request and enables chat."""
    db = Database.get_db()
    doctor_id = context["user_id"]

    request_doc = await db["appointment_requests"].find_one({"_id": ObjectId(request_id)})
    if not request_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    if request_doc.get("doctor_id") != doctor_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    await db["appointment_requests"].update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {"status": "accepted", "updated_at": datetime.utcnow()}}
    )

    # Ensure assignment exists (chat enabled)
    existing = await db["patient_doctor_assignments"].find_one({
        "patient_id": request_doc["patient_id"],
        "doctor_id": doctor_id,
        "is_active": True
    })
    if not existing:
        await db["patient_doctor_assignments"].insert_one({
            "patient_id": request_doc["patient_id"],
            "doctor_id": doctor_id,
            "assigned_at": datetime.utcnow(),
            "is_active": True,
            "is_video_analysis_unlocked": False,
            "notes": "Auto-assigned on appointment acceptance"
        })

    # Notify patient
    await db["notifications"].insert_one({
        "patient_id": request_doc["patient_id"],
        "title": "Appointment accepted",
        "message": "Your appointment request was accepted. You can now chat with your doctor.",
        "category": "appointment",
        "is_read": False,
        "created_at": datetime.utcnow()
    })

    return {"success": True}


@router.post("/appointment-requests/{request_id}/reject")
async def reject_appointment_request(
    request_id: str,
    context: dict = Depends(require_roles(["doctor"]))
):
    """Doctor rejects appointment request."""
    db = Database.get_db()
    doctor_id = context["user_id"]

    request_doc = await db["appointment_requests"].find_one({"_id": ObjectId(request_id)})
    if not request_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    if request_doc.get("doctor_id") != doctor_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    await db["appointment_requests"].update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {"status": "rejected", "updated_at": datetime.utcnow()}}
    )

    await db["notifications"].insert_one({
        "patient_id": request_doc["patient_id"],
        "title": "Appointment rejected",
        "message": "Your appointment request was rejected. Please choose another time or doctor.",
        "category": "appointment",
        "is_read": False,
        "created_at": datetime.utcnow()
    })

    return {"success": True}


@router.get("/notifications")
async def get_doctor_notifications(context: dict = Depends(require_roles(["doctor"]))):
    """Get notifications for doctor (appointments, messages)."""
    db = Database.get_db()
    doctor_id = context["user_id"]
    notifications = await db["doctor_notifications"].find({
        "doctor_id": doctor_id
    }).sort("created_at", -1).to_list(50)

    for n in notifications:
        n["_id"] = str(n["_id"])

    return {"notifications": notifications, "total": len(notifications)}


@router.post("/notifications/mark-read")
async def mark_doctor_notifications_read(context: dict = Depends(require_roles(["doctor"]))):
    """Mark doctor notifications as read."""
    db = Database.get_db()
    doctor_id = context["user_id"]
    await db["doctor_notifications"].update_many(
        {"doctor_id": doctor_id, "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"success": True}


@router.get("/patients", response_model=List[PatientResponse])
async def get_doctor_patients(context: dict = Depends(require_roles(["doctor"]))):
    """Get all patients assigned to this doctor."""
    db = Database.get_db()
    user_id = context["user_id"]
    
    # Get all assignments for this doctor
    assignments = await db["patient_doctor_assignments"].find({
        "doctor_id": user_id,
        "is_active": True
    }).to_list(100)
    
    patients = []
    for assignment in assignments:
        patient = await db["patients"].find_one({"_id": ObjectId(assignment["patient_id"])})
        if patient:
            patients.append(PatientResponse(
                id=str(patient["_id"]),
                user_id=patient["user_id"],
                first_name=patient["first_name"],
                last_name=patient["last_name"],
                email=patient["email"],
                date_of_birth=patient.get("date_of_birth"),
                gender=patient.get("gender"),
                medical_history=patient.get("medical_history"),
                is_active=patient["is_active"],
                created_at=patient["created_at"],
                updated_at=patient["updated_at"]
            ))
    
    return patients


@router.post("/assign-patient/{patient_id}")
async def assign_patient(
    patient_id: str,
    context: dict = Depends(require_roles(["doctor"]))
):
    """Assign a patient to a doctor."""
    db = Database.get_db()
    doctor_id = context["user_id"]
    
    # Verify patient exists
    patient = await db["patients"].find_one({"_id": ObjectId(patient_id)})
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    
    # Check if already assigned
    existing = await db["patient_doctor_assignments"].find_one({
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "is_active": True
    })
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Patient already assigned to this doctor"
        )
    
    await db["patient_doctor_assignments"].insert_one({
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "assigned_at": datetime.utcnow(),
        "is_active": True,
        "is_video_analysis_unlocked": False,
        "notes": ""
    })
    
    return {
        "message": "Patient assigned successfully",
        "patient_id": patient_id,
        "doctor_id": doctor_id
    }


@router.get("/patient/{patient_id}/health-timeline")
async def get_patient_health_timeline(
    patient_id: str,
    days: int = 30,
    context: dict = Depends(require_roles(["doctor"]))
):
    """Get patient's health risk timeline."""
    db = Database.get_db()
    doctor_id = context["user_id"]
    
    # Verify doctor-patient relationship
    assignment = await db["patient_doctor_assignments"].find_one({
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "is_active": True
    })
    
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this patient"
        )
    
    # Get health risk assessments
    start_date = datetime.utcnow() - timedelta(days=days)
    
    assessments = await db["health_risk_assessments"].find({
        "patient_id": patient_id,
        "risk_date": {"$gte": start_date}
    }).sort("risk_date", -1).to_list(100)
    
    return {
        "patient_id": patient_id,
        "assessments": assessments,
        "total_assessments": len(assessments),
        "date_range": {
            "start": start_date.isoformat(),
            "end": datetime.utcnow().isoformat()
        }
    }


@router.post("/patient/{patient_id}/medication")
async def add_patient_medication(
    patient_id: str,
    medication: Medication,
    context: dict = Depends(require_roles(["doctor"]))
):
    """Add medication for a patient."""
    db = Database.get_db()
    doctor_id = context["user_id"]
    
    # Verify access
    assignment = await db["patient_doctor_assignments"].find_one({
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "is_active": True
    })
    
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    # Create medication record
    med_doc = {
        "patient_id": patient_id,
        "medication": medication.dict(),
        "prescribed_by": doctor_id,
        "prescribed_at": datetime.utcnow(),
        "is_active": True
    }
    
    result = await db["medications"].insert_one(med_doc)

    await db["notifications"].insert_one({
        "patient_id": patient_id,
        "title": "Medication added",
        "message": f"Dr. {doctor_id} added {medication.name} to your plan.",
        "category": "medication",
        "is_read": False,
        "created_at": datetime.utcnow()
    })
    
    return {
        "id": str(result.inserted_id),
        "message": "Medication added successfully"
    }


@router.get("/patient/{patient_id}/medications")
async def get_patient_medications(
    patient_id: str,
    context: dict = Depends(require_roles(["doctor"]))
):
    """Get patient's medications."""
    db = Database.get_db()
    doctor_id = context["user_id"]
    
    # Verify access
    assignment = await db["patient_doctor_assignments"].find_one({
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "is_active": True
    })
    
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    medications = await db["medications"].find({
        "patient_id": patient_id,
        "is_active": True
    }).to_list(100)
    
    return {
        "patient_id": patient_id,
        "medications": medications,
        "total": len(medications)
    }


@router.get("/patient/{patient_id}/high-risk-alerts")
async def get_high_risk_alerts(
    patient_id: str,
    context: dict = Depends(require_roles(["doctor"]))
):
    """Get high-risk alerts for patient."""
    db = Database.get_db()
    doctor_id = context["user_id"]
    
    # Verify access
    assignment = await db["patient_doctor_assignments"].find_one({
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "is_active": True
    })
    
    if not assignment:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    # Get latest assessment
    latest = await db["health_risk_assessments"].find_one(
        {"patient_id": patient_id},
        sort=[("risk_date", -1)]
    )
    
    alerts = []
    if latest:
        if latest["disease_risk_level"] in ["High", "Critical"]:
            alerts.append({
                "severity": latest["disease_risk_level"],
                "message": f"Patient flagged as {latest['disease_risk_level']} risk",
                "risk_score": latest["disease_risk_score"],
                "risk_factors": latest.get("risk_factors", []),
                "date": latest["risk_date"]
            })
    
    return {
        "patient_id": patient_id,
        "alerts": alerts,
        "critical_count": len([a for a in alerts if a["severity"] == "Critical"])
    }
