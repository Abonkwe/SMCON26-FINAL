"""Authentication API router."""

import uuid

from fastapi import APIRouter, Depends

from app.core.exceptions import AuthenticationError
from app.core.security import AuthenticatedUser, require_role
from app.modules.auth.schemas import (
    AuthTokenResponse,
    PhoneOtpSendRequest,
    PhoneOtpVerifyRequest,
    RoleAssignRequest,
)
from app.modules.auth.services import create_mock_jwt, normalize_cameroon_phone

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/otp/send", summary="Send Phone OTP (E.164 Cameroon)")
async def send_phone_otp(payload: PhoneOtpSendRequest):
    """Normalize Cameroon phone number and initiate OTP delivery."""
    phone_e164 = normalize_cameroon_phone(payload.phone)
    # In hackathon/demo mode, code 123456 is supported for instant verification
    return {
        "status": "success",
        "phone_e164": phone_e164,
        "message": "OTP sent successfully (Use 123456 in development/demo mode)",
    }


@router.post("/otp/verify", summary="Verify Phone OTP", response_model=AuthTokenResponse)
async def verify_phone_otp(payload: PhoneOtpVerifyRequest):
    """Verify OTP and issue session JWT."""
    phone_e164 = normalize_cameroon_phone(payload.phone)

    # Demo/test OTP verification gate
    if payload.token not in ("123456", "000000"):
        raise AuthenticationError("Invalid OTP token. For demo use: 123456")

    # Generate deterministic user UUID from phone for consistent demo sessions
    user_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"alice-{phone_e164}"))
    roles = ["CUSTOMER"]
    token = create_mock_jwt(user_id=user_id, phone_e164=phone_e164, roles=roles)

    return AuthTokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=86400,
        user_id=user_id,
        phone_e164=phone_e164,
        roles=roles,
        account_status="ACTIVE",
    )


@router.post("/roles/assign", summary="Assign User Role (Admin only)")
async def assign_role(
    payload: RoleAssignRequest,
    admin_user: AuthenticatedUser = Depends(require_role("ADMIN")),
):
    """Admin-only endpoint to assign or modify user roles."""
    return {
        "status": "success",
        "user_id": payload.user_id,
        "assigned_role": payload.role_code,
        "assigned_by": admin_user.user_id,
    }
