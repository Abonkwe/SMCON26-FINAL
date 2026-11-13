"""Unit tests for WhatsApp allowlisted tools and server-side confirmation gate (FR-GEM-005)."""

from datetime import datetime, timedelta, timezone

import pytest

from app.core.exceptions import ValidationError
from app.modules.whatsapp_agent.tools import (
    tool_confirm_rental_request,
    tool_confirm_service_request,
    tool_draft_rental_request,
    tool_draft_service_request,
    tool_get_provider_public_profile,
    tool_search_services,
)


def test_search_services_and_provider_profile():
    """Verify read-only discovery tools return grounded, safe fields."""
    services_res = tool_search_services(query="plumb", neighbourhood="Molyko")
    assert "matched_services" in services_res
    assert len(services_res["matched_services"]) >= 1

    profile_res = tool_get_provider_public_profile("provider-demo-1")
    assert "public_name" in profile_res
    assert "verification_badges" in profile_res
    # Verify no private files or passwords exposed
    assert "password_hash" not in profile_res
    assert "private_file_ref" not in profile_res


def test_server_side_confirmation_gate_blocks_unconfirmed_booking():
    """FR-GEM-005: Consequential service booking MUST be rejected if user_confirmed is False."""
    customer_id = "test-wa-cust-001"

    # Step 1: Draft is created
    draft = tool_draft_service_request(
        customer_id=customer_id,
        provider_id="provider-demo-1",
        service_id="00000000-0000-0000-0003-000000000001",
        neighbourhood="Molyko",
        description="Kitchen pipe leaking water",
    )
    draft_id = draft["draft_id"]

    # Step 2: Attempting to confirm with user_confirmed=False MUST be blocked
    with pytest.raises(ValidationError):
        tool_confirm_service_request(customer_id=customer_id, draft_id=draft_id, user_confirmed=False)

    # Step 3: Confirming with user_confirmed=True succeeds
    confirmed = tool_confirm_service_request(customer_id=customer_id, draft_id=draft_id, user_confirmed=True)
    assert confirmed["status"] == "CONFIRMED"
    assert "booking_id" in confirmed


def test_server_side_confirmation_gate_blocks_unconfirmed_rental():
    """FR-GEM-005: Power station rental booking MUST be rejected if user_confirmed is False."""
    customer_id = "test-wa-cust-002"
    now = datetime.now(timezone.utc)
    start_iso = (now + timedelta(days=20)).isoformat()
    end_iso = (now + timedelta(days=22)).isoformat()

    # Step 1: Draft rental
    draft = tool_draft_rental_request(
        customer_id=customer_id,
        listing_id="rental-listing-1",
        start_at_iso=start_iso,
        end_at_iso=end_iso,
    )
    draft_id = draft["draft_id"]

    # Step 2: Blocked when unconfirmed
    with pytest.raises(ValidationError):
        tool_confirm_rental_request(customer_id=customer_id, draft_id=draft_id, user_confirmed=False)

    # Step 3: Success when confirmed
    confirmed = tool_confirm_rental_request(customer_id=customer_id, draft_id=draft_id, user_confirmed=True)
    assert confirmed["status"] == "CONFIRMED"
    assert "rental_id" in confirmed
