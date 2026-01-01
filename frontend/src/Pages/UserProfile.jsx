import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../Styles/UserProfile.css";

const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
const DEFAULT_COVER =
  "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1600&q=80";

export default function UserProfile() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // File input refs
  const avatarInputRef = React.useRef(null);
  const coverInputRef = React.useRef(null);

  // State'ler
  const [userData, setUserData] = useState(null);
  const [active, setActive] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [favoriEtkinlikler, setFavoriEtkinlikler] = useState([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Form State
  const [editForm, setEditForm] = useState({
    full_name: "",
    bio: "",
    department: "",
    grade: "",
    phone_number: "",
    profile_photo: "",
    cover_photo: "",
  });

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  // --- 1. Verileri Çek ---
  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }

    const fetchData = async () => {
      try {
        const profileRes = await fetch("http://127.0.0.1:8000/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (profileRes.status === 401) {
          handleLogout();
          return;
        }
        const profileData = await profileRes.json();

        // Takvim verisini çek (Hata verirse yoksay)
        try {
          const takvimRes = await fetch("http://127.0.0.1:8000/api/takvim", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const takvimData = await takvimRes.json();
          if (takvimData.basarili) setFavoriEtkinlikler(takvimData.takvim);
        } catch (e) {}

        if (profileData.basarili) {
          const user = profileData.profile;
          setUserData(user);
          setEditForm({
            full_name: user.full_name || "",
            bio: user.bio || "",
            department: user.department || "",
            grade: user.grade || "",
            phone_number: user.phone_number || "",
            profile_photo: user.profile_photo || "",
            cover_photo: user.cover_photo || "",
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, navigate]);

  // --- 2. FOTOĞRAF YÜKLEME (TİP AYRIMLI) ---
  const handleFileUpload = async (e, type) => {
    console.log("📸 handleFileUpload başladı, type:", type);

    const file = e.target.files[0];
    if (!file) {
      console.log("❌ Dosya seçilmedi!");
      return;
    }

    console.log(
      "✅ Dosya seçildi:",
      file.name,
      "Boyut:",
      file.size,
      "Tip:",
      file.type
    );

    // Dosya boyutu kontrolü (5MB)
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      alert("Dosya boyutu 5MB'dan küçük olmalıdır.");
      return;
    }

    // Dosya türü kontrolü
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      alert("Lütfen JPG, PNG, WebP veya GIF formatında bir dosya seçiniz.");
      return;
    }

    // Loading state'i set et
    if (type === "cover") {
      setUploadingCover(true);
    } else {
      setUploadingAvatar(true);
    }

    const formData = new FormData();
    formData.append("file", file);

    console.log("🔥 FormData oluşturuldu, Backend'e gönderiliyor...");

    try {
      // Type'ı query parameter olarak URL'ye ekle
      const urlWithType = `http://127.0.0.1:8000/api/profil/foto-guncelle?type=${encodeURIComponent(
        type
      )}`;
      console.log("📍 URL:", urlWithType);

      const res = await fetch(urlWithType, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      console.log("📡 Backend'den yanıt alındı, status:", res.status);

      const data = await res.json();
      console.log("📦 Backend Yanıtı:", data);

      if (data.basarili) {
        const photoType = type === "cover" ? "Kapak" : "Profil";
        console.log(`✅ ${photoType} fotoğrafı başarıyla güncellendi! 📸`);

        // Ekranda anında güncelle (optimistic update) - HEMEN GÖSTERİL
        if (type === "cover") {
          setUserData((prev) => ({ ...prev, cover_photo: data.foto }));
        } else {
          setUserData((prev) => ({ ...prev, profile_photo: data.foto }));
        }

        // Cache'i temizle - BACKGROUND'DA YAP (beklemeden devam et)
        // Böylece kullanıcı UI blok olmaz
        (async () => {
          console.log("🔄 Background: Profile verisini yeniden çekiliyor...");
          try {
            const refreshRes = await fetch(
              "http://127.0.0.1:8000/api/profile",
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            const refreshData = await refreshRes.json();
            if (refreshData.basarili) {
              console.log("✅ Background: Cache temizlendi");
            }
          } catch (err) {
            console.warn("⚠️ Background revalidate hatası:", err);
          }
        })();
      } else {
        console.log("❌ Backend hatası:", data.mesaj);
        alert(
          "Hata: " + (data.mesaj || "Fotoğraf yüklenirken bir hata oluştu.")
        );
      }
    } catch (err) {
      console.error("🔴 Ağ Hatası:", err);
      alert("Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyiniz.");
    } finally {
      // Loading state'ini kapat
      if (type === "cover") {
        setUploadingCover(false);
      } else {
        setUploadingAvatar(false);
      }
    }
  };

  // --- 3. Profil Bilgilerini Kaydet ---
  const handleSave = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (data.basarili) {
        alert("Bilgiler güncellendi!");
        setUserData((prev) => ({ ...prev, ...editForm }));
        setActive("overview");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const settingsMenu = useMemo(
    () => [
      { id: "overview", label: "Genel Bakış (Vitrin)" },
      { id: "edit_profile", label: "Profili Düzenle" },
      { id: "security", label: "Şifre Değiştir" },
      {
        id: "etkinlikler",
        label: "📅 Etkinliklere Dön",
        link: "/tum-etkinlikler",
      },
      { id: "home", label: "🏠 Ana Sayfaya Dön", link: "/anasayfa" },
      { id: "logout", label: "Çıkış Yap", danger: true },
    ],
    []
  );

  if (loading) return <div className="pp-loading">Yükleniyor...</div>;

  const safeUser = userData || {
    full_name: "Kullanıcı",
    email: "",
    bio: "",
    profile_photo: DEFAULT_AVATAR,
    cover_photo: DEFAULT_COVER,
  };

  return (
    <div className="pp">
      {/* HEADER */}
      <header className="pp__cover">
        <img
          className="pp__coverImg"
          src={safeUser.cover_photo || DEFAULT_COVER}
          alt="Kapak"
          style={{ opacity: uploadingCover ? 0.5 : 1 }}
          onError={(e) => (e.target.src = DEFAULT_COVER)}
        />
        <div className="pp__coverOverlay" />

        {/* --- KAPAK FOTOĞRAFI BUTONU --- */}
        {/* Sadece mouse üzerine gelince görünür (CSS ile) */}
        <button
          className="pp__changeCoverBtn"
          onClick={() => coverInputRef.current?.click()}
          type="button"
          disabled={uploadingCover}
        >
          {uploadingCover ? "⏳ Kapak Yükleniyor..." : "📷 Kapağı Değiştir"}
        </button>

        <input
          ref={coverInputRef}
          type="file"
          style={{ display: "none" }}
          onChange={(e) => handleFileUpload(e, "cover")}
          accept="image/*"
          disabled={uploadingCover}
        />

        <div className="pp__coverInner">
          <div className="pp__identity">
            {/* --- AVATAR KUTUSU --- */}
            <div
              className="pp__avatarWrap"
              title="Tıkla, profil fotoğrafını değiştir"
              onClick={() => avatarInputRef.current?.click()}
            >
              <img
                className="pp__avatar"
                src={safeUser.profile_photo || DEFAULT_AVATAR}
                alt="Avatar"
                style={{ opacity: uploadingAvatar ? 0.5 : 1 }}
                onError={(e) => (e.target.src = DEFAULT_AVATAR)}
              />

              {/* --- PROFİL FOTOĞRAFI İKONU (OVERLAY) --- */}
              {/* Sadece mouse üzerine gelince görünür (CSS ile) */}
              <div
                className="pp__avatarOverlay"
                title="Profil Fotoğrafını Değiştir"
                style={{ opacity: uploadingAvatar ? 0.8 : undefined }}
              >
                {uploadingAvatar ? "⏳" : "📷"}
              </div>

              <input
                ref={avatarInputRef}
                type="file"
                style={{ display: "none" }}
                onChange={(e) => handleFileUpload(e, "avatar")}
                accept="image/*"
                disabled={uploadingAvatar}
              />
            </div>

            <div className="pp__who">
              <h1 className="pp__name">{safeUser.full_name}</h1>
              <div className="pp__meta">
                <span className="pp__username">{safeUser.email}</span>
                <span className="pp__sep">•</span>
                <span className="pp__bio">{safeUser.bio}</span>
              </div>
              <div className="pp__statsRow">
                <span className="pp__statItem">
                  📚 {safeUser.department || "Bölüm Yok"}
                </span>
                <span className="pp__statItem">
                  🎓 {safeUser.grade || "Sınıf Yok"}
                </span>
              </div>
            </div>
          </div>

          <div className="pp__actions">
            <button
              className="pp__btn pp__btnPrimary"
              onClick={() => setActive("edit_profile")}
            >
              ✏️ Profili Düzenle
            </button>
          </div>
        </div>
      </header>

      {/* BODY */}
      <div className="pp__body">
        <div className="pp__grid">
          <aside className="pp__card">
            <div className="pp__cardHeader">
              <div className="pp__cardTitle">Hesap Ayarları</div>
            </div>
            <div className="pp__menu">
              {settingsMenu.map((m) => (
                <button
                  key={m.id}
                  className={`pp__menuItem ${
                    active === m.id ? "is-active" : ""
                  } ${m.danger ? "is-danger" : ""}`}
                  onClick={() => {
                    if (m.id === "logout") handleLogout();
                    else if (m.link) navigate(m.link);
                    else setActive(m.id);
                  }}
                  type="button"
                >
                  {m.label}
                </button>
              ))}
            </div>
          </aside>

          <main className="pp__main">
            {/* GENEL BAKIŞ */}
            {active === "overview" && (
              <section className="pp__card">
                <div className="pp__cardHeader">
                  <div className="pp__cardTitle">🎟️ Katıldığı Etkinlikler</div>
                </div>
                <div className="pp__eventsGrid">
                  {favoriEtkinlikler.length > 0 ? (
                    favoriEtkinlikler.map((ev) => (
                      <article className="pp__event" key={ev.id}>
                        <div className="pp__eventImgWrap">
                          <img
                            className="pp__eventImg"
                            src={ev.image_url || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1200"}
                            alt={ev.title}
                          />
                          <span className="pp__tag">
                            {ev.university || "Genel"}
                          </span>
                          <div className="pp__eventShade" />
                        </div>
                        <div className="pp__eventBody">
                          <div className="pp__eventTitle">{ev.title}</div>
                          <div className="pp__eventSub">{ev.date}</div>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="pp__muted" style={{ padding: "10px" }}>
                      Henüz favori etkinliğiniz yok.
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* PROFİL DÜZENLEME */}
            {active === "edit_profile" && (
              <section className="pp__card">
                <div className="pp__cardHeader">
                  <div className="pp__cardTitle">✏️ Profili Düzenle</div>
                </div>
                <div className="pp__panel">
                  <div className="pp__panelBlock">
                    <div className="pp__formGrid">
                      <Field
                        label="Ad Soyad"
                        defaultValue={editForm.full_name}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            full_name: e.target.value,
                          })
                        }
                      />
                      <Field
                        label="E-posta"
                        defaultValue={safeUser.email}
                        readOnly={true}
                      />
                      <Field
                        label="Bölüm"
                        defaultValue={editForm.department}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            department: e.target.value,
                          })
                        }
                      />
                      <Field
                        label="Sınıf"
                        defaultValue={editForm.grade}
                        onChange={(e) =>
                          setEditForm({ ...editForm, grade: e.target.value })
                        }
                      />
                      <Field
                        label="Telefon"
                        defaultValue={editForm.phone_number}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            phone_number: e.target.value,
                          })
                        }
                      />
                      <Field
                        label="Biyografi"
                        defaultValue={editForm.bio}
                        onChange={(e) =>
                          setEditForm({ ...editForm, bio: e.target.value })
                        }
                      />
                    </div>
                    <div style={{ marginTop: "20px", textAlign: "right" }}>
                      <button
                        className="pp__btn pp__btnPrimary"
                        type="button"
                        onClick={handleSave}
                      >
                        💾 Kaydet
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* DİĞER */}
            {active !== "overview" && active !== "edit_profile" && (
              <section className="pp__card">
                <div className="pp__cardHeader">
                  <div className="pp__cardTitle">⚙️ Ayarlar</div>
                </div>
                <div className="pp__panel">
                  <div className="pp__panelBlock">
                    <p className="pp__muted">
                      Bu özellik şu an geliştirme aşamasındadır.
                    </p>
                  </div>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  type = "text",
  defaultValue = "",
  readOnly = false,
  onChange,
}) {
  return (
    <label className="pp__field">
      <span className="pp__fieldLabel">{label}</span>
      <input
        className="pp__input"
        type={type}
        defaultValue={defaultValue}
        placeholder={label}
        readOnly={readOnly}
        onChange={onChange}
        style={readOnly ? { opacity: 0.6, cursor: "not-allowed" } : {}}
      />
    </label>
  );
}
