"""WhatsApp agent orchestration, account linking, and asynchronous worker logic."""

import hashlib
import random
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from app.core.logging import logger
from app.integrations.twilio.client import get_twilio_service

# In-memory store for linking codes and identities
_LINKING_CODES: Dict[str, Dict[str, Any]] = {}
_CHANNEL_IDENTITIES: Dict[str, Dict[str, Any]] = {}
_PROCESSED_MESSAGE_SIDS: set = set()


def hash_address(raw_address: str) -> str:
    """Generate SHA-256 hash of external phone address for privacy at rest."""
    return hashlib.sha256(raw_address.strip().encode("utf-8")).hexdigest()


def generate_linking_code(user_id: str) -> Dict[str, Any]:
    """Generate a 6-digit linking code valid for 10 minutes (Appendix D.6)."""
    code = f"{random.randint(100000, 999999)}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    _LINKING_CODES[code] = {
        "user_id": user_id,
        "expires_at": expires_at,
    }

    logger.info("Generated WhatsApp linking code for user %s (expires in 10 mins)", user_id)
    return {
        "linking_code": code,
        "expires_at": expires_at,
        "instructions": f"Send 'LINK {code}' to ALICE on WhatsApp to connect your account.",
    }


def verify_linking_code(sender_whatsapp: str, code: str) -> bool:
    """Verify linking code sent from WhatsApp and connect account."""
    clean_code = code.strip().upper().replace("LINK", "").strip()
    record = _LINKING_CODES.get(clean_code)

    if not record:
        return False

    if record["expires_at"] < datetime.now(timezone.utc):
        del _LINKING_CODES[clean_code]
        return False

    user_id = record["user_id"]
    address_hash = hash_address(sender_whatsapp)

    _CHANNEL_IDENTITIES[address_hash] = {
        "channel_identity_id": str(uuid.uuid4()),
        "user_id": user_id,
        "channel": "WHATSAPP",
        "external_address_hash": address_hash,
        "status": "LINKED",
        "linked_at": datetime.now(timezone.utc),
    }

    # Invalidate used code
    del _LINKING_CODES[clean_code]
    logger.info("Successfully linked WhatsApp identity %s to user %s", address_hash[:8], user_id)
    return True


async def async_process_whatsapp_turn(
    sender_whatsapp: str,
    message_body: str,
    message_sid: str,
) -> None:
    """FastAPI BackgroundTasks worker for AI agent turn execution."""
    logger.info("Processing async WhatsApp turn for %s: %s (SID: %s)", sender_whatsapp, message_body[:30], message_sid)

    # 1. Check for account linking command: e.g. "LINK 123456"
    if message_body.strip().upper().startswith("LINK "):
        code = message_body.strip().split()[-1]
        if verify_linking_code(sender_whatsapp, code):
            reply = "✅ Compte ALICE lié avec succès! / Your ALICE account has been successfully linked. You can now manage bookings and rentals directly on WhatsApp."
        else:
            reply = "❌ Code de liaison invalide ou expiré. / Invalid or expired linking code. Please generate a new code in your ALICE app profile."

        try:
            twilio = get_twilio_service()
            twilio.send_whatsapp_message(sender_whatsapp, reply)
        except Exception as e:
            logger.error("Failed to send async reply: %s", str(e))
        return

    # 2. Grounded intent processing (Draft or Query)
    # Echo / greeting fallback response for MVP demonstration
    reply = (
        "Bonjour! Je suis ALICE, votre assistante pour les services à Buea. "
        "Dites-moi de quel service vous avez besoin (plombier à Molyko, recharge de gaz, ou location de batterie)."
    )
    try:
        twilio = get_twilio_service()
        twilio.send_whatsapp_message(sender_whatsapp, reply)
    except Exception as e:
        logger.error("Failed to send WhatsApp message: %s", str(e))
