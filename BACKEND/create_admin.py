"""
İlk admin kullanıcısını oluşturmak için script
Kullanım: python create_admin.py
"""
import asyncio
import bcrypt
from dotenv import load_dotenv
import os

# .env dosyasını yükle
load_dotenv()

from tortoise import Tortoise
from models import User, UserProfile


async def create_admin():
    """İlk admin kullanıcısını oluştur"""
    
    # Veritabanı bağlantısı
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
        await Tortoise.generate_schemas()
    except:
        pass
    
    # Admin bilgileri
    admin_email = "campushub06@gmail.com"
    admin_password = "CampusHub06OZBZI"
    admin_name = "CampusHub Admin"
    
    # Kullanıcı zaten var mı kontrol et
    existing_admin = await User.get_or_none(email=admin_email)
    
    if existing_admin:
        print(f"⚠️  {admin_email} zaten mevcut!")
        
        # Şifreyi hash'le ve güncelle
        hashed_password = bcrypt.hashpw(admin_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        existing_admin.password = hashed_password
        existing_admin.is_admin = True
        existing_admin.role = "admin"
        await existing_admin.save()
        
        print(f"✅ Admin kullanıcısı güncellendi!")
        print(f"   Email: {admin_email}")
        print(f"   Şifre: {admin_password}")
        print(f"   Admin: Evet")
        
    else:
        # Şifreyi hash'le
        hashed_password = bcrypt.hashpw(admin_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Yeni admin kullanıcısı oluştur
        admin_user = await User.create(
            email=admin_email,
            password=hashed_password,
            is_admin=True,
            role="admin"
        )
        
        # Admin profili oluştur
        await UserProfile.create(
            user=admin_user,
            full_name=admin_name,
            bio="CampusHub Ankara Yöneticisi",
            department="Yönetim",
            grade="Admin",
            phone_number="",
            profile_photo="",
            cover_photo=""
        )
        
        print(f"\n✅ Admin kullanıcısı başarıyla oluşturuldu!")
        print(f"   Email: {admin_email}")
        print(f"   Şifre: {admin_password}")
        print(f"   Admin: Evet")
        print(f"\n🔐 Şifre güvenli şekilde hash'lendi ve veritabanına kaydedildi.")
    
    # Bağlantıyı kapat
    await Tortoise.close_connections()
    print("\n✅ İşlem tamamlandı!")


if __name__ == "__main__":
    asyncio.run(create_admin())
