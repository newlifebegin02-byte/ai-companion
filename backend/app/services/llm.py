from typing import List, Dict
from anthropic import Anthropic
from app.core.config import get_settings

settings = get_settings()

class LLMService:
    def __init__(self):
        self.anthropic_client = Anthropic(api_key=settings.ANTHROPIC_API_KEY) if settings.ANTHROPIC_API_KEY else None

    async def generate_response(self, system_prompt: str, messages: List[Dict], temperature: float = 0.7, max_tokens: int = 500) -> str:
        if not self.anthropic_client:
            return "Hello! I'm your AI companion. (Configure ANTHROPIC_API_KEY to enable full responses)"
        
        claude_messages = [{"role": msg["role"], "content": msg["content"]} for msg in messages]
        
        try:
            response = self.anthropic_client.messages.create(
                model="claude-sonnet-5-5", 
                max_tokens=max_tokens, 
                system=system_prompt, 
                messages=claude_messages
            )
            
            # Fallback if no content
            if not response.content or len(response.content) == 0:
                return "I'm sorry, I couldn't generate a response. Please try again."
            
            return response.content[0].text
            
        except Exception as e:
            print(f"LLM Error: {str(e)}")
            return f"I'm having trouble right now. Error: {str(e)}"

llm_service = LLMService()