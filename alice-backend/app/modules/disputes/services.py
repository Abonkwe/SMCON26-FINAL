"""Disputes business logic with ALICE-CASE-XXXX reference generation."""

import random
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List

from app.core.audit import record_audit_log
from app.core.exceptions import NotFoundError, ValidationError
from app.core.logging import logger
from app.modules.disputes.schemas import ComplaintCreateRequest, DisputeResolveRequest

_COMPLAINTS_STORE: Dict[str, Dict[str, Any]] = {}
_DISPUTES_STORE: Dict[str, Dict[str, Any]] = {}


def generate_case_ref() -> str:
    """Generate human-readable support/dispute case identifier (e.g. ALICE-CASE-4921)."""
    return f"ALICE-CASE-{random.randint(1000, 9999)}"


def lodge_complaint(reporter_id: str, payload: ComplaintCreateRequest) -> Dict[str, Any]:
    """Create safety report/complaint and bind to dispute case (AC-10, FR-SAFE-001)."""
    complaint_id = str(uuid.uuid4())
    dispute_id = str(uuid.uuid4())
    case_ref = generate_case_ref()
    now = datetime.now(timezone.utc)

    complaint = {
        "complaint_id": complaint_id,
        "case_ref": case_ref,
        "booking_id": payload.booking_id,
        "rental_id": payload.rental_id,
        "reporter_id": reporter_id,
        "subject_id": payload.subject_user_id,
        "reason": payload.reason,
        "description": payload.description,
        "severity": payload.severity,
        "status": "OPEN",
        "created_at": now,
    }
    _COMPLAINTS_STORE[complaint_id] = complaint

    dispute = {
        "dispute_id": dispute_id,
        "case_ref": case_ref,
        "complaint_id": complaint_id,
        "assigned_admin_id": None,
        "outcome": "PENDING",
        "resolution_notes": None,
        "created_at": now,
        "resolved_at": None,
    }
    _DISPUTES_STORE[dispute_id] = dispute

    logger.warning(
        "Safety report/complaint lodged: %s by user %s (Severity: %s)", case_ref, reporter_id, payload.severity
    )
    return complaint


def list_dispute_cases() -> List[Dict[str, Any]]:
    """List open disputes for Admin triage."""
    return list(_DISPUTES_STORE.values())


def resolve_dispute(dispute_id: str, admin_id: str, payload: DisputeResolveRequest) -> Dict[str, Any]:
    """Admin resolves a dispute case with mandatory notes."""
    dispute = _DISPUTES_STORE.get(dispute_id)
    if not dispute:
        raise NotFoundError("Dispute", dispute_id)

    if payload.outcome not in ("UPHELD_CUSTOMER", "UPHELD_PROVIDER", "MUTUAL_RESOLUTION", "DISMISSED"):
        raise ValidationError(f"Invalid outcome: {payload.outcome}")

    now = datetime.now(timezone.utc)
    dispute["assigned_admin_id"] = admin_id
    dispute["outcome"] = payload.outcome
    dispute["resolution_notes"] = payload.resolution_notes
    dispute["resolved_at"] = now

    complaint = _COMPLAINTS_STORE.get(dispute["complaint_id"])
    if complaint:
        complaint["status"] = "RESOLVED"

    # Immutable audit logging for dispute resolution
    record_audit_log(
        action=f"DISPUTE_{payload.outcome}",
        entity_type="DisputeCase",
        entity_id=dispute_id,
        actor_id=admin_id,
        reason=payload.resolution_notes,
        safe_metadata={
            "case_ref": dispute["case_ref"],
            "complaint_id": dispute["complaint_id"],
            "outcome": payload.outcome,
        },
    )

    logger.info("Dispute %s resolved by admin %s with outcome: %s", dispute["case_ref"], admin_id, payload.outcome)
    return dispute
