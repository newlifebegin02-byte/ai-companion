import base64
import io
from openai import OpenAI
from app.core.config import get_settings

settings = get_settings()

class VoiceService:
    def __init__(self):
        self.openai_client = OpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None
    
    async def speech_to_text(self, audio_base64: str) -> str:
        """Convert voice to text using OpenAI Whisper"""
        if not self.openai_client:
            return ""
        
        try:
            # Decode base64 audio
            audio_bytes = base64.b64decode(audio_base64)
            
            # Create file-like object
            audio_file = io.BytesIO(audio_bytes)
            audio_file.name = "audio.wav"
            
            # Transcribe with Whisper
            transcript = self.openai_client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file
            )
            
            return transcript.text
        except Exception as e:
            print(f"STT Error: {str(e)}")
            return ""

voice_service = VoiceService()