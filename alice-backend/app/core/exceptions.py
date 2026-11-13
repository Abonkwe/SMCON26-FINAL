"""Standardized JSON error envelopes and custom exceptions for ALICE."""

from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.logging import get_correlation_id, logger


class AliceException(Exception):
    """Base exception class for ALICE business and operational exceptions."""

    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_SERVER_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}


class AuthenticationError(AliceException):
    """Raised when authentication credentials are missing, invalid, or expired."""

    def __init__(
        self, message: str = "Invalid or expired authentication credentials", details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            code="AUTHENTICATION_FAILED",
            status_code=status.HTTP_401_UNAUTHORIZED,
            details=details,
        )


class ForbiddenError(AliceException):
    """Raised when user lacks required role or ownership permissions."""

    def __init__(
        self, message: str = "Access forbidden", code: str = "FORBIDDEN", details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            code=code,
            status_code=status.HTTP_403_FORBIDDEN,
            details=details,
        )


class AccountSuspendedError(AliceException):
    """Raised when an account is marked SUSPENDED."""

    def __init__(self, message: str = "Account is suspended due to a safety or policy violation"):
        super().__init__(
            message=message,
            code="ACCOUNT_SUSPENDED",
            status_code=status.HTTP_403_FORBIDDEN,
        )


class NotFoundError(AliceException):
    """Raised when an entity or resource is not found."""

    def __init__(self, resource: str, identifier: Any):
        super().__init__(
            message=f"{resource} with identifier '{identifier}' was not found",
            code="RESOURCE_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
            details={"resource": resource, "identifier": str(identifier)},
        )


class ConflictError(AliceException):
    """Raised when a unique constraint or conflict occurs (e.g. double booking)."""

    def __init__(self, message: str, code: str = "CONFLICT", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code=code,
            status_code=status.HTTP_409_CONFLICT,
            details=details,
        )


class ValidationError(AliceException):
    """Raised on invalid domain or input parameters."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            details=details,
        )


def create_error_response(
    status_code: int, code: str, message: str, details: Optional[Dict[str, Any]] = None
) -> JSONResponse:
    """Build the standardized JSON error envelope."""
    correlation_id = get_correlation_id()
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "details": details or {},
            },
            "correlation_id": correlation_id,
        },
        headers={"X-Correlation-ID": correlation_id},
    )


async def alice_exception_handler(request: Request, exc: AliceException) -> JSONResponse:
    """Handler for custom ALICE exceptions."""
    logger.warning("Handled AliceException: [%s] %s", exc.code, exc.message)
    return create_error_response(
        status_code=exc.status_code,
        code=exc.code,
        message=exc.message,
        details=exc.details,
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handler for standard FastAPI/Starlette HTTPExceptions."""
    code_map = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        409: "CONFLICT",
        422: "UNPROCESSABLE_ENTITY",
        500: "INTERNAL_ERROR",
    }
    code = code_map.get(exc.status_code, "HTTP_ERROR")
    logger.warning("HTTPException [%s]: %s", exc.status_code, exc.detail)
    return create_error_response(
        status_code=exc.status_code,
        code=code,
        message=str(exc.detail),
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handler for Pydantic input validation failures."""
    details = {"errors": exc.errors()}
    logger.info("Request validation failed: %s", exc.errors())
    return create_error_response(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        code="REQUEST_VALIDATION_FAILED",
        message="Request payload or parameters failed validation",
        details=details,
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all handler for unhandled exceptions."""
    logger.exception("Unhandled server error: %s", str(exc))
    return create_error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        code="INTERNAL_SERVER_ERROR",
        message="An unexpected server error occurred. Please contact support with the correlation ID.",
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Register all custom error handlers with the FastAPI app."""
    app.add_exception_handler(AliceException, alice_exception_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
