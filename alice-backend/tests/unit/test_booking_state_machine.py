"""Unit tests for the booking state machine transitions."""

import pytest

from app.core.exceptions import ValidationError
from app.modules.bookings.schemas import (
    BookingCreateRequest,
    BookingStatusUpdate,
    QuotationCreateRequest,
    QuotationLineItem,
)
from app.modules.bookings.services import (
    accept_quotation,
    create_quotation,
    create_service_booking,
    update_booking_status,
)


def test_valid_booking_lifecycle():
    """Verify complete valid transition: REQUESTED -> QUOTATION_RECEIVED -> CONFIRMED -> IN_PROGRESS -> COMPLETED_PENDING -> COMPLETED."""
    customer_id = "cust-1"
    provider_id = "prov-1"

    # 1. Create booking
    booking = create_service_booking(
        customer_id=customer_id,
        payload=BookingCreateRequest(
            provider_id=provider_id,
            service_id="serv-1",
            area_id="area-1",
            address_snapshot={"landmark": "Checkpoint Total"},
            description="Fixing bathroom tap leak",
        ),
    )
    assert booking["status"] == "REQUESTED"

    # 2. Provider submits quote -> transitions to QUOTATION_RECEIVED
    quote = create_quotation(
        provider_id=provider_id,
        booking_id=booking["booking_id"],
        payload=QuotationCreateRequest(
            line_items=[
                QuotationLineItem(description="Labour", amount_xaf=4000),
                QuotationLineItem(description="Replacement Washer", amount_xaf=1500),
            ]
        ),
    )
    assert quote["total_xaf"] == 5500
    assert booking["status"] == "QUOTATION_RECEIVED"

    # 3. Customer accepts quote -> transitions to CONFIRMED, generates PIN
    accepted = accept_quotation(customer_id=customer_id, quotation_id=quote["quotation_id"])
    assert accepted["booking_status"] == "CONFIRMED"
    pin = accepted["checkin_pin"]
    assert len(pin) == 4

    # 4. Provider checks in with PIN -> IN_PROGRESS
    b_progress = update_booking_status(
        user_id=provider_id,
        booking_id=booking["booking_id"],
        payload=BookingStatusUpdate(new_status="IN_PROGRESS", checkin_pin=pin),
    )
    assert b_progress["status"] == "IN_PROGRESS"

    # 5. Provider marks complete -> COMPLETED_PENDING_CONFIRMATION
    b_pending = update_booking_status(
        user_id=provider_id,
        booking_id=booking["booking_id"],
        payload=BookingStatusUpdate(new_status="COMPLETED_PENDING_CONFIRMATION"),
    )
    assert b_pending["status"] == "COMPLETED_PENDING_CONFIRMATION"

    # 6. Customer confirms completion -> COMPLETED
    b_done = update_booking_status(
        user_id=customer_id,
        booking_id=booking["booking_id"],
        payload=BookingStatusUpdate(new_status="COMPLETED"),
    )
    assert b_done["status"] == "COMPLETED"


def test_illegal_transition_rejection():
    """Attempting an illegal jump (e.g. REQUESTED -> COMPLETED) must raise ValidationError."""
    booking = create_service_booking(
        customer_id="cust-2",
        payload=BookingCreateRequest(
            provider_id="prov-2",
            service_id="serv-2",
            area_id="area-2",
            address_snapshot={"landmark": "Molyko Stadium"},
            description="Test illegal transition",
        ),
    )

    with pytest.raises(ValidationError):
        update_booking_status(
            user_id="cust-2",
            booking_id=booking["booking_id"],
            payload=BookingStatusUpdate(new_status="COMPLETED"),
        )
