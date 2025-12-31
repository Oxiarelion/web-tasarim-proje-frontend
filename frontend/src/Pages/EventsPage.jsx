import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../Styles/MainPage.css";
import Aurora from "../Components/Aurora";

const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

const EventsPage = () => {
  const [secilenUni, setSecilenUni] = useState("");
  const [dbEtkinlikler, setDbEtkinlikler] = useState([]);
  const [favoriler, setFavoriler] = useState([]);
  const [menuAcik, setMenuAcik] = useState(false);

  // Arama
  const [aramaMetni, setAramaMetni] = useState("");
  const [aramaSonuclar, setAramaSonuclar] = useState([]);
  const [aramaAcik, setAramaAcik] = useState(false);
  const aramaRef = useRef(null);

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

  useEffect(() => {
    if (!token) navigate("/", { replace: true });
  }, [navigate, token]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  // 🔥 KAYDIRMA FONKSİYONU (EKSİKTİ, EKLENDİ)
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      setMenuAcik(false);
    }
  };

  const handleSearch = async (text) => {
    setAramaMetni(text);
    if (text.length < 2) {
      setAramaSonuclar([]);
      setAramaAcik(false);
      return;
    }
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/kullanici-ara?q=${text}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (data.basarili) {
        setAramaSonuclar(data.sonuclar);
        setAramaAcik(true);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!token) return;
    let url = "http://127.0.0.1:8000/api/etkinlikler";
    if (secilenUni) url += `?university=${encodeURIComponent(secilenUni)}`;

    fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.basarili && Array.isArray(data.etkinlikler))
          setDbEtkinlikler(data.etkinlikler);
        else setDbEtkinlikler([]);
      })
      .catch((err) => console.error(err));
  }, [token, secilenUni]);

  useEffect(() => {
    if (!token) return;
    fetch("http://127.0.0.1:8000/api/takvim", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.basarili && Array.isArray(data.takvim))
          setFavoriler(data.takvim.map((i) => i.id));
      });
  }, [token]);

  const toggleFavori = async (etkinlik) => {
    const userStr = localStorage.getItem("user");
    const userEmail = userStr ? JSON.parse(userStr).email : null;
    if (!userEmail) return;

    try {
      const res = await fetch("http://127.0.0.1:8000/api/takvim/ekle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ event_id: etkinlik.id, email: userEmail }),
      });
      const data = await res.json();
      if (data.basarili) {
        if (favoriler.includes(etkinlik.id))
          setFavoriler((prev) => prev.filter((id) => id !== etkinlik.id));
        else setFavoriler((prev) => [...prev, etkinlik.id]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleMenu = () => setMenuAcik(!menuAcik);

  if (!token) return null;

  return (
    <>
      <div className="aurora-bg-wrapper">
        <Aurora colorStops={["#D8D8F6", "#4F7C82", "#B8E3E9"]} speed={0.5} />
      </div>

      <div
        className="main-container"
        style={{ overflowY: "auto", height: "100vh" }}
      >
        {/* NAVBAR */}
        <nav className="navbar-fixed">
          <div className="hamburger-icon" onClick={toggleMenu}>
            &#9776;
          </div>
          <div
            className="logo-center"
            onClick={() => navigate("/anasayfa")}
            style={{ cursor: "pointer" }}
          >
            <h1 className="logo-text">Campushub06</h1>
          </div>

          <div className="search-wrapper" ref={aramaRef}>
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Kullanıcı Ara..."
                className="search-input"
                value={aramaMetni}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => {
                  if (aramaMetni.length >= 2) setAramaAcik(true);
                }}
              />
            </div>
            {aramaAcik && aramaSonuclar.length > 0 && (
              <div className="search-dropdown">
                {aramaSonuclar.map((user) => (
                  <div
                    key={user.user_id}
                    className="search-result-item"
                    onClick={() => navigate(`/profil/${user.user_id}`)}
                  >
                    <img
                      src={user.profile_photo || DEFAULT_AVATAR}
                      className="search-avatar"
                      alt="avatar"
                    />
                    <div className="search-info">
                      <div className="search-name">{user.full_name}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* SIDEBAR - EKSİK OLANLAR EKLENDİ! */}
        <div className={`sidebar ${menuAcik ? "open" : ""}`}>
          <button className="close-btn" onClick={toggleMenu}>
            &times;
          </button>
          <ul className="sidebar-links">
            <li>
              <a
                onClick={() => navigate("/profil")}
                style={{ cursor: "pointer" }}
              >
                Profil
              </a>
            </li>

            <li>
              <a
                onClick={() => navigate("/anasayfa")}
                style={{ cursor: "pointer" }}
              >
                Ana Sayfa
              </a>
            </li>

            {/* Üniversite - Bu sayfadaki filtreye kaydırır */}
            <li>
              <a
                onClick={() => scrollToSection("universite")}
                style={{ cursor: "pointer" }}
              >
                Üniversite
              </a>
            </li>

            <li>
              <a style={{ fontWeight: "bold", color: "#fbbf24" }}>
                Etkinlikler
              </a>
            </li>

            {/* İletişim - Bu sayfadaki footera kaydırır */}
            <li>
              <a
                onClick={() => scrollToSection("iletisim")}
                style={{ cursor: "pointer" }}
              >
                İletişim
              </a>
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

        {/* İÇERİK - SADECE ETKİNLİKLER */}
        <div className="main-layout" style={{ display: "block" }}>
          {/* Üniversite ID'si eklendi (Menüden tıklayınca buraya gelir) */}
          <div
            className="filter-header"
            id="universite"
            style={{ marginBottom: "30px" }}
          >
            <h2 className="page-title">Tüm Etkinlikler</h2>
            <select
              value={secilenUni}
              onChange={(e) => setSecilenUni(e.target.value)}
              className="uni-select"
            >
              <option value="">Tüm Üniversiteler</option>
              {universiteler.map((uni, i) => (
                <option key={i} value={uni}>
                  {uni}
                </option>
              ))}
            </select>
          </div>

          <div className="events-grid">
            {dbEtkinlikler.length > 0 ? (
              dbEtkinlikler.map((etkinlik, index) => {
                let gun = "??",
                  ayAdi = "AY";
                if (etkinlik.date) {
                  const p = etkinlik.date.split("-");
                  if (p.length === 3) {
                    gun = p[2];
                    ayAdi = ayIsimleri[parseInt(p[1]) - 1] || "AY";
                  }
                }
                const isFav = favoriler.includes(etkinlik.id);

                return (
                  <div
                    key={index}
                    className="etkinlik-kutu"
                    onClick={() => navigate(`/etkinlik/${etkinlik.id}`)}
                    style={{ cursor: "pointer" }}
                  >
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
                      <button
                        className={`fav-btn ${isFav ? "active" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavori(etkinlik);
                        }}
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
                      </p>
                      <p
                        style={{
                          textAlign: "center",
                          color: "#fbbf24",
                          marginTop: "10px",
                          fontSize: "0.9rem",
                        }}
                      >
                        Detaylar için tıkla →
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-state">
                <h3>⚠️ Etkinlik Bulunamadı</h3>
              </div>
            )}
          </div>

          {/* İletişim ID'si eklendi (Menüden tıklayınca buraya gelir) */}
          <div
            id="iletisim"
            style={{
              marginTop: "50px",
              padding: "30px",
              background: "rgba(0,0,0,0.6)",
              borderRadius: "16px",
              color: "white",
              textAlign: "center",
            }}
          >
            <h3>Bizimle İletişime Geçin</h3>
            <p>Campushub06 ekibi olarak her zaman yanınızdayız.</p>
            <p>📧 info@campushub06.com</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default EventsPage;
