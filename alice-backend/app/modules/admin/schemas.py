"""Admin and audit log schemas."""

from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class AuditLogEntry(BaseModel):
    """Immutable audit log record schema."""

    audit_id: str
    actor_id: Optional[str] = None
    action: str
    entity_type: str
    entity_id: str
    reason: Optional[str] = None
    safe_metadata: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime


class AdminMetricsResponse(BaseModel):
    """High-level platform health and operation metrics."""

    total_users: int
    total_providers: int
    pending_identity_verifications: int
    pending_competence_verifications: int
    active_bookings: int
    active_rentals: int
    open_disputes: int
