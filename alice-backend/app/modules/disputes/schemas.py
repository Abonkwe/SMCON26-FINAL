"""Disputes and safety complaint schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ComplaintCreateRequest(BaseModel):
    """Payload to lodge a safety incident, misconduct report, or service complaint."""

    booking_id: Optional[str] = None
    rental_id: Optional[str] = None
    subject_user_id: Optional[str] = Field(None, description="Reported user ID")
    reason: str = Field(..., min_length=3, description="Brief category/summary")
    description: str = Field(..., min_length=10, description="Full factual narrative")
    severity: str = Field("MEDIUM", description="LOW, MEDIUM, HIGH, CRITICAL")


class ComplaintResponse(BaseModel):
    """Complaint submission response."""

    complaint_id: str
    case_ref: str
    reporter_id: str
    reason: str
    severity: str
    status: str
    created_at: datetime


class DisputeResolveRequest(BaseModel):
    """Admin resolution payload."""

    outcome: str = Field(..., description="UPHELD_CUSTOMER, UPHELD_PROVIDER, MUTUAL_RESOLUTION, DISMISSED")
    resolution_notes: str = Field(..., min_length=10)


class DisputeResponse(BaseModel):
    """Dispute case record."""

    dispute_id: str
    case_ref: str
    complaint_id: str
    assigned_admin_id: Optional[str] = None
    outcome: str
    resolution_notes: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
