from typing import Optional, List, Dict
import json
from openai import OpenAI
from ..config import settings

class AIService:
    def __init__(self):
        self.personalities = {
            "helpful": "You are a helpful, friendly assistant who provides clear and accurate information.",
            "professional": "You are a professional assistant who maintains a formal tone and provides detailed responses.",
            "casual": "You are a casual, conversational assistant who communicates in a relaxed, friendly manner.",
            "creative": "You are a creative assistant who thinks outside the box and provides innovative solutions.",
            "educational": "You are an educational assistant who explains concepts clearly and encourages learning."
        }
        
        self.use_deepseek = False
        self.client = None
        
        if settings.openai_api_key:
            try:
                self.client = OpenAI(
                    api_key=settings.openai_api_key,
                    base_url="https://api.deepseek.com"
                )
                self.use_deepseek = True
                print("✅ Using DeepSeek AI")
            except Exception as e:
                print(f"⚠️ DeepSeek init error: {e}")
    
    async def generate_response(
        self,
        message: str,
        conversation_history: List[Dict],
        personality: str = "helpful",
        **kwargs
    ) -> Dict:
        if self.use_deepseek:
            return await self._generate_with_deepseek(message, conversation_history, personality)
        return {
            "success": False,
            "content": "AI service not configured. Please add a valid API key."
        }
    
    async def _generate_with_deepseek(
        self,
        message: str,
        conversation_history: List[Dict],
        personality: str = "helpful"
    ) -> Dict:
        try:
            system_prompt = self.personalities.get(personality, self.personalities["helpful"])
            
            messages = [
                {"role": "system", "content": system_prompt}
            ]
            
            # Add conversation history (last 5 messages)
            if conversation_history:
                for msg in conversation_history[-5:]:
                    role = "user" if msg.get("role") == "user" else "assistant"
                    messages.append({
                        "role": role,
                        "content": msg.get("content", "")
                    })
            
            messages.append({"role": "user", "content": message})
            
            response = self.client.chat.completions.create(
                model="deepseek-chat",
                messages=messages,
                temperature=0.7,
                max_tokens=500
            )
            
            return {
                "success": True,
                "content": response.choices[0].message.content,
                "model": "deepseek-chat"
            }
            
        except Exception as e:
            error_msg = str(e)
            print(f"❌ DeepSeek Error: {error_msg}")
            return {
                "success": False,
                "content": "I'm having trouble right now. Please try again in a moment.",
                "error": error_msg
            }

ai_service = AIService()