"""Twilio WhatsApp client wrapper and webhook signature verification."""

from functools import lru_cache
from typing import Dict, Optional

from twilio.request_validator import RequestValidator
from twilio.rest import Client as TwilioRestClient

from app.core.config import get_settings
from app.core.logging import logger


class TwilioService:
    """Twilio WhatsApp client and webhook security adapter."""

    def __init__(self, account_sid: str, auth_token: str, from_number: str):
        self.account_sid = account_sid
        self.auth_token = auth_token
        self.from_number = from_number
        self._validator: Optional[RequestValidator] = None
        self._client: Optional[TwilioRestClient] = None

    @property
    def validator(self) -> RequestValidator:
        if self._validator is None:
            self._validator = RequestValidator(self.auth_token)
        return self._validator

    @property
    def client(self) -> TwilioRestClient:
        if self._client is None:
            self._client = TwilioRestClient(self.account_sid, self.auth_token)
        return self._client

    def validate_signature(self, full_url: str, params: Dict[str, str], signature: str) -> bool:
        """Validate inbound Twilio webhook X-Twilio-Signature header."""
        if not signature:
            return False
        return self.validator.validate(full_url, params, signature)

    def send_whatsapp_message(self, to_e164_whatsapp: str, body: str) -> str:
        """Send an outbound WhatsApp message via Twilio REST API."""
        formatted_to = to_e164_whatsapp if to_e164_whatsapp.startswith("whatsapp:") else f"whatsapp:{to_e164_whatsapp}"
        formatted_from = (
            self.from_number if self.from_number.startswith("whatsapp:") else f"whatsapp:{self.from_number}"
        )

        logger.info("Sending outbound WhatsApp message to %s", formatted_to)
        try:
            msg = self.client.messages.create(
                to=formatted_to,
                from_=formatted_from,
                body=body,
            )
            return msg.sid
        except Exception as e:
            logger.error("Failed to send WhatsApp message via Twilio: %s", str(e))
            raise


@lru_cache()
def get_twilio_service() -> TwilioService:
    """Return cached Twilio service instance."""
    settings = get_settings()
    return TwilioService(
        account_sid=settings.TWILIO_ACCOUNT_SID,
        auth_token=settings.TWILIO_AUTH_TOKEN,
        from_number=settings.TWILIO_WHATSAPP_FROM,
    )
