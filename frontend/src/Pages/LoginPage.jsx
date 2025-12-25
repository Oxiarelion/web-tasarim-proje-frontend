import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../Styles/LoginPage.css";

const LoginPage = () => {
  const navigate = useNavigate();

  // --- State Yönetimi ---
  const [view, setView] = useState("login"); // 'login' | 'register' | 'forgot'

  // Form Verileri
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [mesaj, setMesaj] = useState("");
  const [loading, setLoading] = useState(false);

  // --- Zaten girişliyse yönlendir ---
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/anasayfa", { replace: true });
    }
  }, [navigate]);

  // Ekran değişince mesajları ve bazı inputları temizle
  const switchView = (newView) => {
    setMesaj("");
    setName("");
    setPassword("");
    setView(newView);
  };

  // --- 1. GİRİŞ YAP ---
  const handleLogin = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/giris", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (data.basarili) {
        setMesaj("✅ " + data.mesaj);
        if (data.token) localStorage.setItem("token", data.token);
        if (data.user) localStorage.setItem("user", JSON.stringify(data.user));

        setTimeout(() => {
          navigate("/anasayfa", { replace: true });
        }, 1000);
      } else {
        setMesaj("❌ " + (data.mesaj || "Giriş başarısız."));
      }
    } catch (error) {
      setMesaj("❌ Sunucu hatası.");
    }
  };

  // --- 2. KAYIT OL ---
  const handleRegister = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/kayit-ol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();

      if (data.basarili) {
        setMesaj("✅ Kayıt başarılı! Giriş yapabilirsiniz.");
        setTimeout(() => switchView("login"), 2000); // 2 saniye sonra girişe at
      } else {
        setMesaj("❌ " + data.mesaj);
      }
    } catch (error) {
      setMesaj("❌ Kayıt hatası.");
    }
  };

  // --- 3. ŞİFREMİ UNUTTUM ---
  const handleForgot = async () => {
    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/sifremi-unuttum",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );
      const data = await response.json();

      if (data.basarili) {
        setMesaj("✅ " + data.mesaj);
      } else {
        setMesaj("❌ " + data.mesaj);
      }
    } catch (error) {
      setMesaj("❌ Hata oluştu.");
    }
  };

  // --- FORM GÖNDERME ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMesaj("");
    setLoading(true);

    if (view === "login") await handleLogin();
    else if (view === "register") await handleRegister();
    else if (view === "forgot") await handleForgot();

    setLoading(false);
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
            {/* Kilit İkonu */}
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

          {/* Başlık Dinamik Değişiyor */}
          <h2 className="welcome-title">
            {view === "login" && "Hoş Geldiniz"}
            {view === "register" && "Hesap Oluştur"}
            {view === "forgot" && "Şifre Sıfırlama"}
          </h2>
          <p className="welcome-subtitle">
            {view === "login" && "Hesabınıza giriş yapın"}
            {view === "register" && "Aramıza katılın"}
            {view === "forgot" && "E-posta adresinizi girin"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {/* İSİM ALANI (Sadece Kayıt Olurken Görünür) */}
          {view === "register" && (
            <div className="input-group">
              <div className="input-icon">
                {/* User Icon */}
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
                type="text"
                placeholder="Ad Soyad"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="login-input"
                required
              />
            </div>
          )}

          {/* E-POSTA ALANI (Her Zaman Görünür) */}
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
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
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

          {/* ŞİFRE ALANI (Şifremi Unuttum hariç görünür) */}
          {view !== "forgot" && (
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
                  <rect
                    x="3"
                    y="11"
                    width="18"
                    height="11"
                    rx="2"
                    ry="2"
                  ></rect>
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
                  // Eye Open
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
                  // Eye Off
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
          )}

          {/* Mesaj Kutusu */}
          {mesaj && (
            <div
              className={`message-box ${
                mesaj.includes("✅") ? "success" : "error"
              }`}
            >
              {mesaj}
            </div>
          )}

          {/* Gönder Butonu */}
          <button type="submit" className="login-button" disabled={loading}>
            {loading
              ? "İşlem Yapılıyor..."
              : view === "login"
              ? "Giriş Yap"
              : view === "register"
              ? "Kayıt Ol"
              : "Bağlantı Gönder"}
          </button>

          {/* --- ALT LİNKLER (Dinamik Değişir) --- */}
          <div className="form-footer">
            {view === "login" && (
              <>
                <span
                  onClick={() => switchView("forgot")}
                  style={{
                    cursor: "pointer",
                    color: "white",
                    textDecoration: "underline",
                  }}
                >
                  Şifremi Unuttum
                </span>
                <p style={{ marginTop: "10px", opacity: 0.8 }}>
                  Hesabınız yok mu?{" "}
                  <span
                    onClick={() => switchView("register")}
                    style={{
                      fontWeight: "bold",
                      marginLeft: "5px",
                      cursor: "pointer",
                      color: "#34d399",
                    }}
                  >
                    Hesap Oluştur
                  </span>
                </p>
              </>
            )}

            {view === "register" && (
              <p style={{ marginTop: "10px", opacity: 0.8 }}>
                Zaten hesabınız var mı?{" "}
                <span
                  onClick={() => switchView("login")}
                  style={{
                    fontWeight: "bold",
                    marginLeft: "5px",
                    cursor: "pointer",
                    color: "#34d399",
                  }}
                >
                  Giriş Yap
                </span>
              </p>
            )}

            {view === "forgot" && (
              <p style={{ marginTop: "10px", opacity: 0.8 }}>
                <span
                  onClick={() => switchView("login")}
                  style={{
                    fontWeight: "bold",
                    cursor: "pointer",
                    color: "#34d399",
                  }}
                >
                  ← Giriş Ekranına Dön
                </span>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
