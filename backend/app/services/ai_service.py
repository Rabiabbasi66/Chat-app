from typing import Optional, List, Dict
import aiohttp
import json
import google.generativeai as genai
from ..config import settings

class AIService:
    def __init__(self):
        self.base_url = "https://api.openai.com/v1"
        
        self.personalities = {
            "helpful": "You are a helpful, friendly assistant who provides clear and accurate information.",
            "professional": "You are a professional assistant who maintains a formal tone and provides detailed responses.",
            "casual": "You are a casual, conversational assistant who communicates in a relaxed, friendly manner.",
            "creative": "You are a creative assistant who thinks outside the box and provides innovative solutions.",
            "educational": "You are an educational assistant who explains concepts clearly and encourages learning."
        }
        
        # Initialize Gemini
        self.use_gemini = False
        self.gemini_model = None
        
        if settings.openai_api_key and settings.openai_api_key.startswith("AIza"):
            try:
                genai.configure(api_key=settings.openai_api_key)
                # ✅ FIXED: Use available model
                self.gemini_model = genai.GenerativeModel("gemini-2.0-flash-exp")
                self.use_gemini = True
                print("✅ Using Google Gemini AI (gemini-2.0-flash-exp)")
            except Exception as e:
                print(f"⚠️ Gemini init error: {e}")
    
    @property
    def api_key(self):
        return settings.openai_api_key

    async def generate_response(
        self,
        message: str,
        conversation_history: List[Dict],
        personality: str = "helpful",
        **kwargs
    ) -> Dict:
        if self.use_gemini:
            return await self._generate_with_gemini(message, conversation_history, personality)
        return await self._generate_with_openai(message, conversation_history, personality)
    
    async def _generate_with_gemini(
        self,
        message: str,
        conversation_history: List[Dict],
        personality: str = "helpful"
    ) -> Dict:
        try:
            system_prompt = self.personalities.get(personality, self.personalities["helpful"])
            
            context = ""
            if conversation_history:
                for msg in conversation_history[-5:]:
                    role = "User" if msg.get("role") == "user" else "Assistant"
                    context += f"{role}: {msg.get('content', '')}\n"
            
            full_prompt = f"""{system_prompt}

Previous conversation:
{context}

User: {message}
Assistant:"""
            
            response = self.gemini_model.generate_content(full_prompt)
            
            return {
                "success": True,
                "content": response.text.strip(),
                "model": "gemini-2.0-flash-exp",
                "usage": {}
            }
            
        except Exception as e:
            error_msg = str(e)
            if "API key" in error_msg or "key" in error_msg:
                return {
                    "success": False,
                    "content": "❌ Invalid API key. Please check your Google Gemini API key.",
                    "error": "Invalid API key"
                }
            return {
                "success": False,
                "content": f"Error generating response: {error_msg}",
                "error": error_msg
            }
    
    async def _generate_with_openai(
        self,
        message: str,
        conversation_history: List[Dict],
        personality: str = "helpful"
    ) -> Dict:
        # Your existing OpenAI code here (keep as is)
        pass
    
    async def generate_streaming_response(
        self,
        message: str,
        conversation_history: List[Dict],
        personality: str = "helpful"
    ):
        # Your existing streaming code here (keep as is)
        pass
    
    def validate_content(self, content: str) -> bool:
        return bool(content and content.strip())

ai_service = AIService()