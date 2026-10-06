from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime
from enum import Enum

class SenderType(str, Enum):
    USER = "user"
    CHARACTER = "character"

class UserCreate(BaseModel):
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class PersonalityTraits(BaseModel):
    openness: float = 0.5
    extraversion: float = 0.5
    humor_style: str = "witty"
    affection_style: str = "warm"

class Appearance(BaseModel):
    hair_color: str
    hair_style: str
    eye_color: str
    skin_tone: str
    body_type: str
    style: str

class CharacterCreate(BaseModel):
    name: str
    age: int = Field(..., ge=18, le=100)
    occupation: str
    backstory: str
    personality: PersonalityTraits
    appearance: Appearance

class CharacterResponse(BaseModel):
    id: str
    name: str
    age: int
    occupation: str
    backstory: str
    personality: Dict
    appearance: Dict
    affection_level: float
    trust_level: float
    created_at: datetime
    class Config:
        from_attributes = True

class MessageResponse(BaseModel):
    id: str
    content: str
    sender: SenderType
    created_at: datetime
    class Config:
        from_attributes = True

class EmotionState(BaseModel):
    valence: float = 0.0
    arousal: float = 0.0
    dominance: float = 0.0

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    character_id: str

class ChatResponse(BaseModel):
    message: MessageResponse
    character_emotion: EmotionState
