"""Unit tests for the portable power station runtime and compatibility calculator."""

from app.modules.rentals.schemas import AppliancePowerItem, PowerCompatibilityRequest
from app.modules.rentals.services import calculate_power_compatibility


def test_compatible_light_load():
    """Laptops + Wi-Fi router on a 2048Wh / 2400W station should be fully compatible."""
    req = PowerCompatibilityRequest(
        capacity_wh=2048,
        continuous_output_w=2400,
        appliances=[
            AppliancePowerItem(name="MacBook Pro", watts=65, daily_hours=8, is_concurrent=True),
            AppliancePowerItem(name="Starlink Mini / Wi-Fi", watts=35, daily_hours=10, is_concurrent=True),
            AppliancePowerItem(name="LED Room Light", watts=15, daily_hours=6, is_concurrent=True),
        ],
    )
    result = calculate_power_compatibility(req)

    # Total energy: (65*8) + (35*10) + (15*6) = 520 + 350 + 90 = 960 Wh
    assert result.total_energy_wh == 960.0
    # Usable energy at 85% inverter efficiency: 2048 * 0.85 = 1740.8 Wh
    assert result.usable_energy_wh == 1740.8
    # Peak concurrent power: 65 + 35 + 15 = 115 W <= 2400 W
    assert result.peak_concurrent_watts == 115
    assert result.is_compatible is True
    assert len(result.warnings) == 0


def test_inverter_overload_warning():
    """An electric iron (1500W) + microwave (1200W) exceeding a 2000W inverter should trigger an overload warning."""
    req = PowerCompatibilityRequest(
        capacity_wh=2048,
        continuous_output_w=2000,
        appliances=[
            AppliancePowerItem(name="Electric Iron", watts=1500, daily_hours=1, is_concurrent=True),
            AppliancePowerItem(name="Microwave Oven", watts=1200, daily_hours=0.5, is_concurrent=True),
        ],
    )
    result = calculate_power_compatibility(req)

    # 1500 + 1200 = 2700W > 2000W continuous output
    assert result.peak_concurrent_watts == 2700
    assert result.is_compatible is False
    assert any("exceeds inverter continuous output" in w for w in result.warnings)


def test_energy_capacity_exhaustion_warning():
    """Energy demand exceeding 85% usable battery capacity should generate a warning."""
    req = PowerCompatibilityRequest(
        capacity_wh=1000,  # Usable: 850 Wh
        continuous_output_w=2000,
        appliances=[
            AppliancePowerItem(name="Deep Freezer", watts=200, daily_hours=6, is_concurrent=True),  # 1200 Wh
        ],
    )
    result = calculate_power_compatibility(req)

    assert result.total_energy_wh == 1200.0
    assert any("exceeds estimated usable capacity" in w for w in result.warnings)
