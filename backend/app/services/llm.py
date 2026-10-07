from typing import List, Dict
from anthropic import Anthropic
from app.core.config import get_settings

settings = get_settings()

class LLMService:
    def __init__(self):
        self.anthropic_client = Anthropic(api_key=settings.ANTHROPIC_API_KEY) if settings.ANTHROPIC_API_KEY else None

    async def generate_response(self, system_prompt: str, messages: List[Dict], temperature: float = 0.7, max_tokens: int = 500) -> str:
        if not self.anthropic_client:
            return "Hello! I'm your AI companion. (Configure ANTHROPIC_API_KEY)"
        
        try:
            # Convert messages format
            claude_messages = []
            for msg in messages:
                role = "user" if msg["role"] == "user" else "assistant"
                claude_messages.append({"role": role, "content": msg["content"]})
            
            # Call Claude API
            response = self.anthropic_client.messages.create(
                model="claude-sonnet-5-5",
                max_tokens=max_tokens,
                system=system_prompt,
                messages=claude_messages
            )
            
            # Extract text - find the text block, not thinking block
            for block in response.content:
                if hasattr(block, 'type') and block.type == 'text':
                    if hasattr(block, 'text') and block.text:
                        return block.text
            
            # If no text block found, return fallback
            return "I'm sorry, I couldn't generate a proper response. Please try again."
            
        except Exception as e:
            print(f"Claude Error: {str(e)}")
            return f"I'm having trouble right now. Please try again in a moment."

llm_service = LLMService()