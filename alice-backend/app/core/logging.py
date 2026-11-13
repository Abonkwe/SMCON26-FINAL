"""Structured and redacted logging for ALICE backend."""

import logging
import re
import uuid
from contextvars import ContextVar

# Context variable for request correlation ID
correlation_id_var: ContextVar[str] = ContextVar("correlation_id", default="")


def get_correlation_id() -> str:
    """Return the current correlation ID or generate a new fallback."""
    cid = correlation_id_var.get()
    if not cid:
        cid = str(uuid.uuid4())
        correlation_id_var.set(cid)
    return cid


def set_correlation_id(correlation_id: str) -> None:
    """Explicitly set the correlation ID for the current context."""
    correlation_id_var.set(correlation_id)


# Patterns to redact from logs to avoid leaking PII or credentials
SENSITIVE_PATTERNS = [
    (
        re.compile(r"(password|token|secret|api_key|authorization)[\"']?\s*[:=]\s*[\"']?([^\"'\s,]+)", re.IGNORECASE),
        r"\1: [REDACTED]",
    ),
    (re.compile(r"(\+?237\d{4})\d{4}(\d{2})"), r"\1****\2"),  # Mask Cameroon phone numbers
]


class RedactingFormatter(logging.Formatter):
    """Custom logging formatter that injects correlation_id and redacts sensitive data."""

    def format(self, record: logging.LogRecord) -> str:
        record.correlation_id = get_correlation_id()
        msg = super().format(record)
        for pattern, replacement in SENSITIVE_PATTERNS:
            msg = pattern.sub(replacement, msg)
        return msg


def setup_logging(level: str = "INFO") -> None:
    """Initialize root logger with redacting formatter."""
    handler = logging.StreamHandler()
    formatter = RedactingFormatter(
        fmt="%(asctime)s [%(levelname)s] [corr_id:%(correlation_id)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S%z",
    )
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    # Remove existing handlers to avoid duplicate output
    root_logger.handlers = [handler]


logger = logging.getLogger("alice")
