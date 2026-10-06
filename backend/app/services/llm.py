from typing import List, Dict
from anthropic import Anthropic
from app.core.config import get_settings

settings = get_settings()

class LLMService:
    def __init__(self):
        self.anthropic_client = Anthropic(api_key=settings.ANTHROPIC_API_KEY) if settings.ANTHROPIC_API_KEY else None

    async def generate_response(self, system_prompt: str, messages: List[Dict], temperature: float = 0.7, max_tokens: int = 500) -> str:
        if not self.anthropic_client:
            return "Hello! I'm your AI companion. ^(Configure ANTHROPIC_API_KEY to enable full responses^)"
        claude_messages = [{"role": msg["role"], "content": msg["content"]} for msg in messages]
        response = self.anthropic_client.messages.create(model="claude-3-5-sonnet-20241022", max_tokens=max_tokens, temperature=temperature, system=system_prompt, messages=claude_messages)
        return response.content[0].text

llm_service = LLMService()
