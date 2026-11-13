"""Liveness and readiness health check endpoints."""

from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.logging import logger
from app.integrations.supabase.client import get_supabase_client

router = APIRouter(tags=["Health"])


@router.get("/health", summary="Liveness Probe", status_code=status.HTTP_200_OK)
async def liveness_check() -> Dict[str, Any]:
    """Check if the FastAPI service is running and responsive."""
    settings = get_settings()
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/ready", summary="Readiness Probe")
async def readiness_check() -> JSONResponse:
    """Verify backend readiness and database connectivity without leaking credentials."""
    settings = get_settings()
    checks: Dict[str, str] = {
        "api": "ok",
        "database": "unknown",
    }
    is_ready = True

    try:
        supabase = get_supabase_client()
        # Querying service_categories to verify database connectivity
        _ = supabase.client.table("service_categories").select("category_id").limit(1).execute()
        checks["database"] = "reachable"
    except Exception as e:
        logger.warning("Readiness probe database check warning: %s", str(e))
        # In local/mock dev, mark mock mode or degraded without failing liveness
        if settings.ENVIRONMENT == "development" and "mock" in settings.SUPABASE_URL:
            checks["database"] = "mock_mode_active"
        else:
            checks["database"] = "degraded"
            is_ready = False

    status_code = status.HTTP_200_OK if is_ready else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "ready" if is_ready else "not_ready",
            "service": settings.PROJECT_NAME,
            "checks": checks,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )
