"""Unit tests for WhatsApp Gemini Agent Orchestrator, Allowlisted Tools, and Security Gates."""

from datetime import datetime, timedelta, timezone

import pytest

from app.core.exceptions import ForbiddenError
from app.modules.bookings.schemas import QuotationCreateRequest, QuotationLineItem
from app.modules.bookings.services import create_quotation, create_service_booking
from app.modules.whatsapp_agent.services import (
    CONFIRMATION_KEYWORDS,
    execute_agent_turn,
    get_or_create_channel_identity,
    get_or_create_conversation,
    verify_linking_code_from_chat,
)
from app.modules.whatsapp_agent.tools import (
    _AGENT_RUNS_STORE,
    _AGENT_TOOL_CALLS_STORE,
    create_rental_request,
    create_service_request,
    create_support_case,
    get_gemini_tools,
    get_my_booking,
    get_provider_public_profile,
    list_my_bookings,
    list_my_quotations,
    redact_private_data,
    request_human_handoff,
    search_rental_listings,
    search_services,
)


def test_gemini_tools_declarations_count():
    """Verify all 10 allowlisted tools are declared in Gemini tool definitions."""
    tools = get_gemini_tools()
    assert len(tools) == 1
    declarations = tools[0].function_declarations
    assert len(declarations) == 10
    names = {d.name for d in declarations}
    expected = {
        "search_services",
        "get_provider_public_profile",
        "create_service_request",
        "list_my_bookings",
        "get_my_booking",
        "list_my_quotations",
        "search_rental_listings",
        "create_rental_request",
        "create_support_case",
        "request_human_handoff",
    }
    assert names == expected


def test_redact_private_data():
    """NFR-AI-002, G.6: Verify sensitive keys and full phone numbers are redacted."""
    raw = {
        "customer_name": "John Doe",
        "password_hash": "argon2$mockhash",
        "checkin_pin": "1234",
        "customer_phone": "+237671234567",
        "secret_token": "secret_abc",
        "details": {
            "national_id": "1122334455",
            "provider_phone": "+237699112233",
            "public_field": "safe_value",
        },
    }
    cleaned = redact_private_data(raw)
    assert "password_hash" not in cleaned
    assert "checkin_pin" not in cleaned
    assert "secret_token" not in cleaned
    assert cleaned["customer_phone"] == "+2376****567"
    assert "national_id" not in cleaned["details"]
    assert cleaned["details"]["provider_phone"] == "+2376****233"
    assert cleaned["details"]["public_field"] == "safe_value"


def test_tool_search_services_and_provider_profile():
    """Verify search_services and get_provider_public_profile return public safe data."""
    res = search_services(query="plumb", neighbourhood="Molyko")
    assert "matched_services" in res
    assert "available_providers" in res
    assert res["buea_neighbourhood"] == "Molyko"

    profile = get_provider_public_profile("provider-demo-1")
    assert "public_name" in profile
    assert "verification_badges" in profile
    assert "password" not in profile


def test_tool_create_service_request_lifecycle():
    """
    Test create_service_request security enforcement:
    1. Unlinked user -> AUTHENTICATION_REQUIRED
    2. Linked user without confirmation -> CONFIRMATION_REQUIRED
    3. Linked user with confirmation -> CONFIRMED
    """
    # 1. Unlinked user
    unlinked_res = create_service_request(
        provider_id="provider-demo-1",
        service_id="00000000-0000-0000-0003-000000000001",
        neighbourhood="Molyko",
        description="Leaking kitchen sink",
        customer_confirmed=False,
        customer_id=None,
    )
    assert unlinked_res["status"] == "AUTHENTICATION_REQUIRED"

    # 2. Linked user, unconfirmed
    cust_id = "linked-customer-001"
    unconfirmed_res = create_service_request(
        provider_id="provider-demo-1",
        service_id="00000000-0000-0000-0003-000000000001",
        neighbourhood="Molyko",
        description="Leaking kitchen sink",
        customer_confirmed=False,
        customer_id=cust_id,
        run_id="run-test-01",
    )
    assert unconfirmed_res["status"] == "CONFIRMATION_REQUIRED"
    assert "draft_id" in unconfirmed_res

    # 3. Linked user, confirmed
    confirmed_res = create_service_request(
        provider_id="provider-demo-1",
        service_id="00000000-0000-0000-0003-000000000001",
        neighbourhood="Molyko",
        description="Leaking kitchen sink",
        customer_confirmed=True,
        customer_id=cust_id,
        run_id="run-test-02",
    )
    assert confirmed_res["status"] == "CONFIRMED"
    assert "booking_id" in confirmed_res


def test_tool_bookings_and_quotations_ownership():
    """Verify list_my_bookings, get_my_booking, and list_my_quotations enforce account linking and ownership."""
    # Unlinked checks
    assert list_my_bookings(customer_id=None)["status"] == "AUTHENTICATION_REQUIRED"
    assert get_my_booking(booking_id="b-1", customer_id=None)["status"] == "AUTHENTICATION_REQUIRED"
    assert list_my_quotations(booking_id="b-1", customer_id=None)["status"] == "AUTHENTICATION_REQUIRED"

    # Create test booking
    cust_owner = "user-alice-01"
    cust_other = "user-bob-02"
    provider_id = "provider-demo-1"

    booking_res = create_service_request(
        provider_id=provider_id,
        service_id="00000000-0000-0000-0003-000000000001",
        neighbourhood="Clerks Quarters",
        description="Fix circuit breaker",
        customer_confirmed=True,
        customer_id=cust_owner,
    )
    booking_id = booking_res["booking_id"]

    # Owner can get booking
    my_booking = get_my_booking(booking_id=booking_id, customer_id=cust_owner)
    assert my_booking["booking_id"] == booking_id

    # Another customer cannot get booking
    with pytest.raises(ForbiddenError):
        get_my_booking(booking_id=booking_id, customer_id=cust_other)

    # Provider creates quotation
    create_quotation(
        provider_id=provider_id,
        booking_id=booking_id,
        payload=QuotationCreateRequest(
            line_items=[QuotationLineItem(description="Circuit repair", amount_xaf=15000)]
        ),
    )

    # Owner can list quotations
    quotes_res = list_my_quotations(booking_id=booking_id, customer_id=cust_owner)
    assert len(quotes_res["quotations"]) >= 1

    # Other customer cannot list quotations
    with pytest.raises(ForbiddenError):
        list_my_quotations(booking_id=booking_id, customer_id=cust_other)


def test_tool_rental_request_confirmation_gate():
    """Verify power station rental creation requires linking and explicit confirmation."""
    cust_id = "user-rental-001"
    now = datetime.now(timezone.utc)
    start_iso = (now + timedelta(days=5)).isoformat()
    end_iso = (now + timedelta(days=7)).isoformat()

    # Search listings
    listings_res = search_rental_listings(min_capacity_wh=500)
    assert "listings" in listings_res
    assert len(listings_res["listings"]) >= 1
    listing_id = listings_res["listings"][0]["listing_id"]

    # Unconfirmed -> draft
    unconfirmed = create_rental_request(
        listing_id=listing_id,
        start_at_iso=start_iso,
        end_at_iso=end_iso,
        customer_confirmed=False,
        customer_id=cust_id,
    )
    assert unconfirmed["status"] == "CONFIRMATION_REQUIRED"

    # Confirmed -> booked
    confirmed = create_rental_request(
        listing_id=listing_id,
        start_at_iso=start_iso,
        end_at_iso=end_iso,
        customer_confirmed=True,
        customer_id=cust_id,
    )
    assert confirmed["status"] == "CONFIRMED"
    assert "rental_id" in confirmed


def test_tool_create_support_case_and_human_handoff():
    """Verify support case lodging and human handoff routing."""
    case = create_support_case(reason="Billing discrepancy", description="Overcharged by provider")
    assert case["status"] == "LODGED"
    assert case["case_ref"].startswith("ALICE-CASE-")

    handoff = request_human_handoff(reason="Customer requested live human assistance")
    assert handoff["status"] == "HANDOFF_QUEUED"


def test_bilingual_confirmation_keywords():
    """FR-WA-005: Confirmation words must be recognized in both English and French."""
    assert "yes" in CONFIRMATION_KEYWORDS
    assert "confirm" in CONFIRMATION_KEYWORDS
    assert "oui" in CONFIRMATION_KEYWORDS
    assert "confirmer" in CONFIRMATION_KEYWORDS
    assert "d'accord" in CONFIRMATION_KEYWORDS


@pytest.mark.asyncio
async def test_agent_turn_fallback_resilience():
    """Appendix G.7: When Gemini encounters network delay or outage, a graceful bilingual fallback is returned."""
    identity = get_or_create_channel_identity("+237671998877")
    conversation = get_or_create_conversation(identity["id"])

    # English message
    reply_en = await execute_agent_turn(conversation, identity, "Hello, I need help with a leak in Molyko")
    assert "ALICE" in reply_en

    # French message
    reply_fr = await execute_agent_turn(conversation, identity, "Bonjour, j'ai besoin d'un plombier à Molyko")
    assert "ALICE" in reply_fr
    assert "Bonjour" in reply_fr

    # Verify run logged in telemetry
    assert len(_AGENT_RUNS_STORE) >= 1

