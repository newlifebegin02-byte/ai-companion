from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.models.database import get_db, Character, User
from app.models.schemas import CharacterCreate, CharacterResponse
from app.core.security import verify_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/characters", tags=["characters"])
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> User:
    user_id = verify_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid authentication")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

@router.post("/", response_model=CharacterResponse)
async def create_character(character_data: CharacterCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    character = Character(user_id=current_user.id, name=character_data.name, age=character_data.age, occupation=character_data.occupation, backstory=character_data.backstory, personality=character_data.personality.dict(), appearance=character_data.appearance.dict())
    db.add(character)
    db.commit()
    db.refresh(character)
    return character

@router.get("/", response_model=List[CharacterResponse])
async def list_characters(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Character).filter(Character.user_id == current_user.id, Character.is_active == True).all()
