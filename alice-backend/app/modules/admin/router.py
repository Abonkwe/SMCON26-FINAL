"""Admin API router for platform metrics and audit logs."""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query

from app.core.security import AuthenticatedUser, require_role
from app.modules.admin.schemas import AdminMetricsResponse, AuditLogEntry
from app.modules.admin.services import calculate_platform_metrics, get_audit_logs

router = APIRouter(prefix="/admin", tags=["Admin Operations"])


@router.get("/metrics", response_model=AdminMetricsResponse, summary="Get Platform Metrics (Admin)")
async def get_metrics(
    current_user: AuthenticatedUser = Depends(require_role("ADMIN")),
):
    """Retrieve operational dashboard counts (verifications, bookings, rentals, disputes)."""
    return calculate_platform_metrics()


@router.get("/audit-logs", response_model=List[AuditLogEntry], summary="View Immutable Audit Logs (Admin)")
async def list_audit_logs(
    entity_type: Optional[str] = Query(None, description="Filter by entity type (e.g. Verification, Dispute, Booking)"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: AuthenticatedUser = Depends(require_role("ADMIN")),
):
    """Retrieve immutable audit trail entries."""
    return get_audit_logs(entity_type=entity_type, limit=limit, offset=offset)
