"""Twilio WhatsApp client wrapper and webhook signature verification."""

from app.integrations.twilio.client import get_twilio_service

__all__ = ["get_twilio_service"]
