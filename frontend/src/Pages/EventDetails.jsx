import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../Styles/EventDetails.css"; // CSS dosyanın doğru yerde olduğundan emin ol

const DEFAULT_EVENT_IMG =
  "https://images.unsplash.com/photo-1523580494863-6f3031224c94?q=80&w=2070";
const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [event, setEvent] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);

  // --- Verileri Çek ---
  const fetchDetails = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/etkinlik/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.basarili) {
        setEvent(data.etkinlik);
        setComments(data.yorumlar);
      } else {
        alert(data.mesaj);
        navigate("/tum-etkinlikler"); // Hata olursa da listeye dönsün
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) navigate("/");
    else fetchDetails();
  }, [id]);

  // --- Yorum Gönder ---
  const handlePostComment = async () => {
    if (!newComment.trim()) return alert("Lütfen bir yorum yazın.");

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/etkinlik/${id}/yorum`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: newComment,
            rating: null, // Daha sonra rating eklenebilir
          }),
        }
      );

      const data = await res.json();
      if (data.basarili) {
        console.log("✅ Yorum başarıyla eklendi!");
        setNewComment("");
        // Yeni yorum'u hemen state'e ekle (optimistic update)
        setComments((prev) => [data.yorum, ...prev]);
      } else {
        alert("Yorum gönderilemedi: " + data.mesaj);
      }
    } catch (err) {
      console.error("Yorum gönderme hatası:", err);
      alert("Sunucu hatası oluştu.");
    }
  };

  if (loading) return <div className="ed-loading">Yükleniyor...</div>;
  if (!event) return null;

  return (
    <div className="ed-container">
      {/* Arka Plan Video */}
      <div className="video-background">
        <video src="/video.mp4" autoPlay loop muted playsInline />
        <div className="video-overlay"></div>
      </div>

      {/* --- Geri Dön Butonu (FIXED SOL ALTI) --- */}
      <button
        className="ed-back-btn"
        onClick={() => navigate(-1)}
      >
        ← Dön
      </button>

      <div className="ed-content">
        <div className="ed-left-column">
          {/* --- Etkinlik Kartı --- */}
          <div className="ed-card">
            <div className="ed-image-wrap">
              <img
                src={event.image_url || DEFAULT_EVENT_IMG}
                alt="Etkinlik"
                className="ed-image"
              />
            </div>

            <div className="ed-info">
              <h1 className="ed-title">{event.title}</h1>
              <div className="ed-meta">
                <span>📅 {event.date}</span>
                <span>🕒 {event.time}</span>
                <span>📍 {event.location}</span>
              </div>
              <p className="ed-desc">{event.description}</p>
            </div>
          </div>
        </div>

        <div className="ed-right-column">
          {/* --- Yorumlar Bölümü --- */}
          <div className="ed-comments-section">
            <h3>💬 Yorumlar ({comments.length})</h3>

            <div className="ed-new-comment">
              <textarea
                rows="3"
                placeholder="Bu etkinlik hakkında ne düşünüyorsun?"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              ></textarea>
              <button onClick={handlePostComment}>Gönder</button>
            </div>

            <div
              className="ed-comment-list"
              style={{ maxHeight: "500px", overflowY: "auto" }}
            >
              {comments.length > 0 ? (
                comments.map((com) => (
                  <div key={com.id} className="ed-comment-item">
                    <img
                      src={com.user_photo || DEFAULT_AVATAR}
                      alt="avatar"
                      className="ed-comment-avatar"
                      onClick={() => navigate(`/profil/${com.user_id}`)}
                      style={{ cursor: "pointer" }}
                    />
                    <div className="ed-comment-content">
                      <div className="ed-comment-header">
                        <span
                          className="ed-comment-author"
                          onClick={() => navigate(`/profil/${com.user_id}`)}
                        >
                          {com.user_name}
                        </span>
                        <span className="ed-comment-date">{com.date}</span>
                      </div>
                      <p className="ed-comment-text">{com.message}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="ed-no-comment">
                  Henüz yorum yapılmamış. İlk yorumu sen yap!
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
