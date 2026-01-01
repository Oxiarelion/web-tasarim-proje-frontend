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
        from datetime import datetime, timedelta
        import pytz
        ISTANBUL_TZ = pytz.timezone('Europe/Istanbul')
        seven_days_ago = datetime.now(ISTANBUL_TZ) - timedelta(days=7)
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
        
        users_list = []
        for user in users:
            users_list.append({
                "user_id": user.user_id,
                "email": user.email,
                "full_name": user.profile.full_name if user.profile else "",
                "role": user.role,
                "is_admin": user.is_admin,
                "is_active": user.is_active,
from app import to_istanbul_tz  # Import helper function

                "created_at": to_istanbul_tz(user.created_at).isoformat() if user.created_at else None,
                "last_login": to_istanbul_tz(user.last_login).isoformat() if user.last_login else None,
            })
        
        return json({"basarili": True, "count": len(users_list), "users": users_list})
    except Exception as e:
        print(f"Kullanıcı listeleme hatası: {e}")
        return json({"basarili": False, "mesaj": str(e)}, status=500)


# Kullanıcı detayları
@app.get("/api/admin/users/<user_id:int>")
@admin_required()
async def admin_get_user(request, user_id):
    """Belirli bir kullanıcının detaylarını getir"""
    try:
        user = await User.get_or_none(user_id=user_id).prefetch_related("profile")
        if not user:
            return json({"basarili": False, "mesaj": "Kullanıcı bulunamadı."}, status=404)
        
        return json({
            "basarili": True,
            "user": {
                "user_id": user.user_id,
                "email": user.email,
                "full_name": user.profile.full_name if user.profile else "",
                "bio": user.profile.bio if user.profile else "",
                "department": user.profile.department if user.profile else "",
                "grade": user.profile.grade if user.profile else "",
                "phone_number": user.profile.phone_number if user.profile else "",
                "role": user.role,
                "is_admin": user.is_admin,
                "is_active": user.is_active,
                "created_at": to_istanbul_tz(user.created_at).isoformat() if user.created_at else None,
                "last_login": to_istanbul_tz(user.last_login).isoformat() if user.last_login else None,
            }
        })
    except Exception as e:
        print(f"Kullanıcı detay hatası: {e}")
        return json({"basarili": False, "mesaj": str(e)}, status=500)


# Yeni admin kullanıcı oluştur
@app.post("/api/admin/users")
@admin_required()
async def admin_create_user(request):
    """Yeni kullanıcı (admin) oluştur"""
    try:
        data = request.json or {}
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""
        full_name = (data.get("full_name") or "").strip()
        is_admin = data.get("is_admin", False)
        
        if not email or not password:
            return json({"basarili": False, "mesaj": "Email ve şifre gerekli."}, status=400)
        
        # Kullanıcı zaten var mı?
        existing = await User.get_or_none(email=email)
        if existing:
            return json({"basarili": False, "mesaj": "Bu e-posta zaten kayıtlı."}, status=409)
        
        # Şifreyi hash'le
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Kullanıcı oluştur
        user = await User.create(
            email=email,
            password=hashed_password,
            is_admin=is_admin,
            role="admin" if is_admin else "user"
        )
        
        # Profil oluştur
        await UserProfile.create(
            user=user,
            full_name=full_name or "",
            bio="",
            department="",
            grade="",
            phone_number="",
            profile_photo="",
            cover_photo=""
        )
        
        return json({
            "basarili": True,
            "mesaj": "Kullanıcı başarıyla oluşturuldu.",
            "user_id": user.user_id
        }, status=201)
    except Exception as e:
        print(f"Kullanıcı oluşturma hatası: {e}")
        return json({"basarili": False, "mesaj": str(e)}, status=500)


# Kullanıcı güncelle
@app.put("/api/admin/users/<user_id:int>")
@admin_required()
async def admin_update_user(request, user_id):
    """Kullanıcı bilgilerini güncelle"""
    try:
        user = await User.get_or_none(user_id=user_id).prefetch_related("profile")
        if not user:
            return json({"basarili": False, "mesaj": "Kullanıcı bulunamadı."}, status=404)
        
        data = request.json or {}
        
        # User alanları
        if "is_admin" in data:
            user.is_admin = data["is_admin"]
            user.role = "admin" if data["is_admin"] else "user"
        
        if "is_active" in data:
            user.is_active = data["is_active"]
        
        await user.save()
        
        # Profile alanları
        if user.profile:
            if "full_name" in data:
                user.profile.full_name = data["full_name"]
            if "bio" in data:
                user.profile.bio = data["bio"]
            if "department" in data:
                user.profile.department = data["department"]
            if "grade" in data:
                user.profile.grade = data["grade"]
            if "phone_number" in data:
                user.profile.phone_number = data["phone_number"]
            
            await user.profile.save()
        
        return json({"basarili": True, "mesaj": "Kullanıcı başarıyla güncellendi."})
    except Exception as e:
        print(f"Kullanıcı güncelleme hatası: {e}")
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
                "location": event.location,
                "university": event.university.name if event.university else None,
                "start_datetime": event.start_datetime.isoformat() if event.start_datetime else None,
                "end_datetime": event.end_datetime.isoformat() if event.end_datetime else None,
                "is_active": event.is_active,
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
        
        if not title:
            return json({"basarili": False, "mesaj": "Başlık gerekli."}, status=400)
        
        # Datetime dönüşümü
        from datetime import datetime
        start_dt = datetime.fromisoformat(start_datetime) if start_datetime else None
        end_dt = datetime.fromisoformat(end_datetime) if end_datetime else None
        
        event = await Event.create(
            title=title,
            description=description,
            location=location,
            university_id=university_id,
            start_datetime=start_dt,
            end_datetime=end_dt,
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
            event.university_id = data["university_id"]
        if "is_active" in data:
            event.is_active = data["is_active"]
        
        if "start_datetime" in data and data["start_datetime"]:
            from datetime import datetime
            event.start_datetime = datetime.fromisoformat(data["start_datetime"])
        
        if "end_datetime" in data and data["end_datetime"]:
            from datetime import datetime
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

# Tüm feedbackleri listele
@app.get("/api/admin/feedbacks")
@admin_required()
async def admin_list_feedbacks(request):
    """Tüm feedbackleri listele"""
    try:
        feedbacks = await Feedback.all().prefetch_related("user", "event").order_by("-created_at")
        
        feedbacks_list = []
        for fb in feedbacks:
            feedbacks_list.append({
                "feedback_id": fb.feedback_id,
                "user_email": fb.user.email if fb.user else None,
                "event_title": fb.event.title if fb.event else None,
                "type": fb.type,
                "title": fb.title,
                "message": fb.message,
                "status": fb.status,
                "created_at": fb.created_at.isoformat() if fb.created_at else None,
            })
        
        return json({"basarili": True, "count": len(feedbacks_list), "feedbacks": feedbacks_list})
    except Exception as e:
        print(f"Feedback listeleme hatası: {e}")
        return json({"basarili": False, "mesaj": str(e)}, status=500)


# Feedback durumu güncelle
@app.put("/api/admin/feedbacks/<feedback_id:int>")
@admin_required()
async def admin_update_feedback(request, feedback_id):
    """Feedback durumunu güncelle"""
    try:
        feedback = await Feedback.get_or_none(feedback_id=feedback_id)
        if not feedback:
            return json({"basarili": False, "mesaj": "Feedback bulunamadı."}, status=404)
        
        data = request.json or {}
        
        if "status" in data:
            feedback.status = data["status"]
        
        await feedback.save()
        
        return json({"basarili": True, "mesaj": "Feedback durumu güncellendi."})
    except Exception as e:
        print(f"Feedback güncelleme hatası: {e}")
        return json({"basarili": False, "mesaj": str(e)}, status=500)


# Feedback sil
@app.delete("/api/admin/feedbacks/<feedback_id:int>")
@admin_required()
async def admin_delete_feedback(request, feedback_id):
    """Feedback'i sil"""
    try:
        feedback = await Feedback.get_or_none(feedback_id=feedback_id)
        if not feedback:
            return json({"basarili": False, "mesaj": "Feedback bulunamadı."}, status=404)
        
        await feedback.delete()
        
        return json({"basarili": True, "mesaj": "Feedback başarıyla silindi."})
    except Exception as e:
        print(f"Feedback silme hatası: {e}")
        return json({"basarili": False, "mesaj": str(e)}, status=500)


# -------------------------------------------------
# 🔥 ÜNİVERSİTE LİSTESİ (ADMIN İÇİN)
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


# Üniversite güncelle (logo_url)
@app.put("/api/admin/universities/<university_id:int>")
@admin_required()
async def admin_update_university(request, university_id):
    """Üniversite logo URL'sini güncelle"""
    try:
        university = await University.get_or_none(university_id=university_id)
        if not university:
            return json({"basarili": False, "mesaj": "Üniversite bulunamadı."}, status=404)
        
        data = request.json or {}
        
        if "logo_url" in data:
            university.logo_url = data["logo_url"]
        
        await university.save()
        
        return json({"basarili": True, "mesaj": "Üniversite logosu başarıyla güncellendi."})
    except Exception as e:
        print(f"Üniversite güncelleme hatası: {e}")
        return json({"basarili": False, "mesaj": str(e)}, status=500)


if __name__ == \"__main__\":
    app.run(host=\"0.0.0.0\", port=8000, debug=True)
