"""Tests for rentals API and concurrency overlap prevention (AC-07)."""

from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_rental_listings(async_client: AsyncClient):
    """GET /api/v1/rentals/listings should return pre-seeded power stations."""
    resp = await async_client.get("/api/v1/rentals/listings")
    assert resp.status_code == 200
    listings = resp.json()
    assert len(listings) >= 1
    unit = listings[0]
    assert unit["capacity_wh"] > 0
    assert unit["continuous_output_w"] > 0


@pytest.mark.asyncio
async def test_rental_anti_overlap_booking(async_client: AsyncClient, customer_auth_headers: dict):
    """AC-07: Concurrent overlapping bookings for the same unit must be rejected with 409 Conflict."""
    # Base start time in the future
    base_time = datetime.now(timezone.utc) + timedelta(days=10)
    start_1 = base_time.isoformat()
    end_1 = (base_time + timedelta(days=2)).isoformat()

    # 1. Customer A books day 10 to day 12
    resp_1 = await async_client.post(
        "/api/v1/rentals/bookings",
        headers=customer_auth_headers,
        json={
            "listing_id": "rental-listing-1",
            "start_at": start_1,
            "end_at": end_1,
        },
    )
    assert resp_1.status_code == 201

    # 2. Customer B attempts to book an overlapping window (day 11 to day 13)
    start_2 = (base_time + timedelta(days=1)).isoformat()
    end_2 = (base_time + timedelta(days=3)).isoformat()

    resp_2 = await async_client.post(
        "/api/v1/rentals/bookings",
        headers=customer_auth_headers,
        json={
            "listing_id": "rental-listing-1",
            "start_at": start_2,
            "end_at": end_2,
        },
    )
    # Must be blocked atomically with 409 Conflict
    assert resp_2.status_code == 409
    assert resp_2.json()["error"]["code"] == "RENTAL_PERIOD_OVERLAP"
