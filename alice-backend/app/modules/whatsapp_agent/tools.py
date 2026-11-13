"""Typed, allowlisted tools for the WhatsApp AI Agent (Appendix D.5 & Appendix G).

CRITICAL SECURITY RULES:
1. Grounded in backend API results only (NFR-AI-001).
2. Never expose private customer/provider data or identity documents (NFR-AI-002, G.6).
3. Consequential actions (booking/rental creation) strictly require explicit customer confirmation (NFR-AI-003, FR-GEM-005).
4. Unlinked WhatsApp senders cannot access private account, booking, or quotation data (FR-WA-003, D.6).
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import uuid

from google.genai import types

from app.core.exceptions import ForbiddenError, NotFoundError, ValidationError
from app.core.logging import logger
from app.integrations.supabase.client import get_supabase_service_client
from app.modules.bookings.schemas import BookingCreateRequest
from app.modules.bookings.services import _BOOKINGS_STORE, _QUOTATIONS_STORE, create_service_booking, get_booking
from app.modules.catalogue.services import get_services
from app.modules.disputes.schemas import ComplaintCreateRequest
from app.modules.disputes.services import lodge_complaint
from app.modules.providers.services import get_provider_profile, search_providers
from app.modules.rentals.schemas import RentalBookingCreate
from app.modules.rentals.services import book_rental, list_listings

# In-memory stores for audit telemetry and confirmation drafts
_PENDING_DRAFTS_STORE: Dict[str, Dict[str, Any]] = {}
_AGENT_RUNS_STORE: List[Dict[str, Any]] = []
_AGENT_TOOL_CALLS_STORE: List[Dict[str, Any]] = []
_SUPPORT_HANDOFFS_STORE: List[Dict[str, Any]] = []

SENSITIVE_FIELD_NAMES = {
    "password",
    "password_hash",
    "secret",
    "jwt_secret",
    "token",
    "access_token",
    "national_id",
    "id_card",
    "id_card_number",
    "private_file_ref",
    "private_doc_url",
    "checkin_pin",
    "pin",
    "cvv",
}


def redact_private_data(item: Any) -> Any:
    """Recursively redact private fields and sensitive credentials before returning to LLM (NFR-AI-002, G.6)."""
    if isinstance(item, dict):
        cleaned: Dict[str, Any] = {}
        for k, v in item.items():
            k_lower = str(k).lower()
            if any(sens in k_lower for sens in SENSITIVE_FIELD_NAMES):
                continue
            if "phone" in k_lower and isinstance(v, str) and len(v) >= 8:
                cleaned[k] = f"{v[:5]}****{v[-3:]}" if len(v) > 8 else "***"
            else:
                cleaned[k] = redact_private_data(v)
        return cleaned
    elif isinstance(item, list):
        return [redact_private_data(x) for x in item]
    return item


def record_agent_tool_trace(
    run_id: str,
    tool_name: str,
    arguments_redacted: Dict[str, Any],
    authorization_outcome: str = "ALLOWED",
    confirmed_by_user: bool = False,
    result_summary: Optional[str] = None,
) -> None:
    """Log tool call execution into immutable agent trace audit (Appendix D.8)."""
    trace_entry = {
        "id": str(uuid.uuid4()),
        "call_id": str(uuid.uuid4()),
        "agent_run_id": run_id,
        "tool_name": tool_name,
        "arguments_redacted": redact_private_data(arguments_redacted),
        "authorization_outcome": authorization_outcome,
        "confirmed_by_user": confirmed_by_user,
        "result_reference": result_summary[:200] if result_summary else None,
        "created_at": datetime.now(timezone.utc),
    }
    _AGENT_TOOL_CALLS_STORE.append(trace_entry)

    # Optional mirror to Supabase PostgreSQL table public.agent_tool_calls
    try:
        supabase = get_supabase_service_client()
        supabase.client.table("agent_tool_calls").insert({
            "id": trace_entry["id"],
            "agent_run_id": run_id,
            "tool_name": tool_name,
            "arguments_redacted": trace_entry["arguments_redacted"],
            "result_reference": trace_entry["result_reference"],
            "authorization_outcome": authorization_outcome,
            "confirmed_by_user": confirmed_by_user,
        }).execute()
    except Exception as e:
        logger.debug("Supabase tool trace insert skipped or failed: %s", str(e))


# -----------------------------------------------------------------------------
# Allowlisted Tool 1: search_services
# -----------------------------------------------------------------------------
def search_services(
    query: Optional[str] = None,
    neighbourhood: Optional[str] = None,
    run_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Search public service catalogue and eligible providers in a Buea neighbourhood."""
    services = get_services()
    matched_services = [
        {"service_id": s["service_id"], "name_en": s["name_en"], "name_fr": s["name_fr"]}
        for s in services
        if not query or query.lower() in s["name_en"].lower() or query.lower() in s["name_fr"].lower()
    ]
    providers = search_providers(keyword=query)
    # Exclude any private fields
    safe_providers = [
        {
            "provider_id": p.get("provider_id"),
            "public_name": p.get("public_name"),
            "base_area_name": p.get("base_area_name"),
            "rating_average": p.get("rating_average"),
            "verification_badges": p.get("verification_badges", []),
        }
        for p in providers[:3]
    ]

    res = {
        "matched_services": matched_services[:5],
        "available_providers": safe_providers,
        "buea_neighbourhood": neighbourhood or "Buea",
    }
    if run_id:
        record_agent_tool_trace(
            run_id,
            "search_services",
            {"query": query, "neighbourhood": neighbourhood},
            result_summary=f"Found {len(matched_services)} services, {len(safe_providers)} providers",
        )
    return redact_private_data(res)


# -----------------------------------------------------------------------------
# Allowlisted Tool 2: get_provider_public_profile
# -----------------------------------------------------------------------------
def get_provider_public_profile(provider_id: str, run_id: Optional[str] = None) -> Dict[str, Any]:
    """Retrieve public provider profile, rating, and verified badges (never private IDs or phones)."""
    try:
        profile = get_provider_profile(provider_id)
        res = {
            "public_name": profile.get("public_name"),
            "bio": profile.get("bio"),
            "base_area_name": profile.get("base_area_name"),
            "rating_average": profile.get("rating_average"),
            "review_count": profile.get("review_count"),
            "verification_badges": profile.get("verification_badges", []),
        }
    except NotFoundError:
        res = {"error": f"Provider '{provider_id}' not found"}

    if run_id:
        record_agent_tool_trace(
            run_id,
            "get_provider_public_profile",
            {"provider_id": provider_id},
            result_summary="Profile retrieved" if "public_name" in res else "Not found",
        )
    return redact_private_data(res)


# -----------------------------------------------------------------------------
# Allowlisted Tool 3: create_service_request (Server-Side Confirmation Gate)
# -----------------------------------------------------------------------------
def create_service_request(
    provider_id: str,
    service_id: str,
    neighbourhood: str,
    description: str,
    customer_confirmed: bool = False,
    customer_id: Optional[str] = None,
    run_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Create a customer service request in Buea.
    Requires explicit customer confirmation before executing booking creation (FR-GEM-005, NFR-AI-003).
    """
    if not customer_id:
        if run_id:
            record_agent_tool_trace(
                run_id,
                "create_service_request",
                {"provider_id": provider_id, "service_id": service_id},
                authorization_outcome="DENIED",
                result_summary="Account linking required",
            )
        return {
            "status": "AUTHENTICATION_REQUIRED",
            "message": "Account linking required. Please link your ALICE account with 'LINK <code>' before creating a service request.",
        }

    # If user has NOT explicitly confirmed yet, create draft and return confirmation prompt
    if not customer_confirmed:
        draft_id = str(uuid.uuid4())
        _PENDING_DRAFTS_STORE[draft_id] = {
            "draft_id": draft_id,
            "type": "SERVICE_BOOKING",
            "customer_id": customer_id,
            "provider_id": provider_id,
            "service_id": service_id,
            "neighbourhood": neighbourhood,
            "description": description,
            "created_at": datetime.now(timezone.utc),
        }
        if run_id:
            record_agent_tool_trace(
                run_id,
                "create_service_request",
                {"provider_id": provider_id, "service_id": service_id, "neighbourhood": neighbourhood},
                authorization_outcome="CONFIRMATION_REQUIRED",
                confirmed_by_user=False,
                result_summary=f"Draft {draft_id} created awaiting confirmation",
            )
        return {
            "status": "CONFIRMATION_REQUIRED",
            "draft_id": draft_id,
            "summary": (
                f"Please confirm: Requesting service with provider {provider_id} "
                f"in {neighbourhood} for '{description}'. Reply YES (or OUI) to confirm."
            ),
        }

    # User explicitly confirmed -> Create official booking
    booking = create_service_booking(
        customer_id=customer_id,
        payload=BookingCreateRequest(
            provider_id=provider_id,
            service_id=service_id,
            area_id="00000000-0000-0000-0001-000000000001",
            address_snapshot={"neighbourhood": neighbourhood},
            description=description,
        ),
        idempotency_key=f"wa-booking-{customer_id}-{provider_id}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M')}",
    )
    if run_id:
        record_agent_tool_trace(
            run_id,
            "create_service_request",
            {"provider_id": provider_id, "service_id": service_id},
            authorization_outcome="ALLOWED",
            confirmed_by_user=True,
            result_summary=f"Booking {booking['booking_id']} created",
        )
    return {
        "status": "CONFIRMED",
        "booking_id": booking["booking_id"],
        "message": f"Your service request has been confirmed! Reference: {booking['booking_id']}.",
    }


# -----------------------------------------------------------------------------
# Allowlisted Tool 4: list_my_bookings
# -----------------------------------------------------------------------------
def list_my_bookings(
    status_filter: Optional[str] = None,
    customer_id: Optional[str] = None,
    run_id: Optional[str] = None,
) -> Dict[str, Any]:
    """List bookings strictly belonging to the authenticated customer."""
    if not customer_id:
        if run_id:
            record_agent_tool_trace(run_id, "list_my_bookings", {}, authorization_outcome="DENIED")
        return {
            "status": "AUTHENTICATION_REQUIRED",
            "message": "Please link your ALICE account with 'LINK <code>' to view your bookings.",
        }

    my_bookings = [
        {
            "booking_id": b["booking_id"],
            "service_id": b["service_id"],
            "status": b["status"],
            "scheduled_at": str(b.get("scheduled_at")) if b.get("scheduled_at") else None,
            "price_basis": b["price_basis"],
        }
        for b in _BOOKINGS_STORE.values()
        if b.get("customer_id") == customer_id and (not status_filter or b.get("status") == status_filter)
    ]

    if run_id:
        record_agent_tool_trace(
            run_id,
            "list_my_bookings",
            {"status_filter": status_filter},
            result_summary=f"Found {len(my_bookings)} bookings",
        )
    return {"bookings": redact_private_data(my_bookings)}


# -----------------------------------------------------------------------------
# Allowlisted Tool 5: get_my_booking
# -----------------------------------------------------------------------------
def get_my_booking(
    booking_id: str,
    customer_id: Optional[str] = None,
    run_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Retrieve details for an owned booking with strict ownership check (NFR-AI-002)."""
    if not customer_id:
        return {
            "status": "AUTHENTICATION_REQUIRED",
            "message": "Please link your ALICE account to access booking details.",
        }

    try:
        booking = get_booking(booking_id)
    except NotFoundError:
        return {"error": f"Booking '{booking_id}' not found."}

    if booking["customer_id"] != customer_id and booking["provider_id"] != customer_id:
        if run_id:
            record_agent_tool_trace(
                run_id,
                "get_my_booking",
                {"booking_id": booking_id},
                authorization_outcome="DENIED",
                result_summary="Cross-user access denied",
            )
        raise ForbiddenError("Cannot access booking belonging to another user (NFR-AI-002)")

    res = {
        "booking_id": booking["booking_id"],
        "status": booking["status"],
        "description": booking["description"],
        "price_basis": booking["price_basis"],
    }
    if run_id:
        record_agent_tool_trace(run_id, "get_my_booking", {"booking_id": booking_id}, result_summary="Booking retrieved")
    return redact_private_data(res)


# -----------------------------------------------------------------------------
# Allowlisted Tool 6: list_my_quotations
# -----------------------------------------------------------------------------
def list_my_quotations(
    booking_id: str,
    customer_id: Optional[str] = None,
    run_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Retrieve quotations for an owned booking with ownership checks."""
    if not customer_id:
        return {
            "status": "AUTHENTICATION_REQUIRED",
            "message": "Please link your ALICE account to inspect quotations.",
        }

    try:
        booking = get_booking(booking_id)
    except NotFoundError:
        return {"error": f"Booking '{booking_id}' not found."}

    if booking["customer_id"] != customer_id and booking["provider_id"] != customer_id:
        if run_id:
            record_agent_tool_trace(
                run_id,
                "list_my_quotations",
                {"booking_id": booking_id},
                authorization_outcome="DENIED",
            )
        raise ForbiddenError("Cannot access quotations for another user's booking.")

    quotes = [
        {
            "quotation_id": q["quotation_id"],
            "version": q.get("version", 1),
            "line_items": q.get("line_items", []),
            "total_xaf": q.get("total_xaf"),
            "status": q.get("status"),
            "valid_until": str(q.get("valid_until")),
        }
        for q in _QUOTATIONS_STORE.values()
        if q.get("booking_id") == booking_id
    ]

    if run_id:
        record_agent_tool_trace(
            run_id,
            "list_my_quotations",
            {"booking_id": booking_id},
            result_summary=f"Found {len(quotes)} quotations",
        )
    return {"booking_id": booking_id, "quotations": redact_private_data(quotes)}


# -----------------------------------------------------------------------------
# Allowlisted Tool 7: search_rental_listings
# -----------------------------------------------------------------------------
def search_rental_listings(
    min_capacity_wh: Optional[int] = None,
    max_daily_rate_xaf: Optional[int] = None,
    run_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Search available portable power stations with Wh capacity and continuous W output."""
    listings = list_listings()
    filtered = []
    for item in listings:
        if min_capacity_wh and item.get("capacity_wh", 0) < min_capacity_wh:
            continue
        if max_daily_rate_xaf and item.get("daily_rate_xaf", 0) > max_daily_rate_xaf:
            continue
        filtered.append({
            "listing_id": item.get("listing_id"),
            "item_name": item.get("item_name"),
            "capacity_wh": item.get("capacity_wh"),
            "continuous_output_w": item.get("continuous_output_w"),
            "daily_rate_xaf": item.get("daily_rate_xaf"),
            "deposit_xaf": item.get("deposit_xaf"),
        })

    if run_id:
        record_agent_tool_trace(
            run_id,
            "search_rental_listings",
            {"min_capacity_wh": min_capacity_wh, "max_daily_rate_xaf": max_daily_rate_xaf},
            result_summary=f"Found {len(filtered)} units",
        )
    return {"listings": redact_private_data(filtered)}


# -----------------------------------------------------------------------------
# Allowlisted Tool 8: create_rental_request (Server-Side Confirmation Gate)
# -----------------------------------------------------------------------------
def create_rental_request(
    listing_id: str,
    start_at_iso: str,
    end_at_iso: str,
    customer_confirmed: bool = False,
    customer_id: Optional[str] = None,
    run_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Submit a portable power station rental request with explicit confirmation (FR-GEM-005)."""
    if not customer_id:
        if run_id:
            record_agent_tool_trace(run_id, "create_rental_request", {}, authorization_outcome="DENIED")
        return {
            "status": "AUTHENTICATION_REQUIRED",
            "message": "Please link your ALICE account with 'LINK <code>' to rent equipment.",
        }

    if not customer_confirmed:
        draft_id = str(uuid.uuid4())
        _PENDING_DRAFTS_STORE[draft_id] = {
            "draft_id": draft_id,
            "type": "RENTAL_BOOKING",
            "customer_id": customer_id,
            "listing_id": listing_id,
            "start_at": start_at_iso,
            "end_at": end_at_iso,
            "created_at": datetime.now(timezone.utc),
        }
        if run_id:
            record_agent_tool_trace(
                run_id,
                "create_rental_request",
                {"listing_id": listing_id, "start_at_iso": start_at_iso, "end_at_iso": end_at_iso},
                authorization_outcome="CONFIRMATION_REQUIRED",
                confirmed_by_user=False,
                result_summary=f"Rental draft {draft_id} created",
            )
        return {
            "status": "CONFIRMATION_REQUIRED",
            "draft_id": draft_id,
            "summary": f"Please confirm: Renting power station {listing_id} from {start_at_iso} to {end_at_iso}. Reply YES (or OUI) to finalize.",
        }

    # Execute rental booking
    rental = book_rental(
        customer_id=customer_id,
        payload=RentalBookingCreate(
            listing_id=listing_id,
            start_at=datetime.fromisoformat(start_at_iso),
            end_at=datetime.fromisoformat(end_at_iso),
        ),
        idempotency_key=f"wa-rental-{customer_id}-{listing_id}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M')}",
    )
    if run_id:
        record_agent_tool_trace(
            run_id,
            "create_rental_request",
            {"listing_id": listing_id},
            authorization_outcome="ALLOWED",
            confirmed_by_user=True,
            result_summary=f"Rental {rental['rental_id']} confirmed",
        )
    return {
        "status": "CONFIRMED",
        "rental_id": rental["rental_id"],
        "total_price_xaf": rental.get("total_price_xaf"),
        "message": "Power station rental confirmed! Provider will prepare unit for handover.",
    }


# -----------------------------------------------------------------------------
# Allowlisted Tool 9: create_support_case
# -----------------------------------------------------------------------------
def create_support_case(
    reason: str,
    description: str,
    customer_id: Optional[str] = None,
    run_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Lodge a support case or dispute, generating an official ALICE-CASE-XXXX reference."""
    reporter = customer_id or "wa-unlinked-user"
    complaint = lodge_complaint(
        reporter_id=reporter,
        payload=ComplaintCreateRequest(reason=reason, description=description),
    )
    if run_id:
        record_agent_tool_trace(
            run_id,
            "create_support_case",
            {"reason": reason, "description": description},
            result_summary=f"Case {complaint['case_ref']} lodged",
        )
    return {
        "case_ref": complaint["case_ref"],
        "status": "LODGED",
        "message": f"Support case {complaint['case_ref']} has been lodged. Our support desk in Buea will review it promptly.",
    }


# -----------------------------------------------------------------------------
# Allowlisted Tool 10: request_human_handoff
# -----------------------------------------------------------------------------
def request_human_handoff(
    reason: str,
    customer_id: Optional[str] = None,
    conversation_id: Optional[str] = None,
    run_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Transfer conversation to human support staff in Buea (Appendix D.4 FR-WA-011)."""
    handoff_entry = {
        "id": str(uuid.uuid4()),
        "conversation_id": conversation_id or str(uuid.uuid4()),
        "customer_id": customer_id,
        "reason": reason,
        "status": "PENDING",
        "created_at": datetime.now(timezone.utc),
    }
    _SUPPORT_HANDOFFS_STORE.append(handoff_entry)
    if run_id:
        record_agent_tool_trace(run_id, "request_human_handoff", {"reason": reason}, result_summary="Escalated to human queue")

    return {
        "status": "HANDOFF_QUEUED",
        "message": "I have transferred our conversation to our human support desk in Buea. An agent will respond shortly.",
    }


# -----------------------------------------------------------------------------
# Backwards Compatibility Wrappers for Legacy Unit Tests
# -----------------------------------------------------------------------------
def tool_search_services(query: Optional[str] = None, neighbourhood: Optional[str] = None, run_id: Optional[str] = None) -> Dict[str, Any]:
    return search_services(query=query, neighbourhood=neighbourhood, run_id=run_id)


def tool_get_provider_public_profile(provider_id: str, run_id: Optional[str] = None) -> Dict[str, Any]:
    return get_provider_public_profile(provider_id=provider_id, run_id=run_id)


def tool_draft_service_request(
    customer_id: str,
    provider_id: str,
    service_id: str,
    neighbourhood: str,
    description: str,
    run_id: Optional[str] = None,
) -> Dict[str, Any]:
    return create_service_request(
        provider_id=provider_id,
        service_id=service_id,
        neighbourhood=neighbourhood,
        description=description,
        customer_confirmed=False,
        customer_id=customer_id,
        run_id=run_id,
    )


def tool_confirm_service_request(
    customer_id: str,
    draft_id: str,
    user_confirmed: bool,
    run_id: Optional[str] = None,
) -> Dict[str, Any]:
    draft = _PENDING_DRAFTS_STORE.get(draft_id)
    if not draft or draft.get("type") != "SERVICE_BOOKING":
        raise NotFoundError("PendingDraft", draft_id)
    if draft["customer_id"] != customer_id:
        raise ForbiddenError("Unauthorized to confirm another user's draft")
    if not user_confirmed:
        raise ValidationError("Action blocked: User has not explicitly confirmed the read-back summary.")

    del _PENDING_DRAFTS_STORE[draft_id]
    return create_service_request(
        provider_id=draft["provider_id"],
        service_id=draft["service_id"],
        neighbourhood=draft["neighbourhood"],
        description=draft["description"],
        customer_confirmed=True,
        customer_id=customer_id,
        run_id=run_id,
    )


def tool_list_my_bookings(customer_id: str, run_id: Optional[str] = None) -> List[Dict[str, Any]]:
    res = list_my_bookings(customer_id=customer_id, run_id=run_id)
    return res.get("bookings", [])


def tool_get_my_booking(customer_id: str, booking_id: str, run_id: Optional[str] = None) -> Dict[str, Any]:
    return get_my_booking(booking_id=booking_id, customer_id=customer_id, run_id=run_id)


def tool_search_rental_listings(
    min_capacity_wh: Optional[int] = None,
    max_daily_rate_xaf: Optional[int] = None,
    run_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    res = search_rental_listings(min_capacity_wh=min_capacity_wh, max_daily_rate_xaf=max_daily_rate_xaf, run_id=run_id)
    return res.get("listings", [])


def tool_draft_rental_request(
    customer_id: str,
    listing_id: str,
    start_at_iso: str,
    end_at_iso: str,
    run_id: Optional[str] = None,
) -> Dict[str, Any]:
    return create_rental_request(
        listing_id=listing_id,
        start_at_iso=start_at_iso,
        end_at_iso=end_at_iso,
        customer_confirmed=False,
        customer_id=customer_id,
        run_id=run_id,
    )


def tool_confirm_rental_request(
    customer_id: str,
    draft_id: str,
    user_confirmed: bool,
    run_id: Optional[str] = None,
) -> Dict[str, Any]:
    draft = _PENDING_DRAFTS_STORE.get(draft_id)
    if not draft or draft.get("type") != "RENTAL_BOOKING":
        raise NotFoundError("PendingDraft", draft_id)
    if draft["customer_id"] != customer_id:
        raise ForbiddenError("Unauthorized to confirm another user's draft")
    if not user_confirmed:
        raise ValidationError("Action blocked: User has not explicitly confirmed the rental summary.")

    del _PENDING_DRAFTS_STORE[draft_id]
    return create_rental_request(
        listing_id=draft["listing_id"],
        start_at_iso=draft["start_at"],
        end_at_iso=draft["end_at"],
        customer_confirmed=True,
        customer_id=customer_id,
        run_id=run_id,
    )


def tool_create_support_case(customer_id: str, reason: str, description: str, run_id: Optional[str] = None) -> Dict[str, Any]:
    return create_support_case(reason=reason, description=description, customer_id=customer_id, run_id=run_id)


def tool_request_human_handoff(customer_id: str, reason: str, run_id: Optional[str] = None) -> Dict[str, Any]:
    return request_human_handoff(reason=reason, customer_id=customer_id, run_id=run_id)


# -----------------------------------------------------------------------------
# Google Gemini Typed Function Declarations (FR-GEM-003, G.4)
# -----------------------------------------------------------------------------
def get_gemini_tools() -> List[types.Tool]:
    """Generate typed Google Gemini tool declarations for the 10 allowlisted tools."""
    declarations = [
        types.FunctionDeclaration(
            name="search_services",
            description="Search public service catalogue and eligible providers in Buea (e.g. plumbing, electrical, gas refill).",
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "query": types.Schema(type="STRING", description="Service category or issue description"),
                    "neighbourhood": types.Schema(type="STRING", description="Buea neighbourhood e.g. Molyko, Clerks Quarters, Buea Town"),
                },
            ),
        ),
        types.FunctionDeclaration(
            name="get_provider_public_profile",
            description="Get public profile and verification badges of a service provider.",
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "provider_id": types.Schema(type="STRING", description="Provider ID"),
                },
                required=["provider_id"],
            ),
        ),
        types.FunctionDeclaration(
            name="create_service_request",
            description="Create a home service request with a provider in Buea. Must pass customer_confirmed=True only if the customer has explicitly approved the booking summary.",
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "provider_id": types.Schema(type="STRING", description="Provider ID"),
                    "service_id": types.Schema(type="STRING", description="Service catalogue ID"),
                    "neighbourhood": types.Schema(type="STRING", description="Neighbourhood in Buea"),
                    "description": types.Schema(type="STRING", description="Description of the issue or task"),
                    "customer_confirmed": types.Schema(
                        type="BOOLEAN",
                        description="True only if user explicitly confirmed (e.g. replied YES or OUI to summary)",
                    ),
                },
                required=["provider_id", "service_id", "neighbourhood", "description"],
            ),
        ),
        types.FunctionDeclaration(
            name="list_my_bookings",
            description="List bookings for the authenticated user.",
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "status_filter": types.Schema(type="STRING", description="Optional filter e.g. REQUESTED, CONFIRMED"),
                },
            ),
        ),
        types.FunctionDeclaration(
            name="get_my_booking",
            description="Get status and details of an owned booking.",
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "booking_id": types.Schema(type="STRING", description="Booking ID"),
                },
                required=["booking_id"],
            ),
        ),
        types.FunctionDeclaration(
            name="list_my_quotations",
            description="Retrieve provider quotations for an owned booking.",
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "booking_id": types.Schema(type="STRING", description="Booking ID"),
                },
                required=["booking_id"],
            ),
        ),
        types.FunctionDeclaration(
            name="search_rental_listings",
            description="Search available portable power stations by capacity (Wh) and maximum daily rate (XAF).",
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "min_capacity_wh": types.Schema(type="INTEGER", description="Minimum capacity in Watt-hours (Wh)"),
                    "max_daily_rate_xaf": types.Schema(type="INTEGER", description="Maximum daily rental rate in XAF"),
                },
            ),
        ),
        types.FunctionDeclaration(
            name="create_rental_request",
            description="Request a portable power station rental. Must pass customer_confirmed=True only if user explicitly approved rental summary.",
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "listing_id": types.Schema(type="STRING", description="Rental listing ID"),
                    "start_at_iso": types.Schema(type="STRING", description="Rental start ISO timestamp"),
                    "end_at_iso": types.Schema(type="STRING", description="Rental end ISO timestamp"),
                    "customer_confirmed": types.Schema(
                        type="BOOLEAN",
                        description="True only if user explicitly confirmed the rental summary",
                    ),
                },
                required=["listing_id", "start_at_iso", "end_at_iso"],
            ),
        ),
        types.FunctionDeclaration(
            name="create_support_case",
            description="Lodge a customer support case or report an issue.",
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "reason": types.Schema(type="STRING", description="Reason or subject"),
                    "description": types.Schema(type="STRING", description="Issue description"),
                },
                required=["reason", "description"],
            ),
        ),
        types.FunctionDeclaration(
            name="request_human_handoff",
            description="Transfer the WhatsApp conversation to a human support agent in Buea.",
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "reason": types.Schema(type="STRING", description="Reason for escalation"),
                },
                required=["reason"],
            ),
        ),
    ]
    return [types.Tool(function_declarations=declarations)]
