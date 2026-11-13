"""Authentication and phone validation schemas."""

from typing import List

from pydantic import BaseModel, Field


class PhoneOtpSendRequest(BaseModel):
    """Request to send an OTP to a Cameroon phone number."""

    phone: str = Field(
        ..., description="Cameroon local or international phone format (e.g. 671234567 or +237671234567)"
    )


class PhoneOtpVerifyRequest(BaseModel):
    """Request to verify OTP code for a phone number."""

    phone: str = Field(..., description="Phone number")
    token: str = Field(..., min_length=4, max_length=6, description="OTP code")


class AuthTokenResponse(BaseModel):
    """Authentication session token response."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: str
    phone_e164: str
    roles: List[str]
    account_status: str


class RoleAssignRequest(BaseModel):
    """Admin role assignment request."""

    user_id: str
    role_code: str = Field(..., description="CUSTOMER, PROVIDER, VERIFICATION_REVIEWER, ADMIN")
