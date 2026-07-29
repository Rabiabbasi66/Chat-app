from typing import Optional, List, Dict
import json
import random
from datetime import datetime

class AIService:
    def __init__(self):
        self.personalities = {
            "helpful": "You are a helpful assistant.",
            "professional": "You are a professional assistant.",
            "casual": "You are a casual assistant.",
            "creative": "You are a creative assistant.",
            "educational": "You are an educational assistant."
        }
        
        # ✅ MOCK AI - No API key needed!
        print("✅ Using Mock AI (No API key required!)")
    
    async def generate_response(
        self,
        message: str,
        conversation_history: List[Dict] = None,
        personality: str = "helpful",
        **kwargs
    ) -> Dict:
        """Generate a mock AI response - works without any API"""
        
        # Some smart responses
        responses = [
            f"That's a great question! Let me think about '{message}'...",
            f"Interesting! I'd say the best approach for '{message}' is to...",
            f"Thanks for asking about '{message}'. Here's what I think...",
            f"I understand you're curious about '{message}'. Let me explain...",
            f"Great topic! Regarding '{message}', I would suggest...",
            f"That's a really interesting point about '{message}'!",
            f"I appreciate your question about '{message}'. Here's my take...",
            f"Let me give you my thoughts on '{message}'...",
        ]
        
        # Random greeting based on time
        hour = datetime.now().hour
        if hour < 12:
            greeting = "Good morning!"
        elif hour < 17:
            greeting = "Good afternoon!"
        else:
            greeting = "Good evening!"
        
        # Pick a random response
        response_text = random.choice(responses)
        
        # Add personality flavor
        if personality == "helpful":
            response_text += " I'm here to help!"
        elif personality == "professional":
            response_text += " Let me provide a detailed analysis."
        elif personality == "casual":
            response_text += " Just my two cents!"
        elif personality == "creative":
            response_text += " Here's a creative perspective!"
        elif personality == "educational":
            response_text += " Let me explain this clearly."
        
        return {
            "success": True,
            "content": f"{greeting} {response_text}",
            "model": "mock-ai"
        }

ai_service = AIService()