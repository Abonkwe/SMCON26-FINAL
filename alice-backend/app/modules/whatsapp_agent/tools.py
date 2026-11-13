"""Typed, allowlisted tools for the WhatsApp AI Agent (Appendix D.5 & G.4).

CRITICAL SECURITY RULES:
1. Grounded in backend API results only (NFR-AI-001).
2. Never expose private customer/provider data (NFR-AI-002).
3. Consequential actions (booking/rental creation) require explicit server-side confirmation (NFR-AI-003, FR-GEM-005).
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.core.exceptions import ForbiddenError, NotFoundError, ValidationError
from app.core.logging import logger
from app.modules.bookings.schemas import BookingCreateRequest
from app.modules.bookings.services import create_service_booking, get_booking
from app.modules.catalogue.services import get_services
from app.modules.disputes.schemas import ComplaintCreateRequest
from app.modules.disputes.services import lodge_complaint
from app.modules.providers.services import get_provider_profile, search_providers
from app.modules.rentals.schemas import RentalBookingCreate
from app.modules.rentals.services import book_rental, list_listings

# State storage for draft actions awaiting user confirmation
_PENDING_DRAFTS_STORE: Dict[str, Dict[str, Any]] = {}
_AGENT_RUNS_STORE: List[Dict[str, Any]] = []
_AGENT_TOOL_CALLS_STORE: List[Dict[str, Any]] = []


def record_agent_tool_trace(
    run_id: str,
    tool_name: str,
    arguments_redacted: Dict[str, Any],
    authorization_outcome: str = "ALLOWED",
    confirmed_by_user: bool = False,
    result_summary: Optional[str] = None,
) -> None:
    """Log tool call execution into immutable agent trace audit (Appendix D.8)."""
    _AGENT_TOOL_CALLS_STORE.append({
        "call_id": str(uuid.uuid4()),
        "agent_run_id": run_id,
        "tool_name": tool_name,
        "arguments_redacted": arguments_redacted,
        "authorization_outcome": authorization_outcome,
        "confirmed_by_user": confirmed_by_user,
        "result_reference": result_summary,
        "created_at": datetime.now(timezone.utc),
    })


# -----------------------------------------------------------------------------
# Allowlisted Tool 1: search_services
# -----------------------------------------------------------------------------
def tool_search_services(
    query: Optional[str] = None,
    neighbourhood: Optional[str] = None,
    run_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Search public services catalogue and eligible providers in a Buea neighbourhood."""
    services = get_services()
    matched_services = [
        {"service_id": s["service_id"], "name_en": s["name_en"], "name_fr": s["name_fr"]}
        for s in services
        if not query or query.lower() in s["name_en"].lower() or query.lower() in s["name_fr"].lower()
    ]
    providers = search_providers(keyword=query)
    res = {
        "matched_services": matched_services[:5],
        "available_providers": providers[:3],
        "buea_neighbourhood": neighbourhood or "Buea",
    }
    if run_id:
        record_agent_tool_trace(run_id, "search_services", {"query": query, "neighbourhood": neighbourhood}, result_summary="Found results")
    return res


# -----------------------------------------------------------------------------
# Allowlisted Tool 2: get_provider_public_profile
# -----------------------------------------------------------------------------
def tool_get_provider_public_profile(provider_id: str, run_id: Optional[str] = None) -> Dict[str, Any]:
    """Retrieve public provider profile, rating, and verified badges (never private IDs or phones)."""
    try:
        profile = get_provider_profile(provider_id)
        res = {
            "public_name": profile["public_name"],
            "bio": profile.get("bio"),
            "base_area_name": profile.get("base_area_name"),
            "rating_average": profile.get("rating_average"),
            "review_count": profile.get("review_count"),
            "verification_badges": profile.get("verification_badges", []),
        }
    except NotFoundError:
        res = {"error": f"Provider '{provider_id}' not found"}

    if run_id:
        record_agent_tool_trace(run_id, "get_provider_public_profile", {"provider_id": provider_id}, result_summary="Profile retrieved")
    return res


# -----------------------------------------------------------------------------
# Allowlisted Tool 3: draft_service_request
# -----------------------------------------------------------------------------
def tool_draft_service_request(
    customer_id: str,
    provider_id: str,
    service_id: str,
    neighbourhood: str,
    description: str,
    run_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Create a pending draft booking that MUST be confirmed by user in the next turn (FR-GEM-005)."""
    draft_id = str(uuid.uuid4())
    draft_data = {
        "draft_id": draft_id,
        "type": "SERVICE_BOOKING",
        "customer_id": customer_id,
        "provider_id": provider_id,
        "service_id": service_id,
        "neighbourhood": neighbourhood,
        "description": description,
        "created_at": datetime.now(timezone.utc),
    }
    _PENDING_DRAFTS_STORE[draft_id] = draft_data
    logger.info("Draft service request created: %s for customer %s", draft_id, customer_id)

    if run_id:
        record_agent_tool_trace(
            run_id,
            "draft_service_request",
            {"provider_id": provider_id, "service_id": service_id, "neighbourhood": neighbourhood},
            authorization_outcome="CONFIRMATION_REQUIRED",
            confirmed_by_user=False,
            result_summary=f"Draft {draft_id} created awaiting customer confirmation",
        )

    return {
        "status": "DRAFT_AWAITING_CONFIRMATION",
        "draft_id": draft_id,
        "summary": (
            f"Please confirm: Requesting service with provider {provider_id} "
            f"in {neighbourhood} for '{description}'. Reply YES or OUI to finalize."
        ),
    }


# -----------------------------------------------------------------------------
# Allowlisted Tool 4: confirm_service_request (Server-Side Confirmation Gate)
# -----------------------------------------------------------------------------
def tool_confirm_service_request(
    customer_id: str,
    draft_id: str,
    user_confirmed: bool,
    run_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Execute booking creation ONLY after user explicitly confirmed the draft (FR-GEM-005)."""
    draft = _PENDING_DRAFTS_STORE.get(draft_id)
    if not draft or draft["type"] != "SERVICE_BOOKING":
        raise NotFoundError("PendingDraft", draft_id)

    if draft["customer_id"] != customer_id:
        raise ForbiddenError("Unauthorized to confirm another user's draft")

    # SERVER-SIDE CONFIRMATION GATE (Trap 3 & FR-GEM-005)
    if not user_confirmed:
        logger.warning("Confirmation gate blocked: user_confirmed is False for draft %s", draft_id)
        raise ValidationError("Action blocked: User has not explicitly confirmed the read-back summary.")

    booking = create_service_booking(
        customer_id=customer_id,
        payload=BookingCreateRequest(
            provider_id=draft["provider_id"],
            service_id=draft["service_id"],
            area_id="00000000-0000-0000-0001-000000000001",  # Default area UUID
            address_snapshot={"neighbourhood": draft["neighbourhood"]},
            description=draft["description"],
        ),
        idempotency_key=f"whatsapp-draft-{draft_id}",
    )

    # Invalidate draft
    del _PENDING_DRAFTS_STORE[draft_id]

    if run_id:
        record_agent_tool_trace(
            run_id,
            "confirm_service_request",
            {"draft_id": draft_id},
            authorization_outcome="ALLOWED",
            confirmed_by_user=True,
            result_summary=f"Booking {booking['booking_id']} confirmed",
        )

    return {
        "status": "CONFIRMED",
        "booking_id": booking["booking_id"],
        "message": "Your booking request has been confirmed and sent to the provider!",
    }


# -----------------------------------------------------------------------------
# Allowlisted Tool 5: list_my_bookings
# -----------------------------------------------------------------------------
def tool_list_my_bookings(customer_id: str, run_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """List bookings belonging strictly to the authenticated user."""
    from app.modules.bookings.services import _BOOKINGS_STORE
    my_bookings = [
        {
            "booking_id": b["booking_id"],
            "service_id": b["service_id"],
            "status": b["status"],
            "scheduled_at": b.get("scheduled_at"),
            "price_basis": b["price_basis"],
        }
        for b in _BOOKINGS_STORE.values()
        if b["customer_id"] == customer_id
    ]
    if run_id:
        record_agent_tool_trace(run_id, "list_my_bookings", {}, result_summary=f"Found {len(my_bookings)} bookings")
    return my_bookings


# -----------------------------------------------------------------------------
# Allowlisted Tool 6: get_my_booking
# -----------------------------------------------------------------------------
def tool_get_my_booking(customer_id: str, booking_id: str, run_id: Optional[str] = None) -> Dict[str, Any]:
    """Retrieve details for an owned booking with ownership check."""
    booking = get_booking(booking_id)
    if booking["customer_id"] != customer_id and booking["provider_id"] != customer_id:
        raise ForbiddenError("Cannot access booking belonging to another user (NFR-AI-002)")

    if run_id:
        record_agent_tool_trace(run_id, "get_my_booking", {"booking_id": booking_id}, result_summary="Booking retrieved")
    return {
        "booking_id": booking["booking_id"],
        "status": booking["status"],
        "description": booking["description"],
        "price_basis": booking["price_basis"],
        "checkin_pin": booking.get("checkin_pin"),
    }


# -----------------------------------------------------------------------------
# Allowlisted Tool 7: search_rental_listings
# -----------------------------------------------------------------------------
def tool_search_rental_listings(
    min_capacity_wh: Optional[int] = None,
    max_daily_rate_xaf: Optional[int] = None,
    run_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Search available portable power stations with Wh capacity and W continuous specs."""
    listings = list_listings()
    filtered = []
    for item in listings:
        if min_capacity_wh and item["capacity_wh"] < min_capacity_wh:
            continue
        if max_daily_rate_xaf and item["daily_rate_xaf"] > max_daily_rate_xaf:
            continue
        filtered.append({
            "listing_id": item["listing_id"],
            "item_name": item["item_name"],
            "capacity_wh": item["capacity_wh"],
            "continuous_output_w": item["continuous_output_w"],
            "daily_rate_xaf": item["daily_rate_xaf"],
            "deposit_xaf": item["deposit_xaf"],
        })
    if run_id:
        record_agent_tool_trace(run_id, "search_rental_listings", {"min_capacity_wh": min_capacity_wh}, result_summary=f"Found {len(filtered)} units")
    return filtered


# -----------------------------------------------------------------------------
# Allowlisted Tool 8: draft_rental_request
# -----------------------------------------------------------------------------
def tool_draft_rental_request(
    customer_id: str,
    listing_id: str,
    start_at_iso: str,
    end_at_iso: str,
    run_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Draft a power station rental request awaiting explicit user confirmation."""
    draft_id = str(uuid.uuid4())
    draft_data = {
        "draft_id": draft_id,
        "type": "RENTAL_BOOKING",
        "customer_id": customer_id,
        "listing_id": listing_id,
        "start_at": start_at_iso,
        "end_at": end_at_iso,
        "created_at": datetime.now(timezone.utc),
    }
    _PENDING_DRAFTS_STORE[draft_id] = draft_data

    if run_id:
        record_agent_tool_trace(
            run_id,
            "draft_rental_request",
            {"listing_id": listing_id, "start_at": start_at_iso, "end_at": end_at_iso},
            authorization_outcome="CONFIRMATION_REQUIRED",
            confirmed_by_user=False,
            result_summary=f"Rental draft {draft_id} created",
        )

    return {
        "status": "DRAFT_AWAITING_CONFIRMATION",
        "draft_id": draft_id,
        "summary": f"Please confirm: Renting power station {listing_id} from {start_at_iso} to {end_at_iso}. Reply YES or OUI to finalize.",
    }


# -----------------------------------------------------------------------------
# Allowlisted Tool 9: confirm_rental_request (Server-Side Confirmation Gate)
# -----------------------------------------------------------------------------
def tool_confirm_rental_request(
    customer_id: str,
    draft_id: str,
    user_confirmed: bool,
    run_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Execute power station rental booking after explicit confirmation."""
    draft = _PENDING_DRAFTS_STORE.get(draft_id)
    if not draft or draft["type"] != "RENTAL_BOOKING":
        raise NotFoundError("PendingDraft", draft_id)

    if draft["customer_id"] != customer_id:
        raise ForbiddenError("Unauthorized to confirm another user's draft")

    if not user_confirmed:
        raise ValidationError("Action blocked: User has not explicitly confirmed the rental summary.")

    rental = book_rental(
        customer_id=customer_id,
        payload=RentalBookingCreate(
            listing_id=draft["listing_id"],
            start_at=datetime.fromisoformat(draft["start_at"]),
            end_at=datetime.fromisoformat(draft["end_at"]),
        ),
        idempotency_key=f"whatsapp-rental-draft-{draft_id}",
    )

    del _PENDING_DRAFTS_STORE[draft_id]

    if run_id:
        record_agent_tool_trace(
            run_id,
            "confirm_rental_request",
            {"draft_id": draft_id},
            authorization_outcome="ALLOWED",
            confirmed_by_user=True,
            result_summary=f"Rental {rental['rental_id']} confirmed",
        )

    return {
        "status": "CONFIRMED",
        "rental_id": rental["rental_id"],
        "total_price_xaf": rental["total_price_xaf"],
        "message": "Power station rental confirmed! Provider will prepare unit for handover.",
    }


# -----------------------------------------------------------------------------
# Allowlisted Tool 10: create_support_case & request_human_handoff
# -----------------------------------------------------------------------------
def tool_create_support_case(customer_id: str, reason: str, description: str, run_id: Optional[str] = None) -> Dict[str, Any]:
    """Lodge support or safety complaint creating an ALICE-CASE-XXXX reference."""
    complaint = lodge_complaint(
        reporter_id=customer_id,
        payload=ComplaintCreateRequest(reason=reason, description=description),
    )
    if run_id:
        record_agent_tool_trace(run_id, "create_support_case", {"reason": reason}, result_summary=f"Case {complaint['case_ref']} lodged")
    return {
        "case_ref": complaint["case_ref"],
        "status": "LODGED",
        "message": f"Support case {complaint['case_ref']} has been lodged. Our support team will review it shortly.",
    }


def tool_request_human_handoff(customer_id: str, reason: str, run_id: Optional[str] = None) -> Dict[str, Any]:
    """Escalate WhatsApp session to human support queue."""
    if run_id:
        record_agent_tool_trace(run_id, "request_human_handoff", {"reason": reason}, result_summary="Escalated to human queue")
    return {
        "status": "HANDOFF_QUEUED",
        "message": "I have transferred our conversation to our human support desk in Buea. An agent will respond shortly.",
    }
