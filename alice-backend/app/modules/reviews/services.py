"""Reviews business logic with completion gate enforcement (AC-09)."""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError, ValidationError
from app.core.logging import logger
from app.modules.bookings.services import _BOOKINGS_STORE
from app.modules.rentals.services import _RENTAL_BOOKINGS_STORE
from app.modules.reviews.schemas import ReviewCreateRequest

_REVIEWS_STORE: Dict[str, Dict[str, Any]] = {}


def submit_review(reviewer_id: str, payload: ReviewCreateRequest) -> Dict[str, Any]:
    """Submit a review with strict post-completion enforcement (AC-09, FR-REV-001)."""
    if not payload.booking_id and not payload.rental_id:
        raise ValidationError("Either booking_id or rental_id must be provided to submit a review")

    reviewee_id: Optional[str] = None

    if payload.booking_id:
        booking = _BOOKINGS_STORE.get(payload.booking_id)
        if not booking:
            raise NotFoundError("Booking", payload.booking_id)

        # GATING RULE (AC-09): Booking must be in COMPLETED state
        if booking["status"] != "COMPLETED":
            raise ValidationError(
                f"Reviews can only be submitted for COMPLETED bookings (current status: {booking['status']})",
                details={"status": booking["status"]},
            )

        # Caller must be the customer or provider
        if reviewer_id == booking["customer_id"]:
            reviewee_id = booking["provider_id"]
        elif reviewer_id == booking["provider_id"]:
            reviewee_id = booking["customer_id"]
        else:
            raise ForbiddenError("Only participants in this completed booking can submit a review")

        # Prevent duplicate reviews by the same user for this booking
        for r in _REVIEWS_STORE.values():
            if r.get("booking_id") == payload.booking_id and r.get("reviewer_id") == reviewer_id:
                raise ConflictError("You have already submitted a review for this booking")

    elif payload.rental_id:
        rental = _RENTAL_BOOKINGS_STORE.get(payload.rental_id)
        if not rental:
            raise NotFoundError("RentalBooking", payload.rental_id)

        if rental["status"] != "COMPLETED":
            raise ValidationError(
                f"Reviews can only be submitted for COMPLETED rentals (current status: {rental['status']})",
                details={"status": rental["status"]},
            )

        if reviewer_id == rental["customer_id"]:
            reviewee_id = rental["provider_id"]
        else:
            reviewee_id = rental["customer_id"]

    review_id = str(uuid.uuid4())
    record = {
        "review_id": review_id,
        "booking_id": payload.booking_id,
        "rental_id": payload.rental_id,
        "reviewer_id": reviewer_id,
        "reviewee_id": reviewee_id,
        "rating": payload.rating,
        "subratings": payload.subratings,
        "comment": payload.comment,
        "moderation_status": "PUBLISHED",
        "created_at": datetime.now(timezone.utc),
    }

    _REVIEWS_STORE[review_id] = record
    logger.info("Review %s created for reviewee %s (Rating: %d/5)", review_id, reviewee_id, payload.rating)
    return record


def list_provider_reviews(provider_id: str) -> List[Dict[str, Any]]:
    """List published reviews for a provider."""
    return [
        r
        for r in _REVIEWS_STORE.values()
        if r.get("reviewee_id") == provider_id and r.get("moderation_status") == "PUBLISHED"
    ]
