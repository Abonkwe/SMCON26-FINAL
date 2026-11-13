"""Disputes and complaints API router."""

from typing import List

from fastapi import APIRouter, Depends, status

from app.core.security import AuthenticatedUser, get_current_user, require_role
from app.modules.disputes.schemas import (
    ComplaintCreateRequest,
    ComplaintResponse,
    DisputeResolveRequest,
    DisputeResponse,
)
from app.modules.disputes.services import (
    list_dispute_cases,
    lodge_complaint,
    resolve_dispute,
)

router = APIRouter(prefix="/disputes", tags=["Disputes"])


@router.post(
    "/complaints",
    response_model=ComplaintResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Lodge Safety Incident or Service Complaint",
)
async def create_complaint(
    payload: ComplaintCreateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Lodge a safety report or service dispute generating an ALICE-CASE-XXXX reference."""
    return lodge_complaint(reporter_id=current_user.user_id, payload=payload)


@router.get("/admin/cases", response_model=List[DisputeResponse], summary="List All Dispute Cases (Admin)")
async def get_disputes(
    current_user: AuthenticatedUser = Depends(require_role("ADMIN")),
):
    """Admin-only list of open and historical dispute cases."""
    return list_dispute_cases()


@router.patch(
    "/admin/cases/{dispute_id}/resolve", response_model=DisputeResponse, summary="Resolve Dispute Case (Admin)"
)
async def resolve_case(
    dispute_id: str,
    payload: DisputeResolveRequest,
    current_user: AuthenticatedUser = Depends(require_role("ADMIN")),
):
    """Admin records outcome and resolution notes for a dispute case."""
    return resolve_dispute(
        dispute_id=dispute_id,
        admin_id=current_user.user_id,
        payload=payload,
    )
