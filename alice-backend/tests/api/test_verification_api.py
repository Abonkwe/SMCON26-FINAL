"""Tests for verification endpoints and anti-self-approval rule."""

import pytest
from httpx import AsyncClient

from app.modules.auth.services import create_mock_jwt


@pytest.mark.asyncio
async def test_anti_self_review_enforcement(async_client: AsyncClient):
    """Reviewers must be strictly blocked from reviewing their own identity submission."""
    reviewer_user_id = "test-reviewer-uuid-001"
    token = create_mock_jwt(
        user_id=reviewer_user_id,
        phone_e164="+237674445566",
        roles=["CUSTOMER", "VERIFICATION_REVIEWER"],
    )
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Reviewer submits an ID document for themselves
    sub_resp = await async_client.post(
        "/api/v1/verifications/identity",
        headers=headers,
        json={
            "document_type": "NATIONAL_ID",
            "private_file_ref": "ids/cni_reviewer_001.jpg",
        },
    )
    assert sub_resp.status_code == 201
    verification_id = sub_resp.json()["verification_id"]

    # 2. Reviewer attempts to approve their own submission
    review_resp = await async_client.patch(
        f"/api/v1/verifications/admin/{verification_id}/review",
        headers=headers,
        json={
            "decision": "VERIFIED",
            "decision_reason": "Attempting self-approval",
        },
    )
    # Must fail closed with 403 Forbidden!
    assert review_resp.status_code == 403
    assert "prohibited from approving their own submissions" in review_resp.json()["error"]["message"]
