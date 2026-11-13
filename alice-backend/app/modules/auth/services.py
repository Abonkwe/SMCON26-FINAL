"""Authentication service layer with Cameroon phone normalization."""

from datetime import datetime, timedelta, timezone
from typing import List, Optional

import jwt
import phonenumbers

from app.core.config import get_settings
from app.core.exceptions import ValidationError


def normalize_cameroon_phone(phone_input: str) -> str:
    """Validate and normalize a Cameroon phone number to strict E.164 (+2376XXXXXXXX)."""
    clean_input = phone_input.strip()
    try:
        parsed = phonenumbers.parse(clean_input, "CM")
        if not phonenumbers.is_valid_number(parsed):
            raise ValidationError(
                f"Phone number '{phone_input}' is not a valid Cameroon phone number",
                details={"input": phone_input, "country": "CM"},
            )
        # Ensure it is a Cameroon country code (+237)
        if parsed.country_code != 237:
            raise ValidationError("Only Cameroon (+237) phone numbers are supported for MVP")

        return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    except phonenumbers.NumberParseException as e:
        raise ValidationError(
            f"Could not parse phone number '{phone_input}': {str(e)}",
            details={"input": phone_input, "error": str(e)},
        )


def create_mock_jwt(
    user_id: str, phone_e164: str, roles: Optional[List[str]] = None, expires_delta_hours: int = 24
) -> str:
    """Generate a Supabase-compatible JWT for development, hackathon demos, and automated testing."""
    settings = get_settings()
    user_roles = roles or ["CUSTOMER"]
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "aud": "authenticated",
        "role": "authenticated",
        "phone": phone_e164,
        "app_metadata": {
            "provider": "phone",
            "roles": user_roles,
            "account_status": "ACTIVE",
        },
        "user_metadata": {
            "phone": phone_e164,
        },
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=expires_delta_hours)).timestamp()),
    }
    return jwt.encode(payload, settings.SUPABASE_JWT_SECRET, algorithm="HS256")
