"""Tests for authentication and user endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_auth_otp_flow(async_client: AsyncClient):
    """Test full OTP send -> verify -> authenticated profile retrieval."""
    # 1. Send OTP
    send_resp = await async_client.post(
        "/api/v1/auth/otp/send",
        json={"phone": "671234567"},
    )
    assert send_resp.status_code == 200
    assert send_resp.json()["phone_e164"] == "+237671234567"

    # 2. Verify OTP
    verify_resp = await async_client.post(
        "/api/v1/auth/otp/verify",
        json={"phone": "+237671234567", "token": "123456"},
    )
    assert verify_resp.status_code == 200
    token_data = verify_resp.json()
    assert "access_token" in token_data
    token = token_data["access_token"]

    # 3. Retrieve user profile using Bearer JWT
    profile_resp = await async_client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert profile_resp.status_code == 200
    profile = profile_resp.json()
    assert profile["phone_e164"] == "+237671234567"
    assert "CUSTOMER" in profile["roles"]


@pytest.mark.asyncio
async def test_unauthenticated_request_rejected(async_client: AsyncClient):
    """Protected endpoints must reject requests lacking a Bearer token."""
    resp = await async_client.get("/api/v1/users/me")
    assert resp.status_code == 401
    error = resp.json()["error"]
    assert error["code"] == "AUTHENTICATION_FAILED"

