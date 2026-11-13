"""Notifications API router."""

from typing import List

from fastapi import APIRouter, Depends

from app.core.security import AuthenticatedUser, get_current_user
from app.modules.notifications.schemas import (
    NotificationPreferencesResponse,
    NotificationPreferencesUpdate,
    NotificationResponse,
)
from app.modules.notifications.services import (
    get_user_notifications,
    get_user_preferences,
    mark_notification_read,
    update_user_preferences,
)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=List[NotificationResponse], summary="List User Notifications")
async def list_notifications(current_user: AuthenticatedUser = Depends(get_current_user)):
    """Retrieve all notifications for the authenticated user."""
    return get_user_notifications(current_user.user_id)


@router.patch("/{notification_id}/read", response_model=NotificationResponse, summary="Mark Notification as Read")
async def mark_read(
    notification_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Mark a specific notification as read."""
    return mark_notification_read(notification_id, current_user.user_id)


@router.get("/preferences", response_model=NotificationPreferencesResponse, summary="Get Notification Preferences")
async def get_preferences(current_user: AuthenticatedUser = Depends(get_current_user)):
    """Retrieve notification and language preferences."""
    return get_user_preferences(current_user.user_id)


@router.put("/preferences", response_model=NotificationPreferencesResponse, summary="Update Notification Preferences")
async def set_preferences(
    payload: NotificationPreferencesUpdate,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Update WhatsApp opt-in and language preferences."""
    return update_user_preferences(current_user.user_id, payload)
