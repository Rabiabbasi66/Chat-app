from typing import Optional, List, Dict
import json
import traceback
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
        
        self.use_mistral = False
        self.client = None
        
        # ✅ DIRECT HARDCODE - NO ENV VARIABLE
        api_key = "01Nh2chSGRNsIP8tcdca1yMHBSTYUbRF"
        print(f"🔑 Using hardcoded API key: {api_key[:15]}...")
        
        try:
            self.client = OpenAI(
                api_key=api_key,
                base_url="https://api.mistral.ai/v1"
            )
            self.use_mistral = True
            print("✅ Using Mistral AI with hardcoded key")
        except Exception as e:
            print(f"⚠️ Mistral init error: {e}")
            print(traceback.format_exc())
    
    async def generate_response(
        self,
        message: str,
        conversation_history: List[Dict],
        personality: str = "helpful",
        **kwargs
    ) -> Dict:
        if self.use_mistral:
            return await self._generate_with_mistral(message, conversation_history, personality)
        return {
            "success": False,
            "content": "AI service not configured. Please add a valid API key."
        }
    
    async def _generate_with_mistral(
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
            
            if conversation_history:
                for msg in conversation_history[-5:]:
                    role = "user" if msg.get("role") == "user" else "assistant"
                    messages.append({
                        "role": role,
                        "content": msg.get("content", "")
                    })
            
            messages.append({"role": "user", "content": message})
            
            print(f"📤 Sending to Mistral: {message[:50]}...")
            
            response = self.client.chat.completions.create(
                model="mistral-small-latest",
                messages=messages,
                temperature=0.7,
                max_tokens=500
            )
            
            reply = response.choices[0].message.content
            print(f"📩 Mistral response: {reply[:50]}...")
            
            return {
                "success": True,
                "content": reply,
                "model": "mistral-small"
            }
            
        except Exception as e:
            error_msg = str(e)
            print(f"❌ Mistral Error: {error_msg}")
            print(traceback.format_exc())
            return {
                "success": False,
                "content": f"Error: {error_msg}",
                "error": error_msg
            }

ai_service = AIService()