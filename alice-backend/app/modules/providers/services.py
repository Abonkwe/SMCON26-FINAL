"""Provider services layer with eligibility-filtered discovery search."""

from typing import Any, Dict, List, Optional

from app.core.exceptions import NotFoundError
from app.core.logging import logger
from app.modules.catalogue.services import LAUNCH_SERVICES
from app.modules.providers.schemas import ProviderOnboardRequest

# Demo / fallback provider storage
_PROVIDERS_STORE: Dict[str, Dict[str, Any]] = {
    # Pre-seeded sample provider in Molyko: ID verified, Plumbing assessed
    "provider-demo-1": {
        "user_id": "provider-demo-1",
        "public_name": "Tanyi Plumber & Electrician",
        "provider_type": "INDIVIDUAL",
        "bio": "Certified domestic plumbing and electrical technician in Buea for 6 years.",
        "base_area_id": "00000000-0000-0000-0001-000000000001",
        "base_area_name": "Molyko",
        "identity_status": "VERIFIED",
        "competence_summary": "Plumbing certified; Electrical pending verification",
        "rating_average": 4.85,
        "review_count": 24,
        "is_available": True,
        "account_status": "ACTIVE",
        "services": {
            # Plumbing (no competence required)
            "00000000-0000-0000-0003-000000000001": {
                "pricing_model": "QUOTE_REQUIRED",
                "indicative_price": 5000,
                "competence_status": "VERIFIED",
            },
            # Electrical Repairs (requires competence verification - currently PENDING)
            "00000000-0000-0000-0003-000000000002": {
                "pricing_model": "QUOTE_REQUIRED",
                "indicative_price": 7500,
                "competence_status": "PENDING_REVIEW",
            },
        },
        "coverage_areas": [
            "00000000-0000-0000-0001-000000000001",
            "00000000-0000-0000-0001-000000000003",
        ],  # Molyko, Bonduma
    }
}


def onboard_provider(user_id: str, payload: ProviderOnboardRequest) -> Dict[str, Any]:
    """Initialize a provider profile under the user's account."""
    provider = {
        "user_id": user_id,
        "public_name": payload.public_name,
        "provider_type": payload.provider_type,
        "bio": payload.bio,
        "base_area_id": payload.base_area_id,
        "base_area_name": "Molyko",
        "identity_status": "UNVERIFIED",
        "competence_summary": None,
        "rating_average": 0.0,
        "review_count": 0,
        "is_available": True,
        "account_status": "ACTIVE",
        "services": {},
        "coverage_areas": [payload.base_area_id],
    }
    _PROVIDERS_STORE[user_id] = provider
    logger.info("Onboarded provider profile for user %s (%s)", user_id, payload.public_name)
    return provider


def get_provider_profile(provider_id: str) -> Dict[str, Any]:
    """Retrieve provider profile with dynamic verification badge generation."""
    provider = _PROVIDERS_STORE.get(provider_id)
    if not provider:
        raise NotFoundError("Provider", provider_id)

    badges = []
    if provider.get("identity_status") == "VERIFIED":
        badges.append("Identity Checked")

    for s_id, s_info in provider.get("services", {}).items():
        if s_info.get("competence_status") == "VERIFIED":
            badges.append("Skill Assessed")
            break

    profile_copy = dict(provider)
    profile_copy["verification_badges"] = badges
    return profile_copy


def search_providers(
    service_id: Optional[str] = None,
    area_id: Optional[str] = None,
    keyword: Optional[str] = None,
    verified_only: bool = False,
) -> List[Dict[str, Any]]:
    """Eligibility-filtered provider discovery search (Section 13.2 & FR-VER-008)."""
    # Look up service requirements if service_id is provided
    target_service = None
    if service_id:
        target_service = next((s for s in LAUNCH_SERVICES if s["service_id"] == service_id), None)

    results = []
    for p_id, p in _PROVIDERS_STORE.items():
        # Exclude unavailable or suspended accounts
        if not p.get("is_available") or p.get("account_status") == "SUSPENDED":
            continue

        # Area filter
        if area_id and area_id not in p.get("coverage_areas", []):
            continue

        # Service filter and HARD ELIGIBILITY GATE (FR-VER-008)
        if service_id:
            provider_services = p.get("services", {})
            if service_id not in provider_services:
                continue

            # If service requires competence verification, gate provider on status == 'VERIFIED'
            if target_service and target_service.get("requires_competence_verification"):
                service_offering = provider_services[service_id]
                if service_offering.get("competence_status") != "VERIFIED":
                    logger.info(
                        "Filtering out provider %s for high-risk service %s: competence not verified", p_id, service_id
                    )
                    continue

        # Keyword filter
        if keyword:
            kw = keyword.lower()
            name_match = kw in p.get("public_name", "").lower()
            bio_match = kw in (p.get("bio") or "").lower()
            if not (name_match or bio_match):
                continue

        # Verified-only filter
        badges = []
        if p.get("identity_status") == "VERIFIED":
            badges.append("Identity Checked")
        if verified_only and not badges:
            continue

        price_xaf = None
        p_model = None
        if service_id and service_id in p.get("services", {}):
            price_xaf = p["services"][service_id].get("indicative_price")
            p_model = p["services"][service_id].get("pricing_model")

        results.append(
            {
                "user_id": p["user_id"],
                "public_name": p["public_name"],
                "provider_type": p["provider_type"],
                "base_area_name": p.get("base_area_name", "Buea"),
                "rating_average": p.get("rating_average", 0.0),
                "review_count": p.get("review_count", 0),
                "is_available": p.get("is_available", True),
                "indicative_price_xaf": price_xaf,
                "pricing_model": p_model,
                "verification_badges": badges,
            }
        )

    return results
