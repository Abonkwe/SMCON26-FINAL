"""Providers API router."""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status

from app.core.security import AuthenticatedUser, get_current_user
from app.modules.providers.schemas import (
    ProviderOnboardRequest,
    ProviderProfileResponse,
    ProviderSearchResult,
)
from app.modules.providers.services import (
    get_provider_profile,
    onboard_provider,
    search_providers,
)

router = APIRouter(prefix="/providers", tags=["Providers"])


@router.get("", response_model=List[ProviderSearchResult], summary="Search and Discover Providers")
async def list_providers(
    service_id: Optional[str] = Query(None, description="UUID of service"),
    area_id: Optional[str] = Query(None, description="Buea neighbourhood UUID"),
    keyword: Optional[str] = Query(None, description="Search term"),
    verified_only: bool = Query(False, description="Filter for ID-verified providers"),
):
    """Discovery search for eligible service providers with badge indicators."""
    return search_providers(
        service_id=service_id,
        area_id=area_id,
        keyword=keyword,
        verified_only=verified_only,
    )


@router.post(
    "/onboard",
    response_model=ProviderProfileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Onboard as Provider",
)
async def onboard_as_provider(
    payload: ProviderOnboardRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Initialize a provider profile under the current authenticated account."""
    return onboard_provider(current_user.user_id, payload)


@router.get("/{provider_id}", response_model=ProviderProfileResponse, summary="Get Provider Profile")
async def get_provider(provider_id: str):
    """Retrieve detailed provider profile with verified badges."""
    return get_provider_profile(provider_id)
