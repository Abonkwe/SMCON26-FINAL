"""Booking and quotation business logic and state machine engine."""

import random
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from app.core.exceptions import ForbiddenError, NotFoundError, ValidationError
from app.core.logging import logger
from app.modules.bookings.schemas import (
    BookingCreateRequest,
    BookingStatusUpdate,
    QuotationCreateRequest,
)

# In-memory storage for bookings and quotations
_BOOKINGS_STORE: Dict[str, Dict[str, Any]] = {}
_QUOTATIONS_STORE: Dict[str, Dict[str, Any]] = {}
_IDEMPOTENCY_STORE: Dict[str, str] = {}


# Allowed state transitions per SRS Section 6.2
ALLOWED_BOOKING_TRANSITIONS = {
    "REQUESTED": ["QUOTATION_PENDING", "ACCEPTED", "CANCELLED"],
    "QUOTATION_PENDING": ["QUOTATION_RECEIVED", "CANCELLED"],
    "QUOTATION_RECEIVED": ["ACCEPTED", "CANCELLED"],
    "ACCEPTED": ["CONFIRMED", "CANCELLED"],
    "CONFIRMED": ["IN_PROGRESS", "CANCELLED", "DISPUTED"],
    "IN_PROGRESS": ["COMPLETED_PENDING_CONFIRMATION", "DISPUTED"],
    "COMPLETED_PENDING_CONFIRMATION": ["COMPLETED", "DISPUTED"],
    "COMPLETED": [],  # Terminal
    "CANCELLED": [],  # Terminal
    "DISPUTED": ["COMPLETED", "CANCELLED"],
}


def create_service_booking(
    customer_id: str,
    payload: BookingCreateRequest,
    idempotency_key: Optional[str] = None,
) -> Dict[str, Any]:
    """Create a new service request booking in REQUESTED state."""
    if idempotency_key and idempotency_key in _IDEMPOTENCY_STORE:
        existing_id = _IDEMPOTENCY_STORE[idempotency_key]
        return _BOOKINGS_STORE[existing_id]

    booking_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    booking = {
        "booking_id": booking_id,
        "idempotency_key": idempotency_key,
        "customer_id": customer_id,
        "provider_id": payload.provider_id,
        "service_id": payload.service_id,
        "area_id": payload.area_id,
        "address_snapshot": payload.address_snapshot,
        "description": payload.description,
        "scheduled_at": payload.scheduled_at,
        "price_basis": "QUOTE_REQUIRED",
        "status": "REQUESTED",
        "checkin_pin": None,
        "created_at": now,
        "updated_at": now,
    }

    _BOOKINGS_STORE[booking_id] = booking
    if idempotency_key:
        _IDEMPOTENCY_STORE[idempotency_key] = booking_id

    logger.info("Created booking %s for customer %s with provider %s", booking_id, customer_id, payload.provider_id)
    return booking


def get_booking(booking_id: str) -> Dict[str, Any]:
    """Retrieve booking by ID."""
    booking = _BOOKINGS_STORE.get(booking_id)
    if not booking:
        raise NotFoundError("Booking", booking_id)
    return booking


def create_quotation(
    provider_id: str,
    booking_id: str,
    payload: QuotationCreateRequest,
) -> Dict[str, Any]:
    """Provider submits an itemized quotation."""
    booking = get_booking(booking_id)

    if booking["provider_id"] != provider_id:
        raise ForbiddenError("Only the designated service provider can submit a quotation for this booking")

    # Sum line items strictly in integer XAF
    total_xaf = sum(item.amount_xaf for item in payload.line_items)
    now = datetime.now(timezone.utc)
    valid_until = now + timedelta(hours=24)  # 24-hour default validity (Section 15.4)

    quotation_id = str(uuid.uuid4())
    quotation = {
        "quotation_id": quotation_id,
        "booking_id": booking_id,
        "provider_id": provider_id,
        "version": 1,
        "line_items": [item.model_dump() for item in payload.line_items],
        "total_xaf": total_xaf,
        "currency": "XAF",
        "valid_until": valid_until,
        "status": "PENDING",
        "accepted_at": None,
        "created_at": now,
    }

    _QUOTATIONS_STORE[quotation_id] = quotation

    # Transition booking status to QUOTATION_RECEIVED
    booking["status"] = "QUOTATION_RECEIVED"
    booking["updated_at"] = now
    logger.info("Quotation %s created for booking %s. Total: %d XAF", quotation_id, booking_id, total_xaf)
    return quotation


def accept_quotation(customer_id: str, quotation_id: str) -> Dict[str, Any]:
    """Customer accepts provider quotation, generating 4-digit check-in PIN and confirming booking."""
    quotation = _QUOTATIONS_STORE.get(quotation_id)
    if not quotation:
        raise NotFoundError("Quotation", quotation_id)

    booking = get_booking(quotation["booking_id"])
    if booking["customer_id"] != customer_id:
        raise ForbiddenError("Only the booking customer can accept this quotation")

    now = datetime.now(timezone.utc)
    if quotation["valid_until"] < now:
        quotation["status"] = "EXPIRED"
        raise ValidationError("This quotation has expired. Please request a refreshed quote.")

    # Generate 4-digit job check-in PIN
    pin = f"{random.randint(1000, 9999)}"

    quotation["status"] = "ACCEPTED"
    quotation["accepted_at"] = now

    booking["status"] = "CONFIRMED"
    booking["checkin_pin"] = pin
    booking["price_basis"] = f"FIXED_QUOTE_{quotation['total_xaf']}_XAF"
    booking["updated_at"] = now

    logger.info("Quotation %s accepted for booking %s. PIN generated.", quotation_id, booking["booking_id"])
    return {
        "status": "success",
        "booking_id": booking["booking_id"],
        "quotation_id": quotation_id,
        "booking_status": booking["status"],
        "checkin_pin": pin,
        "total_xaf": quotation["total_xaf"],
    }


def update_booking_status(
    user_id: str,
    booking_id: str,
    payload: BookingStatusUpdate,
) -> Dict[str, Any]:
    """Enforce the Section 6.2 booking state machine."""
    booking = get_booking(booking_id)

    # Caller must be customer, provider, or admin
    is_customer = booking["customer_id"] == user_id
    is_provider = booking["provider_id"] == user_id
    if not (is_customer or is_provider):
        raise ForbiddenError("You are not an authorized participant in this booking")

    current_status = booking["status"]
    allowed = ALLOWED_BOOKING_TRANSITIONS.get(current_status, [])

    if payload.new_status not in allowed:
        raise ValidationError(
            f"Illegal booking status transition from '{current_status}' to '{payload.new_status}'. Allowed: {allowed}",
            details={"current_status": current_status, "requested_status": payload.new_status, "allowed": allowed},
        )

    # Validating checkin PIN when transitioning from CONFIRMED -> IN_PROGRESS
    if current_status == "CONFIRMED" and payload.new_status == "IN_PROGRESS":
        if not payload.checkin_pin or payload.checkin_pin != booking.get("checkin_pin"):
            raise ValidationError("Invalid check-in PIN. Provider must provide the correct customer PIN.")

    now = datetime.now(timezone.utc)
    booking["status"] = payload.new_status
    booking["updated_at"] = now

    logger.info(
        "Booking %s transitioned from %s to %s by user %s", booking_id, current_status, payload.new_status, user_id
    )
    return booking
