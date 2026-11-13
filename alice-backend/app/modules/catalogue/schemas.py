"""Catalogue schemas."""

from typing import Optional

from pydantic import BaseModel


class CategoryResponse(BaseModel):
    """Service category schema."""

    category_id: str
    name_en: str
    name_fr: str
    icon_key: Optional[str] = None
    display_order: int = 0
    active: bool = True


class ServiceResponse(BaseModel):
    """Service item schema."""

    service_id: str
    category_id: str
    name_en: str
    name_fr: str
    description: Optional[str] = None
    risk_level: str  # LOW, MEDIUM, HIGH
    requires_competence_verification: bool
    active: bool = True


class ServiceAreaResponse(BaseModel):
    """Buea service area (neighbourhood) schema."""

    area_id: str
    name: str
    city: str = "Buea"
    active: bool = True
