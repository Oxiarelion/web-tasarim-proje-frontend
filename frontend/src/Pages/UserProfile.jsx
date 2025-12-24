import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../Styles/UserProfile.css";

export default function UserProfile() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // State'ler
  const [userData, setUserData] = useState(null);
  const [favoriEtkinlikler, setFavoriEtkinlikler] = useState([]);
  const [active, setActive] = useState("overview");
  const [loading, setLoading] = useState(true);

  // Form State
  const [editForm, setEditForm] = useState({
    full_name: "",
    bio: "",
    department: "",
    grade: "",
    phone_number: "",
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

        if (!profileRes.ok) {
          handleLogout();
          return;
        }

        const profileData = await profileRes.json();

        const takvimRes = await fetch("http://127.0.0.1:8000/api/takvim", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const takvimData = await takvimRes.json();

        if (profileData.basarili) {
          setUserData(profileData.profile);
          setEditForm({
            full_name: profileData.profile.full_name || "",
            bio: profileData.profile.bio || "",
            department: profileData.profile.department || "",
            grade: profileData.profile.grade || "",
            phone_number: profileData.profile.phone_number || "",
          });
        }

        if (takvimData.basarili && Array.isArray(takvimData.takvim)) {
          setFavoriEtkinlikler(takvimData.takvim);
        }
      } catch (err) {
        console.error("Veri hatası:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, navigate]);

  // --- 2. Kaydetme İşlemi ---
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
        alert("Profil güncellendi! ✅");
        setUserData((prev) => ({ ...prev, ...editForm }));
        setActive("overview");
      } else {
        alert("Hata: " + data.mesaj);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const settingsMenu = useMemo(
    () => [
      { id: "overview", label: "Genel Bakış (Vitrin)" },
      { id: "edit_profile", label: "Profili Düzenle" },
      { id: "security", label: "Şifre Değiştir" },
      { id: "notifications", label: "Bildirim Ayarları" },
      { id: "home", label: "🏠 Ana Sayfaya Dön" },
      { id: "logout", label: "Çıkış Yap", danger: true },
    ],
    []
  );

  if (loading) return <div className="pp-loading">Yükleniyor...</div>;
  if (!userData) return <div className="pp-loading">Kullanıcı bulunamadı.</div>;

  return (
    <div className="pp">
      {/* COVER & HEADER */}
      <header className="pp__cover">
        <img
          className="pp__coverImg"
          src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1600&q=80"
          alt="Kapak"
        />
        <div className="pp__coverOverlay" />

        <div className="pp__coverInner">
          <div className="pp__identity">
            <div className="pp__avatarWrap">
              <img
                className="pp__avatar"
                src={
                  userData.profile_photo || "https://via.placeholder.com/150"
                }
                alt="Avatar"
              />
              <span className="pp__statusDot" title="Aktif" />
            </div>

            <div className="pp__who">
              <h1 className="pp__name">{userData.full_name || "İsimsiz"}</h1>
              <div className="pp__meta">
                <span className="pp__username">{userData.email}</span>
                <span className="pp__sep">•</span>
                <span className="pp__bio">
                  {userData.bio || "Biyografi yok."}
                </span>
              </div>

              <div className="pp__statsRow">
                <span className="pp__statItem">
                  📚 {userData.department || "Bölüm Yok"}
                </span>
                <span className="pp__statItem">
                  🎓 {userData.grade || "Sınıf Yok"}
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
          <aside className="pp__card pp_sidebar">
            <div className="pp__cardTitle">Hesap Ayarları</div>
            <div className="pp__menu">
              {settingsMenu.map((m) => (
                <button
                  key={m.id}
                  className={[
                    "pp__menuItem",
                    active === m.id ? "is-active" : "",
                    m.danger ? "is-danger" : "",
                  ].join(" ")}
                  onClick={() => {
                    if (m.id === "logout") handleLogout();
                    else if (m.id === "home") navigate("/anasayfa");
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
            {/* 1. GENEL BAKIŞ (SADECE ETKİNLİKLER) */}
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
                            src="https://images.unsplash.com/photo-1501612780327-45045538702b?auto=format&fit=crop&w=1200&q=80"
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
                    <div className="pp__muted" style={{ padding: "20px" }}>
                      Henüz favori etkinliğiniz yok.
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* 2. PROFİL DÜZENLEME */}
            {active === "edit_profile" && (
              <section className="pp__card">
                <div className="pp__cardTitle">✏️ Profili Düzenle</div>
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
                        defaultValue={userData.email}
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
                        label="Telefon Numarası"
                        defaultValue={editForm.phone_number}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            phone_number: e.target.value,
                          })
                        }
                      />

                      <Field
                        label="Bio"
                        defaultValue={editForm.bio}
                        onChange={(e) =>
                          setEditForm({ ...editForm, bio: e.target.value })
                        }
                      />
                    </div>
                    <button
                      className="pp__btn pp__btnPrimary"
                      type="button"
                      onClick={handleSave}
                    >
                      Kaydet
                    </button>
                  </div>
                </div>
              </section>
            )}

            {active !== "overview" && active !== "edit_profile" && (
              <section className="pp__card">
                <div className="pp__cardTitle">⚙️ Ayarlar</div>
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

// Helper (Field bileşeni gerekli olduğu için tutuyoruz, InfoRow artık sadece düzenlemede gerekebilir ama kodda kalsın zararı yok)
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
