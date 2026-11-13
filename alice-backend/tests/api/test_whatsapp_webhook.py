"""API integration tests for Meta WhatsApp Cloud API webhooks and account linking (Graph API v22.0)."""

import hashlib
import hmac
import json

import pytest
from httpx import AsyncClient

from app.core.config import get_settings
from app.modules.whatsapp_agent.services import (
    _CHANNEL_IDENTITIES,
    _LINKING_CODES,
    _PROCESSED_WAMIDS,
    hash_address,
)


def compute_meta_hub_signature(raw_body: bytes, secret: str) -> str:
    """Compute HMAC-SHA256 signature for Meta webhook test headers."""
    mac = hmac.new(secret.encode("utf-8"), msg=raw_body, digestmod=hashlib.sha256)
    return f"sha256={mac.hexdigest()}"


@pytest.mark.asyncio
async def test_meta_webhook_get_handshake_success(async_client: AsyncClient):
    """GET /api/v1/integrations/whatsapp/webhook handshake verification succeeds with valid token."""
    settings = get_settings()
    challenge_token = "1158201444"

    response = await async_client.get(
        "/api/v1/integrations/whatsapp/webhook",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": settings.WHATSAPP_VERIFY_TOKEN,
            "hub.challenge": challenge_token,
        },
    )

    assert response.status_code == 200
    assert response.text == challenge_token


@pytest.mark.asyncio
async def test_meta_webhook_get_handshake_invalid_token(async_client: AsyncClient):
    """GET /api/v1/integrations/whatsapp/webhook fails with 403 on invalid verify token."""
    response = await async_client.get(
        "/api/v1/integrations/whatsapp/webhook",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "wrong-token-abc",
            "hub.challenge": "1158201444",
        },
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_meta_webhook_get_handshake_invalid_mode(async_client: AsyncClient):
    """GET /api/v1/integrations/whatsapp/webhook fails with 403 when hub.mode != subscribe."""
    settings = get_settings()
    response = await async_client.get(
        "/api/v1/integrations/whatsapp/webhook",
        params={
            "hub.mode": "unsubscribe",
            "hub.verify_token": settings.WHATSAPP_VERIFY_TOKEN,
            "hub.challenge": "1158201444",
        },
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_meta_webhook_post_valid_signature_and_event(async_client: AsyncClient):
    """POST /api/v1/integrations/whatsapp/webhook accepts valid HMAC-SHA256 signature and returns 200 ok."""
    settings = get_settings()
    payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "100000000000000",
                "changes": [
                    {
                        "field": "messages",
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {
                                "display_phone_number": "237670000000",
                                "phone_number_id": "100000000000000",
                            },
                            "contacts": [
                                {
                                    "profile": {"name": "Paul Biya"},
                                    "wa_id": "237671234567",
                                    "user_id": "bsuid_test_12345",
                                }
                            ],
                            "messages": [
                                {
                                    "from": "237671234567",
                                    "id": "wamid.test_unique_001",
                                    "timestamp": "1710000000",
                                    "text": {"body": "Hello ALICE"},
                                    "type": "text",
                                }
                            ],
                        },
                    }
                ],
            }
        ],
    }

    raw_body = json.dumps(payload).encode("utf-8")
    signature = compute_meta_hub_signature(raw_body, settings.WHATSAPP_APP_SECRET)

    response = await async_client.post(
        "/api/v1/integrations/whatsapp/webhook",
        content=raw_body,
        headers={
            "Content-Type": "application/json",
            "X-Hub-Signature-256": signature,
        },
    )

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert "wamid.test_unique_001" in _PROCESSED_WAMIDS


@pytest.mark.asyncio
async def test_meta_webhook_post_invalid_signature_rejected(async_client: AsyncClient):
    """POST /api/v1/integrations/whatsapp/webhook rejects invalid X-Hub-Signature-256 header with 403."""
    payload = {"object": "whatsapp_business_account", "entry": []}
    raw_body = json.dumps(payload).encode("utf-8")

    response = await async_client.post(
        "/api/v1/integrations/whatsapp/webhook",
        content=raw_body,
        headers={
            "Content-Type": "application/json",
            "X-Hub-Signature-256": "sha256=invalid_hex_digest_00000000000000000000000000000000",
        },
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_meta_webhook_deduplicates_wamid(async_client: AsyncClient):
    """FR-WA-014: Duplicate incoming Meta wamid must be ignored without raising errors."""
    settings = get_settings()
    wamid = "wamid.duplicate_test_999"
    _PROCESSED_WAMIDS.add(wamid)

    payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "100000000000000",
                "changes": [
                    {
                        "field": "messages",
                        "value": {
                            "messaging_product": "whatsapp",
                            "messages": [
                                {
                                    "from": "237671234567",
                                    "id": wamid,
                                    "timestamp": "1710000000",
                                    "text": {"body": "Duplicate retry attempt"},
                                    "type": "text",
                                }
                            ],
                        },
                    }
                ],
            }
        ],
    }

    raw_body = json.dumps(payload).encode("utf-8")
    signature = compute_meta_hub_signature(raw_body, settings.WHATSAPP_APP_SECRET)

    response = await async_client.post(
        "/api/v1/integrations/whatsapp/webhook",
        content=raw_body,
        headers={
            "Content-Type": "application/json",
            "X-Hub-Signature-256": signature,
        },
    )
    # Must immediately return 200 ok
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_account_linking_start_and_confirm(
    async_client: AsyncClient,
    customer_auth_headers: dict,
):
    """Explicit account linking lifecycle via POST /link/start and /confirm."""
    # 1. Start linking from authenticated customer session
    start_res = await async_client.post(
        "/api/v1/whatsapp/link/start",
        headers=customer_auth_headers,
    )
    assert start_res.status_code == 200
    data = start_res.json()
    code = data["linking_code"]
    assert len(code) == 6
    assert "expires_at" in data

    # 2. Confirm linking with Cameroon phone number
    phone = "+237671234567"
    confirm_res = await async_client.post(
        "/api/v1/whatsapp/link/confirm",
        json={"phone_number": phone, "linking_code": code},
    )
    assert confirm_res.status_code == 200
    confirm_data = confirm_res.json()
    assert confirm_data["status"] == "LINKED"
    assert confirm_data["phone_number"] == phone
    assert confirm_data["user_id"] == "test-customer-uuid-001"

    # Verify channel identity record is now LINKED
    addr_hash = hash_address(phone)
    assert addr_hash in _CHANNEL_IDENTITIES
    assert _CHANNEL_IDENTITIES[addr_hash]["status"] == "LINKED"
    assert _CHANNEL_IDENTITIES[addr_hash]["user_id"] == "test-customer-uuid-001"

