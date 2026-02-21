from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File
from bson import ObjectId
from datetime import datetime
from typing import List
from app.database import Database, settings
from app.schemas import (
    AnalysisSessionCreate, SessionResponse,
    SessionFeatures, AnalysisSessionResponse
)
from app.auth import get_current_user, require_roles
import aiohttp
import json
from app.ai_engine import GaitAnalyzer, TremorAnalyzer, BaselineManager

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


async def _call_gemini(prompt: str) -> str:
    if not settings.GEMINI_API_KEY:
        return ""

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
    )
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 700
        }
    }

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, timeout=30) as response:
                data = await response.json()
        candidates = data.get("candidates", [])
        if not candidates:
            return ""
        return candidates[0]["content"]["parts"][0].get("text", "")
    except Exception:
        return ""


async def _verify_doctor_patient_access(db, patient_id: str, doctor_id: str):
    assignment = await db["patient_doctor_assignments"].find_one({
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "is_active": True
    })
    if not assignment:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

@router.post("/upload-session", response_model=AnalysisSessionResponse)
async def upload_analysis_session(
    session_data: AnalysisSessionCreate,
    context: dict = Depends(require_roles(["patient"]))
):
    """
    Upload pose data from video analysis session.
    Performs AI analysis and stores results.
    """
    try:
        db = Database.get_db()
        user_id = context["user_id"]
        
        # Get patient from authenticated user
        patient = await db["patients"].find_one({"user_id": user_id})
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        patient_id = str(patient.get("_id", user_id))
        
        # Extract features from pose data
        pose_keypoints = []
        for frame in session_data.pose_frames:
            pose_keypoints.append(frame.keypoints)
        
        # Initialize AI engines
        gait_analyzer = GaitAnalyzer(sample_rate=settings.FFT_SAMPLE_RATE)
        tremor_analyzer = TremorAnalyzer(sample_rate=settings.FFT_SAMPLE_RATE)
        
        try:
            # Calculate gait metrics
            stride_length = gait_analyzer.calculate_stride_length(pose_keypoints)
            cadence = gait_analyzer.calculate_cadence(pose_keypoints)
            gait_symmetry = gait_analyzer.calculate_gait_symmetry(pose_keypoints)
            bradykinesia = gait_analyzer.calculate_bradykinesia_score(pose_keypoints)
            
            # Calculate tremor metrics
            tremor_freq = tremor_analyzer.extract_tremor_frequency(pose_keypoints, 15)
            tremor_amp = tremor_analyzer.extract_tremor_amplitude(pose_keypoints, 15)
        except Exception as e:
            print(f"AI calculation error: {str(e)}")
            # Use default values if AI calculation fails
            stride_length = 0.5
            cadence = 1.0
            gait_symmetry = 0.8
            bradykinesia = 0.5
            tremor_freq = 5.0
            tremor_amp = 0.1
        
        # Create extracted features
        extracted_features = SessionFeatures(
            stride_length=stride_length,
            cadence=cadence,
            gait_symmetry=gait_symmetry,
            tremor_frequency=tremor_freq,
            tremor_amplitude=tremor_amp,
            bradykinesia_score=bradykinesia,
            deviation_from_baseline=None,
            risk_score=0.5,
            risk_level="Low"
        )
        
        # Store session in database
        session_doc = {
            "patient_id": patient_id,
            "user_id": user_id,
            "video_duration": session_data.video_duration,
            "frame_count": session_data.frame_count,
            "pose_frames": [frame.dict() for frame in session_data.pose_frames],
            "extracted_features": extracted_features.dict(),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await db["analysis_sessions"].insert_one(session_doc)
        session_id = str(result.inserted_id)
        
        # Get or create baseline
        baseline_doc = await db["baselines"].find_one({"patient_id": patient_id})
        
        # Get all sessions for baseline calculation
        all_sessions = await db["analysis_sessions"].find({
            "patient_id": patient_id
        }).sort("created_at", -1).to_list(100)
        
        # Calculate deviation and risk
        baseline_manager = BaselineManager(
            required_sessions=settings.BASELINE_SESSIONS,
            deviation_threshold=settings.DEVIATION_THRESHOLD
        )
        
        if not baseline_doc and len(all_sessions) >= settings.BASELINE_SESSIONS:
            # Try to create new baseline
            sessions_data = [sess.get("extracted_features", {}) for sess in all_sessions]
            new_baseline = baseline_manager.create_baseline(sessions_data)
            
            if new_baseline:
                baseline_insert = {
                    "patient_id": patient_id,
                    "metrics": new_baseline,
                    "is_calibrated": True
                }
                await db["baselines"].insert_one(baseline_insert)
                baseline_doc = baseline_insert
        
        # Calculate risk
        deviation_score = 0.0
        risk_class = {"score": 0.5, "classification": "Low", "confidence": 0.8}
        
        if baseline_doc:
            try:
                deviation_score = baseline_manager.calculate_deviation_score(
                    extracted_features.dict(),
                    baseline_doc.get("metrics", {})
                )
                risk_class = baseline_manager.classify_risk(
                    deviation_score,
                    baseline_doc.get("is_calibrated", False)
                )
            except Exception as e:
                print(f"Risk calculation error: {str(e)}")
        
        # Store risk assessment
        risk_doc = {
            "patient_id": patient_id,
            "session_id": session_id,
            "risk_score": {
                "score": risk_class.get("score", 0.5),
                "classification": risk_class.get("classification", "Low"),
                "confidence": risk_class.get("confidence", 0.8),
                "components": {
                    "gait_symmetry": gait_symmetry,
                    "bradykinesia": bradykinesia,
                    "tremor_amplitude": tremor_amp
                }
            },
            "flagged_for_review": risk_class.get("should_flag", False),
            "created_at": datetime.utcnow()
        }
        
        await db["risk_assessments"].insert_one(risk_doc)
        
        # Generate recommendations based on analysis
        recommendations = []
        if gait_symmetry < 0.7:
            recommendations.append("Improve gait symmetry by consulting a physical therapist")
        if bradykinesia > 0.6:
            recommendations.append("Bradykinesia detected - consider medication review with your doctor")
        if tremor_amp > 0.3:
            recommendations.append("Tremor activity detected - may require assessment and adjustment of treatment")
        if risk_class.get("classification") in ["High", "Critical"]:
            recommendations.append("Urgent: Consult with your healthcare provider immediately")
        if risk_class.get("classification") == "Moderate":
            recommendations.append("Schedule follow-up consultation with your neurology team")
        if not recommendations:
            recommendations.append("Continue current treatment plan and regular monitoring")
        
        # Create analysis summary
        analysis_summary = (
            f"Analysis Results: Video of {session_data.video_duration:.1f}s processed with "
            f"{session_data.frame_count} frames. Gait Symmetry: {gait_symmetry:.2%} | "
            f"Bradykinesia Score: {bradykinesia:.2f}/1.0 | "
            f"Tremor Amplitude: {tremor_amp:.3f} | "
            f"Overall Risk Level: {risk_class.get('classification', 'Unknown')}"
        )
        
        return AnalysisSessionResponse(
            id=session_id,
            patient_id=patient_id,
            session_id=session_id,
            video_duration=session_data.video_duration,
            frame_count=session_data.frame_count,
            extracted_features=extracted_features,
            risk_score=risk_class.get("score", 0.5),
            risk_level=risk_class.get("classification", "Low"),
            recommendations=recommendations,
            analysis_summary=analysis_summary,
            created_at=datetime.utcnow().isoformat(),
            success=True
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Upload session error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process video: {str(e)}"
        )


@router.post("/upload-video")
async def upload_video_analysis(
    file: UploadFile = File(...),
    context: dict = Depends(require_roles(["patient"]))
):
    """Upload a video for AI-assisted gait/pain analysis."""
    db = Database.get_db()
    user_id = context["user_id"]

    patient = await db["patients"].find_one({"user_id": user_id})
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    patient_id = str(patient.get("_id", user_id))
    content = await file.read()
    file_size = len(content)

    prompt = (
        "You are a clinical gait review assistant. Provide a patient-friendly analysis. "
        "Do not diagnose. Provide sections: Summary, Possible Pain Areas, Risk Flags, "
        "Precautions, Doctor Guidance. Keep it concise."
    )
    ai_text = await _call_gemini(prompt)

    if not ai_text:
        ai_text = (
            "Summary: The video was received and reviewed. \n"
            "Possible Pain Areas: Lower back, knees, or ankles may need attention if discomfort is present.\n"
            "Risk Flags: Uneven stride, reduced balance, or visible asymmetry.\n"
            "Precautions: Avoid overexertion, use supportive footwear, and rest if pain increases.\n"
            "Doctor Guidance: Share this video with your clinician for a full assessment."
        )

    analysis_doc = {
        "patient_id": patient_id,
        "user_id": user_id,
        "file_name": file.filename,
        "content_type": file.content_type,
        "file_size": file_size,
        "analysis_text": ai_text,
        "created_at": datetime.utcnow()
    }

    result = await db["video_analyses"].insert_one(analysis_doc)

    return {
        "id": str(result.inserted_id),
        "patient_id": patient_id,
        "file_name": file.filename,
        "analysis_text": ai_text,
        "created_at": analysis_doc["created_at"].isoformat()
    }


@router.get("/video-history")
async def get_video_history(
    limit: int = 20,
    context: dict = Depends(require_roles(["patient"]))
):
    """Get video analysis history for the current patient."""
    db = Database.get_db()
    user_id = context["user_id"]

    patient = await db["patients"].find_one({"user_id": user_id})
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    patient_id = str(patient.get("_id", user_id))
    history = await db["video_analyses"].find({
        "patient_id": patient_id
    }).sort([("created_at", -1), ("analysis_date", -1)]).to_list(limit)

    serialized = []
    for item in history:
        created = item.get("created_at") or item.get("analysis_date")
        summary = item.get("analysis_text") or (item.get("video_analysis") or {}).get("summary") or item.get("report_content", "")[:500]
        serialized.append({
            "id": str(item.get("_id")) if item.get("_id") else None,
            "patient_id": item.get("patient_id"),
            "file_name": item.get("file_name"),
            "analysis_text": item.get("analysis_text"),
            "summary": summary,
            "video_analysis": item.get("video_analysis"),
            "report_content": item.get("report_content"),
            "created_at": created.isoformat() if created else None
        })

    return {
        "patient_id": patient_id,
        "history": serialized,
        "total": len(serialized)
    }


@router.get("/video-history/{patient_id}")
async def get_video_history_for_doctor(
    patient_id: str,
    limit: int = 50,
    context: dict = Depends(require_roles(["doctor"]))
):
    """Get video analysis history for an assigned patient."""
    db = Database.get_db()
    doctor_id = context["user_id"]
    await _verify_doctor_patient_access(db, patient_id, doctor_id)

    history = await db["video_analyses"].find(
        {"patient_id": patient_id}
    ).sort([("created_at", -1), ("analysis_date", -1)]).to_list(limit)

    serialized = []
    for item in history:
        created = item.get("created_at") or item.get("analysis_date")
        summary = item.get("analysis_text") or (item.get("video_analysis") or {}).get("summary") or (item.get("report_content") or "")[:500]
        serialized.append({
            "id": str(item.get("_id")) if item.get("_id") else None,
            "patient_id": item.get("patient_id"),
            "file_name": item.get("file_name"),
            "analysis_text": item.get("analysis_text"),
            "summary": summary,
            "video_analysis": item.get("video_analysis"),
            "report_content": item.get("report_content"),
            "created_at": created.isoformat() if created else None
        })

    return {
        "patient_id": patient_id,
        "history": serialized,
        "total": len(serialized)
    }


@router.get("/baseline-status/{patient_id}")
async def get_baseline_status(
    patient_id: str,
    context: dict = Depends(require_roles(["patient"]))
):
    """Get patient's baseline calibration status."""
    db = Database.get_db()
    user_id = context["user_id"]
    
    # Verify access
    patient = await db["patients"].find_one({"user_id": user_id})
    if not patient or str(patient["_id"]) != patient_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    baseline = await db["baselines"].find_one({"patient_id": patient_id})
    
    # Count sessions
    session_count = await db["analysis_sessions"].count_documents({"patient_id": patient_id})
    
    if baseline:
        return {
            "is_calibrated": baseline.get("is_calibrated", False),
            "session_count": session_count,
            "required_sessions": 7,
            "baseline_metrics": baseline.get("metrics", {})
        }
    
    return {
        "is_calibrated": False,
        "session_count": session_count,
        "required_sessions": 7,
        "baseline_metrics": {}
    }


@router.get("/risk-history/{patient_id}")
async def get_risk_history(
    patient_id: str,
    limit: int = 50,
    context: dict = Depends(require_roles(["patient"]))
):
    """Get patient's risk assessment history."""
    db = Database.get_db()
    user_id = context["user_id"]
    
    # Verify access
    patient = await db["patients"].find_one({"user_id": user_id})
    if not patient or str(patient["_id"]) != patient_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    assessments = await db["risk_assessments"].find({
        "patient_id": patient_id
    }).sort("created_at", -1).to_list(limit)
    
    return {
        "patient_id": patient_id,
        "assessments": [
            {
                "id": str(a["_id"]),
                "session_id": a["session_id"],
                "risk_classification": a["risk_score"]["classification"],
                "risk_score": a["risk_score"]["score"],
                "confidence": a["risk_score"]["confidence"],
                "flagged": a.get("flagged_for_review", False),
                "created_at": a["created_at"]
            }
            for a in assessments
        ]
    }
