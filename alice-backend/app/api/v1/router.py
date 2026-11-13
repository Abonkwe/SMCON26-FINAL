"""ALICE API v1 master router aggregating all domain modules."""

from fastapi import APIRouter

from app.api.v1.health import router as health_router
from app.modules.admin.router import router as admin_router
from app.modules.auth.router import router as auth_router
from app.modules.bookings.router import router as bookings_router
from app.modules.catalogue.router import router as catalogue_router
from app.modules.disputes.router import router as disputes_router
from app.modules.notifications.router import router as notifications_router
from app.modules.providers.router import router as providers_router
from app.modules.rentals.router import router as rentals_router
from app.modules.reviews.router import router as reviews_router
from app.modules.users.router import router as users_router
from app.modules.verification.router import router as verification_router
from app.modules.whatsapp_agent.router import router as whatsapp_router

api_v1_router = APIRouter()

# 1. System Health & Readiness
api_v1_router.include_router(health_router)

# 2. Domain Modules
api_v1_router.include_router(auth_router)
api_v1_router.include_router(users_router)
api_v1_router.include_router(verification_router)
api_v1_router.include_router(catalogue_router)
api_v1_router.include_router(providers_router)
api_v1_router.include_router(bookings_router)
api_v1_router.include_router(rentals_router)
api_v1_router.include_router(reviews_router)
api_v1_router.include_router(disputes_router)
api_v1_router.include_router(notifications_router)
api_v1_router.include_router(whatsapp_router)
api_v1_router.include_router(admin_router)
