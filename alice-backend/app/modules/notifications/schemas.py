"""Notification schemas."""

from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class NotificationResponse(BaseModel):
    """Notification item schema."""

    notification_id: str
    recipient_id: str
    channel: str
    event_type: str
    title: str
    body: str
    payload_ref: Dict[str, Any]
    read_at: Optional[datetime] = None
    created_at: datetime


class NotificationPreferencesUpdate(BaseModel):
    """Preferences update schema."""

    whatsapp_opt_in: Optional[bool] = None
    language: Optional[str] = Field(None, pattern="^(en|fr)$")
    transactional_updates: Optional[bool] = None
    marketing_opt_in: Optional[bool] = None


class NotificationPreferencesResponse(BaseModel):
    """Preferences response."""

    user_id: str
    whatsapp_opt_in: bool
    language: str
    transactional_updates: bool
    marketing_opt_in: bool
