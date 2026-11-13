"""Meta WhatsApp Cloud API (Graph API v22.0) async client adapter."""

from functools import lru_cache
from typing import Any, Dict, List, Optional
import uuid

import httpx

from app.core.config import get_settings
from app.core.logging import logger


def strip_plus_prefix(phone_e164: str) -> str:
    """
    Strip leading '+' and whitespace from E.164 phone numbers for Meta Graph API.
    Example: '+2376XXXXXXXX' -> '2376XXXXXXXX'
    """
    clean = phone_e164.strip()
    return clean[1:] if clean.startswith("+") else clean


class MetaWhatsAppClient:
    """Official Meta WhatsApp Cloud API async client (Graph API v22.0)."""

    def __init__(
        self,
        access_token: str,
        phone_number_id: str,
        graph_version: str = "v22.0",
        client: Optional[httpx.AsyncClient] = None,
    ):
        self.access_token = access_token
        self.phone_number_id = phone_number_id
        self.graph_version = graph_version
        self.endpoint_url = (
            f"https://graph.facebook.com/{self.graph_version}/{self.phone_number_id}/messages"
        )
        self._client = client

    @property
    def is_mock_mode(self) -> bool:
        """Check if client is configured with mock credentials for local dev or tests."""
        return (
            not self.access_token
            or self.access_token.startswith("mock")
            or not self.phone_number_id
            or self.phone_number_id.startswith("mock")
        )

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=15.0)
        return self._client

    async def close(self) -> None:
        """Close underlying HTTP client if opened."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def _post(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Send authenticated POST request to Meta Graph API messages endpoint."""
        if self.is_mock_mode:
            logger.info("Meta WhatsApp mock client executing POST to %s with type=%s", self.endpoint_url, payload.get("type") or payload.get("status"))
            if payload.get("status") == "read":
                return {"success": True}
            return {
                "messaging_product": "whatsapp",
                "contacts": [{"input": payload.get("to", ""), "wa_id": payload.get("to", "")}],
                "messages": [{"id": f"wamid.mock_{uuid.uuid4().hex[:16]}"}],
            }

        client = await self._get_client()
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }
        try:
            response = await client.post(self.endpoint_url, headers=headers, json=payload)
            if response.status_code >= 400:
                logger.error(
                    "Meta WhatsApp API error: status=%d body=%s",
                    response.status_code,
                    response.text,
                )
                response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error("Meta WhatsApp HTTPStatusError: %s", str(e))
            raise
        except Exception as e:
            logger.error("Meta WhatsApp request failed: %s", str(e))
            raise

    async def send_text_message(
        self,
        to: str,
        text: str,
        preview_url: bool = False,
    ) -> Dict[str, Any]:
        """
        Send a free-form WhatsApp text message via Meta Cloud API.
        Automatically strips leading '+' from recipient number.
        """
        recipient = strip_plus_prefix(to)
        logger.info("Sending WhatsApp text message via Meta Cloud API to %s", recipient)
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": recipient,
            "type": "text",
            "text": {
                "preview_url": preview_url,
                "body": text,
            },
        }
        return await self._post(payload)

    async def send_template_message(
        self,
        to: str,
        template_name: str,
        language_code: str = "en",
        components: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Send an approved WhatsApp template message via Meta Cloud API.
        Used for business-initiated notifications outside 24h customer service window (FR-WA-013).
        """
        recipient = strip_plus_prefix(to)
        logger.info(
            "Sending WhatsApp template '%s' (%s) via Meta Cloud API to %s",
            template_name,
            language_code,
            recipient,
        )
        template_body: Dict[str, Any] = {
            "name": template_name,
            "language": {"code": language_code},
        }
        if components:
            template_body["components"] = components

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": recipient,
            "type": "template",
            "template": template_body,
        }
        return await self._post(payload)

    async def mark_message_as_read(self, message_id: str) -> Dict[str, Any]:
        """
        Mark an inbound WhatsApp message as read (status: 'read').
        Displays blue read ticks to the user in WhatsApp.
        """
        logger.info("Marking WhatsApp message %s as read", message_id)
        payload = {
            "messaging_product": "whatsapp",
            "status": "read",
            "message_id": message_id,
        }
        return await self._post(payload)


@lru_cache()
def get_meta_whatsapp_client() -> MetaWhatsAppClient:
    """Return cached Meta WhatsApp Cloud API client singleton."""
    settings = get_settings()
    return MetaWhatsAppClient(
        access_token=settings.WHATSAPP_ACCESS_TOKEN,
        phone_number_id=settings.WHATSAPP_PHONE_NUMBER_ID,
        graph_version=settings.WHATSAPP_GRAPH_VERSION,
    )

