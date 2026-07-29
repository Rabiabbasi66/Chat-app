from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from .config import settings
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class Database:
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None

database = Database()

def get_collection(name: str):
    """Get a MongoDB collection"""
    if database.db is None:
        raise Exception("Database not connected")
    return database.db[name]

async def connect_to_mongodb():
    """Connect to MongoDB Atlas and initialize indexes"""
    try:
        database.client = AsyncIOMotorClient(settings.mongodb_uri)
        database.db = database.client[settings.mongodb_db_name]
        
        # Test connection
        await database.client.admin.command('ping')
        print("✅ Connected to MongoDB Atlas")
        
        # Setup Indexes
        if database.db is not None:
            try:
                await database.db.users.create_index("email", unique=True)
                await database.db.messages.create_index([("chat_id", 1), ("created_at", -1)])
                await database.db.chat_sessions.create_index("user_id")
                await database.db.chat_sessions.create_index([("user_id", 1), ("updated_at", -1)])
                print("🚀 Database indexes initialized")
            except Exception as index_error:
                print(f"⚠️ Index initialization warning: {index_error}")
        
    except Exception as e:
        print(f"❌ MongoDB connection error: {e}")
        raise

async def close_mongodb_connection():
    """Close MongoDB connection"""
    if database.client:
        database.client.close()
        print("🔌 MongoDB connection closed")