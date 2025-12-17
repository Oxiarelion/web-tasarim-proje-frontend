from tortoise import fields, models

# 1. Kullanıcı Tablosu
class User(models.Model):
    user_id = fields.IntField(pk=True) 
    email = fields.CharField(max_length=255, unique=True)
    password = fields.CharField(max_length=255)
    name = fields.CharField(max_length=255, null=True)
    
    role = fields.CharField(max_length=50, default='user') 
    is_active = fields.BooleanField(default=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    last_login = fields.DatetimeField(null=True)

    class Meta:
        table = "users"

# 2. Kullanıcı Profili (DÜZELTİLDİ: Çakışma Giderildi)
class UserProfile(models.Model):
    # user_id alanını sildik, çünkü aşağıdaki 'user' alanı zaten user_id sütununu yönetiyor.
    # pk=True diyerek bu bağlantının aynı zamanda tablonun anahtarı olduğunu belirttik.
    user = fields.OneToOneField("models.User", related_name="profile", source_field="user_id", pk=True)
    
    bio = fields.TextField(null=True)
    profile_photo = fields.CharField(max_length=255, null=True)
    full_name = fields.CharField(max_length=255, null=True)
    
    class Meta:
        table = "user_profiles"

# 3. Etkinlikler Tablosu
class Event(models.Model):
    event_id = fields.IntField(pk=True)
    title = fields.CharField(max_length=255)
    description = fields.TextField(null=True)
    location = fields.CharField(max_length=255, null=True)
    
    created_at = fields.DatetimeField(auto_now_add=True)
    is_active = fields.BooleanField(default=True)
    
    class Meta:
        table = "events"

# 4. Favori Etkinlikler
class FavouriteEvent(models.Model):
    # Composite Key (Çoklu Anahtar) yerine Tortoise'un otomatik ID atamasına izin veriyoruz.
    # Veritabanında user_id ve event_id var, onları bağlıyoruz.
    user = fields.ForeignKeyField("models.User", related_name="favorites", source_field="user_id")
    event = fields.ForeignKeyField("models.Event", related_name="favorited_by", source_field="event_id")
    added_at = fields.DatetimeField(auto_now_add=True)
    
    class Meta:
        table = "favourite_events"

# 5. Geri Bildirimler
class Feedback(models.Model):
    feedback_id = fields.IntField(pk=True)
    user = fields.ForeignKeyField("models.User", related_name="feedbacks", source_field="user_id")
    message = fields.TextField()
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "feedbacks"

# 6. İletişim Kullanıcı Tipleri
class ContactUserTypes(models.Model):
    id = fields.IntField(pk=True)
    label = fields.CharField(max_length=100)

    class Meta:
        table = "contact_user_types"

# 7. İletişim Konu Tipleri
class ContactTopicTypes(models.Model):
    id = fields.IntField(pk=True)
    label = fields.CharField(max_length=100)

    class Meta:
        table = "contact_topic_types"

# 8. İletişim Mesajları
class ContactMessages(models.Model):
    contact_id = fields.IntField(pk=True)
    full_name = fields.CharField(max_length=255)
    email = fields.CharField(max_length=255)
    message = fields.TextField()
    
    user_type = fields.ForeignKeyField("models.ContactUserTypes", null=True, source_field="user_type_id")
    topic_type = fields.ForeignKeyField("models.ContactTopicTypes", null=True, source_field="topic_type_id")
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "contact_messages"