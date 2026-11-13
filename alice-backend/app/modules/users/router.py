"""Users API router."""

from typing import List

from fastapi import APIRouter, Depends, status

from app.core.security import AuthenticatedUser, get_current_user
from app.modules.users.schemas import (
    UserAddressCreate,
    UserAddressResponse,
    UserProfileResponse,
    UserProfileUpdate,
)
from app.modules.users.services import add_address, get_profile, list_addresses, update_profile

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserProfileResponse, summary="Get Current User Profile")
async def get_my_profile(current_user: AuthenticatedUser = Depends(get_current_user)):
    """Retrieve profile and roles for the authenticated user."""
    profile = get_profile(
        user_id=current_user.user_id,
        phone=current_user.phone or "+237670000000",
        roles=current_user.roles,
    )
    return profile


@router.patch("/me", response_model=UserProfileResponse, summary="Update Current User Profile")
async def update_my_profile(
    payload: UserProfileUpdate,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Update preferred language, display name, legal name, or avatar."""
    return update_profile(current_user.user_id, payload)


@router.get("/me/addresses", response_model=List[UserAddressResponse], summary="List Saved Addresses")
async def get_my_addresses(current_user: AuthenticatedUser = Depends(get_current_user)):
    """List saved Buea neighbourhood addresses for the user."""
    return list_addresses(current_user.user_id)


@router.post(
    "/me/addresses",
    response_model=UserAddressResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add Saved Address",
)
async def create_my_address(
    payload: UserAddressCreate,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Save a new Buea address with neighbourhood reference."""
    return add_address(current_user.user_id, payload)
