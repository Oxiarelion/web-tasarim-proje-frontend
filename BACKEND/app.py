from dotenv import load_dotenv
import os
import base64  # 🔥 RESİM İŞLEMLERİ İÇİN BU GEREKLİ
import bcrypt  # 🔥 ŞİFRE HASH'LEME İÇİN

# 1. .env DOSYASINI YÜKLE
load_dotenv()

from sanic import Sanic
from sanic.response import json, text
from sanic_cors import CORS
import secrets, smtplib, asyncio
import jwt
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from functools import partial, wraps
from tortoise import Tortoise, connections
from models import (
    User, UserProfile, Event, FavouriteEvent, Comment, Feedback, University
)
import pytz

app = Sanic("Campushub06")
CORS(app)

# --- GİZLİ ANAHTAR ---
SECRET_KEY = os.getenv("SECRET_KEY", "bu_cok_gizli_ve_uzun_bir_sifredir_kimse_bilmemeli_12345")

# 🔥 İSTANBUL TIMEZONE (UTC+3) 🔥
ISTANBUL_TZ = pytz.timezone('Europe/Istanbul')

# 🔥 HELPER FUNCTION: Datetime'ı İstanbul Saatine Çevir 🔥
def to_istanbul_tz(dt):
    """Datetime'ı Istanbul timezone'a çevir
    
        Tortoise ORM timezone='UTC' ve use_tz=True ile çalışıyor, 
        bu yüzden datetime'lar UTC timezone-aware olarak dönüyor.
    """
    if dt is None:
        return None
    
    # Tortoise ORM UTC aware datetime döndürüyor, Istanbul'a çevir
    if dt.tzinfo is None:
        # Naive datetime ise UTC olarak kabul et (güvenlik için)
        dt = dt.replace(tzinfo=timezone.utc)
    
    return dt.astimezone(ISTANBUL_TZ)

# 🔥 HELPER FUNCTION: İstanbul Saatinde Şu Anki Zaman 🔥
def now_istanbul():
    """İstanbul timezone'ında şu anki zamanı döndür (UTC+3)"""
    return datetime.now(ISTANBUL_TZ)

def to_istanbul_datetime(dt_str):
    """ISO string'i Istanbul timezone datetime'a çevir
    Frontend lokal (Istanbul) saati gönderiyor, biz bunu timezone-aware yapıyoruz
    """
    if not dt_str:
        return None
    
    # ISO formatındaki string'i parse et
    dt = datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
    
    # Eğer timezone bilgisi yoksa (naive), Istanbul timezone'u olarak kabul et
    if dt.tzinfo is None:
        dt = ISTANBUL_TZ.localize(dt)
    else:
        # Timezone varsa, Istanbul'a çevir
        dt = dt.astimezone(ISTANBUL_TZ)
    
    return dt

# 🔥 BASİT RAM ÖNBELLEĞİ (CACHE) 🔥
# Kullanıcı profillerini burada tutacağız: {user_id: {profil_verisi}}
PROFILE_CACHE = {}

# -------------------------------------------------
# TOKEN KONTROL (Middleware)
# -------------------------------------------------
def authorized():
    def decorator(f):
        @wraps(f)
        async def decorated_function(request, *args, **kwargs):
            token = None
            if "Authorization" in request.headers:
                try:
                    token = request.headers["Authorization"].split(" ")[1]
                except IndexError:
                    return json({"basarili": False, "mesaj": "Token formatı hatalı."}, status=401)
            
            if not token:
                return json({"basarili": False, "mesaj": "Token bulunamadı. Giriş yapmalısınız."}, status=401)

            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
                request.ctx.user_id = payload["user_id"]
            except jwt.ExpiredSignatureError:
                return json({"basarili": False, "mesaj": "Oturum süresi doldu. Tekrar giriş yapın."}, status=401)
            except jwt.InvalidTokenError:
                return json({"basarili": False, "mesaj": "Geçersiz token."}, status=401)

            return await f(request, *args, **kwargs)
        return decorated_function
    return decorator


# -------------------------------------------------
# ADMIN KONTROL (Middleware)
# -------------------------------------------------
def admin_required():
    """Sadece admin kullanıcıların erişebileceği endpoint'ler için"""
    def decorator(f):
        @wraps(f)
        async def decorated_function(request, *args, **kwargs):
            print(f"🔐 AUTH CHECK for {request.path}")
            # Önce token kontrolü yap
            token = None
            if "Authorization" in request.headers:
                try:
                    token = request.headers["Authorization"].split(" ")[1]
                except IndexError:
                    print("🔐 Token format error")
                    return json({"basarili": False, "mesaj": "Token formatı hatalı."}, status=401)
            
            if not token:
                print("🔐 No token found")
                return json({"basarili": False, "mesaj": "Token bulunamadı. Giriş yapmalısınız."}, status=401)

            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
                user_id = payload["user_id"]
                request.ctx.user_id = user_id
                print(f"🔐 Token decoded, user_id: {user_id}")
                
                # Kullanıcının admin olup olmadığını kontrol et
                user = await User.get_or_none(user_id=user_id)
                if not user or not user.is_admin:
                    print(f"🔐 User {user_id} NOT ADMIN")
                    return json({"basarili": False, "mesaj": "Bu işlem için yönetici yetkisi gerekiyor."}, status=403)
                
                print(f"🔐 User {user_id} authorized")
                    
            except jwt.ExpiredSignatureError:
                print("🔐 Token expired")
                return json({"basarili": False, "mesaj": "Oturum süresi doldu. Tekrar giriş yapın."}, status=401)
            except jwt.InvalidTokenError:
                print("🔐 Token invalid")
                return json({"basarili": False, "mesaj": "Geçersiz token."}, status=401)
            except Exception as e:
                print(f"🔐 Auth error: {e}")
                return json({"basarili": False, "mesaj": str(e)}, status=500)

            return await f(request, *args, **kwargs)
        return decorated_function
    return decorator

# -------------------------------------------------
# ORM BAĞLANTISI (.env DOSYASINDAN OKUR)
# -------------------------------------------------
@app.listener("before_server_start")
async def init_orm(app, loop):
    print(f"🌍 Bağlanılan Veritabanı Hostu: {os.getenv('DB_HOST')}")
    
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
    print("✅ Tortoise ORM hazır")

@app.listener("after_server_stop")
async def close_orm(app, loop):
    await Tortoise.close_connections()
    print("🔻 ORM bağlantıları kapandı")


# -------------------------------------------------
# Mail helper
# -------------------------------------------------
def send_email_sync(email, reset_link):
    import sys
    try:
        print(f"📧 Gmail User: {os.getenv('GMAIL_USER')}", flush=True, file=sys.stderr)
        print(f"📧 Email To: {email}", flush=True, file=sys.stderr)
        
        msg = EmailMessage()
        msg["Subject"] = "CampusHub Ankara - Şifre Sıfırlama"
        msg["From"] = os.getenv("GMAIL_USER")
        msg["To"] = email
        msg.set_content(
            f"Merhaba,\n\nŞifreni sıfırlamak için: {reset_link}\n\nCampusHub Ekibi"
        )
        print("📧 Email message created", flush=True, file=sys.stderr)

        print("📧 Connecting to SMTP...", flush=True, file=sys.stderr)
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
            print("📧 Connected to SMTP", flush=True, file=sys.stderr)
            print(f"📧 Logging in with user: {os.getenv('GMAIL_USER')}", flush=True, file=sys.stderr)
            smtp.login(os.getenv("GMAIL_USER"), os.getenv("GMAIL_PASS"))
            print("📧 Login successful", flush=True, file=sys.stderr)
            smtp.send_message(msg)
            print("📧 Message sent", flush=True, file=sys.stderr)
        
        print("✅ Email gönderildi!", flush=True, file=sys.stderr)
        return True
    except Exception as e:
        import traceback
        print(f"❌ Email Gönderme Hatası: {e}", flush=True, file=sys.stderr)
        print(f"❌ Full Error: {traceback.format_exc()}", flush=True, file=sys.stderr)
        return False


# -------------------------------------------------
# SSS Verileri
# -------------------------------------------------
FAQ_ITEMS = [
    { "id": 1, "question": "CampusHub Ankara nedir?", "answer": "CampusHub Ankara, Ankara’daki üniversitelerde gerçekleşen etkinlikleri tek bir platformda toplayan öğrenci odaklı bir etkinlik keşif uygulamasıdır." },
    { "id": 2, "question": "Etkinlikleri nereden buluyorsunuz?", "answer": "Etkinlikler üniversitelerin resmi web siteleri, kulüp sayfaları ve sosyal medya hesapları üzerinden toplanarak listelenmektedir." },
    { "id": 3, "question": "Bir etkinliği takvime nasıl eklerim?", "answer": "Anasayfada bulunan 'Favorilere Ekle' butonuna tıklayarak etkinliği kişisel takviminize ekleyebilirsiniz." },
    { "id": 4, "question": "CampusHub Ankara’ya üye olmam gerekiyor mu?", "answer": "Evet , diğer insanlarla etkileşime girebilmek için üye olmalısınız." },
    { "id": 5, "question": "Üyelik ücretli mi?", "answer": "Hayır. CampusHub Ankara tamamen ücretsiz bir platformdur." },
    { "id": 6, "question": "Yanlış listelenen bir etkinliği nasıl bildiririm?", "answer": "İstek ve Şikayet bölümünden bize bildirebilirsiniz." },
    { "id": 7, "question": "Etkinlikler sadece Ankara için mi?", "answer": "Şu an sadece Ankara için hizmet veriyoruz. İleride diğer şehirleri de eklemeyi planlıyoruz." },
    { "id": 8, "question": "Kendi kulübümün etkinliğini nasıl ekleyebilirim?", "answer": "Yakında kulüpler için 'Organizatör Paneli' eklenecek. Şimdilik istek ve şikayet bölümünden veya campushub06@gmail.com adresimizden bize ulaşabilirsiniz" },
    { "id": 9, "question": "Verilerimi nasıl saklıyorsunuz?", "answer": "Kullanıcı verileri güvenli sunucularda ve KVKK’ya uygun şekilde saklanmaktadır." },
    { "id": 10, "question": "Mobil uygulamanız var mı?", "answer": "Şu güncel web sitemiz var. İleride Android ve iOS uygulamaları da yayınlamayı planlıyoruz." },
]


# -------------------------------------------------
# Ana Sayfa
# -------------------------------------------------
@app.get("/")
async def home(request):
    return text("CampusHub backend çalışıyor 🚀")


# -------------------------------------------------
# Kayıt Ol
# -------------------------------------------------
@app.post("/api/kayit-ol")
async def kayit_ol(request):
    data = request.json or {}
    email = (data.get("email") or "").strip().lower()
    full_name = (data.get("name") or "").strip()
    password = data.get("password") or ""

    if not email or not password or not full_name:
        return json({"basarili": False, "mesaj": "Tüm alanları doldurmanız gerekiyor."}, status=400)

    if len(password) < 6:
        return json({"basarili": False, "mesaj": "Şifre en az 6 karakter olmalıdır."}, status=400)

    existing = await User.get_or_none(email=email)
    if existing:
        return json({"basarili": False, "mesaj": "Bu e-posta zaten kayıtlı."}, status=409)

    # 🔥 Şifreyi hash'le
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    user = await User.create(email=email, password=hashed_password)
    await UserProfile.create(
        user=user, 
        full_name=full_name,
        bio="",
        department="",
        grade="",
        phone_number="",
        profile_photo="",
        cover_photo=""
    )

    return json({"basarili": True, "mesaj": "Hesabınız başarıyla oluşturuldu!"}, status=201)


# -------------------------------------------------
# Giriş
# -------------------------------------------------
@app.post("/api/giris")
async def giris(request):
    data = request.json or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return json({"basarili": False, "mesaj": "E-posta ve şifre gerekli."}, status=400)

    user = await User.get_or_none(email=email)
    if not user:
        return json({"basarili": False, "mesaj": "Bu e-posta ile kayıt bulunamadı."}, status=404)

    # 🔥 Şifre kontrolü - hem hash'li hem plain text şifreleri destekle
    password_valid = False
    
    try:
        # Önce hash'lenmiş şifre olarak kontrol et
        if bcrypt.checkpw(password.encode('utf-8'), user.password.encode('utf-8')):
            password_valid = True
    except (ValueError, AttributeError):
        # Hash'lenmiş değilse (eski kullanıcı), plain text olarak kontrol et
        if user.password == password:
            password_valid = True
            # 🔥 Otomatik migrate: Plain text şifreyi hash'le
            hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            user.password = hashed_password
            await user.save(update_fields=["password"])
            print(f"✅ Kullanıcı {email} şifresi otomatik olarak hash'lendi")
    
    if not password_valid:
        return json({"basarili": False, "mesaj": "Şifre yanlış."}, status=401)

    # 🔥 BAN KONTROLÜ
    if user.is_banned:
        # Ban süresi kontrolü
        if user.ban_until:
            # Ban süresi geçmiş mi?
            now = now_istanbul()
            ban_until_ist = to_istanbul_tz(user.ban_until)
            
            if now >= ban_until_ist:
                # Ban süresi dolmuş, otomatik kaldır
                user.is_banned = False
                user.ban_reason = None
                user.ban_until = None
                await user.save(update_fields=["is_banned", "ban_reason", "ban_until"])
                print(f"✅ Kullanıcı {email} banı otomatik olarak kaldırıldı (süre doldu)")
            else:
                # Hala banlı
                kalan_sure = ban_until_ist - now
                kalan_gun = kalan_sure.days
                kalan_saat = kalan_sure.seconds // 3600
                kalan_dakika = (kalan_sure.seconds % 3600) // 60
                return json({
                    "basarili": False, 
                    "mesaj": f"Hesabınız yasaklandı. Sebep: {user.ban_reason or 'Belirtilmemiş'}. Kalan süre: {kalan_gun} gün {kalan_saat} saat {kalan_dakika} dakika"
                }, status=403)
        else:
            # Kalıcı ban
            return json({
                "basarili": False, 
                "mesaj": f"Hesabınız kalıcı olarak yasaklandı. Sebep: {user.ban_reason or 'Belirtilmemiş'}"
            }, status=403)


    # Token oluşturma
    expiration_time = now_istanbul() + timedelta(hours=24)
    token_payload = {
        "user_id": user.user_id,
        "email": user.email,
        "is_admin": user.is_admin,  # 🔥 Token'a admin bilgisi ekle
        "exp": expiration_time
    }
    
    token = jwt.encode(token_payload, SECRET_KEY, algorithm="HS256")

    user.last_login = now_istanbul()
    await user.save(update_fields=["last_login"])

    return json({
        "basarili": True, 
        "mesaj": "Hoş geldin!",
        "token": token,
        "user": {"email": user.email, "role": user.role, "is_admin": user.is_admin}
    }, status=200)


# -------------------------------------------------
# Şifremi Unuttum
# -------------------------------------------------
RESET_TOKENS = {}

@app.post("/api/sifremi-unuttum")
async def sifremi_unuttum(request):
    data = request.json or {}
    email = (data.get("email") or "").strip().lower()

    if not email:
        return json({"basarili": False, "mesaj": "E-posta girmelisiniz."}, status=400)

    user = await User.get_or_none(email=email)
    if not user:
        return json({"basarili": False, "mesaj": "Bu e-posta sistemde kayıtlı değil."}, status=404)

    token = secrets.token_urlsafe(32)
    expires_at = now_istanbul() + timedelta(hours=1)
    RESET_TOKENS[token] = {"email": email, "expires_at": expires_at}

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    reset_link = f"{frontend_url}/sifre-sifirla?token={token}"

    try:
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, partial(send_email_sync, email, reset_link))
        return json({"basarili": True, "mesaj": "Şifre sıfırlama bağlantısı gönderildi."})
    except Exception as e:
        print("Mail gönderim hatası:", e)
        return json({"basarili": False, "mesaj": "E-posta gönderilirken hata oluştu."}, status=500)


# -------------------------------------------------
# Şifre Sıfırla
# -------------------------------------------------
@app.post("/api/sifre-sifirla")
async def sifre_sifirla(request):
    data = request.json or {}
    token = data.get("token", "")
    new_password = data.get("password", "")

    entry = RESET_TOKENS.get(token)
    now_ist = now_istanbul()

    if not entry or entry["expires_at"] < now_ist:
        return json({"basarili": False, "mesaj": "Bağlantı geçersiz veya süresi dolmuş."}, status=400)

    if len(new_password) < 6:
        return json({"basarili": False, "mesaj": "Şifre en az 6 karakter olmalıdır."}, status=400)

    email = entry["email"]
    user = await User.get_or_none(email=email)
    if not user:
        return json({"basarili": False, "mesaj": "Kullanıcı bulunamadı."}, status=404)

    # 🔥 Yeni şifreyi hash'le
    hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    user.password = hashed_password
    await user.save(update_fields=["password"])

    del RESET_TOKENS[token]

    return json({"basarili": True, "mesaj": "Şifreniz başarıyla sıfırlandı."}, status=200)


# -------------------------------------------------
# Etkinlikler
# -------------------------------------------------
@app.get("/api/etkinlikler")
@authorized()
async def etkinlikler(request):
    university_name = request.args.get("university")
    date_str = request.args.get("date")
    status = request.args.get("status")

    query = """
        SELECT 
            e.event_id AS id,
            e.title,
            e.description,
            e.location,
            uni.name AS university,
            e.start_datetime AS start_datetime,
            e.end_datetime AS end_datetime
        FROM events e
        LEFT JOIN universities uni ON e.university_id = uni.university_id
        WHERE e.is_active = TRUE
    """
    params = []

    if university_name:
        query += " AND uni.name = %s"
        params.append(university_name)

    if date_str:
        query += " AND DATE(e.start_datetime) = %s"
        params.append(date_str)

    if status == "guncel":
        # Şu anki zamanı al (UTC veya veritabanı ile uyumlu olmalı)
        now = datetime.utcnow()
        query += " AND e.end_datetime >= %s"
        params.append(now)

    query += " ORDER BY e.start_datetime DESC"

    try:
        conn = connections.get("default")
        rows = await conn.execute_query_dict(query, params)
        
        etkinlikler_list = []
        for r in rows:
            sd = r["start_datetime"]
            ed = r["end_datetime"]
            etkinlikler_list.append({
                "id": r["id"],
                "title": r["title"],
                "university": r["university"],
                "location": r["location"],
                "description": r["description"],
                "date": sd.strftime("%Y-%m-%d") if sd else None,
                "time": sd.strftime("%H:%M") if sd else None,
                "end_datetime": ed.isoformat() if ed else None,  # 🔥 Bitiş zamanı eklendi
            })

        return json({"basarili": True, "adet": len(etkinlikler_list), "etkinlikler": etkinlikler_list})
        
    except Exception as e:
        print(f"❌ HATA OLUŞTU: {str(e)}")
        return json({"basarili": False, "hata": str(e)}, status=500)



# -------------------------------------------------
# Takvime Ekle (ÇOKLU SİLME)
# -------------------------------------------------
@app.post("/api/takvim/ekle")
@authorized()
async def takvime_ekle(request):
    try:
        data = request.json or {}
        email = (data.get("email") or "").strip().lower()
        event_id = data.get("event_id")

        if not email or not event_id:
            return json({"basarili": False, "mesaj": "Email ve event_id gerekli."}, status=400)

        user = await User.get_or_none(email=email)
        if not user:
            return json({"basarili": False, "mesaj": "Kullanıcı bulunamadı."}, status=404)

        event = await Event.get_or_none(event_id=event_id)
        if not event:
            return json({"basarili": False, "mesaj": "Etkinlik bulunamadı."}, status=404)

        existing_favs = await FavouriteEvent.filter(user=user, event=event).all()

        if existing_favs:
            await FavouriteEvent.filter(user=user, event=event).delete()
            return json({"basarili": True, "mesaj": "Favorilerden çıkarıldı.", "durum": "cikarildi"}, status=200)
        else:
            await FavouriteEvent.create(user=user, event=event)
            return json({"basarili": True, "mesaj": "Favorilere eklendi.", "durum": "eklendi"}, status=200)
    
    except Exception as e:
        print(f"❌ TAKVİM EKLEME HATASI: {str(e)}")
        return json({"basarili": False, "mesaj": f"Sunucu hatası: {str(e)}"}, status=500)


# -------------------------------------------------
# Kullanıcının takvimi
# -------------------------------------------------
@app.get("/api/takvim")
@authorized()
async def takvim(request):
    user_id = request.ctx.user_id 
    
    user = await User.get_or_none(user_id=user_id)
    if not user:
        return json({"basarili": False, "mesaj": "Kullanıcı bulunamadı."}, status=404)

    query = """
        SELECT
            e.event_id AS id,
            e.title,
            e.description,
            e.location,
            e.image_url,
            uni.name AS university,
            e.start_datetime AS start_datetime,
            e.end_datetime AS end_datetime
        FROM favourite_events f
        JOIN events e ON f.event_id = e.event_id
        LEFT JOIN universities uni ON e.university_id = uni.university_id
        WHERE f.user_id = %s
        ORDER BY e.start_datetime ASC
    """

    conn = connections.get("default")
    rows = await conn.execute_query_dict(query, [user.user_id])

    user_events = []
    for r in rows:
        sd = r["start_datetime"]
        user_events.append({
            "id": r["id"],
            "title": r["title"],
            "university": r["university"],
            "location": r["location"],
            "description": r["description"],
            "image_url": r["image_url"],  # 🔥 Etkinlik fotoğrafı
            "date": sd.strftime("%Y-%m-%d") if sd else None,
            "time": sd.strftime("%H:%M") if sd else None,
        })

    return json({"basarili": True, "adet": len(user_events), "takvim": user_events})


# -------------------------------------------------
# SSS (FAQ)
# -------------------------------------------------
@app.get("/api/faq")
async def get_all_faqs(request):
    return json({"faqs": FAQ_ITEMS}, status=200)



# -------------------------------------------------
# Feedback (ORM)
# -------------------------------------------------
@app.post("/api/feedback")
@authorized()
async def create_feedback(request):
    try:
        data = request.json or {}
        user_id = request.ctx.user_id

        event_id = data.get("event_id")  # Artık opsiyonel
        fb_type = (data.get("type") or "").strip() or None
        title = (data.get("title") or "").strip() or None
        message = (data.get("message") or "").strip()

        if not message:
            return json({"basarili": False, "mesaj": "Mesaj alanı zorunludur."}, status=400)

        user = await User.get_or_none(user_id=user_id)
        if not user:
            return json({"basarili": False, "mesaj": "Kullanıcı bulunamadı."}, status=404)

        # Etkinlik kontrolü (sadece event_id varsa)
        event = None
        if event_id:
            event = await Event.get_or_none(event_id=event_id)
            if not event:
                return json({"basarili": False, "mesaj": "Etkinlik bulunamadı."}, status=404)

        fb = await Feedback.create(
            user=user,
            event=event,  # None olabilir (genel feedback için)
            type=fb_type,
            title=title,
            message=message,
            status="pending"
        )

        return json({"basarili": True, "mesaj": "Geri bildiriminiz alındı. Teşekkür ederiz.", "feedback_id": fb.feedback_id}, status=201)
    
    except Exception as e:
        print(f"❌ Feedback Hatası: {str(e)}")
        import traceback
        traceback.print_exc()
        return json({"basarili": False, "mesaj": f"Sunucu hatası: {str(e)}"}, status=500)







# -------------------------------------------------
# UNİVERSİTELER
# -------------------------------------------------
@app.get("/api/universities")
async def get_universities(request):
    """Tüm üniversiteleri getir (public endpoint)"""
    try:
        universities = await University.all().order_by("name").values(
            "university_id",
            "name",
            "logo_url"
        )
        return json({
            "basarili": True, 
            "adet": len(universities), 
            "universities": universities
        }, status=200)
    except Exception as e:
        print(f"❌ Üniversiteler getirme hatası: {str(e)}")
        return json({
            "basarili": False, 
            "mesaj": f"Sunucu hatası: {str(e)}"
        }, status=500)


# -------------------------------------------------
# 👤 PROFİL İŞLEMLERİ (CACHE EKLENDİ)
# -------------------------------------------------

# 1. Profil Bilgilerini Getir (CACHE KULLANIYOR)
@app.get("/api/profile")
@authorized()
async def get_profile(request):
    try:
        user_id = request.ctx.user_id
        
        # 🔥 ÖNCE RAM'DEKİ CACHE'E BAK
        if user_id in PROFILE_CACHE:
            print(f"⚡ Cache'den getirildi: {user_id}")
            return json(PROFILE_CACHE[user_id])

        # Kullanıcıyı ve profilini çek
        user = await User.get_or_none(user_id=user_id).prefetch_related("profile")
        
        if not user:
            return json({"basarili": False, "mesaj": "Kullanıcı bulunamadı."}, status=404)

        if not user.profile:
            await UserProfile.create(user=user, full_name="", bio="", profile_photo="", cover_photo="")
            user = await User.get_or_none(user_id=user_id).prefetch_related("profile")

        response_data = {
            "basarili": True,
            "profile": {
                "email": user.email,
                "full_name": user.profile.full_name or "",
                "bio": user.profile.bio or "",
                "profile_photo": user.profile.profile_photo or "",
                "cover_photo": user.profile.cover_photo or "",
                "role": user.role,
                "department": user.profile.department or "", 
                "grade": user.profile.grade or "",
                "phone_number": user.profile.phone_number or ""
            }
        }
        
        # 🔥 VERİTABANINDAN ALDIKTAN SONRA CACHE'E KAYDET
        PROFILE_CACHE[user_id] = response_data
        print(f"💾 Cache'e kaydedildi: {user_id}")
        
        return json(response_data)
        
    except Exception as e:
        print(f"Profil Getirme Hatası: {e}")
        return json({"basarili": False, "mesaj": str(e)}, status=500)


# 2. Profil Bilgilerini Güncelle (CACHE TEMİZLER)
@app.put("/api/profile")
@authorized()
async def update_profile(request):
    try:
        user_id = request.ctx.user_id
        data = request.json or {}

        user = await User.get_or_none(user_id=user_id).prefetch_related("profile")
        if not user:
            return json({"basarili": False, "mesaj": "Kullanıcı bulunamadı."}, status=404)

        new_name = data.get("full_name")
        new_bio = data.get("bio")
        new_dept = data.get("department")
        new_grade = data.get("grade")
        new_phone = data.get("phone_number")
        new_photo = data.get("profile_photo")
        new_cover = data.get("cover_photo")

        if user.profile:
            if new_name is not None: user.profile.full_name = new_name
            if new_bio is not None: user.profile.bio = new_bio
            if new_dept is not None: user.profile.department = new_dept
            if new_grade is not None: user.profile.grade = new_grade
            if new_phone is not None: user.profile.phone_number = new_phone
            if new_photo is not None: user.profile.profile_photo = new_photo
            if new_cover is not None: user.profile.cover_photo = new_cover
            
            await user.profile.save()
        else:
            await UserProfile.create(
                user=user,
                full_name=new_name or "",
                bio=new_bio or "",
                department=new_dept or "",
                grade=new_grade or "",
                phone_number=new_phone or "",
                profile_photo=new_photo or "",
                cover_photo=new_cover or ""
            )

        # 🔥 PROFİL GÜNCELLENDİĞİ İÇİN CACHE'İ SİL
        # Böylece bir sonraki istekte veritabanından taze veri çekilecek
        if user_id in PROFILE_CACHE:
            del PROFILE_CACHE[user_id]
            print(f"🗑️ Cache temizlendi: {user_id}")

        return json({"basarili": True, "mesaj": "Profil başarıyla güncellendi."})

    except Exception as e:
        print(f"Profil Güncelleme Hatası: {e}")
        return json({"basarili": False, "mesaj": str(e)}, status=500)

# 🔥 3. FOTOĞRAF GÜNCELLEME (HEM KAPAK HEM PROFİL) 🔥
@app.post("/api/profil/foto-guncelle")
@authorized()
async def foto_guncelle(request):
    try:
        user_id = request.ctx.user_id
        print(f"\n🔥 === foto_guncelle başladı === 🔥")
        print(f"🔑 User ID: {user_id}")
        print(f"� request.files: {list(request.files.keys()) if request.files else 'EMPTY'}")
        
        # Dosya kontrolü
        if not request.files or "file" not in request.files:
            print("❌ Dosya bulunamadı!")
            return json({"basarili": False, "mesaj": "Dosya seçilmedi."}, status=400)

        file = request.files["file"][0]
        print(f"✅ Dosya alındı: name={file.name}, size={len(file.body)} bytes")
        
        # 🔥 TÜR KONTROLÜ - Query parameter'dan oku
        foto_type = request.args.get("type", "avatar")
        print(f"📸 Foto Tipi (URL param): {foto_type}")

        # Dosyayı Base64'e çeviriyoruz
        base64_img = "data:image/jpeg;base64," + base64.b64encode(file.body).decode('utf-8')
        print(f"✅ Base64 conversion: {len(base64_img)} bytes")

        # Kullanıcı ve profil kontrolü
        user = await User.get_or_none(user_id=user_id).prefetch_related("profile")
        if not user:
            print(f"❌ User bulunamadı: {user_id}")
            return json({"basarili": False, "mesaj": "Kullanıcı bulunamadı."}, status=404)
        if not user.profile:
            print(f"❌ Profile bulunamadı: user={user.id}")
            return json({"basarili": False, "mesaj": "Profil bulunamadı."}, status=404)

        # Fotoğrafı güncelle
        if foto_type == "cover":
            user.profile.cover_photo = base64_img
            mesaj = "Kapak fotoğrafı güncellendi."
            print("✅ Kapak fotoğrafı ayarlandı")
        else:
            user.profile.profile_photo = base64_img
            mesaj = "Profil fotoğrafı güncellendi."
            print("✅ Profil fotoğrafı ayarlandı")
            
        # Veritabanına kaydet
        await user.profile.save()
        print(f"✅ Veritabanına kaydedildi!")

        # Cache'i güncelle (veya temizle)
        if user_id in PROFILE_CACHE:
            # Cache var ise direkt update et - daha hızlı
            PROFILE_CACHE[user_id]["profile"]["profile_photo"] = base64_img if foto_type == "avatar" else PROFILE_CACHE[user_id]["profile"].get("profile_photo")
            PROFILE_CACHE[user_id]["profile"]["cover_photo"] = base64_img if foto_type == "cover" else PROFILE_CACHE[user_id]["profile"].get("cover_photo")
            print("✅ Cache güncellendi")
        else:
            print("ℹ️ Cache'de veri yok (ilk upload)")

        print(f"✅ === foto_guncelle başarıyla tamamlandı === ✅\n")
        return json({"basarili": True, "mesaj": mesaj, "foto": base64_img, "type": foto_type})

    except Exception as e:
        print(f"Foto Upload Hatası: {e}")
        return json({"basarili": False, "mesaj": str(e)}, status=500)

# -------------------------------------------------
# 🔍 KULLANICI ARAMA (GÜNCELLENDİ: Hayalet Kayıtları Gizler)
# -------------------------------------------------
@app.get("/api/kullanici-ara")
@authorized()
async def kullanici_ara(request):
    try:
        q = request.args.get("q", "").strip()
        
        if not q or len(q) < 2:
            return json({"basarili": True, "sonuclar": []})
        
        # 🔥 ÖNEMLİ: prefetch_related("user") ekledik.
        # Bu sayede profille birlikte kullanıcı kaydını da çekiyoruz.
        profiles = await UserProfile.filter(full_name__icontains=q).prefetch_related("user").limit(5).all()
        
        results = []
        for p in profiles:
            # 🔥 KONTROL: Eğer kullanıcısı (users tablosundaki karşılığı) silinmişse listeye ekleme!
            if p.user:
                results.append({
                    "user_id": p.user.user_id, # ID'yi user tablosundan alıyoruz, garanti olsun
                    "full_name": p.full_name,
                    "profile_photo": p.profile_photo,
                    "department": p.department,
                    "grade": p.grade
                })
        
        return json({"basarili": True, "sonuclar": results})
        
    except Exception as e:
        print(f"Arama Hatası: {e}")
        return json({"basarili": False, "mesaj": str(e)}, status=500)

# -------------------------------------------------
# 🌍 HERKESE AÇIK PROFİL GÖRÜNTÜLEME (Public Profile)
# -------------------------------------------------
@app.get("/api/public-profile/<target_id:int>")
@authorized()
async def get_public_profile(request, target_id):
    try:
        # 1. Kullanıcıyı ve Profilini Bul
        user = await User.get_or_none(user_id=target_id).prefetch_related("profile")
        if not user:
            return json({"basarili": False, "mesaj": "Veritabanında bu ID'ye sahip kullanıcı yok."}, status=404)

        if not user.profile:
            # Profil yoksa bile hata vermesin, boş göstersin
            return json({"basarili": False, "mesaj": "Bu kullanıcının profili henüz oluşturulmamış."}, status=404)

        # 2. Katıldığı Etkinlikleri Çek
        fav_rows = await FavouriteEvent.filter(user_id=target_id).prefetch_related("event", "event__university").all()
        katildigi_etkinlikler = []
        for fav in fav_rows:
            e = fav.event
            if e:
                katildigi_etkinlikler.append({
                    "id": e.event_id,
                    "title": e.title,
                    "university": e.university.name if e.university else "Genel",
                    "image_url": e.image_url,  # 🔥 Etkinlik fotoğrafı
                    "date": e.start_datetime.strftime("%Y-%m-%d") if e.start_datetime else None,
                })

        # 3. Yaptığı Yorumları Çek
        comments = await Comment.filter(user_id=target_id).prefetch_related("event", "event__university").order_by("-created_at").all()
        yorumlar = []
        for c in comments:
            yorumlar.append({
                "id": c.comment_id,
                "event_id": c.event.event_id if c.event else None,  # 🔥 Etkinlik ID
                "event_title": c.event.title if c.event else "Bilinmeyen Etkinlik",
                "event_date": c.event.start_datetime.strftime("%d.%m.%Y") if (c.event and c.event.start_datetime) else None,  # 🔥 Etkinlik tarihi
                "event_university": c.event.university.name if (c.event and c.event.university) else "Genel",  # 🔥 Üniversite
                "message": c.message,
                "rating": c.rating,
                "date": c.created_at.strftime("%d.%m.%Y")
            })

        return json({
            "basarili": True,
            "profile": {
                "full_name": user.profile.full_name,
                "bio": user.profile.bio,
                "department": user.profile.department,
                "grade": user.profile.grade,
                "profile_photo": user.profile.profile_photo,
                "cover_photo": user.profile.cover_photo,
                "email": user.email 
            },
            "events": katildigi_etkinlikler,
            "comments": yorumlar
        })

    except Exception as e:
        print(f"Public Profil Hatası: {e}")
        return json({"basarili": False, "mesaj": f"Sunucu hatası: {str(e)}"}, status=500)
    # -------------------------------------------------
# 🎫 TEK ETKİNLİK DETAYI ve YORUMLARI
# -------------------------------------------------
@app.get("/api/etkinlik/<event_id:int>")
@authorized()
async def get_event_detail(request, event_id):
    try:
        # 1. Etkinliği Bul
        event = await Event.get_or_none(event_id=event_id).prefetch_related("university")
        if not event:
            return json({"basarili": False, "mesaj": "Etkinlik bulunamadı."}, status=404)

        # 2. Bu Etkinliğe Yapılan Yorumları Bul
        # Comment tablosundan bu event_id'ye ait olanları çekiyoruz
        comments = await Comment.filter(event_id=event_id).prefetch_related("user", "user__profile").order_by("-created_at").all()
        
        comment_list = []
        for c in comments:
            # Yorum yapanın profil bilgilerini al (Avatar ve İsim için)
            user_profile = c.user.profile if c.user and c.user.profile else None
            
            comment_list.append({
                "id": c.comment_id,
                "user_id": c.user.user_id,
                "user_name": user_profile.full_name if user_profile else c.user.email,
                "user_photo": user_profile.profile_photo if user_profile else None,
                "message": c.message,
                "date": to_istanbul_tz(c.created_at).strftime("%d.%m.%Y %H:%M")
            })

        # 3. Veriyi Gönder
        return json({
            "basarili": True,
            "etkinlik": {
                "id": event.event_id,
                "title": event.title,
                "description": event.description,
                "location": event.location,
                "date": event.start_datetime.strftime("%Y-%m-%d"),
                "time": event.start_datetime.strftime("%H:%M"),
                "university": event.university.name if event.university else "Genel",
                "university_logo": event.university.logo_url if event.university else None,
                "image_url": event.image_url,  # 🔥 Etkinlik fotoğrafı
                "category": event.category,  # 🔥 Kategori
                "club": event.club  # 🔥 Kulüp
            },
            "yorumlar": comment_list
        })

    except Exception as e:
        print(f"Etkinlik Detay Hatası: {e}")
        return json({"basarili": False, "mesaj": str(e)}, status=500)

# -------------------------------------------------
# 💬 YORUM EKLEME (YENİ ENDPOINT)
# -------------------------------------------------
@app.post("/api/etkinlik/<event_id:int>/yorum")
@authorized()
async def add_comment(request, event_id):
    try:
        user_id = request.ctx.user_id
        
        # Request body'den message'ı al
        body = request.json or {}
        message = body.get("message", "").strip()
        rating = body.get("rating")
        
        # Validasyon
        if not message:
            return json({"basarili": False, "mesaj": "Yorum boş olamaz."}, status=400)
        
        if len(message) > 1000:
            return json({"basarili": False, "mesaj": "Yorum 1000 karakterden kısa olmalı."}, status=400)
        
        # Etkinliği kontrol et
        event = await Event.get_or_none(event_id=event_id)
        if not event:
            return json({"basarili": False, "mesaj": "Etkinlik bulunamadı."}, status=404)
        
        # Kullanıcıyı kontrol et
        user = await User.get_or_none(user_id=user_id).prefetch_related("profile")
        if not user:
            return json({"basarili": False, "mesaj": "Kullanıcı bulunamadı."}, status=404)
        
        # Yorum oluştur
        comment = await Comment.create(
            user_id=user_id,
            event_id=event_id,
            message=message,
            rating=rating if rating and 1 <= rating <= 5 else None
        )
        
        # Response olarak yeni yorum'u döndür
        user_profile = user.profile if user.profile else None
        
        return json({
            "basarili": True,
            "mesaj": "Yorum başarıyla eklendi.",
            "yorum": {
                "id": comment.comment_id,
                "user_id": user.user_id,
                "user_name": user_profile.full_name if user_profile else user.email,
                "user_photo": user_profile.profile_photo if user_profile else None,
                "message": comment.message,
                "rating": comment.rating,
                "date": to_istanbul_tz(comment.created_at).strftime("%d.%m.%Y %H:%M"),
                "created_at": to_istanbul_tz(comment.created_at).isoformat()
            }
        })
        
    except Exception as e:
        print(f"Yorum Ekleme Hatası: {e}")
        return json({"basarili": False, "mesaj": str(e)}, status=500)


# -------------------------------------------------
# 🔥 ADMIN PANELİ - DASHBOARD İSTATİSTİKLERİ
# -------------------------------------------------
@app.get("/api/admin/dashboard")
@admin_required()
async def admin_dashboard(request):
    """Admin paneli için genel istatistikler"""
    try:
        # Toplam kullanıcı sayısı
        total_users = await User.all().count()
        
        # Toplam etkinlik sayısı
        total_events = await Event.all().count()
        
        # Aktif etkinlik sayısı
        active_events = await Event.filter(is_active=True).count()
        
        # Toplam mesaj sayısı
        total_messages = await ContactMessages.all().count()
        
        # Toplam feedback sayısı
        total_feedbacks = await Feedback.all().count()
        
        # Pending feedback sayısı
        pending_feedbacks = await Feedback.filter(status="pending").count()
        
        # Son 7 günde eklenen kullanıcılar
        from datetime import timedelta
        seven_days_ago = now_istanbul() - timedelta(days=7)
        new_users_week = await User.filter(created_at__gte=seven_days_ago).count()
        
        return json({
            "basarili": True,
            "stats": {
                "total_users": total_users,
                "total_events": total_events,
                "active_events": active_events,
                "total_messages": total_messages,
                "total_feedbacks": total_feedbacks,
                "pending_feedbacks": pending_feedbacks,
                "new_users_week": new_users_week
            }
        })
    except Exception as e:
        print(f"Dashboard hatası: {e}")
        return json({"basarili": False, "mesaj": str(e)}, status=500)


# -------------------------------------------------
# 🔥 ADMIN PANELİ - KULLANICI YÖNETİMİ
# -------------------------------------------------

# Tüm kullanıcıları listele
@app.get("/api/admin/users")
@admin_required()
async def admin_list_users(request):
    """Tüm kullanıcıları listele"""
    try:
        users = await User.all().prefetch_related("profile").order_by("-created_at")
        
        # 🔥 Süresi geçmiş banları otomatik temizle
        now = now_istanbul()
        cleared_count = 0
        
        users_list = []
        for user in users:
            # Ban süresi kontrolü
            if user.is_banned and user.ban_until:
                ban_until_ist = to_istanbul_tz(user.ban_until)
                
                if now >= ban_until_ist:
                    # Ban süresi dolmuş, otomatik kaldır
                    user.is_banned = False
                    user.ban_reason = None
                    user.ban_until = None
                    await user.save(update_fields=["is_banned", "ban_reason", "ban_until"])
                    cleared_count += 1
                    print(f"✅ Admin panel: {user.email} banı otomatik kaldırıldı")
            
            users_list.append({
                "user_id": user.user_id,
                "email": user.email,
                "full_name": user.profile.full_name if user.profile else "",
                "role": user.role,
                "is_admin": user.is_admin,
                "is_active": user.is_active,
                "is_banned": user.is_banned,  # 🔥 Güncellenmiş ban durumu
                "ban_reason": user.ban_reason,  # 🔥 Ban nedeni
                "ban_until": to_istanbul_tz(user.ban_until).isoformat() if user.ban_until else None,  # 🔥 Istanbul timezone
                "created_at": to_istanbul_tz(user.created_at).isoformat() if user.created_at else None,  # 🔥 Istanbul timezone
                "last_login": to_istanbul_tz(user.last_login).isoformat() if user.last_login else None,  # 🔥 Istanbul timezone
            })
        
        if cleared_count > 0:
            print(f"📊 Admin panel: {cleared_count} kullanıcının süresi geçmiş banı temizlendi")
        
        # 🔥 Admin ve normal kullanıcıları ayır, sonra birleştir
        admin_users = [u for u in users_list if u["is_admin"]]
        regular_users = [u for u in users_list if not u["is_admin"]]
        
        # Her grubu kendi içinde kayıt tarihine göre sırala (en yeni üstte)
        admin_users.sort(key=lambda x: x["created_at"] or "", reverse=True)
        regular_users.sort(key=lambda x: x["created_at"] or "", reverse=True)
        
        # Önce admin kullanıcılar, sonra normal kullanıcılar
        users_list = admin_users + regular_users
        
        # 🔥 DEBUG: İlk 3 kullanıcıyı logla
        print("📋 İlk 3 kullanıcı sıralaması:")
        for i, u in enumerate(users_list[:3], 1):
            print(f"  {i}. {u['email']} - Admin: {u['is_admin']}")
        
        return json({"basarili": True, "count": len(users_list), "users": users_list})
    except Exception as e:
        print(f"Kullanıcı listeleme hatası: {e}")
        return json({"basarili": False, "mesaj": str(e)}, status=500)



# Kullanıcı sil
@app.delete("/api/admin/users/<user_id:int>")
@admin_required()
async def admin_delete_user(request, user_id):
    """Kullanıcıyı sil"""
    try:
        user = await User.get_or_none(user_id=user_id)
        if not user:
            return json({"basarili": False, "mesaj": "Kullanıcı bulunamadı."}, status=404)
        
        # Kendini silmeyi engelle
        if request.ctx.user_id == user_id:
            return json({"basarili": False, "mesaj": "Kendi hesabınızı silemezsiniz."}, status=400)
        
        await user.delete()
        
        return json({"basarili": True, "mesaj": "Kullanıcı başarıyla silindi."})
    except Exception as e:
        print(f"Kullanıcı silme hatası: {e}")
        return json({"basarili": False, "mesaj": str(e)}, status=500)


# -------------------------------------------------
# 🔥 ADMIN PANELİ - ETKİNLİK YÖNETİMİ
# -------------------------------------------------

# Tüm etkinlikleri listele (admin için)
@app.get("/api/admin/events")
@admin_required()
async def admin_list_events(request):
    """Tüm etkinlikleri listele (aktif + pasif)"""
    try:
        events = await Event.all().prefetch_related("university").order_by("-created_at")
        
        events_list = []
        for event in events:
            events_list.append({
                "event_id": event.event_id,
                "title": event.title,
                "description": event.description,
                "category": event.category,  # 🔥 Kategori
                "club": event.club,  # 🔥 Kulüp
                "location": event.location,
                "university": event.university.name if event.university else None,
                "start_datetime": event.start_datetime.isoformat() if event.start_datetime else None,
                "end_datetime": event.end_datetime.isoformat() if event.end_datetime else None,
                "is_active": event.is_active,
                "image_url": event.image_url,
                "max_participants": event.max_participants,
                "created_at": event.created_at.isoformat() if event.created_at else None,
            })
        
        return json({"basarili": True, "count": len(events_list), "events": events_list})
    except Exception as e:
        print(f"Etkinlik listeleme hatası: {e}")
        return json({"basarili": False, "mesaj": str(e)}, status=500)


# Etkinlik oluştur
@app.post("/api/admin/events")
@admin_required()
async def admin_create_event(request):
    """Yeni etkinlik oluştur"""
    try:
        data = request.json or {}
        
        title = (data.get("title") or "").strip()
        description = (data.get("description") or "").strip()
        location = (data.get("location") or "").strip()
        university_id = data.get("university_id")
        start_datetime = data.get("start_datetime")
        end_datetime = data.get("end_datetime")
        image_url = data.get("image_url", "")
        max_participants = data.get("max_participants")
        category = data.get("category")
        club = data.get("club")
        
        if not title:
            return json({"basarili": False, "mesaj": "Başlık gerekli."}, status=400)
        
        # Datetime dönüşümü
        start_dt = datetime.fromisoformat(start_datetime) if start_datetime else None
        end_dt = datetime.fromisoformat(end_datetime) if end_datetime else None
        
        event = await Event.create(
            title=title,
            description=description,
            location=location,
            university_id=university_id,
            start_datetime=start_dt,
            end_datetime=end_dt,
            image_url=image_url,
            max_participants=max_participants,
            category=category,
            club=club,
            is_active=True
        )
        
        return json({
            "basarili": True,
            "mesaj": "Etkinlik başarıyla oluşturuldu.",
            "event_id": event.event_id
        }, status=201)
    except Exception as e:
        print(f"Etkinlik oluşturma hatası: {e}")
        return json({"basarili": False, "mesaj": str(e)}, status=500)


# Etkinlik güncelle
@app.put("/api/admin/events/<event_id:int>")
@admin_required()
async def admin_update_event(request, event_id):
    """Etkinlik bilgilerini güncelle"""
    try:
        event = await Event.get_or_none(event_id=event_id)
        if not event:
            return json({"basarili": False, "mesaj": "Etkinlik bulunamadı."}, status=404)
        
        data = request.json or {}
        
        if "title" in data:
            event.title = data["title"]
        if "description" in data:
            event.description = data["description"]
        if "location" in data:
            event.location = data["location"]
        if "university_id" in data:
            val = data["university_id"]
            if val == "" or val is None:
                event.university_id = None
            else:
                event.university_id = int(val)
        if "is_active" in data:
            event.is_active = data["is_active"]
        if "image_url" in data:  # 🔥 Fotoğraf güncelleme
            event.image_url = data["image_url"]
            # Sadece fotoğraf gerçekten yüklendiğinde log yaz
            if data["image_url"]:
                print(f"✅ Etkinlik {event_id} için fotoğraf güncellendi (size: {len(data['image_url'])} chars)")
        
        if "max_participants" in data:
            val = data["max_participants"]
            if val == "" or val is None:
                event.max_participants = None
            else:
                event.max_participants = int(val)

        if "category" in data:  # 🔥 Kategori güncelleme
            event.category = data["category"]

        if "club" in data:  # 🔥 Kulüp güncelleme
            event.club = data["club"]
        
        if "start_datetime" in data and data["start_datetime"]:
            event.start_datetime = datetime.fromisoformat(data["start_datetime"])
        
        if "end_datetime" in data and data["end_datetime"]:
            event.end_datetime = datetime.fromisoformat(data["end_datetime"])
        
        await event.save()
        
        return json({"basarili": True, "mesaj": "Etkinlik başarıyla güncellendi."})
    except Exception as e:
        print(f"Etkinlik güncelleme hatası: {e}")
        return json({"basarili": False, "mesaj": str(e)}, status=500)



# Etkinlik sil
@app.delete("/api/admin/events/<event_id:int>")
@admin_required()
async def admin_delete_event(request, event_id):
    """Etkinliği sil"""
    try:
        event = await Event.get_or_none(event_id=event_id)
        if not event:
            return json({"basarili": False, "mesaj": "Etkinlik bulunamadı."}, status=404)
        
        await event.delete()
        
        return json({"basarili": True, "mesaj": "Etkinlik başarıyla silindi."})
    except Exception as e:
        print(f"Etkinlik silme hatası: {e}")
        return json({"basarili": False, "mesaj": str(e)}, status=500)


# -------------------------------------------------
# 🔥 ADMIN PANELİ - MESAJ YÖNETİMİ
# -------------------------------------------------

# Tüm iletişim mesajlarını listele
@app.get("/api/admin/messages")
@admin_required()
async def admin_list_messages(request):
    """Tüm iletişim mesajlarını listele"""
    try:
        messages = await ContactMessages.all().prefetch_related("user_type", "topic_type").order_by("-created_at")
        
        messages_list = []
        for msg in messages:
            messages_list.append({
                "contact_id": msg.contact_id,
                "full_name": msg.full_name,
                "email": msg.email,
                "university": msg.university,
                "user_type": msg.user_type.label if msg.user_type else None,
                "topic_type": msg.topic_type.label if msg.topic_type else None,
                "message": msg.message,
                "consent": msg.consent,
                "created_at": msg.created_at.isoformat() if msg.created_at else None,
            })
        
        return json({"basarili": True, "count": len(messages_list), "messages": messages_list})
    except Exception as e:
        print(f"Mesaj listeleme hatası: {e}")
        return json({"basarili": False, "mesaj": str(e)}, status=500)


# Mesaj sil
@app.delete("/api/admin/messages/<contact_id:int>")
@admin_required()
async def admin_delete_message(request, contact_id):
    """İletişim mesajını sil"""
    try:
        message = await ContactMessages.get_or_none(contact_id=contact_id)
        if not message:
            return json({"basarili": False, "mesaj": "Mesaj bulunamadı."}, status=404)
        
        await message.delete()
        
        return json({"basarili": True, "mesaj": "Mesaj başarıyla silindi."})
    except Exception as e:
        print(f"Mesaj silme hatası: {e}")
        return json({"basarili": False, "mesaj": str(e)}, status=500)


# -------------------------------------------------
# 🔥 ADMIN PANELİ - FEEDBACK YÖNETİMİ
# -------------------------------------------------







# -------------------------------------------------
# 🔥 ÜNİVERSİTE Lİ STESİ (ADMIN İÇİN)
# -------------------------------------------------
@app.get("/api/admin/universities")
@admin_required()
async def admin_list_universities(request):
    """Tüm üniversiteleri listele"""
    try:
        universities = await University.all().order_by("name")
        
        universities_list = []
        for uni in universities:
            universities_list.append({
                "university_id": uni.university_id,
                "name": uni.name,
                "logo_url": uni.logo_url,
            })
        
        return json({"basarili": True, "count": len(universities_list), "universities": universities_list})
    except Exception as e:
        print(f"Üniversite listeleme hatası: {e}")
        return json({"basarili": False, "mesaj": str(e)}, status=500)


# Üniversite logosunu güncelle
@app.put("/api/admin/universities/<university_id:int>")
@admin_required()
async def admin_update_university(request, university_id):
    """Üniversite logosu güncelle"""
    try:
        university = await University.get_or_none(university_id=university_id)
        if not university:
            return json({"basarili": False, "mesaj": "Üniversite bulunamadı."}, status=404)
        
        data = request.json or {}
        logo_url = data.get("logo_url", "")
        
        university.logo_url = logo_url
        await university.save()
        
        return json({"basarili": True, "mesaj": "Üniversite logosu güncellendi."})
    except Exception as e:
        print(f"Üniversite güncelleme hatası: {e}")
        return json({"basarili": False, "mesaj": str(e)}, status=500)


# Yeni üniversite ekle
@app.post("/api/admin/universities")
@admin_required()
async def admin_create_university(request):
    """Yeni üniversite ekle"""
    try:
        data = request.json or {}
        name = data.get("name", "").strip()
        logo_url = data.get("logo_url", "").strip()
        
        if not name:
            return json({"basarili": False, "mesaj": "Üniversite adı gerekli."}, status=400)
        
        # Aynı isimde üniversite var mı kontrol et
        existing = await University.get_or_none(name=name)
        if existing:
            return json({"basarili": False, "mesaj": "Bu isimde bir üniversite zaten mevcut."}, status=409)
        
        university = await University.create(name=name, logo_url=logo_url)
        
        return json({
            "basarili": True, 
            "mesaj": "Üniversite başarıyla eklendi.",
            "university": {
                "university_id": university.university_id,
                "name": university.name,
                "logo_url": university.logo_url
            }
        }, status=201)
    except Exception as e:
        print(f"Üniversite ekleme hatası: {e}")
        return json({"basarili": False, "mesaj": str(e)}, status=500)


# Üniversite sil
@app.delete("/api/admin/universities/<university_id:int>")
@admin_required()
async def admin_delete_university(request, university_id):
    """Üniversite sil"""
    try:
        university = await University.get_or_none(university_id=university_id)
        if not university:
            return json({"basarili": False, "mesaj": "Üniversite bulunamadı."}, status=404)
        
        # Üniversiteye bağlı etkinlikler var mı kontrol et
        events_count = await Event.filter(university_id=university_id).count()
        if events_count > 0:
            return json({
                "basarili": False, 
                "mesaj": f"Bu üniversiteye bağlı {events_count} etkinlik var. Önce etkinlikleri silin veya başka bir üniversiteye taşıyın."
            }, status=400)
        
        await university.delete()
        
        return json({"basarili": True, "mesaj": "Üniversite başarıyla silindi."})
    except Exception as e:
        print(f"Üniversite silme hatası: {e}")
        return json({"basarili": False, "mesaj": str(e)}, status=500)



# Admin Feedbacks Listele
@app.get("/api/admin/feedbacks")
@admin_required()
async def admin_list_feedbacks(request):
    """Tüm feedbackleri listele"""
    print("📢 API: /api/admin/feedbacks endpoint hit! (RAW SQL MODE)")
    try:
        # ORM yerine RAW SQL kullanımı (Debug için)
        conn = Tortoise.get_connection("default")
        sql = """
            SELECT 
                f.feedback_id, f.type, f.title, f.message, f.status, f.created_at,
                u.email as user_email,
                up.full_name as user_full_name,
                e.title as event_title
            FROM feedbacks f
            LEFT JOIN users u ON f.user_id = u.user_id
            LEFT JOIN user_profiles up ON u.user_id = up.user_id
            LEFT JOIN events e ON f.event_id = e.event_id
            ORDER BY f.created_at DESC
        """
        
        # execute_query_dict returns list of dicts
        feedbacks = await conn.execute_query_dict(sql)
        print(f"📢 RAW SQL: Found {len(feedbacks)} items in DB.")
        
        result = []
        for row in feedbacks:
            result.append({
                "feedback_id": row.get("feedback_id"),
                "user_email": row.get("user_email") or "Anonim",
                "user_full_name": row.get("user_full_name"),
                "event_title": row.get("event_title") or "Genel",
                "type": row.get("type"),
                "title": row.get("title"),
                "message": row.get("message"),
                "status": row.get("status"),
                "created_at": row.get("created_at").isoformat() if row.get("created_at") else None
            })
            
        return json({"basarili": True, "feedbacks": result})
    except Exception as e:
        return json({"basarili": False, "mesaj": str(e)}, status=500)


# Admin Feedback Yanıtla
@app.post("/api/admin/feedbacks/<feedback_id:int>/reply")
@admin_required()
async def admin_reply_feedback(request, feedback_id):
    try:
        # User ve Profile'ı birlikte çekelim ki full_name'e erişirken hata almayalım
        feedback = await Feedback.get_or_none(feedback_id=feedback_id).prefetch_related("user__profile")
        if not feedback:
            return json({"basarili": False, "mesaj": "Feedback bulunamadı."}, status=404)
        
        data = request.json or {}
        reply_message = data.get("message", "").strip()
        
        if not reply_message:
            return json({"basarili": False, "mesaj": "Yanıt mesajı boş olamaz."}, status=400)
            
        # Kullanıcının emaili
        user_email = feedback.user.email if feedback.user else None
        if not user_email:
             return json({"basarili": False, "mesaj": "Kullanıcı emaili bulunamadı (Anonim?)."}, status=400)

        # 🔥 EMAIL GÖNDERME (GERÇEK)
        try:
            gmail_user = os.getenv("GMAIL_USER")
            gmail_pass = os.getenv("GMAIL_PASS")
            
            if gmail_user and gmail_pass:
                msg = EmailMessage()
                msg["Subject"] = f"Geri Bildirim Yanıtı: {feedback.title or 'Konusuz'}"
                msg["From"] = gmail_user
                msg["To"] = user_email
                
                body = f"""
                Merhaba {feedback.user.profile.full_name if feedback.user and hasattr(feedback.user, 'profile') else 'Kullanıcı'},
                
                Geri bildiriminiz için teşekkür ederiz.
                
                Konu: {feedback.title}
                Mesajınız: {feedback.message}
                
                ------------------------------------------------------------------
                YANITIMIZ:
                {reply_message}
                ------------------------------------------------------------------
                
                İyi günler dileriz,
                CampusHub Yönetimi
                """
                msg.set_content(body)
                
                # SMTP Bağlantısı (TLS 587)
                with smtplib.SMTP("smtp.gmail.com", 587) as smtp:
                    smtp.starttls()
                    smtp.login(gmail_user, gmail_pass)
                    smtp.send_message(msg)
                
                print(f"✅ Email sent to {user_email}")
            else:
                return json({"basarili": False, "mesaj": "Sunucu email ayarları eksik (.env)."}, status=500)

        except Exception as e:
            print(f"❌ Email sending failed: {e}")
            return json({"basarili": False, "mesaj": f"Email gönderilemedi: {str(e)}"}, status=500)
        
        # Durumu güncelle
        feedback.status = "resolved"
        await feedback.save()
        
        return json({"basarili": True, "mesaj": "Yanıt gönderildi ve durum güncellendi."})
    except Exception as e:
        print(f"❌ Yanıt hatası: {e}")
        return json({"basarili": False, "mesaj": str(e)}, status=500)

# Kullanıcıyı banla
@app.post("/api/admin/users/<user_id:int>/ban")
@admin_required()
async def ban_user(request, user_id):
    """Kullanıcıyı geçici veya kalıcı olarak banla"""
    try:
        user = await User.get_or_none(user_id=user_id)
        if not user:
            return json({"basarili": False, "mesaj": "Kullanıcı bulunamadı."}, status=404)
        
        # Kendini banlama kontrolü
        if request.ctx.user_id == user_id:
            return json({"basarili": False, "mesaj": "Kendinizi banlayamazsınız."}, status=400)
        
        data = request.json or {}
        ban_reason = data.get("ban_reason", "Belirsiz neden")
        ban_until = data.get("ban_until")  # ISO format datetime string veya None (kalıcı ban)
        
        user.is_banned = True
        user.ban_reason = ban_reason
        
        
        if ban_until:
            # Frontend'den gelen datetime'ı Istanbul timezone'a çevir
            ban_datetime_istanbul = to_istanbul_datetime(ban_until)
            
            # VERİTABANINA UTC OLARAK KAYDET (Tortoise ORM gereksinimi)
            ban_datetime_utc = ban_datetime_istanbul.astimezone(pytz.UTC)
            user.ban_until = ban_datetime_utc
            
            # Kullanıcı dostu log mesajı
            print(f"✅ Ban süresi kaydedildi (Istanbul): {ban_datetime_istanbul.strftime('%Y-%m-%d %H:%M')} - Ban bu saatte otomatik kalkacak")
        else:
            user.ban_until = None  # Kalıcı ban

        
        await user.save()
        
        return json({"basarili": True, "mesaj": "Kullanıcı başarıyla banlandı."})
    except Exception as e:
        print(f"Ban hatası: {e}")
        return json({"basarili": False, "mesaj": str(e)}, status=500)


# Kullanıcının banını kaldır
@app.post("/api/admin/users/<user_id:int>/unban")
@admin_required()
async def unban_user(request, user_id):
    """Kullanıcının banını kaldır"""
    try:
        user = await User.get_or_none(user_id=user_id)
        if not user:
            return json({"basarili": False, "mesaj": "Kullanıcı bulunamadı."}, status=404)
        
        user.is_banned = False
        user.ban_reason = None
        user.ban_until = None
        await user.save()
        
        return json({"basarili": True, "mesaj": "Ban kaldırıldı."})
    except Exception as e:
        print(f"Unban hatası: {e}")
        return json({"basarili": False, "mesaj": str(e)}, status=500)


# -------------------------------------------------
# 🔥 ETKİNLİK DETAYLI GÜNCELLEME (FOTOĞRAF DAHİL)
# -------------------------------------------------

# Etkinlik detaylarını getir (güncelleme için)
@app.get("/api/admin/events/<event_id:int>/edit")
@admin_required()
async def get_event_for_edit(request, event_id):
    """Etkinlik bilgilerini düzenleme için getir"""
    try:
        event = await Event.get_or_none(event_id=event_id).prefetch_related("university")
        if not event:
            return json({"basarili": False, "mesaj": "Etkinlik bulunamadı."}, status=404)
        
        return json({
            "basarili": True,
            "event": {
                "event_id": event.event_id,
                "title": event.title,
                "description": event.description,
                "location": event.location,
                "image_url": event.image_url,
                "university_id": event.university_id,
                "university_name": event.university.name if event.university else None,
                "start_datetime": event.start_datetime.isoformat() if event.start_datetime else None,
                "end_datetime": event.end_datetime.isoformat() if event.end_datetime else None,
                "is_active": event.is_active,
                "max_participants": event.max_participants,
                "category": event.category,  # 🔥 Kategori eklendi
                "club": event.club,  # 🔥 Kulüp eklendi
            }
        })
    except Exception as e:
        print(f"Etkinlik getirme hatası: {e}")
        return json({"basarili": False, "mesaj": str(e)}, status=500)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000)
