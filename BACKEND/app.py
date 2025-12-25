from dotenv import load_dotenv
import os

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
    User, UserProfile, Event, FavouriteEvent, Feedback,
    ContactUserTypes, ContactTopicTypes, ContactMessages
)

app = Sanic("Campushub06")
CORS(app)

# --- GİZLİ ANAHTAR ---
SECRET_KEY = os.getenv("SECRET_KEY", "bu_cok_gizli_ve_uzun_bir_sifredir_kimse_bilmemeli_12345")

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
    msg = EmailMessage()
    msg["Subject"] = "CampusHub Ankara - Şifre Sıfırlama"
    msg["From"] = os.getenv("GMAIL_USER")
    msg["To"] = email
    msg.set_content(
        f"Merhaba,\n\nŞifreni sıfırlamak için: {reset_link}\n\nCampusHub Ekibi"
    )

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
        smtp.login(os.getenv("GMAIL_USER"), os.getenv("GMAIL_PASS"))
        smtp.send_message(msg)


# -------------------------------------------------
# SSS Verileri
# -------------------------------------------------
FAQ_ITEMS = [
    { "id": 1, "question": "CampusHub Ankara nedir?", "answer": "CampusHub Ankara, Ankara’daki üniversitelerde gerçekleşen etkinlikleri tek bir platformda toplayan öğrenci odaklı bir etkinlik keşif uygulamasıdır." },
    { "id": 2, "question": "Etkinlikleri nereden buluyorsunuz?", "answer": "Etkinlikler üniversitelerin resmi web siteleri, kulüp sayfaları ve sosyal medya hesapları üzerinden toplanarak listelenmektedir." },
    { "id": 3, "question": "Bir etkinliği takvime nasıl eklerim?", "answer": "Etkinlik detay sayfasında bulunan 'Takvime Ekle' butonuna tıklayarak etkinliği kişisel takviminize ekleyebilirsiniz." },
    { "id": 4, "question": "CampusHub Ankara’ya üye olmam gerekiyor mu?", "answer": "Çoğu etkinliği görmek için üyelik gerekmez. Ancak etkinlik kaydetme ve favorileme gibi özellikler için üye olmanız gerekir." },
    { "id": 5, "question": "Üyelik ücretli mi?", "answer": "Hayır. CampusHub Ankara tamamen ücretsiz bir platformdur." },
    { "id": 6, "question": "Yanlış listelenen bir etkinliği nasıl bildiririm?", "answer": "Etkinlik detay sayfasındaki 'Hata Bildir' butonunu kullanarak bize ulaşabilirsiniz." },
    { "id": 7, "question": "Etkinlikler sadece Ankara için mi?", "answer": "Şu an sadece Ankara için hizmet veriyoruz. İleride diğer şehirleri de eklemeyi planlıyoruz." },
    { "id": 8, "question": "Kendi kulübümün etkinliğini nasıl ekleyebilirim?", "answer": "Yakında kulüpler için 'Organizatör Paneli' eklenecek. Şimdilik 'Etkinlik Ekle' formu üzerinden bize ulaşabilirsiniz." },
    { "id": 9, "question": "Verilerimi nasıl saklıyorsunuz?", "answer": "Kullanıcı verileri güvenli sunucularda ve KVKK’ya uygun şekilde saklanmaktadır." },
    { "id": 10, "question": "Mobil uygulamanız var mı?", "answer": "Şu an mobil uyumlu web sitemiz var. İleride Android ve iOS uygulamaları da yayınlamayı planlıyoruz." },
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

    user = await User.create(email=email, password=password)
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

    if user.password != password:
        return json({"basarili": False, "mesaj": "Şifre yanlış."}, status=401)

    # Token oluşturma
    expiration_time = datetime.now(timezone.utc) + timedelta(hours=24)
    token_payload = {
        "user_id": user.user_id,
        "email": user.email,
        "exp": expiration_time
    }
    
    token = jwt.encode(token_payload, SECRET_KEY, algorithm="HS256")

    user.last_login = datetime.now()
    await user.save(update_fields=["last_login"])

    return json({
        "basarili": True, 
        "mesaj": "Hoş geldin!",
        "token": token,
        "user": {"email": user.email, "role": user.role}
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
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    RESET_TOKENS[token] = {"email": email, "expires_at": expires_at}

    reset_link = f"http://localhost:5173/sifre-sifirla?token={token}"

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
    now_utc = datetime.now(timezone.utc)

    if not entry or entry["expires_at"] < now_utc:
        return json({"basarili": False, "mesaj": "Bağlantı geçersiz veya süresi dolmuş."}, status=400)

    if len(new_password) < 6:
        return json({"basarili": False, "mesaj": "Şifre en az 6 karakter olmalıdır."}, status=400)

    email = entry["email"]
    user = await User.get_or_none(email=email)
    if not user:
        return json({"basarili": False, "mesaj": "Kullanıcı bulunamadı."}, status=404)

    user.password = new_password
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

    query += " ORDER BY e.start_datetime ASC"

    try:
        conn = connections.get("default")
        rows = await conn.execute_query_dict(query, params)
        
        etkinlikler_list = []
        for r in rows:
            sd = r["start_datetime"]
            etkinlikler_list.append({
                "id": r["id"],
                "title": r["title"],
                "university": r["university"],
                "location": r["location"],
                "description": r["description"],
                "date": sd.strftime("%Y-%m-%d") if sd else None,
                "time": sd.strftime("%H:%M") if sd else None,
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

@app.get("/api/faq/<faq_id:int>")
async def get_single_faq(request, faq_id):
    for item in FAQ_ITEMS:
        if item["id"] == faq_id:
            return json(item, status=200)
    return json({"error": "FAQ bulunamadı."}, status=404)


# -------------------------------------------------
# Feedback (ORM)
# -------------------------------------------------
@app.post("/api/feedback")
async def create_feedback(request):
    data = request.json or {}

    email = (data.get("email") or "").strip().lower()
    event_id = data.get("event_id")
    fb_type = (data.get("type") or "").strip() or None
    title = (data.get("title") or "").strip() or None
    message = (data.get("message") or "").strip()

    if not email or not event_id or not message:
        return json({"basarili": False, "mesaj": "E-posta, etkinlik ve mesaj alanları zorunludur."}, status=400)

    user = await User.get_or_none(email=email)
    if not user:
        return json({"basarili": False, "mesaj": "Bu e-posta ile kayıtlı kullanıcı bulunamadı."}, status=404)

    event = await Event.get_or_none(event_id=event_id)
    if not event:
        return json({"basarili": False, "mesaj": "Etkinlik bulunamadı."}, status=404)

    fb = await Feedback.create(
        user=user,
        event=event,
        type=fb_type,
        title=title,
        message=message,
        status="pending"
    )

    return json({"basarili": True, "mesaj": "Geri bildiriminiz alındı. Teşekkür ederiz.", "feedback_id": fb.feedback_id}, status=201)


@app.get("/api/feedback")
async def list_feedback(request):
    event_id = request.args.get("event_id")
    status = request.args.get("status")

    q = Feedback.all().prefetch_related("user")

    if event_id:
        q = q.filter(event_id=event_id)
    if status:
        q = q.filter(status=status)

    rows = await q.order_by("-created_at").values(
        "feedback_id",
        "event_id",
        "type",
        "title",
        "message",
        "status",
        "created_at",
        email="user__email"
    )

    return json({"basarili": True, "adet": len(rows), "feedbackler": rows}, status=200)


# -------------------------------------------------
# CONTACT / İLETİŞİM API
# -------------------------------------------------
@app.get("/api/contact/header")
async def contact_header(request):
    return json({
        "title": "Bizimle İletişime Geç",
        "subtitle": (
            "CampusHub Ankara bağımsız bir öğrenci platformudur. "
            "Etkinlik ekleme, öneri ve geri bildirim için "
            "bu sayfadan bizimle iletişime geçebilirsin."
        )
    })

@app.get("/api/contact/cards")
async def contact_cards(request):
    return json({
        "cards": [
            {
                "type": "email",
                "title": "E-posta",
                "text": "campushub@ankara.edu.tr",
                "href": "mailto:campushub@ankara.edu.tr",
            },
            {
                "type": "github",
                "title": "GitHub Deposu",
                "text": "Açık kaynak kodumuzu görüntüleyin ve katkı verin.",
                "href": "https://github.com/campushub-ankara",
            },
        ]
    })

@app.get("/api/contact/club-info")
async def contact_club_info(request):
    return json({
        "title": "Kulüp / Topluluk Musunuz?",
        "text": (
            "Etkinliklerinizi CampusHub Ankara'da listelemek için "
            "formdan bizimle iletişime geçebilir, kulübünüzü "
            "platforma ekletmek için başvurabilirsiniz."
        )
    })

@app.get("/api/contact/about")
async def contact_about(request):
    return json({
        "title": "Biz Kimiz?",
        "text": (
            "CampusHub Ankara, Ankara’daki üniversite ve kulüp etkinliklerini "
            "tek bir platformda toplayan, öğrenciler tarafından geliştirilen "
            "bağımsız bir öğrenci girişimidir. Amacımız, sosyal medyayı aktif "
            "kullanmayan öğrencilerin de kampüsteki fırsatlara kolayca "
            "ulaşmasını sağlamaktır."
        )
    })

@app.get("/api/contact/team")
async def contact_team(request):
    return json({
        "title": "CampusHub Ekibi",
        "members": [
            {"name": "İlayda Ceylan", "roles": ["Backend", "CI/CD"], "photo": None},
            {"name": "Zeynep Bahar Arık", "roles": ["Frontend", "Data Layer", "Testing"], "photo": None},
            {"name": "Zeynepnaz Yüksel", "roles": ["Backend", "Frontend", "Testing"], "photo": None},
            {"name": "Buğra Kılıç", "roles": ["Backend", "CI/CD"], "photo": None},
            {"name": "Osman Kağan Mahir", "roles": ["Frontend", "Data Layer"], "photo": None},
        ]
    })

@app.get("/api/contact/form-options")
async def contact_form_options(request):
    user_types = await ContactUserTypes.filter(is_active=True).order_by("id").values("id", "label")
    topic_types = await ContactTopicTypes.filter(is_active=True).order_by("id").values("id", "label")
    return json({"user_types": user_types, "topic_types": topic_types}, status=200)

@app.get("/api/contact")
async def contact_get(request):
    return json({"ok": True, "message": "Contact endpoint çalışıyor!"}, status=200)

@app.post("/api/contact")
async def contact_post(request):
    data = request.json or {}

    full_name = (data.get("full_name") or "").strip()
    email = (data.get("email") or "").strip()
    university = (data.get("university") or "").strip()
    user_type_label = (data.get("user_type") or "").strip()
    topic_label = (data.get("topic") or "").strip()
    message_text = (data.get("message") or "").strip()
    consent = data.get("consent", False)

    required_fields = ["full_name", "email", "university", "user_type", "topic", "message"]
    missing = [f for f in required_fields if not data.get(f)]
    if consent is not True:
        missing.append("consent")

    if missing:
        return json({"ok": False, "error": "Eksik veya doldurulmamış alanlar var.", "missing": missing}, status=400)

    if "@" not in email:
        return json({"ok": False, "error": "Geçersiz e-posta adresi."}, status=400)

    ut = await ContactUserTypes.get_or_none(label=user_type_label, is_active=True)
    if not ut:
        return json({"ok": False, "error": "Geçersiz kullanıcı tipi."}, status=400)

    tt = await ContactTopicTypes.get_or_none(label=topic_label, is_active=True)
    if not tt:
        return json({"ok": False, "error": "Geçersiz mesaj türü."}, status=400)

    contact_msg = await ContactMessages.create(
        full_name=full_name,
        email=email,
        university=university,
        user_type=ut,
        topic_type=tt,
        message=message_text,
        consent=True
    )

    return json({"ok": True, "message": "İletişim formu başarıyla alındı.", "contact_id": contact_msg.contact_id}, status=201)

@app.get("/api/contact/messages")
async def list_messages(request):
    rows = await ContactMessages.all().prefetch_related("user_type", "topic_type").order_by("-created_at").values(
        "contact_id",
        "full_name",
        "email",
        "university",
        "message",
        "consent",
        "created_at",
        user_type="user_type__label",
        topic_type="topic_type__label",
    )
    return json({"ok": True, "count": len(rows), "messages": rows}, status=200)


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

# -------------------------------------------------
# Çalıştır
# -------------------------------------------------
if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000)