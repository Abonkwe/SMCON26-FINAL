"""WhatsApp agent schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class WhatsAppLinkStartResponse(BaseModel):
    """Response containing 6-digit linking code for WhatsApp."""

    linking_code: str
    expires_at: datetime
    instructions: str


class WhatsAppLinkVerifyRequest(BaseModel):
    """WhatsApp linking verification."""

    sender_phone: str = Field(..., description="WhatsApp sender E.164 phone number")
    linking_code: str = Field(..., min_length=6, max_length=6)
