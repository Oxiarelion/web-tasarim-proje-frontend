import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../Styles/LoginPage.css";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mesaj, setMesaj] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // --- KRİTİK EKLENTİ 1: Zaten girişliyse Login'i gösterme, Main'e at ---
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      // replace: true -> Geçmişten Login sayfasını siler
      navigate("/anasayfa", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setMesaj("Lütfen tüm alanları doldurunuz.");
      return;
    }

    setLoading(true);
    setMesaj("");

    try {
      const response = await fetch("http://127.0.0.1:8000/api/giris", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (data.basarili) {
        setMesaj("✅ " + data.mesaj);

        if (data.token) {
          localStorage.setItem("token", data.token);
        }
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }

        // --- KRİTİK EKLENTİ 2: replace: true ile yönlendirme ---
        setTimeout(() => {
          navigate("/anasayfa", { replace: true });
        }, 1000);
      } else {
        setMesaj("❌ " + (data.mesaj || "Şifre veya e-posta hatalı."));
      }
    } catch (error) {
      console.error(error);
      setMesaj("❌ Sunucu hatası. Backend açık mı?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
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
          <h2 className="welcome-title">Hoş Geldiniz</h2>
          <p className="welcome-subtitle">Hesabınıza giriş yapın</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
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
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <input
              type="email"
              placeholder="E-posta Adresi"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login-input"
              required
            />
          </div>

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
              type={showPassword ? "text" : "password"}
              placeholder="Şifre"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input"
              required
            />
            <button
              type="button"
              className="toggle-password-btn"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
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
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              ) : (
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
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              )}
            </button>
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
            {loading ? "Giriş Yapılıyor..." : "Giriş Yap"}
          </button>

          <div className="form-footer">
            <a href="/forgot-password">Şifremi Unuttum</a>
            <p style={{ marginTop: "10px", opacity: 0.8 }}>
              Hesabınız yok mu?{" "}
              <a
                href="/signup"
                style={{ fontWeight: "bold", marginLeft: "5px" }}
              >
                Hesap Oluştur
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
