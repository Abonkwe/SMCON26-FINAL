"""WhatsApp Agent API router including Twilio webhook and linking endpoints."""

from fastapi import APIRouter, BackgroundTasks, Depends, Form, Header, HTTPException, Request, Response, status

from app.core.config import get_settings
from app.core.logging import logger
from app.core.security import AuthenticatedUser, get_current_user
from app.integrations.twilio.client import get_twilio_service
from app.modules.whatsapp_agent.schemas import WhatsAppLinkStartResponse
from app.modules.whatsapp_agent.services import (
    _PROCESSED_MESSAGE_SIDS,
    async_process_whatsapp_turn,
    generate_linking_code,
)

router = APIRouter(tags=["WhatsApp Agent"])


@router.post("/whatsapp/link/start", response_model=WhatsAppLinkStartResponse, summary="Start WhatsApp Account Linking")
async def start_linking(current_user: AuthenticatedUser = Depends(get_current_user)):
    """Generate a 6-digit linking code with 10-minute validity for the user."""
    return generate_linking_code(current_user.user_id)


@router.post("/integrations/twilio/whatsapp/inbound", summary="Twilio WhatsApp Inbound Webhook")
async def twilio_inbound_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    From: str = Form(...),
    Body: str = Form(""),
    MessageSid: str = Form(...),
    x_twilio_signature: str = Header(None, alias="X-Twilio-Signature"),
):
    """
    Twilio inbound WhatsApp webhook endpoint.
    Validates signature, prevents duplicate executions via MessageSid,
    enqueues async worker, and immediately returns 200 OK TwiML.
    """
    settings = get_settings()

    # 1. Validate Twilio signature in non-mock environments
    if settings.ENVIRONMENT != "development" or "mock" not in settings.TWILIO_AUTH_TOKEN:
        twilio = get_twilio_service()
        full_url = f"{settings.PUBLIC_BASE_URL}{request.url.path}"
        form_data = await request.form()
        params = {k: str(v) for k, v in form_data.items()}
        if not twilio.validate_signature(full_url, params, x_twilio_signature or ""):
            logger.warning("Rejected invalid Twilio webhook signature for %s", MessageSid)
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid Twilio signature")

    # 2. Idempotency Guard (FR-WA-014 & Trap 2): Return 200 OK immediately on duplicate MessageSid
    if MessageSid in _PROCESSED_MESSAGE_SIDS:
        logger.info("Ignoring duplicate Twilio MessageSid %s", MessageSid)
        return Response(content="<Response/>", media_type="application/xml")

    _PROCESSED_MESSAGE_SIDS.add(MessageSid)

    # 3. Enqueue background turn execution and return 200 OK immediately
    background_tasks.add_task(
        async_process_whatsapp_turn,
        sender_whatsapp=From,
        message_body=Body,
        message_sid=MessageSid,
    )

    # Empty TwiML instructs Twilio not to send synchronous message
    return Response(content="<Response/>", media_type="application/xml")
