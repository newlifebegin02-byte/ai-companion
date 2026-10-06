from typing import List
from sqlalchemy.orm import Session
from app.models.database import Memory

class MemoryService:
    async def recall_memories(self, db: Session, user_id: str, character_id: str, query: str, limit: int = 5) -> List[Memory]:
        return db.query(Memory).filter(Memory.user_id == user_id, Memory.character_id == character_id).order_by(Memory.created_at.desc()).limit(limit).all()

    def format_memories_for_prompt(self, memories: List[Memory]) -> str:
        if not memories:
            return ""
        formatted = "\n\nMEMORIES:\n"
        for memory in memories:
            formatted += f"- {memory.content}\n"
        return formatted

memory_service = MemoryService()
