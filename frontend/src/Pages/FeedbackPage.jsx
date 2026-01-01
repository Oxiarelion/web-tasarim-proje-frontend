import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../Styles/FeedbackPage.css";

export default function FeedbackPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [feedbackScope, setFeedbackScope] = useState("general"); // "general" or "event"
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [feedbackType, setFeedbackType] = useState(""); // "İstek", "Şikayet", "Öneri"
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }

    // Fetch events for dropdown
    const fetchEvents = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/etkinlikler", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.basarili) {
          setEvents(data.etkinlikler || []);
        }
      } catch (err) {
        console.error("Etkinlikler yüklenemedi:", err);
      }
    };

    fetchEvents();
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!feedbackType) {
      alert("Lütfen bir feedback türü seçin (İstek/Şikayet/Öneri)");
      return;
    }

    if (!message.trim()) {
      alert("Lütfen mesaj yazın.");
      return;
    }

    if (feedbackScope === "event" && !selectedEventId) {
      alert("Lütfen bir etkinlik seçin.");
      return;
    }

    setLoading(true);
    setSuccessMessage("");

    try {
      const payload = {
        type: feedbackType,
        title: title.trim() || null,
        message: message.trim(),
      };

      if (feedbackScope === "event") {
        payload.event_id = parseInt(selectedEventId);
      }

      const res = await fetch("http://127.0.0.1:8000/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.basarili) {
        setSuccessMessage("✅ Geri bildiriminiz başarıyla gönderildi!");
        // Reset form
        setFeedbackType("");
        setTitle("");
        setMessage("");
        setSelectedEventId("");
        setFeedbackScope("general");
      } else {
        alert("Hata: " + data.mesaj);
      }
    } catch (err) {
      console.error("Feedback gönderme hatası:", err);
      alert("Bir hata oluştu, lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="feedback-container">
      {/* Video Background */}
      <div className="feedback-video-background">
        <video src="/video.mp4" autoPlay loop muted playsInline />
        <div className="feedback-video-overlay"></div>
      </div>

      {/* Header */}
      <div className="feedback-header">
        <h1>İstek & Şikayet</h1>
        <p>Görüşleriniz bizim için değerli</p>
      </div>

      {/* Form */}
      <div className="feedback-form-wrapper">
        <form className="feedback-form" onSubmit={handleSubmit}>
          {/* Scope Selection */}
          <div className="form-group">
            <label>Feedback Kapsamı</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="scope"
                  value="general"
                  checked={feedbackScope === "general"}
                  onChange={(e) => setFeedbackScope(e.target.value)}
                />
                <span>Genel</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="scope"
                  value="event"
                  checked={feedbackScope === "event"}
                  onChange={(e) => setFeedbackScope(e.target.value)}
                />
                <span>Etkinlik Hakkında</span>
              </label>
            </div>
          </div>

          {/* Event Selection (if event scope) */}
          {feedbackScope === "event" && (
            <div className="form-group">
              <label>Etkinlik Seçin</label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="form-select"
                required
              >
                <option value="">-- Etkinlik Seçin --</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title} ({event.date})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Feedback Type */}
          <div className="form-group">
            <label>Feedback Türü *</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="type"
                  value="İstek"
                  checked={feedbackType === "İstek"}
                  onChange={(e) => setFeedbackType(e.target.value)}
                />
                <span>İstek</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="type"
                  value="Şikayet"
                  checked={feedbackType === "Şikayet"}
                  onChange={(e) => setFeedbackType(e.target.value)}
                />
                <span>Şikayet</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="type"
                  value="Öneri"
                  checked={feedbackType === "Öneri"}
                  onChange={(e) => setFeedbackType(e.target.value)}
                />
                <span>Öneri</span>
              </label>
            </div>
          </div>

          {/* Title */}
          <div className="form-group">
            <label>Başlık (Opsiyonel)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Kısa bir başlık..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Message */}
          <div className="form-group">
            <label>Mesajınız *</label>
            <textarea
              className="form-textarea"
              rows="5"
              placeholder="Detaylı açıklama yazın..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            ></textarea>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="success-message">{successMessage}</div>
          )}

          {/* Submit Button */}
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Gönderiliyor..." : "Gönder"}
          </button>
        </form>

        {/* Contact Info Footer */}
        <div className="feedback-contact-footer">
          <h3>Bizimle İletişime Geçin</h3>
          <p>Campushub06 ekibi olarak her zaman yanınızdayız.</p>
          <p>📧 campushub06@gmail.com</p>
        </div>
      </div>

      {/* Back Button */}
      <button className="feedback-back-btn" onClick={() => navigate(-1)}>
        ← Geri Dön
      </button>
    </div>
  );
}
