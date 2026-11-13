"""Supabase PostgreSQL and Storage client wrappers."""

from functools import lru_cache
from typing import Any, Dict, Optional

from supabase import Client, create_client

from app.core.config import get_settings
from app.core.logging import logger


class SupabaseWrapper:
    """Encapsulates Supabase client operations for PostgreSQL and Storage."""

    def __init__(self, url: str, key: str, is_service_role: bool = False):
        self.url = url
        self.key = key
        self.is_service_role = is_service_role
        self._client: Optional[Client] = None

    @property
    def client(self) -> Client:
        if self._client is None:
            logger.info("Initializing Supabase client (service_role=%s)", self.is_service_role)
            self._client = create_client(self.url, self.key)
        return self._client

    def create_signed_read_url(self, bucket: str, path: str, expires_in_seconds: int = 300) -> str:
        """Generate a short-lived signed URL to read private documents (e.g. ID verifications)."""
        try:
            res = self.client.storage.from_(bucket).create_signed_url(path, expires_in_seconds)
            return res.get("signedURL", "") or res.get("signedUrl", "")
        except Exception as e:
            logger.error("Failed to create signed read URL for %s/%s: %s", bucket, path, str(e))
            raise

    def upload_file(self, bucket: str, path: str, file_bytes: bytes, content_type: str) -> Dict[str, Any]:
        """Upload file bytes to Supabase Storage."""
        try:
            return self.client.storage.from_(bucket).upload(
                path=path,
                file=file_bytes,
                file_options={"content-type": content_type, "upsert": "true"},
            )
        except Exception as e:
            logger.error("Failed to upload file to %s/%s: %s", bucket, path, str(e))
            raise


@lru_cache()
def get_supabase_client() -> SupabaseWrapper:
    """Return anon/public Supabase client."""
    settings = get_settings()
    return SupabaseWrapper(url=settings.SUPABASE_URL, key=settings.SUPABASE_ANON_KEY, is_service_role=False)


@lru_cache()
def get_supabase_service_client() -> SupabaseWrapper:
    """Return privileged service-role Supabase client (used for backend domain services)."""
    settings = get_settings()
    return SupabaseWrapper(url=settings.SUPABASE_URL, key=settings.SUPABASE_SERVICE_ROLE_KEY, is_service_role=True)
