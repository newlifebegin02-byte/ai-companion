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
            
            # Call Claude API - no temperature for new models
            response = self.anthropic_client.messages.create(
                model="claude-sonnet-5-5",
                max_tokens=max_tokens,
                system=system_prompt,
                messages=claude_messages
            )
            
            # Debug: print response structure
            print(f"Claude response: {response}")
            
            # Extract text - handle different response formats
            if hasattr(response, 'content') and response.content:
                if isinstance(response.content, list) and len(response.content) > 0:
                    first_content = response.content[0]
                    if hasattr(first_content, 'text'):
                        return first_content.text
                    elif isinstance(first_content, dict) and 'text' in first_content:
                        return first_content['text']
            
            # If we get here, response structure is unexpected
            return f"I received a response but couldn't parse it. Raw: {str(response)}"
            
        except Exception as e:
            print(f"Claude Error: {str(e)}")
            return f"I'm having trouble right now. Error: {str(e)}"

llm_service = LLMService()