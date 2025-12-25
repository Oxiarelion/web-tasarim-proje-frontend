import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "../Styles/LoginPage.css"; // Senin güzel tasarımını kullanır

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token"); // Linkteki şifreyi alır

  const [password, setPassword] = useState("");
  const [mesaj, setMesaj] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMesaj("");

    try {
      const res = await fetch("http://127.0.0.1:8000/api/sifre-sifirla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (data.basarili) {
        setMesaj("✅ Şifre değişti! Giriş ekranına yönlendiriliyorsunuz...");
        setTimeout(() => navigate("/"), 3000);
      } else {
        setMesaj("❌ " + data.mesaj);
      }
    } catch (err) {
      setMesaj("❌ Hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      {/* Video Arka Plan */}
      <div className="video-background">
        <video src="/video.mp4" autoPlay loop muted playsInline />
        <div className="video-overlay"></div>
      </div>

      <h1 className="app-title">Campushub06</h1>

      <div className="login-card">
        <div className="card-header">
          <div className="lock-icon-container">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h2 className="welcome-title">Yeni Şifre Belirle</h2>
          <p className="welcome-subtitle">Lütfen yeni şifrenizi girin</p>
        </div>

        <form onSubmit={handleReset} className="login-form">
          <div className="input-group">
            <div className="input-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <input
              type="password"
              placeholder="Yeni Şifre"
              className="login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {mesaj && (
            <div
              className={`message-box ${
                mesaj.includes("✅") ? "success" : "error"
              }`}
            >
              {mesaj}
            </div>
          )}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "Güncelleniyor..." : "Şifreyi Güncelle"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
