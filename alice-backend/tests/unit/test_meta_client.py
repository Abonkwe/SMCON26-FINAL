"""Unit tests for Meta WhatsApp Cloud API client (Graph API v22.0)."""

import pytest

from app.integrations.whatsapp.meta_client import (
    MetaWhatsAppClient,
    strip_plus_prefix,
)


def test_strip_plus_prefix():
    """Verify that leading '+' and whitespace are stripped from Cameroon E.164 phone numbers."""
    assert strip_plus_prefix("+237671234567") == "237671234567"
    assert strip_plus_prefix(" +237699001122 ") == "237699001122"
    assert strip_plus_prefix("237650334455") == "237650334455"


@pytest.mark.asyncio
async def test_meta_client_mock_send_text_message():
    """Verify Meta client in mock/dev mode formats recipient and generates response."""
    client = MetaWhatsAppClient(
        access_token="mock_token",
        phone_number_id="mock_phone_id",
        graph_version="v22.0",
    )
    assert client.is_mock_mode is True

    res = await client.send_text_message(
        to="+237671234567",
        text="Hello from ALICE Buea!",
    )
    assert res["messaging_product"] == "whatsapp"
    assert res["contacts"][0]["wa_id"] == "237671234567"
    assert len(res["messages"]) == 1
    assert res["messages"][0]["id"].startswith("wamid.mock_")


@pytest.mark.asyncio
async def test_meta_client_mock_send_template_message():
    """Verify template message sending strips '+' and sets template parameters."""
    client = MetaWhatsAppClient(
        access_token="mock_token",
        phone_number_id="mock_phone_id",
        graph_version="v22.0",
    )

    res = await client.send_template_message(
        to="+237699112233",
        template_name="booking_confirmed",
        language_code="fr",
    )
    assert res["messaging_product"] == "whatsapp"
    assert res["contacts"][0]["wa_id"] == "237699112233"


@pytest.mark.asyncio
async def test_meta_client_mock_mark_message_as_read():
    """Verify mark inbound message as read helper."""
    client = MetaWhatsAppClient(
        access_token="mock_token",
        phone_number_id="mock_phone_id",
        graph_version="v22.0",
    )

    res = await client.mark_message_as_read("wamid.HBgLMjM3...")
    assert res.get("success") is True

