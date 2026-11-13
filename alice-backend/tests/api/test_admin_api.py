"""Tests for Admin operations, metrics, and immutable audit logs."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_admin_metrics_access(async_client: AsyncClient, admin_auth_headers: dict, customer_auth_headers: dict):
    """GET /api/v1/admin/metrics should be accessible to Admin and forbidden to normal Customer."""
    # 1. Customer attempt should be forbidden (403)
    cust_resp = await async_client.get("/api/v1/admin/metrics", headers=customer_auth_headers)
    assert cust_resp.status_code == 403

    # 2. Admin access should succeed (200)
    admin_resp = await async_client.get("/api/v1/admin/metrics", headers=admin_auth_headers)
    assert admin_resp.status_code == 200
    metrics = admin_resp.json()
    assert "total_users" in metrics
    assert "open_disputes" in metrics
    assert "pending_identity_verifications" in metrics


@pytest.mark.asyncio
async def test_audit_log_recorded_on_verification_review(
    async_client: AsyncClient,
    reviewer_auth_headers: dict,
    admin_auth_headers: dict,
    customer_auth_headers: dict,
):
    """AC-02: Admin review of verification submission must append an immutable audit log."""
    # 1. Customer submits ID
    sub_resp = await async_client.post(
        "/api/v1/verifications/identity",
        headers=customer_auth_headers,
        json={
            "document_type": "NATIONAL_ID",
            "private_file_ref": "ids/cni_cust_audit_test.jpg",
        },
    )
    assert sub_resp.status_code == 201
    ver_id = sub_resp.json()["verification_id"]

    # 2. Reviewer approves submission with mandatory reason
    review_resp = await async_client.patch(
        f"/api/v1/verifications/admin/{ver_id}/review",
        headers=reviewer_auth_headers,
        json={
            "decision": "VERIFIED",
            "decision_reason": "Clear National ID photo and matching names confirmed",
        },
    )
    assert review_resp.status_code == 200

    # 3. Admin views audit logs and verifies audit trail entry exists
    audit_resp = await async_client.get(
        "/api/v1/admin/audit-logs?entity_type=VerificationSubmission",
        headers=admin_auth_headers,
    )
    assert audit_resp.status_code == 200
    logs = audit_resp.json()
    matching_log = next((entry for entry in logs if entry["entity_id"] == ver_id), None)
    assert matching_log is not None
    assert matching_log["action"] == "VERIFICATION_VERIFIED"
    assert "Clear National ID" in matching_log["reason"]
