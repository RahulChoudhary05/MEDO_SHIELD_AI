from .patients import router as patients_router
from .analysis import router as analysis_router
from .doctors import router as doctors_router
from .health import router as health_router

__all__ = ["patients_router", "analysis_router", "doctors_router", "health_router"]
