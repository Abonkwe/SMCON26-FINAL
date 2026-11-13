"""Bookings and quotations API router."""

from typing import Optional

from fastapi import APIRouter, Depends, Header, status

from app.core.security import AuthenticatedUser, get_current_user, require_role
from app.modules.bookings.schemas import (
    BookingCreateRequest,
    BookingResponse,
    BookingStatusUpdate,
    QuotationCreateRequest,
    QuotationResponse,
)
from app.modules.bookings.services import (
    accept_quotation,
    create_quotation,
    create_service_booking,
    get_booking,
    update_booking_status,
)

router = APIRouter(prefix="/bookings", tags=["Bookings"])


@router.post(
    "", response_model=BookingResponse, status_code=status.HTTP_201_CREATED, summary="Create Service Booking Request"
)
async def create_booking(
    payload: BookingCreateRequest,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Customer creates a service booking request with idempotency protection."""
    return create_service_booking(
        customer_id=current_user.user_id,
        payload=payload,
        idempotency_key=idempotency_key,
    )


@router.get("/{booking_id}", response_model=BookingResponse, summary="Get Booking Details")
async def get_booking_details(
    booking_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Retrieve details for a booking."""
    return get_booking(booking_id)


@router.post(
    "/{booking_id}/quotations",
    response_model=QuotationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit Quotation (Provider)",
)
async def submit_quote(
    booking_id: str,
    payload: QuotationCreateRequest,
    current_user: AuthenticatedUser = Depends(require_role("PROVIDER")),
):
    """Provider submits an itemized quotation with 24-hour validity."""
    return create_quotation(
        provider_id=current_user.user_id,
        booking_id=booking_id,
        payload=payload,
    )


@router.post("/quotations/{quotation_id}/accept", summary="Accept Quotation & Confirm Booking (Customer)")
async def accept_quote(
    quotation_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Customer accepts quotation, locking price and generating 4-digit check-in PIN."""
    return accept_quotation(
        customer_id=current_user.user_id,
        quotation_id=quotation_id,
    )


@router.patch("/{booking_id}/status", response_model=BookingResponse, summary="Update Booking State")
async def update_status(
    booking_id: str,
    payload: BookingStatusUpdate,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Enforce state machine transition (e.g. PIN validation on start, completion, cancellation)."""
    return update_booking_status(
        user_id=current_user.user_id,
        booking_id=booking_id,
        payload=payload,
    )
