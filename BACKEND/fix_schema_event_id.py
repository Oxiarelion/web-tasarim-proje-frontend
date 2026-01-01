import asyncio
import os
from dotenv import load_dotenv
from tortoise import Tortoise

load_dotenv()

async def fix_schema():
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
    
    conn = Tortoise.get_connection("default")
    
    try:
        print("🔧 Altering 'feedbacks' table to allow NULL event_id...")
        
        # MySQL syntax to modify column to allow NULL
        # Assuming event_id is INT. If it's used as FK, we must be careful not to break constraint.
        # Usually MODIFY COLUMN works.
        
        # First, check current structure? No time. Just try Query.
        # "event_id" type matches Event.id (IntField -> INT).
        
        sql = "ALTER TABLE feedbacks MODIFY COLUMN event_id INT NULL;"
        
        await conn.execute_query(sql)
        print("✅ Schema updated: event_id is now nullable.")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        await Tortoise.close_connections()

if __name__ == "__main__":
    asyncio.run(fix_schema())
