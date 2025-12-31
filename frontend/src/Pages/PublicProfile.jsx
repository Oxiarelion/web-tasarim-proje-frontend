import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../Styles/PublicProfile.css"; // 🔥 YENİ CSS'İ BURADA KULLANIYORUZ

// YEDEK RESİMLER
const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
const DEFAULT_COVER =
  "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1600&q=80";

export default function PublicProfile() {
  const { id } = useParams(); // URL'den ID'yi al
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [userData, setUserData] = useState(null);
  const [events, setEvents] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("events");

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }

    const fetchData = async () => {
      try {
        const res = await fetch(
          `http://127.0.0.1:8000/api/public-profile/${id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json();

        if (data.basarili) {
          setUserData(data.profile);
          setEvents(data.events);
          setComments(data.comments);
        } else {
          // Backend'den gelen gerçek hatayı gösterelim
          alert(data.mesaj || "Bir hata oluştu.");
          navigate("/anasayfa");
        }
      } catch (err) {
        console.error("Hata:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, token, navigate]);

  if (loading) return <div className="pp-loading">Profil Yükleniyor...</div>;
  if (!userData) return <div className="pp-loading">Kullanıcı bulunamadı.</div>;

  return (
    <div className="pp">
      {/* COVER & HEADER (Sadece Görüntüleme) */}
      <header className="pp__cover">
        <img
          className="pp__coverImg"
          src={userData.cover_photo || DEFAULT_COVER}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = DEFAULT_COVER;
          }}
          alt="Kapak"
        />
        <div className="pp__coverOverlay" />

        {/* Geri Dön Butonu */}
        <button
          className="pp__changeCoverBtn"
          style={{ left: 20, right: "auto" }} // Sol üste al
          onClick={() => navigate("/anasayfa")}
        >
          ← Ana Sayfaya Dön
        </button>

        <div className="pp__coverInner">
          <div className="pp__identity">
            <div className="pp__avatarWrap">
              <img
                className="pp__avatar"
                src={userData.profile_photo || DEFAULT_AVATAR}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = DEFAULT_AVATAR;
                }}
                alt="Avatar"
              />
            </div>

            <div className="pp__who">
              <h1 className="pp__name">{userData.full_name}</h1>
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
                  🎓 {userData.grade || "-"} .Sınıf
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* BODY */}
      <div className="pp__body">
        <div className="pp__grid" style={{ gridTemplateColumns: "1fr" }}>
          {" "}
          {/* Tek kolon */}
          <main className="pp__main">
            {/* 🔥 SENİN EKLEMEK İSTEDİĞİN GÜNCEL KISIM BURASI 🔥 */}

            {/* TAB BUTONLARI */}
            <div className="pp__tabs">
              <button
                className={`pp__btn ${
                  activeTab === "events" ? "pp__btnPrimary" : ""
                }`}
                onClick={() => setActiveTab("events")}
              >
                🎟️ Katıldığı Etkinlikler ({events.length})
              </button>
              <button
                className={`pp__btn ${
                  activeTab === "comments" ? "pp__btnPrimary" : ""
                }`}
                onClick={() => setActiveTab("comments")}
              >
                💬 Yorumları ({comments.length})
              </button>
            </div>

            {/* 1. ETKİNLİKLER */}
            {activeTab === "events" && (
              <section className="pp__card">
                <div className="pp__eventsGrid">
                  {events.length > 0 ? (
                    events.map((ev) => (
                      <article className="pp__event" key={ev.id}>
                        <div className="pp__eventImgWrap">
                          <img
                            className="pp__eventImg"
                            src="https://images.unsplash.com/photo-1501612780327-45045538702b?auto=format&fit=crop&w=1200&q=80"
                            alt={ev.title}
                          />
                          <span className="pp__tag">{ev.university}</span>
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
                      Bu kullanıcı henüz bir etkinliğe katılmamış.
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* 2. YORUMLAR */}
            {activeTab === "comments" && (
              <section className="pp__card">
                <div className="pp__panel">
                  <div className="pp__panelBlock">
                    {comments.length > 0 ? (
                      comments.map((com) => (
                        <div key={com.id} className="pp__commentItem">
                          <div className="pp__commentHeader">
                            <span className="pp__commentEvent">
                              {com.event_title}
                            </span>
                            <span className="pp__commentDate">{com.date}</span>
                          </div>
                          <div className="pp__commentText">"{com.message}"</div>
                        </div>
                      ))
                    ) : (
                      <div className="pp__muted" style={{ padding: "10px" }}>
                        Henüz yorum yapmamış.
                      </div>
                    )}
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
