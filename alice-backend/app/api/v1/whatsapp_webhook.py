"""Meta WhatsApp Cloud API webhook and account linking endpoints (Graph API v22.0)."""

import hashlib
import hmac
import json
from typing import Any, Dict, Optional

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    Header,
    HTTPException,
    Query,
    Request,
    status,
)
from fastapi.responses import PlainTextResponse

from app.core.config import get_settings
from app.core.logging import logger
from app.core.security import AuthenticatedUser, get_current_user
from app.modules.whatsapp_agent.schemas import (
    WhatsAppLinkConfirmRequest,
    WhatsAppLinkConfirmResponse,
    WhatsAppLinkStartResponse,
    WhatsAppWebhookResponse,
)
from app.modules.whatsapp_agent.services import (
    confirm_linking,
    generate_linking_code,
    process_meta_webhook_payload,
)

router = APIRouter(tags=["WhatsApp Integration"])


def verify_hub_signature(raw_body: bytes, signature_header: Optional[str], secret: str) -> bool:
    """
    Verify X-Hub-Signature-256 HMAC-SHA256 signature from Meta Graph API webhook.
    Uses hmac.compare_digest for timing-attack-resistant comparison.
    """
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    signature_hash = signature_header[len("sha256=") :]
    mac = hmac.new(secret.encode("utf-8"), msg=raw_body, digestmod=hashlib.sha256)
    computed_hash = mac.hexdigest()
    return hmac.compare_digest(computed_hash, signature_hash)


@router.get(
    "/integrations/whatsapp/webhook",
    summary="Meta WhatsApp Cloud API Webhook Handshake Verification",
    response_class=PlainTextResponse,
)
async def verify_whatsapp_webhook(
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge"),
):
    """
    Meta WhatsApp Cloud API GET verification handshake.
    Validates hub.mode == 'subscribe' and compares hub.verify_token with WHATSAPP_VERIFY_TOKEN using hmac.compare_digest.
    Returns plain text hub.challenge with HTTP 200 on success, or HTTP 403 on mismatch.
    """
    settings = get_settings()

    if hub_mode == "subscribe" and hub_verify_token:
        if hmac.compare_digest(hub_verify_token, settings.WHATSAPP_VERIFY_TOKEN):
            logger.info("Meta WhatsApp webhook challenge verified successfully")
            return PlainTextResponse(content=hub_challenge or "", status_code=status.HTTP_200_OK)
        else:
            logger.warning("Meta WhatsApp verify_token mismatch: received=%s", hub_verify_token)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Verification token mismatch",
            )

    logger.warning("Invalid Meta webhook handshake parameters: hub.mode=%s", hub_mode)
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Invalid subscription mode or parameters",
    )


@router.post(
    "/integrations/whatsapp/webhook",
    summary="Meta WhatsApp Cloud API Inbound Event Webhook",
    response_model=WhatsAppWebhookResponse,
)
async def receive_whatsapp_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_hub_signature_256: Optional[str] = Header(None, alias="X-Hub-Signature-256"),
):
    """
    Meta WhatsApp Cloud API POST webhook event receiver.
    1. Verifies X-Hub-Signature-256 HMAC-SHA256 signature against raw request body.
    2. Immediately acknowledges receipt with {'status': 'ok'} (HTTP 200) to prevent Meta retries.
    3. Dispatches async payload processing in FastAPI BackgroundTasks.
    """
    settings = get_settings()
    raw_body = await request.body()

    # Verify HMAC-SHA256 signature when header is present or in strict non-mock environments
    is_mock_secret = (
        not settings.WHATSAPP_APP_SECRET or settings.WHATSAPP_APP_SECRET.startswith("mock")
    )

    if x_hub_signature_256:
        if not verify_hub_signature(raw_body, x_hub_signature_256, settings.WHATSAPP_APP_SECRET):
            logger.warning("Rejected invalid Meta WhatsApp X-Hub-Signature-256 header")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid hub signature",
            )
    elif not is_mock_secret and settings.ENVIRONMENT != "development":
        logger.warning("Missing required X-Hub-Signature-256 header in production environment")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing required signature header",
        )

    # Parse JSON payload
    try:
        payload: Dict[str, Any] = json.loads(raw_body.decode("utf-8")) if raw_body else {}
    except Exception as e:
        logger.error("Failed to parse JSON body from Meta webhook: %s", str(e))
        payload = {}

    # Enqueue background processing so response is immediate (<20ms)
    background_tasks.add_task(process_meta_webhook_payload, payload)

    return WhatsAppWebhookResponse(status="ok")


# -----------------------------------------------------------------------------
# Account Linking Endpoints (Appendix D.6)
# -----------------------------------------------------------------------------
@router.post(
    "/whatsapp/link/start",
    response_model=WhatsAppLinkStartResponse,
    summary="Start WhatsApp Account Linking",
)
async def start_account_linking(current_user: AuthenticatedUser = Depends(get_current_user)):
    """Generate a 6-digit one-time code for the authenticated user (valid for 10 minutes)."""
    return generate_linking_code(current_user.user_id)


@router.post(
    "/whatsapp/link/confirm",
    response_model=WhatsAppLinkConfirmResponse,
    summary="Confirm WhatsApp Account Linking",
)
async def confirm_account_linking(payload: WhatsAppLinkConfirmRequest):
    """
    Explicitly confirm account linking.
    Normalizes phone to Cameroon +237 E.164 and binds to verified user_id.
    """
    return confirm_linking(
        phone_number=payload.phone_number,
        linking_code=payload.linking_code,
    )

