import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
// CSS dosyasını dahil ediyoruz
import "../Styles/MainPage.css";
// Aurora bileşenini dahil ediyoruz
import Aurora from "../Components/Aurora";

const MainPage = () => {
  const [menuAcik, setMenuAcik] = useState(false);
  const [date, setDate] = useState(new Date());
  const [secilenUni, setSecilenUni] = useState("");

  const [tatiller, setTatiller] = useState([]);
  const [dbEtkinlikler, setDbEtkinlikler] = useState([]);

  // --- YENİ: Favori Etkinliklerin ID Listesi ---
  const [favoriler, setFavoriler] = useState([]);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const universiteler = [
    "Ankara Üniversitesi",
    "Hacettepe Üniversitesi",
    "ODTÜ",
    "Gazi Üniversitesi",
    "Bilkent Üniversitesi",
    "Başkent Üniversitesi",
    "TOBB ETÜ",
    "Yıldırım Beyazıt Üniversitesi",
  ];

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

  // --- 1. Güvenlik Kontrolü ---
  useEffect(() => {
    if (!token) navigate("/", { replace: true });
  }, [navigate, token]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  // --- 2. Tüm Etkinlikleri Çekme ---
  useEffect(() => {
    if (!token) return;
    let url = "http://127.0.0.1:8000/api/etkinlikler";
    if (secilenUni) {
      url += `?university=${encodeURIComponent(secilenUni)}`;
    }

    fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (response.status === 401) {
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
  }, [token, secilenUni]);

  // --- 3. Kullanıcının Favorilerini Çekme ---
  useEffect(() => {
    if (!token) return;

    fetch("http://127.0.0.1:8000/api/takvim", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        // Backend yapısına göre veri kontrolü
        if (data.basarili && Array.isArray(data.takvim)) {
          const favIds = data.takvim.map((item) => item.id);
          setFavoriler(favIds);
        } else if (Array.isArray(data)) {
          // Bazı backendler direkt liste döner
          const favIds = data.map((item) => item.id);
          setFavoriler(favIds);
        }
      })
      .catch((err) => console.log("Favoriler çekilemedi:", err));
  }, [token]);

  // --- 4. Tatilleri Çekme ---
  useEffect(() => {
    fetch("https://date.nager.at/api/v3/PublicHolidays/2025/TR")
      .then((res) => res.json())
      .then((data) => setTatiller(data))
      .catch((err) => console.error("Tatil API Hatası:", err));
  }, []);

  // --- YENİ: Favori Ekleme / Çıkarma İşlemi (GÜÇLENDİRİLMİŞ VERSİYON) ---
  const toggleFavori = async (etkinlik) => {
    if (!token) return;

    // 1. LocalStorage'dan kullanıcı e-postasını güvenli şekilde al
    const userStr = localStorage.getItem("user");
    let userEmail = null;

    if (userStr) {
      try {
        const userObj = JSON.parse(userStr);
        userEmail = userObj.email;
      } catch (e) {
        console.error("User bilgisi okunamadı", e);
      }
    }

    if (!userEmail) {
      alert(
        "Kullanıcı e-postası bulunamadı. Lütfen ÇIKIŞ yapıp tekrar GİRİŞ yapın."
      );
      return;
    }

    const isFavori = favoriler.includes(etkinlik.id);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/takvim/ekle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          event_id: etkinlik.id,
          email: userEmail,
        }),
      });

      // Cevabı al ve konsola yazdır (Hata ayıklama için)
      const result = await response.json();
      console.log("Backend Cevabı:", result);

      if (response.ok && (result.basarili || result.success)) {
        // Başarılıysa State'i güncelle
        if (isFavori) {
          setFavoriler((prev) => prev.filter((id) => id !== etkinlik.id));
        } else {
          setFavoriler((prev) => [...prev, etkinlik.id]);
        }
      } else {
        // Hata mesajını yakalamaya çalış
        const hataMesaji =
          result.mesaj ||
          result.message ||
          result.error ||
          result.detail ||
          JSON.stringify(result);
        alert("İşlem başarısız: " + hataMesaji);
      }
    } catch (error) {
      console.error("Favori işlemi hatası:", error);
      alert("Sunucuya bağlanırken hata oluştu. Konsolu kontrol edin.");
    }
  };

  const toggleMenu = () => setMenuAcik(!menuAcik);

  // --- Takvim Noktaları ---
  const tileContent = ({ date, view }) => {
    if (view === "month") {
      const yil = date.getFullYear();
      const ay = String(date.getMonth() + 1).padStart(2, "0");
      const gun = String(date.getDate()).padStart(2, "0");
      const yerelTarih = `${yil}-${ay}-${gun}`;

      const tatilVarMi = tatiller.find((t) => t.date === yerelTarih);
      const etkinlikVarMi = dbEtkinlikler.find((e) => e.date === yerelTarih);
      const favoriVarMi = dbEtkinlikler.find(
        (e) => e.date === yerelTarih && favoriler.includes(e.id)
      );

      if (!tatilVarMi && !etkinlikVarMi && !favoriVarMi) return null;

      return (
        <div className="takvim-nokta-container">
          {tatilVarMi && (
            <div
              className="tatil-noktasi"
              title={`Tatil: ${tatilVarMi.localName}`}
            ></div>
          )}

          {/* Eğer favori varsa YEŞİL nokta, yoksa ama etkinlik varsa SARI nokta */}
          {favoriVarMi ? (
            <div className="favori-noktasi" title="Takvimime Ekli"></div>
          ) : (
            etkinlikVarMi && (
              <div className="etkinlik-noktasi" title="Etkinlik Var"></div>
            )
          )}
        </div>
      );
    }
    return null;
  };

  if (!token) return null;

  return (
    <>
      <div className="aurora-bg-wrapper">
        <Aurora
          colorStops={["#001135", "#e592f0", "#1bb9be"]}
          blend={0.5}
          amplitude={1.0}
          speed={0.5}
        />
      </div>

      <div className="main-container">
        <nav className="navbar-fixed">
          <div className="hamburger-icon" onClick={toggleMenu}>
            &#9776;
          </div>
          <div className="logo-center">
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

        <div className="main-layout">
          {/* --- SOL KOLON --- */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "25px" }}
          >
            <div className="filter-header">
              <h2 className="page-title">Güncel Etkinlikler</h2>
              <select
                value={secilenUni}
                onChange={(e) => setSecilenUni(e.target.value)}
                className="uni-select"
              >
                <option value="">Tüm Üniversiteler</option>
                {universiteler.map((uni, index) => (
                  <option key={index} value={uni}>
                    {uni}
                  </option>
                ))}
              </select>
            </div>

            <div className="events-grid">
              {dbEtkinlikler.length > 0 ? (
                dbEtkinlikler.map((etkinlik, index) => {
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

                  const isFav = favoriler.includes(etkinlik.id);

                  return (
                    <div key={index} className="etkinlik-kutu">
                      <div className="kutu-header">
                        <div className="kutu-tarih">
                          <span className="kutu-gun">{gun}</span>
                          <span className="kutu-ay">{ayAdi}</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <h3 className="kutu-baslik">{etkinlik.title}</h3>
                          {etkinlik.university && (
                            <span className="kutu-uni">
                              {etkinlik.university}
                            </span>
                          )}
                        </div>

                        {/* --- Favori Butonu (Kalp) --- */}
                        <button
                          className={`fav-btn ${isFav ? "active" : ""}`}
                          onClick={() => toggleFavori(etkinlik)}
                          title={isFav ? "Favorilerden Çıkar" : "Takvime Ekle"}
                        >
                          {isFav ? "❤️" : "🤍"}
                        </button>
                      </div>

                      <div>
                        <p className="kutu-desc">
                          {etkinlik.description || "Açıklama yok."}
                        </p>
                        <p className="kutu-footer">
                          📍 {etkinlik.location || "Konum Yok"}
                          {etkinlik.time && (
                            <span style={{ float: "right" }}>
                              🕒 {etkinlik.time.substring(0, 5)}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="empty-state">
                  <h3>⚠️ Etkinlik Bulunamadı</h3>
                  <p>Bu filtreye uygun etkinlik yok.</p>
                  {secilenUni && (
                    <button
                      onClick={() => setSecilenUni("")}
                      className="clear-filter-btn"
                    >
                      Tümünü Göster
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* --- SAĞ KOLON (TAKVİM) --- */}
          <div className="sticky-sidebar">
            <Calendar
              onChange={setDate}
              value={date}
              tileContent={tileContent}
              locale="tr-TR"
            />
            <div className="calendar-legend">
              <span>
                <span style={{ color: "#0d60beff", fontSize: "1.2rem" }}>
                  ●
                </span>{" "}
                Tatil
              </span>
              <span>
                <span style={{ color: "#fbbf24", fontSize: "1.2rem" }}>●</span>{" "}
                Etkinlik
              </span>
              <span>
                <span style={{ color: "#ce1a03ff", fontSize: "1.2rem" }}>
                  ●
                </span>{" "}
                Favorilerim
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MainPage;
