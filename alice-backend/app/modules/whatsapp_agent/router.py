"""WhatsApp Agent router integrating Meta WhatsApp Cloud API (Graph API v22.0) and Account Linking."""

from app.api.v1.whatsapp_webhook import router

__all__ = ["router"]
