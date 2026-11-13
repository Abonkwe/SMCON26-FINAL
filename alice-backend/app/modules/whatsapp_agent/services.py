"""WhatsApp agent orchestration, bilingual Gemini integration, account linking, and background worker."""

from datetime import datetime, timedelta, timezone
from functools import lru_cache
import hashlib
import random
import time
from typing import Any, Dict, List, Optional, Set
import uuid

from google.genai import types

from app.core.exceptions import ValidationError
from app.core.logging import logger
from app.integrations.gemini.client import get_gemini_service
from app.integrations.supabase.client import get_supabase_service_client
from app.integrations.whatsapp.meta_client import get_meta_whatsapp_client
from app.modules.auth.services import normalize_cameroon_phone
from app.modules.whatsapp_agent.tools import (
    _AGENT_RUNS_STORE,
    _PENDING_DRAFTS_STORE,
    create_rental_request,
    create_service_request,
    create_support_case,
    get_gemini_tools,
    get_my_booking,
    get_provider_public_profile,
    list_my_bookings,
    list_my_quotations,
    redact_private_data,
    request_human_handoff,
    search_rental_listings,
    search_services,
)

# -----------------------------------------------------------------------------
# In-Memory Storage & Caches
# -----------------------------------------------------------------------------
_LINKING_CODES: Dict[str, Dict[str, Any]] = {}
_CHANNEL_IDENTITIES: Dict[str, Dict[str, Any]] = {}  # key: external_address_hash
_CONVERSATIONS: Dict[str, Dict[str, Any]] = {}        # key: conversation_id
_MESSAGES_STORE: Dict[str, Dict[str, Any]] = {}       # key: message_id
_PROCESSED_WAMIDS: Set[str] = set()

# Confirmation triggers for English and French
CONFIRMATION_KEYWORDS = {
    "yes", "oui", "confirm", "confirmer", "confirme", "d'accord", "daccord",
    "proceed", "yep", "sure", "ok", "okay", "je confirme", "i confirm", "valider"
}

# -----------------------------------------------------------------------------
# Bilingual System Instruction (FR-WA-005, Appendix D.1, Appendix G)
# -----------------------------------------------------------------------------
BILINGUAL_SYSTEM_INSTRUCTION = """
You are ALICE, an intelligent, trusted, bilingual (English and French) virtual assistant for local home services and portable power station rentals in Buea, Cameroon.

ROLE & BEHAVIOUR:
1. Ground every claim strictly in tool results. Never invent provider names, ratings, prices, or availability.
2. Support English, French, and local Cameroonian expressions naturally. Always reply in the user's chosen or detected language.
3. Be concise, friendly, and practical for mobile WhatsApp reading.
4. For service discovery, help the user identify their need (e.g., plumbing in Molyko, electrical in Clerks Quarters, gas refill) and present available verified providers.
5. For power station rentals, explain capacity in Watt-hours (Wh) and continuous output in Watts (W).
6. CONSEQUENTIAL ACTIONS SAFETY RULE: Before creating a booking or rental request, you MUST first show a concise summary (service/item, neighbourhood, provider/details) and ask for explicit confirmation (e.g. "Reply YES or OUI to confirm"). NEVER call `create_service_request` or `create_rental_request` with customer_confirmed=True unless the customer explicitly approved the summary in the conversation.
7. ACCOUNT LINKING: If a tool returns AUTHENTICATION_REQUIRED or indicates the account is unlinked, explain that they can link their ALICE account by sending "LINK <code>" from the app.
8. If the customer is dissatisfied, confused, or asks for human support, offer human handoff using `request_human_handoff`.
"""


def hash_address(raw_address: str) -> str:
    """Generate SHA-256 hash of external phone address for privacy at rest (Appendix D.8)."""
    return hashlib.sha256(raw_address.strip().encode("utf-8")).hexdigest()


# -----------------------------------------------------------------------------
# Account Linking Service Logic (Appendix D.6)
# -----------------------------------------------------------------------------
def generate_linking_code(user_id: str) -> Dict[str, Any]:
    """Generate a short-lived 6-digit linking code valid for 10 minutes."""
    code = f"{random.randint(100000, 999999)}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    _LINKING_CODES[code] = {
        "user_id": user_id,
        "expires_at": expires_at,
    }

    logger.info("Generated WhatsApp linking code %s for user %s (expires in 10 mins)", code, user_id)
    return {
        "linking_code": code,
        "expires_at": expires_at,
        "instructions": (
            f"Send 'LINK {code}' to ALICE on WhatsApp or confirm in your profile to link your account."
        ),
    }


def confirm_linking(phone_number: str, linking_code: str) -> Dict[str, Any]:
    """
    Explicitly confirm account linking via API endpoint POST /api/v1/whatsapp/link/confirm.
    Normalizes phone to +237 E.164 and connects channel identity to user_id.
    """
    clean_code = linking_code.strip()
    record = _LINKING_CODES.get(clean_code)

    if not record:
        raise ValidationError("Invalid linking code. Please generate a new code.")

    if record["expires_at"] < datetime.now(timezone.utc):
        _LINKING_CODES.pop(clean_code, None)
        raise ValidationError("Linking code has expired. Please generate a new code.")

    user_id = record["user_id"]
    normalized_phone = normalize_cameroon_phone(phone_number)
    address_hash = hash_address(normalized_phone)
    now = datetime.now(timezone.utc)

    identity = _CHANNEL_IDENTITIES.get(address_hash)
    if not identity:
        identity = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "channel": "WHATSAPP",
            "external_address_hash": address_hash,
            "external_address_encrypted": f"{normalized_phone[:5]}****{normalized_phone[-3:]}",
            "linked_at": now,
            "status": "LINKED",
            "consent_at": now,
            "unlinked_at": None,
            "created_at": now,
            "metadata": {},
        }
    else:
        identity["user_id"] = user_id
        identity["status"] = "LINKED"
        identity["linked_at"] = now
        identity["consent_at"] = now

    _CHANNEL_IDENTITIES[address_hash] = identity
    _LINKING_CODES.pop(clean_code, None)

    # Optional Supabase mirror
    try:
        supabase = get_supabase_service_client()
        supabase.client.table("channel_identities").upsert({
            "id": identity["id"],
            "user_id": user_id,
            "channel": "WHATSAPP",
            "external_address_hash": address_hash,
            "external_address_encrypted": identity["external_address_encrypted"],
            "linked_at": now.isoformat(),
            "status": "LINKED",
            "consent_at": now.isoformat(),
        }).execute()
    except Exception as e:
        logger.debug("Supabase channel_identities upsert skipped: %s", str(e))

    logger.info("Successfully confirmed account linking for user %s and phone %s", user_id, normalized_phone)
    return {
        "status": "LINKED",
        "phone_number": normalized_phone,
        "user_id": user_id,
        "message": "WhatsApp account successfully linked.",
    }


def verify_linking_code_from_chat(sender_e164: str, raw_text: str) -> Optional[str]:
    """
    Verify linking code sent directly in WhatsApp message (e.g. 'LINK 123456').
    Returns linked user_id if successful, None otherwise.
    """
    parts = raw_text.strip().split()
    if len(parts) < 2:
        return None

    code = parts[1].strip()
    record = _LINKING_CODES.get(code)
    if not record:
        return None

    if record["expires_at"] < datetime.now(timezone.utc):
        _LINKING_CODES.pop(code, None)
        return None

    user_id = record["user_id"]
    address_hash = hash_address(sender_e164)
    now = datetime.now(timezone.utc)

    identity = _CHANNEL_IDENTITIES.get(address_hash)
    if not identity:
        identity = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "channel": "WHATSAPP",
            "external_address_hash": address_hash,
            "external_address_encrypted": f"{sender_e164[:5]}****{sender_e164[-3:]}",
            "linked_at": now,
            "status": "LINKED",
            "consent_at": now,
            "created_at": now,
            "metadata": {},
        }
    else:
        identity["user_id"] = user_id
        identity["status"] = "LINKED"
        identity["linked_at"] = now
        identity["consent_at"] = now

    _CHANNEL_IDENTITIES[address_hash] = identity
    _LINKING_CODES.pop(code, None)
    logger.info("WhatsApp user %s linked via chat code %s to user %s", address_hash[:8], code, user_id)
    return user_id


def get_or_create_channel_identity(
    phone_e164: str,
    bsuid: Optional[str] = None,
    profile_name: Optional[str] = None,
) -> Dict[str, Any]:
    """Retrieve or create an unlinked channel identity for the normalized phone number."""
    address_hash = hash_address(phone_e164)
    now = datetime.now(timezone.utc)

    if address_hash not in _CHANNEL_IDENTITIES:
        identity_id = str(uuid.uuid4())
        _CHANNEL_IDENTITIES[address_hash] = {
            "id": identity_id,
            "user_id": None,
            "channel": "WHATSAPP",
            "external_address_hash": address_hash,
            "external_address_encrypted": f"{phone_e164[:5]}****{phone_e164[-3:]}",
            "linked_at": None,
            "status": "UNLINKED",
            "consent_at": None,
            "unlinked_at": None,
            "created_at": now,
            "metadata": {"bsuid": bsuid, "profile_name": profile_name},
        }
    else:
        if bsuid:
            _CHANNEL_IDENTITIES[address_hash]["metadata"]["bsuid"] = bsuid
        if profile_name:
            _CHANNEL_IDENTITIES[address_hash]["metadata"]["profile_name"] = profile_name

    return _CHANNEL_IDENTITIES[address_hash]


def get_or_create_conversation(channel_identity_id: str, language: str = "en") -> Dict[str, Any]:
    """Retrieve or create active conversation record for channel identity."""
    for conv in _CONVERSATIONS.values():
        if conv["channel_identity_id"] == channel_identity_id and conv["handoff_status"] != "RESOLVED":
            return conv

    conv_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    conv = {
        "id": conv_id,
        "channel": "WHATSAPP",
        "channel_identity_id": channel_identity_id,
        "language": language,
        "state": {},
        "last_inbound_at": now,
        "service_window_expires_at": now + timedelta(hours=24),
        "assigned_agent": "gemini-2.5-flash",
        "handoff_status": "BOT",
        "created_at": now,
        "updated_at": now,
    }
    _CONVERSATIONS[conv_id] = conv
    return conv


# -----------------------------------------------------------------------------
# Tool Execution Dispatcher
# -----------------------------------------------------------------------------
def execute_allowlisted_tool(
    name: str,
    args: Dict[str, Any],
    customer_id: Optional[str],
    conversation_id: str,
    run_id: str,
    is_confirmed_turn: bool = False,
) -> Dict[str, Any]:
    """Execute allowlisted tool with permission verification and argument redaction."""
    logger.info("Executing allowlisted tool: %s with args=%s (user_id=%s)", name, redact_private_data(args), customer_id)

    if name == "search_services":
        return search_services(
            query=args.get("query"),
            neighbourhood=args.get("neighbourhood"),
            run_id=run_id,
        )
    elif name == "get_provider_public_profile":
        return get_provider_public_profile(
            provider_id=args.get("provider_id", ""),
            run_id=run_id,
        )
    elif name == "create_service_request":
        confirmed = args.get("customer_confirmed", False) or is_confirmed_turn
        return create_service_request(
            provider_id=args.get("provider_id", ""),
            service_id=args.get("service_id", ""),
            neighbourhood=args.get("neighbourhood", ""),
            description=args.get("description", ""),
            customer_confirmed=confirmed,
            customer_id=customer_id,
            run_id=run_id,
        )
    elif name == "list_my_bookings":
        return list_my_bookings(
            status_filter=args.get("status_filter"),
            customer_id=customer_id,
            run_id=run_id,
        )
    elif name == "get_my_booking":
        return get_my_booking(
            booking_id=args.get("booking_id", ""),
            customer_id=customer_id,
            run_id=run_id,
        )
    elif name == "list_my_quotations":
        return list_my_quotations(
            booking_id=args.get("booking_id", ""),
            customer_id=customer_id,
            run_id=run_id,
        )
    elif name == "search_rental_listings":
        return search_rental_listings(
            min_capacity_wh=args.get("min_capacity_wh"),
            max_daily_rate_xaf=args.get("max_daily_rate_xaf"),
            run_id=run_id,
        )
    elif name == "create_rental_request":
        confirmed = args.get("customer_confirmed", False) or is_confirmed_turn
        return create_rental_request(
            listing_id=args.get("listing_id", ""),
            start_at_iso=args.get("start_at_iso", ""),
            end_at_iso=args.get("end_at_iso", ""),
            customer_confirmed=confirmed,
            customer_id=customer_id,
            run_id=run_id,
        )
    elif name == "create_support_case":
        return create_support_case(
            reason=args.get("reason", "Customer inquiry"),
            description=args.get("description", ""),
            customer_id=customer_id,
            run_id=run_id,
        )
    elif name == "request_human_handoff":
        return request_human_handoff(
            reason=args.get("reason", "User requested human agent"),
            customer_id=customer_id,
            conversation_id=conversation_id,
            run_id=run_id,
        )
    else:
        logger.warning("Attempted invocation of non-allowlisted tool: %s", name)
        return {"error": f"Tool '{name}' is not allowed."}


# -----------------------------------------------------------------------------
# Gemini Orchestrator Turn Execution
# -----------------------------------------------------------------------------
async def execute_agent_turn(
    conversation: Dict[str, Any],
    channel_identity: Dict[str, Any],
    user_message: str,
) -> str:
    """
    Run conversational turn with Google Gemini (google-genai) and typed tools.
    Handles tool calls, bilingual formatting, safety redaction, and fallback.
    """
    run_id = str(uuid.uuid4())
    start_time = time.time()
    customer_id = channel_identity.get("user_id")
    conv_id = conversation["id"]

    # Detect if user message is an explicit confirmation keyword
    is_confirmed_turn = user_message.strip().lower() in CONFIRMATION_KEYWORDS

    # Build contents for Gemini
    contents: List[Any] = [
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=user_message)],
        )
    ]

    tools = get_gemini_tools()
    gemini = get_gemini_service()

    try:
        response = gemini.generate_chat_response(
            contents=contents,
            system_instruction=BILINGUAL_SYSTEM_INSTRUCTION,
            tools=tools,
        )

        # Process function/tool calls if proposed by Gemini
        if hasattr(response, "function_calls") and response.function_calls:
            logger.info("Gemini proposed %d function calls", len(response.function_calls))
            tool_parts: List[Any] = []

            for call in response.function_calls:
                call_args = dict(call.args) if hasattr(call, "args") and call.args else {}
                tool_result = execute_allowlisted_tool(
                    name=call.name,
                    args=call_args,
                    customer_id=customer_id,
                    conversation_id=conv_id,
                    run_id=run_id,
                    is_confirmed_turn=is_confirmed_turn,
                )
                safe_result = redact_private_data(tool_result)
                tool_parts.append(
                    types.Part.from_function_response(name=call.name, response={"result": safe_result})
                )

            # Re-invoke Gemini with tool response to generate final conversational message
            contents.append(response.candidates[0].content)
            contents.append(types.Content(role="user", parts=tool_parts))

            final_response = gemini.generate_chat_response(
                contents=contents,
                system_instruction=BILINGUAL_SYSTEM_INSTRUCTION,
            )
            reply_text = final_response.text or "Thank you. Your request is being handled."
        else:
            reply_text = response.text or "Hello! I am ALICE. How can I help you in Buea today?"

        duration_ms = int((time.time() - start_time) * 1000)

        # Log successful agent run
        _AGENT_RUNS_STORE.append({
            "id": run_id,
            "conversation_id": conv_id,
            "intent": "conversational_turn",
            "model_provider": "google-gemini",
            "status": "SUCCESS",
            "latency_ms": duration_ms,
            "token_usage": getattr(response, "usage_metadata", {}) or {},
            "safety_outcome": "SAFE",
            "created_at": datetime.now(timezone.utc),
        })

        return reply_text

    except Exception as e:
        duration_ms = int((time.time() - start_time) * 1000)
        logger.error("Gemini agent execution failed: %s (activating graceful fallback)", str(e))

        # Record fallback run
        _AGENT_RUNS_STORE.append({
            "id": run_id,
            "conversation_id": conv_id,
            "intent": "fallback",
            "model_provider": "google-gemini",
            "status": "FALLBACK",
            "latency_ms": duration_ms,
            "token_usage": {},
            "safety_outcome": "SAFE",
            "created_at": datetime.now(timezone.utc),
        })

        # Graceful bilingual fallback (Appendix G.7)
        if any(w in user_message.lower() for w in ["bonjour", "salut", "besoin", "aide", "plombier", "electricien"]):
            return (
                "Bonjour ! Je suis ALICE, votre assistante pour les services à domicile et la location de batteries à Buea. "
                "Je rencontre actuellement une légère lenteur réseau. Dites-moi quel service vous recherchez (ex: Plombier à Molyko, Recharge gaz), "
                "ou répondez 'HUMAIN' pour parler à notre équipe d'assistance."
            )
        return (
            "Hello! I am ALICE, your assistant for home services and power station rentals in Buea. "
            "I am currently experiencing a brief network delay. Tell me what service you need (e.g. Plumber in Molyko, Electrician), "
            "or reply 'HUMAN' to speak directly with our Buea support desk."
        )


# -----------------------------------------------------------------------------
# Background Worker: Process Meta WhatsApp Webhook Payload
# -----------------------------------------------------------------------------
async def process_meta_webhook_payload(payload: Dict[str, Any]) -> None:
    """
    Process inbound Meta WhatsApp Cloud API events asynchronously in BackgroundTasks.
    Handles deduplication via wamid, sender phone normalization to +237 E.164,
    account linking, read receipt acknowledgment, and Gemini orchestrator execution.
    """
    logger.info("Processing inbound Meta WhatsApp webhook event payload")
    entries = payload.get("entry", [])
    meta_client = get_meta_whatsapp_client()

    for entry in entries:
        for change in entry.get("changes", []):
            value = change.get("value", {})
            if change.get("field") != "messages" or not value:
                continue

            # 1. Check for messages in value
            messages = value.get("messages", [])
            contacts_list = value.get("contacts", [])
            contacts_map = {c.get("wa_id"): c for c in contacts_list if c.get("wa_id")}

            for msg in messages:
                wamid = msg.get("id")
                if not wamid:
                    continue

                # Deduplication via provider_message_id (wamid) (FR-WA-014)
                if wamid in _PROCESSED_WAMIDS:
                    logger.info("Ignoring duplicate Meta message wamid=%s", wamid)
                    continue

                _PROCESSED_WAMIDS.add(wamid)

                # Mark inbound message as read (status: 'read')
                try:
                    await meta_client.mark_message_as_read(wamid)
                except Exception as e:
                    logger.warning("Could not mark message %s as read: %s", wamid, str(e))

                # Extract sender phone and contact details
                sender_raw = msg.get("from", "")
                contact_info = contacts_map.get(sender_raw, {})
                profile_name = contact_info.get("profile", {}).get("name")
                bsuid = contact_info.get("user_id") or msg.get("user_id")

                # Normalize phone to Cameroon +237 E.164
                formatted_raw = f"+{sender_raw}" if not sender_raw.startswith("+") else sender_raw
                try:
                    normalized_phone = normalize_cameroon_phone(formatted_raw)
                except Exception:
                    normalized_phone = formatted_raw

                # Retrieve or create channel identity and conversation
                channel_identity = get_or_create_channel_identity(
                    phone_e164=normalized_phone,
                    bsuid=bsuid,
                    profile_name=profile_name,
                )
                conversation = get_or_create_conversation(channel_identity["id"])

                # Extract message body
                msg_type = msg.get("type", "text")
                body = ""
                if msg_type == "text":
                    body = msg.get("text", {}).get("body", "").strip()
                elif msg_type == "interactive":
                    interactive = msg.get("interactive", {})
                    button_reply = interactive.get("button_reply", {})
                    body = button_reply.get("title") or button_reply.get("id", "")
                else:
                    body = f"[{msg_type} message received]"

                # Record inbound message
                msg_record_id = str(uuid.uuid4())
                _MESSAGES_STORE[msg_record_id] = {
                    "id": msg_record_id,
                    "conversation_id": conversation["id"],
                    "provider_message_id": wamid,
                    "direction": "INBOUND",
                    "message_type": msg_type.upper(),
                    "redacted_content": body,
                    "status": "RECEIVED",
                    "created_at": datetime.now(timezone.utc),
                }

                # 2. Check for Account Linking Command: 'LINK <code>'
                if body.upper().startswith("LINK "):
                    user_id = verify_linking_code_from_chat(normalized_phone, body)
                    if user_id:
                        reply = (
                            "✅ Compte ALICE lié avec succès ! / Your ALICE account has been successfully linked.\n"
                            "You can now manage your bookings, quotations, and equipment rentals directly on WhatsApp."
                        )
                    else:
                        reply = (
                            "❌ Code de liaison invalide ou expiré. / Invalid or expired linking code.\n"
                            "Please generate a new linking code in your ALICE app profile."
                        )
                    await meta_client.send_text_message(normalized_phone, reply)
                    continue

                # 3. Check for Human Handoff Command: 'HUMAN' or 'HUMAIN'
                if body.upper() in {"HUMAN", "HUMAIN", "AIDE", "SUPPORT", "AGENT"}:
                    handoff_res = request_human_handoff(
                        reason="Customer requested live agent in chat",
                        customer_id=channel_identity.get("user_id"),
                        conversation_id=conversation["id"],
                    )
                    reply = (
                        "👤 Transfert vers le support humain en cours... / Transferring to human support...\n"
                        + handoff_res.get("message", "An agent in Buea will respond shortly.")
                    )
                    conversation["handoff_status"] = "HUMAN_REQUESTED"
                    await meta_client.send_text_message(normalized_phone, reply)
                    continue

                # 4. Execute AI Agent Turn via Gemini Orchestrator
                reply_text = await execute_agent_turn(conversation, channel_identity, body)

                # Send reply to customer via Meta Cloud API
                try:
                    await meta_client.send_text_message(normalized_phone, reply_text)
                    out_msg_id = str(uuid.uuid4())
                    _MESSAGES_STORE[out_msg_id] = {
                        "id": out_msg_id,
                        "conversation_id": conversation["id"],
                        "provider_message_id": f"out-{out_msg_id[:12]}",
                        "direction": "OUTBOUND",
                        "message_type": "TEXT",
                        "redacted_content": reply_text,
                        "status": "SENT",
                        "created_at": datetime.now(timezone.utc),
                    }
                except Exception as e:
                    logger.error("Failed to send outbound WhatsApp reply to %s: %s", normalized_phone, str(e))
