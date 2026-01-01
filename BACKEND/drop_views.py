import asyncio
import os
from dotenv import load_dotenv
from tortoise import Tortoise

# Load env vars
load_dotenv()

async def main():
    # Veritabanı bağlantısı (create_admin.py ile aynı mantık)
    db_url = (
        f"mysql://{os.getenv('DB_USER','root')}:"
        f"{os.getenv('DB_PASS','')}"
        f"@{os.getenv('DB_HOST','127.0.0.1')}:"
        f"{int(os.getenv('DB_PORT',3306))}/"
        f"{os.getenv('DB_NAME','event_management_system')}"
    )
        
    print(f"Connecting to database...")
    
    try:
        await Tortoise.init(
            db_url=db_url,
            modules={"models": ["models"]}
        )
        
        conn = Tortoise.get_connection("default")
        
        # Views to drop
        views = ["ActiveEventsWithParticipants", "UpcomingEvents", "UserFullProfile"]
        
        for view in views:
            print(f"Attempting to drop view: {view}")
            await conn.execute_query(f"DROP VIEW IF EXISTS {view}")
            print(f"✅ Dropped view: {view}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        await Tortoise.close_connections()

if __name__ == "__main__":
    asyncio.run(main())
