"""Schemas for Meta WhatsApp Cloud API agent, account linking, and webhook payloads."""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class WhatsAppLinkStartResponse(BaseModel):
    """Response containing 6-digit linking code for WhatsApp account connection."""

    linking_code: str = Field(..., description="6-digit one-time linking code")
    expires_at: datetime = Field(..., description="Expiration timestamp (10 minutes)")
    instructions: str = Field(..., description="Instructions for completing the link")


class WhatsAppLinkConfirmRequest(BaseModel):
    """Request payload to confirm account linking from web/PWA or mobile."""

    phone_number: str = Field(
        ...,
        description="WhatsApp phone number (local 9-digit or E.164 +237...)",
        examples=["+237671234567", "671234567"],
    )
    linking_code: str = Field(
        ...,
        min_length=6,
        max_length=6,
        description="6-digit verification code generated in /link/start",
    )


class WhatsAppLinkConfirmResponse(BaseModel):
    """Response returned upon successful account linking."""

    status: str = "LINKED"
    phone_number: str
    user_id: str
    message: str


class WhatsAppWebhookResponse(BaseModel):
    """Immediate acknowledgment response returned to Meta WhatsApp webhook."""

    status: str = "ok"


class WhatsAppMessageTrace(BaseModel):
    """Audit and operational trace of a processed WhatsApp interaction."""

    wamid: str
    sender_phone: str
    user_id: Optional[str] = None
    direction: str = "INBOUND"
    intent: Optional[str] = None
    response_sent: Optional[str] = None
    status: str = "PROCESSED"
