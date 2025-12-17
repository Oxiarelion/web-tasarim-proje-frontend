import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "../Styles/MainPage.css";

const MainPage = () => {
  const [menuAcik, setMenuAcik] = useState(false);
  const [date, setDate] = useState(new Date());

  const [tatiller, setTatiller] = useState([]);
  const [dbEtkinlikler, setDbEtkinlikler] = useState([]);

  const navigate = useNavigate();

  const ayIsimleri = [
    "OCAK",
    "ŞUB",
    "MAR",
    "NİS",
    "MAY",
    "HAZ",
    "TEM",
    "AĞU",
    "EYL",
    "EKİ",
    "KAS",
    "ARA",
  ];

  // --- 1. GÜVENLİK KONTROLÜ (YENİ EKLENDİ) ---
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      // Token yoksa seni buraya sokmam, giriş yap!
      navigate("/");
    }
  }, [navigate]);

  // --- 2. ÇIKIŞ YAP (GÜNCELLENDİ: Token Siler) ---
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  // --- 3. BACKEND'DEN VERİ ÇEKME (GÜNCELLENDİ: Token Header Ekler) ---
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return; // Token yoksa zaten yukarıdaki kod atacak

    fetch("http://127.0.0.1:8000/api/etkinlikler", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // <-- İŞTE BU SATIR ÇOK ÖNEMLİ
      },
    })
      .then((response) => {
        if (response.status === 401) {
          // Token süresi dolmuş veya geçersiz
          handleLogout();
          throw new Error("Oturum süresi doldu");
        }
        return response.json();
      })
      .then((data) => {
        if (data.basarili && Array.isArray(data.etkinlikler)) {
          setDbEtkinlikler(data.etkinlikler);
        } else {
          setDbEtkinlikler([]);
        }
      })
      .catch((error) => console.error("API Bağlantı Hatası:", error));
  }, []);

  // --- RESMİ TATİLLER API (DEĞİŞMEDİ) ---
  useEffect(() => {
    fetch("https://date.nager.at/api/v3/PublicHolidays/2025/TR")
      .then((res) => res.json())
      .then((data) => setTatiller(data))
      .catch((err) => console.error("Tatil API Hatası:", err));
  }, []);

  const toggleMenu = () => setMenuAcik(!menuAcik);

  // --- TAKVİM İŞARETLEME MANTIĞI (DEĞİŞMEDİ) ---
  const tileContent = ({ date, view }) => {
    if (view === "month") {
      const yil = date.getFullYear();
      const ay = String(date.getMonth() + 1).padStart(2, "0");
      const gun = String(date.getDate()).padStart(2, "0");
      const yerelTarih = `${yil}-${ay}-${gun}`;

      const tatilVarMi = tatiller.find((t) => t.date === yerelTarih);
      const etkinlikVarMi = dbEtkinlikler.find((e) => e.date === yerelTarih);

      if (!tatilVarMi && !etkinlikVarMi) return null;

      return (
        <div className="takvim-nokta-container">
          {tatilVarMi && (
            <div
              className="tatil-noktasi"
              title={`Tatil: ${tatilVarMi.localName}`}
            ></div>
          )}
          {etkinlikVarMi && (
            <div className="etkinlik-noktasi" title="Etkinlik Var"></div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <>
      {/* ARKA PLAN VİDEOSU */}
      <div className="video-wrapper">
        <video className="video-background" autoPlay loop muted playsInline>
          <source src="/video.mp4" type="video/mp4" />
        </video>
        <div className="video-overlay"></div>
      </div>

      <div className="main-container">
        <nav className="navbar">
          <div className="hamburger-icon" onClick={toggleMenu}>
            &#9776;
          </div>
          <div className="logo-container">
            <h1 className="logo-text">Campushub06</h1>
          </div>
          <div className="navbar-right-placeholder"></div>
        </nav>

        <div className={`sidebar ${menuAcik ? "open" : ""}`}>
          <button className="close-btn" onClick={toggleMenu}>
            &times;
          </button>
          <ul className="sidebar-links">
            <li>
              <a href="#profil">Profil</a>
            </li>
            <li>
              <a href="#universite">Üniversite</a>
            </li>
            <li>
              <a href="#etkinlikler">Etkinlikler</a>
            </li>
            <li>
              <a href="#iletisim">İletişim</a>
            </li>
            <li>
              <a
                onClick={handleLogout}
                style={{ color: "#800000", cursor: "pointer" }}
              >
                Çıkış
              </a>
            </li>
          </ul>
        </div>

        {menuAcik && <div className="overlay" onClick={toggleMenu}></div>}

        <div className="hero-section">
          <div className="content-box">
            <h2>Güncel Etkinlikler</h2>
            {dbEtkinlikler.length > 0 ? (
              <div className="etkinlik-container">
                {dbEtkinlikler.map((etkinlik, index) => {
                  let gun = "??";
                  let ayAdi = "AY";
                  if (etkinlik.date) {
                    const parcalar = etkinlik.date.split("-");
                    if (parcalar.length === 3) {
                      gun = parcalar[2];
                      const ayIndex = parseInt(parcalar[1]) - 1;
                      ayAdi = ayIsimleri[ayIndex] || "AY";
                    }
                  }
                  return (
                    <div key={index} className="etkinlik-kart">
                      <div className="etkinlik-tarih">
                        <span>{gun}</span>
                        <small>{ayAdi}</small>
                      </div>
                      <div className="etkinlik-detay">
                        <h3>{etkinlik.title}</h3>
                        {etkinlik.university && (
                          <span
                            style={{
                              fontSize: "0.8rem",
                              color: "#fbbf24",
                              fontWeight: "bold",
                              display: "block",
                              marginBottom: "5px",
                            }}
                          >
                            {etkinlik.university}
                          </span>
                        )}
                        <p className="aciklama">
                          {etkinlik.description || "Açıklama yok."}
                        </p>
                        <p className="konum">
                          📍 {etkinlik.location || "Konum Yok"}
                          {etkinlik.time
                            ? ` | 🕒 ${etkinlik.time.substring(0, 5)}`
                            : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ opacity: 0.8, marginTop: "20px" }}>
                <p>Şu an sistemde aktif etkinlik bulunmuyor.</p>
                <small>
                  (Veritabanı bağlantısı veya veri kontrolü gerekebilir)
                </small>
              </div>
            )}
          </div>

          {/* TAKVİM BÖLÜMÜ */}
          <div className="calendar-wrapper">
            <Calendar
              onChange={setDate}
              value={date}
              tileContent={tileContent}
              locale="tr-TR"
            />
            <div
              style={{
                fontSize: "10px",
                textAlign: "center",
                marginTop: "8px",
                opacity: 0.8,
                color: "white",
                display: "flex",
                justifyContent: "center",
                gap: "10px",
              }}
            >
              <span>
                <span style={{ color: "#ff6b6b" }}>●</span> Tatil
              </span>
              <span>
                <span style={{ color: "#fbbf24" }}>●</span> Etkinlik
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MainPage;
