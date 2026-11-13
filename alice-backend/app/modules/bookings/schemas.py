"""Booking and quotation schemas."""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class BookingCreateRequest(BaseModel):
    """Payload to request a service from a provider."""

    provider_id: str
    service_id: str
    area_id: str
    address_snapshot: Dict[str, Any] = Field(..., description="Snapshot of delivery address")
    description: str = Field(..., min_length=10, description="Description of the requested work")
    scheduled_at: Optional[datetime] = None


class QuotationLineItem(BaseModel):
    """Quotation item breakdown."""

    description: str = Field(..., min_length=2)
    amount_xaf: int = Field(..., ge=0, description="Amount in integer XAF")


class QuotationCreateRequest(BaseModel):
    """Provider quotation submission."""

    line_items: List[QuotationLineItem] = Field(..., min_length=1)
    notes: Optional[str] = None


class QuotationResponse(BaseModel):
    """Quotation response."""

    quotation_id: str
    booking_id: str
    provider_id: str
    version: int
    line_items: List[QuotationLineItem]
    total_xaf: int
    valid_until: datetime
    status: str
    accepted_at: Optional[datetime] = None


class BookingStatusUpdate(BaseModel):
    """Booking state transition request."""

    new_status: str
    checkin_pin: Optional[str] = None
    reason: Optional[str] = None


class BookingResponse(BaseModel):
    """Full booking details."""

    booking_id: str
    customer_id: str
    provider_id: str
    service_id: str
    area_id: str
    address_snapshot: Dict[str, Any]
    description: str
    scheduled_at: Optional[datetime] = None
    price_basis: str
    status: str
    checkin_pin: Optional[str] = None
    created_at: datetime
    updated_at: datetime
