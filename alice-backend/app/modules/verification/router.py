"""Verification API router."""

from typing import List

from fastapi import APIRouter, Depends, status

from app.core.security import AuthenticatedUser, get_current_user, require_any_role, require_role
from app.modules.verification.schemas import (
    CompetenceCredentialSubmit,
    IdentityVerificationSubmit,
    VerificationItemResponse,
    VerificationReviewAction,
)
from app.modules.verification.services import (
    list_pending_queue,
    process_review,
    submit_competence,
    submit_identity,
)

router = APIRouter(prefix="/verifications", tags=["Verification"])


@router.post(
    "/identity",
    response_model=VerificationItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit Identity Document",
)
async def submit_identity_document(
    payload: IdentityVerificationSubmit,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Submit Level-1 National ID, Passport, or Student ID for verification."""
    return submit_identity(current_user.user_id, payload)


@router.post(
    "/competence",
    response_model=VerificationItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit Competence Credential",
)
async def submit_competence_document(
    payload: CompetenceCredentialSubmit,
    current_user: AuthenticatedUser = Depends(require_role("PROVIDER")),
):
    """Submit Level-2 trade certificate, license, or portfolio for a specific service."""
    return submit_competence(current_user.user_id, payload)


@router.get(
    "/admin/queue", response_model=List[VerificationItemResponse], summary="List Pending Submissions (Reviewer/Admin)"
)
async def get_verification_queue(
    current_user: AuthenticatedUser = Depends(require_any_role(["VERIFICATION_REVIEWER", "ADMIN"])),
):
    """Retrieve pending verifications with 5-minute signed document inspection URLs."""
    return list_pending_queue()


@router.patch(
    "/admin/{verification_id}/review", response_model=VerificationItemResponse, summary="Review Verification Submission"
)
async def review_submission(
    verification_id: str,
    payload: VerificationReviewAction,
    current_user: AuthenticatedUser = Depends(require_any_role(["VERIFICATION_REVIEWER", "ADMIN"])),
):
    """Approve or reject verification. Reviewer cannot review own submission."""
    return process_review(verification_id, current_user.user_id, payload)
