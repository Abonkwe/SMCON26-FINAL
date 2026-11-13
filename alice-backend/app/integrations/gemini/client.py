"""Google Gemini client adapter using the official google-genai SDK."""

from functools import lru_cache
from typing import Any, List, Optional

from google import genai
from google.genai import types

from app.core.config import get_settings
from app.core.logging import logger


class GeminiService:
    """Wrapper around google-genai SDK for the bilingual WhatsApp agent."""

    def __init__(self, api_key: str, model_id: str):
        self.api_key = api_key
        self.model_id = model_id
        self._client: Optional[genai.Client] = None

    @property
    def client(self) -> genai.Client:
        if self._client is None:
            logger.info("Initializing Google Gemini client with model=%s", self.model_id)
            self._client = genai.Client(api_key=self.api_key)
        return self._client

    def generate_chat_response(
        self,
        contents: List[Any],
        system_instruction: str,
        tools: Optional[List[Any]] = None,
    ) -> Any:
        """Call Gemini model with system instruction and optional tool declarations."""
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.2,  # Low temperature for strict factual adherence
        )
        if tools:
            config.tools = tools

        try:
            return self.client.models.generate_content(
                model=self.model_id,
                contents=contents,
                config=config,
            )
        except Exception as e:
            logger.error("Gemini API call failed: %s", str(e))
            raise


@lru_cache()
def get_gemini_service() -> GeminiService:
    """Return cached Gemini service singleton."""
    settings = get_settings()
    return GeminiService(
        api_key=settings.GEMINI_API_KEY,
        model_id=settings.GEMINI_MODEL,
    )
