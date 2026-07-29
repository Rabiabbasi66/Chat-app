from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from ..schemas import MessageResponse, ChatSessionResponse
from ..services.message_service import message_service
from ..services.ai_service import ai_service
from ..database import get_collection
from pydantic import BaseModel
from bson import ObjectId

router = APIRouter(prefix="/api/chat", tags=["chat"])

@router.post("/sessions", response_model=ChatSessionResponse)
async def create_chat_session(user_id: str, title: Optional[str] = "New Chat"):
    """Create a new chat session"""
    try:
        # Check if user exists first
        users_collection = get_collection("users")
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        session = await message_service.create_chat_session(user_id, title or "New Chat")
        return session
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error creating chat session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sessions", response_model=List[ChatSessionResponse])
async def get_chat_sessions(user_id: str):
    """Get all chat sessions for a user"""
    try:
        # Check if user exists
        users_collection = get_collection("users")
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        sessions = await message_service.get_chat_sessions(user_id)
        return sessions
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error getting chat sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sessions/{chat_id}/messages", response_model=List[MessageResponse])
async def get_messages(chat_id: str, limit: int = 50, skip: int = 0):
    """Get messages for a chat session"""
    try:
        messages = await message_service.get_messages(chat_id, limit, skip)
        return messages
    except Exception as e:
        print(f"❌ Error getting messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/sessions/{chat_id}")
async def delete_chat_session(chat_id: str, user_id: str):
    """Delete a chat session"""
    try:
        success = await message_service.delete_chat_session(chat_id, user_id)
        if success:
            return {"message": "Chat session deleted successfully"}
        raise HTTPException(status_code=404, detail="Chat session not found")
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error deleting chat session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sessions/{chat_id}/settings")
async def update_chat_settings(chat_id: str, settings: dict):
    """Update chat settings"""
    try:
        db = get_collection("chat_sessions")
        await db.update_one(
            {"_id": ObjectId(chat_id)},
            {"$set": {"settings": settings}}
        )
        return {"message": "Settings updated successfully"}
    except Exception as e:
        print(f"❌ Error updating settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/ai/personalities")
async def get_ai_personalities():
    """Get available AI personalities"""
    return {
        "personalities": [
            {"id": "helpful", "name": "Helpful", "description": "Friendly and informative"},
            {"id": "professional", "name": "Professional", "description": "Formal and detailed"},
            {"id": "casual", "name": "Casual", "description": "Relaxed and conversational"},
            {"id": "creative", "name": "Creative", "description": "Innovative and imaginative"},
            {"id": "educational", "name": "Educational", "description": "Clear and instructive"}
        ]
    }