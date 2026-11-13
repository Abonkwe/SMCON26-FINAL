"""Users service layer."""

import uuid
from typing import Any, Dict, List

from app.modules.users.schemas import UserAddressCreate, UserProfileUpdate

# In-memory store for fallback/demo state when local Supabase instance is running in mock mode
_MOCK_PROFILES: Dict[str, Dict[str, Any]] = {}
_MOCK_ADDRESSES: Dict[str, List[Dict[str, Any]]] = {}


def get_profile(user_id: str, phone: str = "+237670000000", roles: List[str] = None) -> Dict[str, Any]:
    """Get or initialize user profile."""
    if user_id not in _MOCK_PROFILES:
        _MOCK_PROFILES[user_id] = {
            "user_id": user_id,
            "phone_e164": phone,
            "display_name": f"User {user_id[:6]}",
            "legal_name": None,
            "avatar_ref": None,
            "preferred_language": "en",
            "roles": roles or ["CUSTOMER"],
            "account_status": "ACTIVE",
        }
    return _MOCK_PROFILES[user_id]


def update_profile(user_id: str, update_data: UserProfileUpdate) -> Dict[str, Any]:
    """Update user profile fields."""
    profile = get_profile(user_id)
    updates = update_data.model_dump(exclude_unset=True)
    profile.update(updates)
    return profile


def add_address(user_id: str, address_data: UserAddressCreate) -> Dict[str, Any]:
    """Save an address under the user's account."""
    if user_id not in _MOCK_ADDRESSES:
        _MOCK_ADDRESSES[user_id] = []

    new_address = {
        "address_id": str(uuid.uuid4()),
        "user_id": user_id,
        "label": address_data.label,
        "area_id": address_data.area_id,
        "area_name": "Molyko",  # Default demonstration area
        "landmark": address_data.landmark,
        "delivery_notes": address_data.delivery_notes,
        "is_default": address_data.is_default,
    }
    _MOCK_ADDRESSES[user_id].append(new_address)
    return new_address


def list_addresses(user_id: str) -> List[Dict[str, Any]]:
    """List all saved addresses for a user."""
    return _MOCK_ADDRESSES.get(user_id, [])
