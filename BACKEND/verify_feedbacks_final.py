import asyncio
import os
import json
from dotenv import load_dotenv
from tortoise import Tortoise
from models import Feedback, User, Event

# Load .env
load_dotenv()

async def verify():
    print("🌍 Connecting to AWS MySQL...")
    
    db_url = (
        f"mysql://{os.getenv('DB_USER','root')}:"
        f"{os.getenv('DB_PASS','')}"
        f"@{os.getenv('DB_HOST','127.0.0.1')}:"
        f"{int(os.getenv('DB_PORT',3306))}/"
        f"{os.getenv('DB_NAME','event_management_system')}"
    )
    
    await Tortoise.init(
        db_url=db_url,
        modules={"models": ["models"]},
        timezone="UTC",
        use_tz=True,
    )
    
    try:
        print("🔍 Querying Feedbacks using ORM...")
        feedbacks = await Feedback.all().prefetch_related("user", "event").order_by("-created_at")
        
        print(f"📊 Found {len(feedbacks)} objects.")
        
        result = []
        for f in feedbacks:
            # Simulate app.py serialization logic
            item = {
                "feedback_id": f.feedback_id,
                "user_email": f.user.email if f.user else "Anonim",
                "type": f.type,
                "title": f.title,
                "message": f.message,
                "status": f.status
            }
            print(f"Item: {item}")
            result.append(item)
            
        print("✅ Simulation complete.")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        await Tortoise.close_connections()

if __name__ == "__main__":
    asyncio.run(verify())
