from tortoise import fields, models

# 1. Kullanıcı Tablosu
class User(models.Model):
    user_id = fields.IntField(pk=True) 
    email = fields.CharField(max_length=255, unique=True)
    password = fields.CharField(max_length=255)
    
    role = fields.CharField(max_length=50, default='user') 
    is_active = fields.BooleanField(default=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    last_login = fields.DatetimeField(null=True)

    class Meta:
        table = "users"

# 2. Kullanıcı Profili (DÜZELTİLDİ: TextField ve Cover Photo)
class UserProfile(models.Model):
    # Tabloyu silip yeniden oluşturacağımız için id alanını standartlaştırdım
    id = fields.IntField(pk=True)
    
    # Kullanıcı ile ilişki (OneToOne)
    user = fields.OneToOneField("models.User", related_name="profile", source_field="user_id")
    
    full_name = fields.CharField(max_length=255, null=True)
    bio = fields.TextField(null=True)
    
    # 🔥 DÜZELTME: Resimler uzun olduğu için TextField yaptık
    profile_photo = fields.TextField(null=True) 
    cover_photo = fields.TextField(null=True)   
    
    department = fields.CharField(max_length=255, null=True)
    grade = fields.CharField(max_length=50, null=True)
    phone_number = fields.CharField(max_length=255, null=True)
    
    class Meta:
        table = "user_profiles" 

# --- Üniversiteler Tablosu ---
class University(models.Model):
    university_id = fields.IntField(pk=True)
    name = fields.CharField(max_length=255)
    logo_url = fields.CharField(max_length=255, null=True)

    class Meta:
        table = "universities"

# 3. Etkinlikler Tablosu
class Event(models.Model):
    event_id = fields.IntField(pk=True)
    title = fields.CharField(max_length=255)
    description = fields.TextField(null=True)
    location = fields.CharField(max_length=255, null=True)
    
    start_datetime = fields.DatetimeField(null=True)
    end_datetime = fields.DatetimeField(null=True)
    
    # Üniversite ile ilişki
    university = fields.ForeignKeyField("models.University", related_name="events", source_field="university_id", null=True)

    created_at = fields.DatetimeField(auto_now_add=True)
    is_active = fields.BooleanField(default=True)
    
    class Meta:
        table = "events"

# 4. Favori Etkinlikler
class FavouriteEvent(models.Model):
    # id eklemek Tortoise ORM için daha sağlıklıdır
    id = fields.IntField(pk=True)
    user = fields.ForeignKeyField("models.User", related_name="favorites", source_field="user_id")
    event = fields.ForeignKeyField("models.Event", related_name="favorited_by", source_field="event_id")
    added_at = fields.DatetimeField(auto_now_add=True)
    
    class Meta:
        table = "favourite_events"

# 5. Geri Bildirimler
class Feedback(models.Model):
    feedback_id = fields.IntField(pk=True)
    user = fields.ForeignKeyField("models.User", related_name="feedbacks", source_field="user_id")
    event = fields.ForeignKeyField("models.Event", related_name="event_feedbacks", source_field="event_id", null=True)
    
    type = fields.CharField(max_length=50, null=True) # bug, suggestion vb.
    title = fields.CharField(max_length=255, null=True)
    message = fields.TextField()
    status = fields.CharField(max_length=50, default="pending") 

    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "feedbacks"

# 6. İletişim Kullanıcı Tipleri
class ContactUserTypes(models.Model):
    id = fields.IntField(pk=True)
    label = fields.CharField(max_length=100)
    is_active = fields.BooleanField(default=True)

    class Meta:
        table = "contact_user_types"

# 7. İletişim Konu Tipleri
class ContactTopicTypes(models.Model):
    id = fields.IntField(pk=True)
    label = fields.CharField(max_length=100)
    is_active = fields.BooleanField(default=True)

    class Meta:
        table = "contact_topic_types"

# 8. İletişim Mesajları
class ContactMessages(models.Model):
    contact_id = fields.IntField(pk=True)
    full_name = fields.CharField(max_length=255)
    email = fields.CharField(max_length=255)
    university = fields.CharField(max_length=255, null=True)
    message = fields.TextField()
    consent = fields.BooleanField(default=False)
    
    user_type = fields.ForeignKeyField("models.ContactUserTypes", null=True, source_field="user_type_id")
    topic_type = fields.ForeignKeyField("models.ContactTopicTypes", null=True, source_field="topic_type_id")
    
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "contact_messages"