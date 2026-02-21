from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from bson import ObjectId
import os
from app.database import Database, settings
from app.routers import patients_router, analysis_router, doctors_router, health_router
import json
from datetime import datetime

# Custom JSON Encoder for ObjectId and datetime
class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await Database.connect_db()
    print("NEURO-SHIELD AI Backend Started")
    print(f"Environment: {settings.ENVIRONMENT}")
    print(f"Database: {settings.MONGODB_DB}")
    yield
    # Shutdown
    await Database.close_db()
    print("NEURO-SHIELD AI Backend Stopped")

# Create FastAPI app with custom encoder
app = FastAPI(
    title="MEDO SHIELD AI Backend",
    description="Professional AI-powered medical monitoring platform",
    version="2.0.0",
    lifespan=lifespan,
    json_encoder=CustomJSONEncoder
)

# CORS Middleware - MUST be added FIRST (before all other middleware)
allowed_origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",") if origin.strip()]
if not allowed_origins:
    allowed_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost",
        "http://127.0.0.1"
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)

# Register routers
app.include_router(patients_router)
app.include_router(analysis_router)
app.include_router(doctors_router)
app.include_router(health_router)

# Serve uploaded files (chat voice notes, attachments)
uploads_dir = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint - API information."""
    return {
        "name": "NEURO-SHIELD AI",
        "version": "1.0.0",
        "description": "Privacy-first AI-powered longitudinal neurodegenerative monitoring platform",
        "status": "operational",
        "docs": "/docs",
        "health": "/health"
    }

# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    db = Database.get_db()
    try:
        # Quick health check
        await db.command("ping")
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy",
        "database": db_status,
        "demo_mode": Database.demo_mode,
        "timestamp": __import__("datetime").datetime.utcnow().isoformat()
    }

# Error handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler."""
    return {
        "error": "Internal Server Error",
        "detail": str(exc) if settings.DEBUG else "An error occurred"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG
    )
