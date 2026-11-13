"""User profile and address schemas."""

from typing import List, Optional

from pydantic import BaseModel, Field


class UserProfileResponse(BaseModel):
    """User profile response."""

    user_id: str
    phone_e164: str
    display_name: str
    legal_name: Optional[str] = None
    avatar_ref: Optional[str] = None
    preferred_language: str = "en"
    roles: List[str]
    account_status: str


class UserProfileUpdate(BaseModel):
    """Payload to update own user profile."""

    display_name: Optional[str] = None
    legal_name: Optional[str] = None
    avatar_ref: Optional[str] = None
    preferred_language: Optional[str] = Field(None, pattern="^(en|fr)$")


class UserAddressCreate(BaseModel):
    """Payload to add a Buea neighbourhood address."""

    label: str = Field("Home", description="e.g. Home, Shop, Office")
    area_id: str = Field(..., description="UUID of the Buea service area")
    landmark: Optional[str] = Field(None, description="Local landmark (e.g. Opposite Checkpoint Total)")
    delivery_notes: Optional[str] = None
    is_default: bool = False


class UserAddressResponse(BaseModel):
    """Address details response."""

    address_id: str
    user_id: str
    label: str
    area_id: str
    area_name: Optional[str] = None
    landmark: Optional[str] = None
    delivery_notes: Optional[str] = None
    is_default: bool
