"""Provider schemas."""

from typing import List, Optional

from pydantic import BaseModel, Field


class ProviderOnboardRequest(BaseModel):
    """Payload for customer to initialize a provider profile."""

    public_name: str = Field(..., min_length=2)
    provider_type: str = Field("INDIVIDUAL", description="INDIVIDUAL or BUSINESS")
    bio: Optional[str] = None
    base_area_id: str = Field(..., description="UUID of primary Buea neighbourhood")
    coverage_radius_km: float = 10.0


class ProviderServiceCreate(BaseModel):
    """Payload to add a service to provider catalogue."""

    service_id: str
    pricing_model: str = Field("QUOTE_REQUIRED", description="FIXED, HOURLY, QUOTE_REQUIRED, PER_UNIT")
    indicative_price: int = Field(0, ge=0, description="Price in XAF")
    duration_estimate_minutes: Optional[int] = None


class ProviderProfileResponse(BaseModel):
    """Provider public and detailed profile schema."""

    user_id: str
    public_name: str
    provider_type: str
    bio: Optional[str] = None
    base_area_id: Optional[str] = None
    base_area_name: Optional[str] = None
    identity_status: str  # UNVERIFIED, PENDING_REVIEW, VERIFIED, REJECTED
    competence_summary: Optional[str] = None
    rating_average: float
    review_count: int
    is_available: bool
    verification_badges: List[str] = Field(default_factory=list)


class ProviderSearchResult(BaseModel):
    """Provider card in discovery search results."""

    user_id: str
    public_name: str
    provider_type: str
    base_area_name: str
    rating_average: float
    review_count: int
    is_available: bool
    indicative_price_xaf: Optional[int] = None
    pricing_model: Optional[str] = None
    verification_badges: List[str]
