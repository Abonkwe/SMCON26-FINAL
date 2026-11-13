"""Verification schemas for identity and competence submissions."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class IdentityVerificationSubmit(BaseModel):
    """Payload to submit identity document."""

    document_type: str = Field(
        ...,
        description="NATIONAL_ID, PASSPORT, STUDENT_ID, VOTER_CARD, RESIDENCE_PERMIT",
    )
    private_file_ref: str = Field(
        ...,
        description="Reference path in private-verification bucket",
    )


class CompetenceCredentialSubmit(BaseModel):
    """Payload to submit professional competence evidence for a service."""

    service_id: str = Field(..., description="UUID of the restricted/high-risk service")
    evidence_type: str = Field(
        ...,
        description="DIPLOMA_CERTIFICATE, TRADE_REFERENCE, PORTFOLIO_PHOTO, GOVERNMENT_PERMIT",
    )
    private_file_ref: str = Field(..., description="Path in private-verification bucket")
    issuer: Optional[str] = Field(None, description="Certifying body or previous employer")


class VerificationReviewAction(BaseModel):
    """Payload for admin decision on verification queue items."""

    decision: str = Field(..., description="VERIFIED, REJECTED, ADDITIONAL_INFORMATION_REQUIRED")
    decision_reason: str = Field(..., min_length=5, description="Mandatory audit explanation")


class VerificationItemResponse(BaseModel):
    """Response model for a verification record."""

    verification_id: str
    user_id: str
    verification_type: str  # 'IDENTITY' or 'COMPETENCE'
    document_type_or_evidence: str
    service_id: Optional[str] = None
    private_file_ref: str
    status: str
    signed_preview_url: Optional[str] = None
    submitted_at: datetime
    reviewed_at: Optional[datetime] = None
    decision_reason: Optional[str] = None
