from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List, Any
import json
from datetime import datetime, timezone
from ..services.ai_service import ai_service
from ..services.message_service import message_service

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[Dict[str, Any]]] = {}
        self.user_connections: Dict[str, str] = {} 
    
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        
        connection_id = f"{user_id}_{datetime.now(timezone.utc).timestamp()}"
        self.user_connections[connection_id] = user_id
        
        self.active_connections[user_id].append({
            "websocket": websocket,
            "connection_id": connection_id
        })
        return connection_id
    
    def disconnect(self, connection_id: str):
        user_id = self.user_connections.get(connection_id)
        if user_id and user_id in self.active_connections:
            self.active_connections[user_id] = [
                conn for conn in self.active_connections[user_id]
                if conn["connection_id"] != connection_id
            ]
        if connection_id in self.user_connections:
            del self.user_connections[connection_id]

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            for conn in self.active_connections[user_id]:
                try:
                    msg_type = message.get("type")
                    payload = message.get("data", {})
                    payload["type"] = msg_type 
                    
                    cleaned_message = self._serialize_datetime(payload)
                    await conn["websocket"].send_json(cleaned_message)
                except Exception:
                    pass

    def _serialize_datetime(self, obj: Any) -> Any:
        if isinstance(obj, dict):
            return {k: self._serialize_datetime(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._serialize_datetime(i) for i in obj]
        elif isinstance(obj, datetime):
            return obj.isoformat()
        return obj

manager = ConnectionManager()

@router.websocket("/ws/chat/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    connection_id = await manager.connect(websocket, user_id)
    
    print(f"✅ WebSocket connected: {user_id}")
    
    await manager.send_personal_message({
        "type": "connected",
        "data": {"message": "Welcome to AI Chat!"}
    }, user_id)
    
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message_data = json.loads(data)
                message_type = message_data.get("type", "message")
                
                print(f"📩 Received message type: {message_type} from {user_id}")
                
                if message_type == "message":
                    content = message_data.get("content", "")
                    chat_id = message_data.get("chat_id", "")
                    personality = message_data.get("personality", "helpful")
                    
                    if not content or not chat_id:
                        continue
                    
                    print(f"💬 Processing message: '{content}' in chat: {chat_id}")
                    
                    # Save and Broadcast User Message
                    user_message = await message_service.create_message(
                        chat_id=chat_id, user_id=user_id, content=content, sender_type="user"
                    )
                    
                    await manager.send_personal_message({
                        "type": "message",
                        "data": {
                            "message_id": str(user_message["id"]),
                            "content": content,
                            "sender_type": "user",
                            "chat_id": chat_id,
                            "timestamp": user_message["created_at"]
                        }
                    }, user_id)
                    
                    # Typing Indicator
                    await manager.send_personal_message({
                        "type": "typing",
                        "data": {"is_typing": True, "sender": "ai", "chat_id": chat_id}
                    }, user_id)
                    
                    # AI Logic
                    messages = await message_service.get_messages(chat_id, limit=10)
                    history = [
                        {"role": "user" if m["sender_type"] == "user" else "assistant", "content": m["content"]}
                        for m in messages
                    ]
                    
                    print(f"🤖 Calling AI with message: '{content}'")
                    ai_response = await ai_service.generate_response(
                        message=content, conversation_history=history, personality=personality
                    )
                    
                    print(f"🤖 AI Response: {ai_response}")
                    
                    # Stop Typing
                    await manager.send_personal_message({
                        "type": "typing",
                        "data": {"is_typing": False, "sender": "ai", "chat_id": chat_id}
                    }, user_id)
                    
                    if ai_response["success"]:
                        print(f"✅ AI Success: {ai_response['content']}")
                        ai_msg = await message_service.create_message(
                            chat_id=chat_id, user_id=user_id, content=ai_response["content"],
                            sender_type="ai"
                        )
                        
                        print(f"📤 Sending AI message: {ai_response['content']}")
                        await manager.send_personal_message({
                            "type": "message",
                            "data": {
                                "message_id": str(ai_msg["id"]),
                                "content": ai_response["content"],
                                "sender_type": "ai",
                                "chat_id": chat_id,
                                "timestamp": ai_msg["created_at"]
                            }
                        }, user_id)
                    else:
                        print(f"❌ AI Error: {ai_response.get('error', 'Unknown error')}")
                        # Send error message to user
                        await manager.send_personal_message({
                            "type": "error",
                            "data": {
                                "message": "Sorry, I encountered an error. Please try again.",
                                "error": ai_response.get("error", "Unknown error")
                            }
                        }, user_id)
                
                # ✅ NEW: Handle chat:new
                elif message_type == "chat:new":
                    title = message_data.get("title", "New Chat")
                    
                    print(f"📝 Creating new chat: '{title}' for user: {user_id}")
                    chat_session = await message_service.create_chat_session(user_id, title)
                    
                    print(f"✅ Chat created: {chat_session['id']}")
                    await manager.send_personal_message({
                        "type": "chat:created",
                        "data": {
                            "chat_id": chat_session["id"],
                            "title": chat_session["title"],
                            "user_id": chat_session["user_id"],
                            "created_at": chat_session["created_at"].isoformat() if chat_session.get("created_at") else None
                        }
                    }, user_id)
                    
                    chats = await message_service.get_chat_sessions(user_id)
                    await manager.send_personal_message({
                        "type": "chat:list",
                        "data": {"chats": chats}
                    }, user_id)
                
                # ✅ NEW: Handle chat:list
                elif message_type == "chat:list":
                    print(f"📋 Getting chat list for user: {user_id}")
                    chats = await message_service.get_chat_sessions(user_id)
                    await manager.send_personal_message({
                        "type": "chat:list",
                        "data": {"chats": chats}
                    }, user_id)
                
                # ✅ NEW: Handle chat:load
                elif message_type == "chat:load":
                    chat_id = message_data.get("chat_id")
                    limit = message_data.get("limit", 50)
                    
                    if chat_id:
                        print(f"📖 Loading {limit} messages for chat: {chat_id}")
                        messages = await message_service.get_messages(chat_id, limit=limit)
                        await manager.send_personal_message({
                            "type": "messages_loaded",
                            "data": {
                                "chat_id": chat_id,
                                "messages": messages
                            }
                        }, user_id)

            except json.JSONDecodeError as e:
                print(f"❌ JSON decode error: {e}")
                pass
            except Exception as e:
                print(f"❌ Unexpected error: {e}")
                import traceback
                traceback.print_exc()
    
    except WebSocketDisconnect:
        print(f"🔌 WebSocket disconnected: {user_id}")
        manager.disconnect(connection_id)
    except Exception as e:
        print(f"❌ WebSocket error: {e}")
        import traceback
        traceback.print_exc()
        manager.disconnect(connection_id)