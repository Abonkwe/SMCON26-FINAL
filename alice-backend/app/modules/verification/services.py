"""Verification business logic and audit logging."""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List

from app.core.audit import record_audit_log
from app.core.exceptions import ForbiddenError, NotFoundError, ValidationError
from app.core.logging import logger
from app.integrations.supabase.client import get_supabase_client
from app.modules.verification.schemas import (
    CompetenceCredentialSubmit,
    IdentityVerificationSubmit,
    VerificationReviewAction,
)

# In-memory store for verification submissions
_VERIFICATIONS_STORE: Dict[str, Dict[str, Any]] = {}


def submit_identity(user_id: str, payload: IdentityVerificationSubmit) -> Dict[str, Any]:
    """Submit an identity document for review."""
    ver_id = str(uuid.uuid4())
    record = {
        "verification_id": ver_id,
        "user_id": user_id,
        "verification_type": "IDENTITY",
        "document_type_or_evidence": payload.document_type,
        "service_id": None,
        "private_file_ref": payload.private_file_ref,
        "status": "PENDING_REVIEW",
        "submitted_at": datetime.now(timezone.utc),
        "reviewed_at": None,
        "reviewer_id": None,
        "decision_reason": None,
    }
    _VERIFICATIONS_STORE[ver_id] = record
    logger.info("New identity verification submitted by user %s (id: %s)", user_id, ver_id)
    return record


def submit_competence(provider_id: str, payload: CompetenceCredentialSubmit) -> Dict[str, Any]:
    """Submit professional competence evidence for a specific service."""
    ver_id = str(uuid.uuid4())
    record = {
        "verification_id": ver_id,
        "user_id": provider_id,
        "verification_type": "COMPETENCE",
        "document_type_or_evidence": payload.evidence_type,
        "service_id": payload.service_id,
        "private_file_ref": payload.private_file_ref,
        "status": "PENDING_REVIEW",
        "submitted_at": datetime.now(timezone.utc),
        "reviewed_at": None,
        "reviewer_id": None,
        "decision_reason": None,
    }
    _VERIFICATIONS_STORE[ver_id] = record
    logger.info("New competence credential submitted by provider %s for service %s", provider_id, payload.service_id)
    return record


def list_pending_queue() -> List[Dict[str, Any]]:
    """List pending verification items for reviewer/admin inspection."""
    supabase = get_supabase_client()
    results = []
    for item in _VERIFICATIONS_STORE.values():
        if item["status"] == "PENDING_REVIEW":
            # Generate 5-minute signed preview URL
            item_copy = dict(item)
            try:
                item_copy["signed_preview_url"] = supabase.create_signed_read_url(
                    bucket="private-verification",
                    path=item["private_file_ref"],
                    expires_in_seconds=300,
                )
            except Exception:
                item_copy["signed_preview_url"] = f"https://mock-storage.local/signed/{item['private_file_ref']}"
            results.append(item_copy)
    return results


def process_review(
    verification_id: str,
    reviewer_id: str,
    action: VerificationReviewAction,
) -> Dict[str, Any]:
    """Review and approve/reject a verification item with anti-self-approval enforcement."""
    record = _VERIFICATIONS_STORE.get(verification_id)
    if not record:
        raise NotFoundError("VerificationSubmission", verification_id)

    # CRITICAL SECURITY RULE (Section 3.1 & Phase 3.2): Cannot review own submission
    if record["user_id"] == reviewer_id:
        logger.warning(
            "Self-review blocked: Reviewer %s attempted to review own submission %s", reviewer_id, verification_id
        )
        raise ForbiddenError("Reviewers are strictly prohibited from approving their own submissions")

    if action.decision not in ("VERIFIED", "REJECTED", "ADDITIONAL_INFORMATION_REQUIRED"):
        raise ValidationError(f"Invalid decision '{action.decision}'")

    record["status"] = action.decision
    record["reviewer_id"] = reviewer_id
    record["decision_reason"] = action.decision_reason
    record["reviewed_at"] = datetime.now(timezone.utc)

    # Immutable audit logging (AC-02 & Phase 3.2)
    record_audit_log(
        action=f"VERIFICATION_{action.decision}",
        entity_type="VerificationSubmission",
        entity_id=verification_id,
        actor_id=reviewer_id,
        reason=action.decision_reason,
        safe_metadata={
            "submission_user_id": record["user_id"],
            "verification_type": record["verification_type"],
            "decision": action.decision,
        },
    )

    logger.info(
        "Verification %s reviewed by %s: %s (Reason: %s)",
        verification_id,
        reviewer_id,
        action.decision,
        action.decision_reason,
    )
    return record
