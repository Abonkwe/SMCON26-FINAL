"""Review schemas."""

from datetime import datetime
from typing import Dict, Optional

from pydantic import BaseModel, Field


class ReviewCreateRequest(BaseModel):
    """Payload to submit a post-completion review."""

    booking_id: Optional[str] = None
    rental_id: Optional[str] = None
    rating: int = Field(..., ge=1, le=5, description="Overall score between 1 and 5")
    subratings: Optional[Dict[str, int]] = Field(None, description="e.g. {'punctuality': 5, 'quality': 5}")
    comment: Optional[str] = Field(None, min_length=3)


class ReviewResponse(BaseModel):
    """Review item response."""

    review_id: str
    booking_id: Optional[str] = None
    rental_id: Optional[str] = None
    reviewer_id: str
    reviewee_id: str
    rating: int
    subratings: Optional[Dict[str, int]] = None
    comment: Optional[str] = None
    moderation_status: str
    created_at: datetime
