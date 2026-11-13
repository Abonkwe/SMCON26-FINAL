"""Supabase JWT authentication, user resolution, and role-based access control."""

from typing import Callable, List, Optional

import jwt
from fastapi import Depends, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.core.exceptions import AccountSuspendedError, AuthenticationError, ForbiddenError
from app.core.logging import logger

security_scheme = HTTPBearer(auto_error=False)


class AuthenticatedUser(BaseModel):
    """Normalized authenticated user context."""

    user_id: str
    phone: Optional[str] = None
    email: Optional[str] = None
    roles: List[str] = Field(default_factory=list)
    account_status: str = "ACTIVE"

    def has_role(self, role: str) -> bool:
        """Check if user possesses a specific role."""
        return role in self.roles

    @property
    def is_admin(self) -> bool:
        """Return True if user has the ADMIN role."""
        return "ADMIN" in self.roles

    @property
    def is_provider(self) -> bool:
        """Return True if user has the PROVIDER role."""
        return "PROVIDER" in self.roles

    @property
    def is_reviewer(self) -> bool:
        """Return True if user has the VERIFICATION_REVIEWER role."""
        return "VERIFICATION_REVIEWER" in self.roles


def decode_supabase_jwt(token: str) -> dict:
    """Decode and validate a Supabase Auth Bearer JWT."""
    settings = get_settings()
    try:
        # In test/dev with mock secret, we decode using SUPABASE_JWT_SECRET
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise AuthenticationError("Authentication token has expired")
    except jwt.InvalidTokenError as e:
        logger.warning("JWT validation failed: %s", str(e))
        raise AuthenticationError("Invalid authentication token")


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_scheme),
) -> AuthenticatedUser:
    """FastAPI dependency: extracts and validates JWT, returns AuthenticatedUser."""
    if not credentials or not credentials.credentials:
        raise AuthenticationError("Missing Bearer authorization header")

    token = credentials.credentials
    payload = decode_supabase_jwt(token)

    user_id = payload.get("sub") or payload.get("user_id")
    if not user_id:
        raise AuthenticationError("JWT does not contain a valid user subject")

    # In production/integration, roles and account_status are loaded from DB or app_metadata
    app_metadata = payload.get("app_metadata", {})
    user_metadata = payload.get("user_metadata", {})

    roles = app_metadata.get("roles", ["CUSTOMER"])
    if not isinstance(roles, list):
        roles = [roles]

    account_status = app_metadata.get("account_status", "ACTIVE")

    # Hard safety check: Suspended accounts are immediately forbidden
    if account_status == "SUSPENDED":
        logger.warning("Access denied for suspended user %s", user_id)
        raise AccountSuspendedError()

    return AuthenticatedUser(
        user_id=str(user_id),
        phone=payload.get("phone") or user_metadata.get("phone"),
        email=payload.get("email") or user_metadata.get("email"),
        roles=roles,
        account_status=account_status,
    )


def require_role(required_role: str) -> Callable[[AuthenticatedUser], AuthenticatedUser]:
    """Dependency factory that enforces a specific role."""

    def role_checker(current_user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
        if not current_user.has_role(required_role) and not current_user.is_admin:
            raise ForbiddenError(f"Operation requires '{required_role}' role permission")
        return current_user

    return role_checker


def require_any_role(allowed_roles: List[str]) -> Callable[[AuthenticatedUser], AuthenticatedUser]:
    """Dependency factory that enforces any of the specified roles."""

    def role_checker(current_user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
        if not any(current_user.has_role(r) for r in allowed_roles) and not current_user.is_admin:
            raise ForbiddenError(f"Operation requires one of the following roles: {allowed_roles}")
        return current_user

    return role_checker
