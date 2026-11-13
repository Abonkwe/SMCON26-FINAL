"""Notification services and preferences management."""

from datetime import datetime, timezone
from typing import Any, Dict, List

from app.core.exceptions import NotFoundError
from app.modules.notifications.schemas import NotificationPreferencesUpdate

_NOTIFICATIONS_STORE: Dict[str, Dict[str, Any]] = {}
_PREFERENCES_STORE: Dict[str, Dict[str, Any]] = {}


def get_user_notifications(user_id: str) -> List[Dict[str, Any]]:
    """Retrieve notifications for a user sorted by timestamp desc."""
    return sorted(
        [n for n in _NOTIFICATIONS_STORE.values() if n["recipient_id"] == user_id],
        key=lambda x: x["created_at"],
        reverse=True,
    )


def mark_notification_read(notification_id: str, user_id: str) -> Dict[str, Any]:
    """Mark a notification as read."""
    n = _NOTIFICATIONS_STORE.get(notification_id)
    if not n or n["recipient_id"] != user_id:
        raise NotFoundError("Notification", notification_id)

    n["read_at"] = datetime.now(timezone.utc)
    return n


def get_user_preferences(user_id: str) -> Dict[str, Any]:
    """Get or initialize user notification preferences."""
    if user_id not in _PREFERENCES_STORE:
        _PREFERENCES_STORE[user_id] = {
            "user_id": user_id,
            "whatsapp_opt_in": True,
            "language": "en",
            "transactional_updates": True,
            "marketing_opt_in": False,
        }
    return _PREFERENCES_STORE[user_id]


def update_user_preferences(user_id: str, payload: NotificationPreferencesUpdate) -> Dict[str, Any]:
    """Update notification preferences."""
    prefs = get_user_preferences(user_id)
    updates = payload.model_dump(exclude_unset=True)
    prefs.update(updates)
    return prefs
