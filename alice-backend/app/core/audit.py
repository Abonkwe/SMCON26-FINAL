"""Immutable audit logging store and utilities."""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.core.logging import logger

# Immutable audit logs storage
_AUDIT_LOGS_STORE: List[Dict[str, Any]] = []


def record_audit_log(
    action: str,
    entity_type: str,
    entity_id: str,
    actor_id: Optional[str] = None,
    reason: Optional[str] = None,
    safe_metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Append an immutable audit log entry."""
    entry = {
        "audit_id": str(uuid.uuid4()),
        "actor_id": actor_id,
        "action": action,
        "entity_type": entity_type,
        "entity_id": str(entity_id),
        "reason": reason,
        "safe_metadata": safe_metadata or {},
        "timestamp": datetime.now(timezone.utc),
    }
    _AUDIT_LOGS_STORE.append(entry)
    logger.info("AUDIT: [%s] on %s:%s by %s (Reason: %s)", action, entity_type, entity_id, actor_id, reason)
    return entry


def get_audit_logs(
    entity_type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[Dict[str, Any]]:
    """Retrieve audit logs with optional entity filter."""
    filtered = _AUDIT_LOGS_STORE
    if entity_type:
        filtered = [log for log in _AUDIT_LOGS_STORE if log["entity_type"] == entity_type]

    sorted_logs = sorted(filtered, key=lambda x: x["timestamp"], reverse=True)
    return sorted_logs[offset : offset + limit]
