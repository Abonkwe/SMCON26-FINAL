"""Pytest fixtures and test clients."""

from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.modules.auth.services import create_mock_jwt


@pytest_asyncio.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """Async test client using ASGI transport."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


@pytest.fixture
def customer_auth_headers() -> dict:
    """Authorization headers for a verified customer."""
    token = create_mock_jwt(user_id="test-customer-uuid-001", phone_e164="+237671112233", roles=["CUSTOMER"])
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def provider_auth_headers() -> dict:
    """Authorization headers for a service provider."""
    token = create_mock_jwt(
        user_id="test-provider-uuid-001", phone_e164="+237672223344", roles=["CUSTOMER", "PROVIDER"]
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_auth_headers() -> dict:
    """Authorization headers for an administrator."""
    token = create_mock_jwt(user_id="test-admin-uuid-001", phone_e164="+237673334455", roles=["CUSTOMER", "ADMIN"])
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def reviewer_auth_headers() -> dict:
    """Authorization headers for a verification reviewer."""
    token = create_mock_jwt(
        user_id="test-reviewer-uuid-001",
        phone_e164="+237674445566",
        roles=["CUSTOMER", "VERIFICATION_REVIEWER"],
    )
    return {"Authorization": f"Bearer {token}"}
