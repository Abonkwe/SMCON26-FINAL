"""Unit tests for Cameroon phone number normalization."""

import pytest

from app.core.exceptions import ValidationError
from app.modules.auth.services import normalize_cameroon_phone


def test_normalize_valid_local_cameroon_number():
    """Local 9-digit Cameroon numbers should be formatted to strict E.164 (+237...)."""
    assert normalize_cameroon_phone("671234567") == "+237671234567"
    assert normalize_cameroon_phone("699001122") == "+237699001122"
    assert normalize_cameroon_phone("650334455") == "+237650334455"


def test_normalize_valid_e164_cameroon_number():
    """Already formatted E.164 numbers should be preserved."""
    assert normalize_cameroon_phone("+237671234567") == "+237671234567"
    assert normalize_cameroon_phone("00237699001122") == "+237699001122"


def test_reject_foreign_phone_numbers():
    """Only Cameroon (+237) numbers are supported for MVP."""
    with pytest.raises(ValidationError):
        normalize_cameroon_phone("+14155552671")  # US number


def test_reject_malformed_numbers():
    """Invalid strings should raise ValidationError."""
    with pytest.raises(ValidationError):
        normalize_cameroon_phone("12345")
    with pytest.raises(ValidationError):
        normalize_cameroon_phone("not-a-phone")
