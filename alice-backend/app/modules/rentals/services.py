"""Rentals business logic, anti-overlap concurrency, and power compatibility calculator."""

import math
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.core.logging import logger
from app.modules.rentals.schemas import (
    PowerCompatibilityRequest,
    PowerCompatibilityResponse,
    RentalBookingCreate,
    RentalInspectionCreate,
    RentalListingCreate,
)

# Demo in-memory store for rental listings and bookings
_RENTAL_LISTINGS_STORE: Dict[str, Dict[str, Any]] = {
    # Pre-seeded 2kWh EcoFlow power station in Molyko
    "rental-listing-1": {
        "listing_id": "rental-listing-1",
        "owner_provider_id": "provider-demo-1",
        "item_name": "EcoFlow DELTA 2 Max (2048 Wh)",
        "brand": "EcoFlow",
        "model": "DELTA 2 Max",
        "capacity_wh": 2048,
        "continuous_output_w": 2400,
        "peak_output_w": 4800,
        "condition": "EXCELLENT",
        "daily_rate_xaf": 15000,
        "deposit_xaf": 30000,
        "accessories_included": ["AC Fast Charger", "Car 12V Charging Cable", "Solar XT60 Adapter"],
        "owner_attestation": True,
        "active": True,
    }
}

_RENTAL_BOOKINGS_STORE: Dict[str, Dict[str, Any]] = {}
_RENTAL_INSPECTIONS_STORE: Dict[str, List[Dict[str, Any]]] = {}


def create_listing(provider_id: str, payload: RentalListingCreate) -> Dict[str, Any]:
    """Provider registers a portable power station or backup generator."""
    if payload.peak_output_w < payload.continuous_output_w:
        raise ValidationError("Peak output (Watts) must be greater than or equal to continuous output (Watts)")

    listing_id = str(uuid.uuid4())
    record = {
        "listing_id": listing_id,
        "owner_provider_id": provider_id,
        "item_name": payload.item_name,
        "brand": payload.brand,
        "model": payload.model,
        "capacity_wh": payload.capacity_wh,
        "continuous_output_w": payload.continuous_output_w,
        "peak_output_w": payload.peak_output_w,
        "condition": payload.condition,
        "daily_rate_xaf": payload.daily_rate_xaf,
        "deposit_xaf": payload.deposit_xaf,
        "accessories_included": payload.accessories_included,
        "owner_attestation": payload.owner_attestation,
        "active": True,
    }
    _RENTAL_LISTINGS_STORE[listing_id] = record
    logger.info(
        "Created rental listing %s for %s (%d Wh / %d W)",
        listing_id,
        payload.item_name,
        payload.capacity_wh,
        payload.continuous_output_w,
    )
    return record


def list_listings() -> List[Dict[str, Any]]:
    """List all active rental equipment."""
    return [listing for listing in _RENTAL_LISTINGS_STORE.values() if listing.get("active")]


def calculate_power_compatibility(payload: PowerCompatibilityRequest) -> PowerCompatibilityResponse:
    """Evaluate appliance electrical demand against power station specs (FR-RENT-008)."""
    # Sum total daily energy required: E = sum(P_i * t_i) [Wh]
    total_energy_wh = sum(app.watts * app.daily_hours for app in payload.appliances)

    # Inverter efficiency factor: 85% usable energy due to DC->AC inverter conversion
    usable_energy_wh = payload.capacity_wh * 0.85

    # Calculate peak concurrent power load: P_peak = sum(P_concurrent) [W]
    concurrent_watts = sum(app.watts for app in payload.appliances if app.is_concurrent)
    if concurrent_watts == 0 and payload.appliances:
        concurrent_watts = max(app.watts for app in payload.appliances)

    warnings: List[str] = []
    is_compatible = True

    # Check 1: Inverter continuous output limit
    if concurrent_watts > payload.continuous_output_w:
        is_compatible = False
        warnings.append(
            f"Peak load of {concurrent_watts}W exceeds inverter continuous output of {payload.continuous_output_w}W. "
            "High risk of inverter tripping or shutdown."
        )

    # Check 2: Total battery capacity limit
    if total_energy_wh > usable_energy_wh:
        warnings.append(
            f"Energy demand of {total_energy_wh:.0f}Wh exceeds estimated usable capacity of {usable_energy_wh:.0f}Wh (at 85% efficiency). "
            "The battery will run out before completing your desired hours."
        )

    # Estimate average runtime
    avg_load_w = total_energy_wh / 24.0 if total_energy_wh > 0 else 1.0
    estimated_runtime_hours = round(usable_energy_wh / avg_load_w, 1) if avg_load_w > 0 else 24.0

    return PowerCompatibilityResponse(
        total_energy_wh=round(total_energy_wh, 1),
        usable_energy_wh=round(usable_energy_wh, 1),
        peak_concurrent_watts=concurrent_watts,
        estimated_runtime_hours=min(estimated_runtime_hours, 24.0),
        is_compatible=is_compatible,
        warnings=warnings,
    )


def book_rental(
    customer_id: str,
    payload: RentalBookingCreate,
    idempotency_key: Optional[str] = None,
) -> Dict[str, Any]:
    """Book a rental period with atomic anti-overlap check (AC-07, FR-RENT-005)."""
    listing = _RENTAL_LISTINGS_STORE.get(payload.listing_id)
    if not listing:
        raise NotFoundError("RentalListing", payload.listing_id)

    if payload.end_at <= payload.start_at:
        raise ValidationError("Rental end time must be after start time")

    # Anti-overlap check: prevent concurrent bookings of the same unit
    for b in _RENTAL_BOOKINGS_STORE.values():
        if b["listing_id"] == payload.listing_id and b["status"] in (
            "CONFIRMED",
            "READY_FOR_HANDOVER",
            "ACTIVE",
            "RETURN_DUE",
        ):
            # Check overlap: (start_1 < end_2) and (end_1 > start_2)
            if payload.start_at < b["end_at"] and payload.end_at > b["start_at"]:
                logger.warning(
                    "Rental conflict: Listing %s already booked from %s to %s",
                    payload.listing_id,
                    b["start_at"],
                    b["end_at"],
                )
                raise ConflictError(
                    "The selected power station is already booked for this date/time window. Please choose different dates.",
                    code="RENTAL_PERIOD_OVERLAP",
                )

    rental_id = str(uuid.uuid4())
    # Calculate days for pricing
    duration_seconds = (payload.end_at - payload.start_at).total_seconds()
    days = max(1, math.ceil(duration_seconds / 86400))
    total_price_xaf = days * listing["daily_rate_xaf"]

    booking = {
        "rental_id": rental_id,
        "listing_id": payload.listing_id,
        "customer_id": customer_id,
        "provider_id": listing["owner_provider_id"],
        "start_at": payload.start_at,
        "end_at": payload.end_at,
        "total_price_xaf": total_price_xaf,
        "deposit_amount_xaf": listing["deposit_xaf"],
        "deposit_status": "PENDING",
        "status": "CONFIRMED",  # Confirmed on booking for demonstration
        "created_at": datetime.now(timezone.utc),
    }

    _RENTAL_BOOKINGS_STORE[rental_id] = booking
    logger.info(
        "Rental booking %s created for listing %s (%d days, %d XAF)",
        rental_id,
        payload.listing_id,
        days,
        total_price_xaf,
    )
    return booking


def record_inspection(rental_id: str, actor_id: str, payload: RentalInspectionCreate) -> Dict[str, Any]:
    """Record handover or return condition inspection."""
    if rental_id not in _RENTAL_BOOKINGS_STORE:
        raise NotFoundError("RentalBooking", rental_id)

    insp_id = str(uuid.uuid4())
    inspection = {
        "inspection_id": insp_id,
        "rental_id": rental_id,
        "actor_id": actor_id,
        "stage": payload.stage,
        "accessories_present": payload.accessories_present,
        "serial_number_verified": payload.serial_number_verified,
        "condition_notes": payload.condition_notes,
        "timestamp": datetime.now(timezone.utc),
    }
    if rental_id not in _RENTAL_INSPECTIONS_STORE:
        _RENTAL_INSPECTIONS_STORE[rental_id] = []
    _RENTAL_INSPECTIONS_STORE[rental_id].append(inspection)
    return inspection
