"""Tests for health endpoints and Correlation ID middleware."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_liveness(async_client: AsyncClient):
    """GET /api/v1/health should return 200 OK and valid health payload."""
    response = await async_client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "timestamp" in data
    # Verify correlation ID is injected into response headers
    assert "X-Correlation-ID" in response.headers
    assert len(response.headers["X-Correlation-ID"]) > 10


@pytest.mark.asyncio
async def test_readiness_probe(async_client: AsyncClient):
    """GET /api/v1/ready should verify database readiness."""
    response = await async_client.get("/api/v1/ready")
    assert response.status_code in (200, 503)
    data = response.json()
    assert "status" in data
    assert "checks" in data

