"""Admin business logic and platform metrics aggregation."""

from typing import Any, Dict

from app.core.audit import get_audit_logs, record_audit_log

__all__ = ["record_audit_log", "get_audit_logs", "calculate_platform_metrics"]


def calculate_platform_metrics() -> Dict[str, Any]:
    """Aggregate operational metrics across all marketplace domains."""
    from app.modules.bookings.services import _BOOKINGS_STORE
    from app.modules.disputes.services import _DISPUTES_STORE
    from app.modules.providers.services import _PROVIDERS_STORE
    from app.modules.rentals.services import _RENTAL_BOOKINGS_STORE
    from app.modules.users.services import _MOCK_PROFILES
    from app.modules.verification.services import _VERIFICATIONS_STORE

    pending_id = sum(
        1 for v in _VERIFICATIONS_STORE.values()
        if v.get("status") == "PENDING_REVIEW" and v.get("verification_type") == "IDENTITY"
    )
    pending_comp = sum(
        1 for v in _VERIFICATIONS_STORE.values()
        if v.get("status") == "PENDING_REVIEW" and v.get("verification_type") == "COMPETENCE"
    )
    active_b = sum(
        1 for b in _BOOKINGS_STORE.values()
        if b.get("status") in ("CONFIRMED", "IN_PROGRESS", "COMPLETED_PENDING_CONFIRMATION")
    )
    active_r = sum(
        1 for r in _RENTAL_BOOKINGS_STORE.values()
        if r.get("status") in ("CONFIRMED", "READY_FOR_HANDOVER", "ACTIVE", "RETURN_DUE")
    )
    open_disp = sum(
        1 for d in _DISPUTES_STORE.values()
        if d.get("outcome") == "PENDING"
    )

    return {
        "total_users": max(len(_MOCK_PROFILES), 1),
        "total_providers": max(len(_PROVIDERS_STORE), 1),
        "pending_identity_verifications": pending_id,
        "pending_competence_verifications": pending_comp,
        "active_bookings": active_b,
        "active_rentals": active_r,
        "open_disputes": open_disp,
    }
