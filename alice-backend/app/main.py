"""ALICE FastAPI Application Entrypoint & Modular Monolith Factory."""

import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.api.v1.router import api_v1_router
from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import logger, set_correlation_id, setup_logging


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """Injects and propagates an X-Correlation-ID header on every request/response."""

    async def dispatch(self, request: Request, call_next) -> Response:
        # Read correlation ID from incoming header or generate a new UUID
        correlation_id = request.headers.get("X-Correlation-ID") or str(uuid.uuid4())
        set_correlation_id(correlation_id)

        start_time = time.time()
        logger.info("--> %s %s", request.method, request.url.path)

        response = await call_next(request)

        duration_ms = round((time.time() - start_time) * 1000, 2)
        response.headers["X-Correlation-ID"] = correlation_id
        logger.info("<-- %s %s [%s] in %sms", request.method, request.url.path, response.status_code, duration_ms)

        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context for startup and shutdown hooks."""
    setup_logging()
    settings = get_settings()
    logger.info("Starting %s in %s mode", settings.PROJECT_NAME, settings.ENVIRONMENT)
    yield
    logger.info("Shutting down %s", settings.PROJECT_NAME)


def create_application() -> FastAPI:
    """Build and configure the FastAPI modular monolith."""
    settings = get_settings()

    app = FastAPI(
        title=settings.PROJECT_NAME,
        description="ALICE Hyper-Local Home Services and Portable Power Station Rental Platform (Buea, Cameroon)",
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # 1. Logging and Correlation ID Middleware
    app.add_middleware(CorrelationIdMiddleware)

    # 2. CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 3. Standardized Exception Handlers
    register_exception_handlers(app)

    # 4. Versioned API Router (/api/v1)
    app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)

    return app


app = create_application()
