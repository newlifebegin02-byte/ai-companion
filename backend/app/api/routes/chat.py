from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.models.database import get_db, Character, Conversation, Message, User
from app.models.schemas import ChatRequest, ChatResponse, MessageResponse, EmotionState, SenderType
from app.services.llm import llm_service
from app.services.emotion import emotion_engine
from app.core.security import verify_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/chat", tags=["chat"])
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> User:
    user_id = verify_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid authentication")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

@router.post("/send", response_model=ChatResponse)
async def send_message(chat_data: ChatRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    character = db.query(Character).filter(Character.id == chat_data.character_id, Character.user_id == current_user.id).first()
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    conversation = Conversation(user_id=current_user.id, character_id=character.id, title=f"Chat with {character.name}")
    db.add(conversation)
    db.commit()
    user_message = Message(conversation_id=conversation.id, content=chat_data.message, sender=SenderType.USER)
    db.add(user_message)
    db.commit()
    personality = character.personality or {}
    system_prompt = f"""You are {character.name}, a {character.age}-year-old {character.occupation}. Personality: {personality.get^('affection_style', 'warm'^)}, {personality.get^('humor_style', 'witty'^)}. Backstory: {character.backstory[:200]}. Respond naturally as {character.name} would. Keep it conversational ^(2-4 sentences^)."""
    messages = [{"role": "user", "content": chat_data.message}]
    ai_response_text = await llm_service.generate_response(system_prompt, messages)
    new_emotion = emotion_engine.update_from_interaction(user_sentiment=0.2, interaction_quality=0.7, user_message_length=len(chat_data.message))
    ai_message = Message(conversation_id=conversation.id, content=ai_response_text, sender=SenderType.CHARACTER, emotion_state=new_emotion.dict())
    db.add(ai_message)
    db.commit()
    db.refresh(ai_message)
    return ChatResponse(message=MessageResponse(id=ai_message.id, content=ai_message.content, sender=ai_message.sender, created_at=ai_message.created_at), character_emotion=EmotionState(**new_emotion.dict()))
