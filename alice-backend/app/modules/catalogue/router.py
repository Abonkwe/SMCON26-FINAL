"""Catalogue API router."""

from typing import List, Optional

from fastapi import APIRouter, Query

from app.modules.catalogue.schemas import CategoryResponse, ServiceAreaResponse, ServiceResponse
from app.modules.catalogue.services import get_categories, get_service_areas, get_services

router = APIRouter(prefix="/catalogue", tags=["Catalogue"])


@router.get("/categories", response_model=List[CategoryResponse], summary="List Active Service Categories")
async def list_categories():
    """Retrieve all active service categories."""
    return get_categories()


@router.get("/services", response_model=List[ServiceResponse], summary="List Services")
async def list_services(category_id: Optional[str] = Query(None, description="Filter by category UUID")):
    """Retrieve services, optionally filtered by category."""
    return get_services(category_id=category_id)


@router.get("/areas", response_model=List[ServiceAreaResponse], summary="List Buea Neighbourhoods")
async def list_areas():
    """Retrieve all active Buea neighbourhood service areas."""
    return get_service_areas()
