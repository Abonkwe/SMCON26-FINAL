"""Rentals API router."""

from typing import List, Optional

from fastapi import APIRouter, Depends, Header, status

from app.core.security import AuthenticatedUser, get_current_user, require_role
from app.modules.rentals.schemas import (
    PowerCompatibilityRequest,
    PowerCompatibilityResponse,
    RentalBookingCreate,
    RentalBookingResponse,
    RentalInspectionCreate,
    RentalListingCreate,
    RentalListingResponse,
)
from app.modules.rentals.services import (
    book_rental,
    calculate_power_compatibility,
    create_listing,
    list_listings,
    record_inspection,
)

router = APIRouter(prefix="/rentals", tags=["Rentals"])


@router.get(
    "/listings", response_model=List[RentalListingResponse], summary="List Available Power Stations & Generators"
)
async def get_listings():
    """Retrieve all active portable power station and generator listings."""
    return list_listings()


@router.post(
    "/listings",
    response_model=RentalListingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Equipment Listing (Provider)",
)
async def create_rental_listing(
    payload: RentalListingCreate,
    current_user: AuthenticatedUser = Depends(require_role("PROVIDER")),
):
    """Provider creates a new power equipment listing with Wh capacity and W continuous/surge specs."""
    return create_listing(provider_id=current_user.user_id, payload=payload)


@router.post(
    "/compatibility-estimator",
    response_model=PowerCompatibilityResponse,
    summary="Appliance Runtime & Power Compatibility Check",
)
async def estimate_power(payload: PowerCompatibilityRequest):
    """Check if appliances are safe to run and calculate estimated runtime in hours (FR-RENT-008)."""
    return calculate_power_compatibility(payload)


@router.post(
    "/bookings",
    response_model=RentalBookingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Book Power Station Rental Window",
)
async def create_booking(
    payload: RentalBookingCreate,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Book a power station for a date range with atomic anti-overlap verification (AC-07)."""
    return book_rental(
        customer_id=current_user.user_id,
        payload=payload,
        idempotency_key=idempotency_key,
    )


@router.post(
    "/bookings/{rental_id}/inspections",
    status_code=status.HTTP_201_CREATED,
    summary="Record Handover / Return Inspection",
)
async def create_inspection(
    rental_id: str,
    payload: RentalInspectionCreate,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Log accessories, condition, serial number verification at handover or return."""
    return record_inspection(
        rental_id=rental_id,
        actor_id=current_user.user_id,
        payload=payload,
    )
