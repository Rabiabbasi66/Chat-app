from datetime import datetime, timezone
from typing import List, Optional, Dict
from bson import ObjectId
from ..database import get_collection

class MessageService:
    def __init__(self):
        pass

    @property
    def messages_collection(self):
        return get_collection("messages")

    @property
    def chat_sessions_collection(self):
        return get_collection("chat_sessions")
    
    async def create_message(
        self,
        chat_id: str,
        user_id: str,
        content: str,
        sender_type: str,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """Create a new message and link it to the chat session"""
        message = {
            "chat_id": chat_id,
            "user_id": user_id,
            "content": content,
            "sender_type": sender_type,
            "created_at": datetime.now(timezone.utc),
            "is_read": False,
            "metadata": metadata or {}
        }
        
        result = await self.messages_collection.insert_one(message)
        message["id"] = str(result.inserted_id)
        
        try:
            session_id = ObjectId(chat_id)
            await self.chat_sessions_collection.update_one(
                {"_id": session_id},
                {
                    "$set": {"updated_at": datetime.now(timezone.utc)},
                    "$inc": {"message_count": 1}
                },
                upsert=False
            )
        except Exception as e:
            print(f"Error updating session: {e}")
        
        return message
    
    async def get_messages(
        self,
        chat_id: str,
        limit: int = 50,
        skip: int = 0
    ) -> List[Dict]:
        """Get messages for a chat session"""
        messages = await self.messages_collection.find(
            {"chat_id": chat_id}
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
        
        for msg in messages:
            msg["id"] = str(msg["_id"])
            del msg["_id"]
        
        return messages[::-1]
    
    async def create_chat_session(self, user_id: str, title: str = "New Chat") -> Dict:
        """Create a new chat session"""
        session = {
            "user_id": user_id,
            "title": title,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "message_count": 0,
            "is_active": True
        }
        
        result = await self.chat_sessions_collection.insert_one(session)
        session["id"] = str(result.inserted_id)
        
        return session

    # ✅ ADD THIS MISSING METHOD
    async def get_chat_sessions(self, user_id: str) -> List[Dict]:
        """Get all chat sessions for a user"""
        try:
            cursor = self.chat_sessions_collection.find(
                {"user_id": user_id}
            ).sort("updated_at", -1)
            
            sessions = []
            async for session in cursor:
                session["id"] = str(session["_id"])
                sessions.append(session)
            
            return sessions
        except Exception as e:
            print(f"Error in get_chat_sessions: {e}")
            return []

    # ✅ ADD THIS MISSING METHOD
    async def delete_chat_session(self, chat_id: str, user_id: str) -> bool:
        """Delete a chat session and its messages"""
        try:
            # Delete the session
            result = await self.chat_sessions_collection.delete_one({
                "_id": ObjectId(chat_id),
                "user_id": user_id
            })
            
            if result.deleted_count > 0:
                # Delete all messages in this session
                await self.messages_collection.delete_many({"chat_id": chat_id})
                return True
            
            return False
        except Exception as e:
            print(f"Error in delete_chat_session: {e}")
            return False

message_service = MessageService()