"""Reviews API router."""

from typing import List

from fastapi import APIRouter, Depends, status

from app.core.security import AuthenticatedUser, get_current_user
from app.modules.reviews.schemas import ReviewCreateRequest, ReviewResponse
from app.modules.reviews.services import list_provider_reviews, submit_review

router = APIRouter(prefix="/reviews", tags=["Reviews"])


@router.post(
    "", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED, summary="Submit Post-Completion Review"
)
async def create_review(
    payload: ReviewCreateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Submit rating & review. Requires booking to be COMPLETED (AC-09)."""
    return submit_review(reviewer_id=current_user.user_id, payload=payload)


@router.get("/provider/{provider_id}", response_model=List[ReviewResponse], summary="List Reviews for Provider")
async def get_provider_reviews(provider_id: str):
    """Retrieve all published reviews for a service provider."""
    return list_provider_reviews(provider_id)
