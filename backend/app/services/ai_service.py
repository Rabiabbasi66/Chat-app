import google.generativeai as genai
from typing import List, Dict, Any
from ..config import settings

class AIService:
    def __init__(self):
        self.use_gemini = False
        self.gemini_model = None
        
        api_key = settings.openai_api_key
        print(f"🔑 API Key loaded: {api_key[:15] if api_key else 'None'}...")
        
        if api_key and api_key.startswith("AIza"):
            try:
                genai.configure(api_key=api_key)
                self.gemini_model = genai.GenerativeModel("gemini-1.5-flash")
                self.use_gemini = True
                print("✅ Using Google Gemini AI")
            except Exception as e:
                print(f"⚠️ Gemini init error: {e}")
        else:
            print("❌ Invalid or missing API key")

    async def generate_response(
        self,
        message: str,
        conversation_history: List[Dict] = None,
        personality: str = "helpful",
        **kwargs
    ) -> Dict[str, Any]:
        """Generate AI response using Google Gemini"""
        
        # ✅ Always return a dictionary
        if not self.use_gemini:
            return {
                "success": False,
                "content": "AI service not configured",
                "error": "AI_NOT_CONFIGURED"
            }
        
        try:
            # Build prompt
            system_prompt = "You are a helpful AI assistant."
            if personality == "professional":
                system_prompt = "You are a professional, formal assistant."
            elif personality == "casual":
                system_prompt = "You are a casual, friendly assistant."
            elif personality == "creative":
                system_prompt = "You are a creative, imaginative assistant."
            elif personality == "educational":
                system_prompt = "You are an educational, clear assistant."
            
            full_prompt = f"{system_prompt}\n\nUser: {message}\nAssistant:"
            
            # Generate response
            response = self.gemini_model.generate_content(full_prompt)
            
            return {
                "success": True,
                "content": response.text.strip(),
                "model": "gemini-1.5-flash"
            }
            
        except Exception as e:
            print(f"❌ AI Error: {e}")
            return {
                "success": False,
                "content": f"Error: {str(e)}",
                "error": str(e)
            }

ai_service = AIService()