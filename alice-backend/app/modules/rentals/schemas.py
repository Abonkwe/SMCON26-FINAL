"""Rentals and power estimator schemas."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class RentalListingCreate(BaseModel):
    """Payload to list a portable power station or generator for rent."""

    item_name: str = Field(..., description="e.g. EcoFlow DELTA 2 Max")
    brand: str = Field(..., description="e.g. EcoFlow, Bluetti, Anker")
    model: str = Field(..., description="e.g. 2048Wh Unit")
    capacity_wh: int = Field(..., gt=0, description="Battery energy capacity in Watt-hours (Wh)")
    continuous_output_w: int = Field(..., gt=0, description="Continuous inverter output in Watts (W)")
    peak_output_w: int = Field(..., gt=0, description="Surge output in Watts (W)")
    condition: str = Field("GOOD", description="NEW, EXCELLENT, GOOD, FAIR")
    daily_rate_xaf: int = Field(..., gt=0, description="Daily rental rate in integer XAF")
    deposit_xaf: int = Field(0, ge=0, description="Security deposit in integer XAF")
    accessories_included: List[str] = Field(default_factory=list)
    owner_attestation: bool = Field(True, description="Attestation of lawful ownership/rental rights")


class RentalListingResponse(BaseModel):
    """Rental listing details."""

    listing_id: str
    owner_provider_id: str
    item_name: str
    brand: str
    model: str
    capacity_wh: int
    continuous_output_w: int
    peak_output_w: int
    condition: str
    daily_rate_xaf: int
    deposit_xaf: int
    accessories_included: List[str]
    active: bool


class AppliancePowerItem(BaseModel):
    """Appliance power consumption entry."""

    name: str = Field(..., description="e.g. Refrigerator, Laptop, Wi-Fi Router, Standing Fan")
    watts: int = Field(..., gt=0, description="Rated continuous power in Watts (W)")
    daily_hours: float = Field(..., gt=0, le=24, description="Hours used per day")
    is_concurrent: bool = Field(True, description="Whether appliance runs at the same time as others")


class PowerCompatibilityRequest(BaseModel):
    """Request to calculate appliance runtime against a power station."""

    listing_id: Optional[str] = None
    capacity_wh: int = Field(..., gt=0, description="Target battery capacity in Wh")
    continuous_output_w: int = Field(..., gt=0, description="Target inverter output in W")
    appliances: List[AppliancePowerItem] = Field(..., min_length=1)


class PowerCompatibilityResponse(BaseModel):
    """Compatibility results, estimated runtime, and electrical warnings."""

    total_energy_wh: float
    usable_energy_wh: float  # Accounting for 85% inverter conversion efficiency
    peak_concurrent_watts: int
    estimated_runtime_hours: float
    is_compatible: bool
    warnings: List[str] = Field(default_factory=list)


class RentalBookingCreate(BaseModel):
    """Payload to book an equipment rental window."""

    listing_id: str
    start_at: datetime
    end_at: datetime


class RentalBookingResponse(BaseModel):
    """Rental booking record."""

    rental_id: str
    listing_id: str
    customer_id: str
    provider_id: str
    start_at: datetime
    end_at: datetime
    total_price_xaf: int
    deposit_amount_xaf: int
    status: str


class RentalInspectionCreate(BaseModel):
    """Handover or return inspection payload."""

    stage: str = Field(..., description="HANDOVER or RETURN")
    accessories_present: List[str] = Field(default_factory=list)
    serial_number_verified: Optional[str] = None
    condition_notes: Optional[str] = None
