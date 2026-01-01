import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "../Styles/MainPage.css";
import Aurora from "../Components/Aurora";

const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

const MainPage = () => {
  const [menuAcik, setMenuAcik] = useState(false);
  const [date, setDate] = useState(new Date());
  const [secilenUni, setSecilenUni] = useState("");

  const [tatiller, setTatiller] = useState([]);
  const [dbEtkinlikler, setDbEtkinlikler] = useState([]);
  const [favoriler, setFavoriler] = useState([]);

  // Arama State'leri
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

  useEffect(() => {
    function handleClickOutside(event) {
      if (aramaRef.current && !aramaRef.current.contains(event.target)) {
        setAramaAcik(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  const handleProfileClick = () => {
    navigate("/profil");
  };

  // 🔥 GARANTİLİ KAYDIRMA FONKSİYONU (Diğerleri için)
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      setMenuAcik(false);
    } else {
      console.warn("Element bulunamadı:", id);
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
      console.error("Arama hatası:", error);
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
      .then((res) => {
        if (res.status === 401) {
          handleLogout();
          throw new Error("Oturum doldu");
        }
        return res.json();
      })
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
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.basarili && Array.isArray(data.takvim)) {
          setFavoriler(data.takvim.map((item) => item.id));
        } else if (Array.isArray(data)) {
          setFavoriler(data.map((item) => item.id));
        }
      })
      .catch((err) => console.log(err));
  }, [token]);

  useEffect(() => {
    Promise.all([
      fetch("https://date.nager.at/api/v3/PublicHolidays/2025/TR").then((res) => res.json()),
      fetch("https://date.nager.at/api/v3/PublicHolidays/2026/TR").then((res) => res.json())
    ])
      .then(([data2025, data2026]) => {
        setTatiller([...data2025, ...data2026]);
      })
      .catch((err) => console.error("Tatil verisi alınamadı:", err));
  }, []);

  const toggleFavori = async (etkinlik) => {
    if (!token) return;
    const userStr = localStorage.getItem("user");
    const userEmail = userStr ? JSON.parse(userStr).email : null;

    if (!userEmail) return alert("Hata: Kullanıcı maili bulunamadı.");

    const isFavori = favoriler.includes(etkinlik.id);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/takvim/ekle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ event_id: etkinlik.id, email: userEmail }),
      });
      const result = await response.json();
      if (response.ok && (result.basarili || result.success)) {
        if (isFavori)
          setFavoriler((prev) => prev.filter((id) => id !== etkinlik.id));
        else setFavoriler((prev) => [...prev, etkinlik.id]);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const toggleMenu = () => setMenuAcik(!menuAcik);

  const tileContent = ({ date, view }) => {
    if (view === "month") {
      const yil = date.getFullYear();
      const ay = String(date.getMonth() + 1).padStart(2, "0");
      const gun = String(date.getDate()).padStart(2, "0");
      const tarihStr = `${yil}-${ay}-${gun}`;

      const tatil = tatiller.find((t) => t.date === tarihStr);
      const etkinlik = dbEtkinlikler.find((e) => e.date === tarihStr);
      const fav = dbEtkinlikler.find(
        (e) => e.date === tarihStr && favoriler.includes(e.id)
      );

      if (!tatil && !etkinlik && !fav) return null;

      return (
        <div className="takvim-nokta-container">
          {tatil && (
            <div className="tatil-noktasi" title={tatil.localName}></div>
          )}
          {fav ? (
            <div className="favori-noktasi"></div>
          ) : (
            etkinlik && <div className="etkinlik-noktasi"></div>
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
          <div className="logo-center">
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
                    onClick={() => {
                      navigate(`/profil/${user.user_id}`);
                      setAramaAcik(false);
                    }}
                  >
                    <img
                      src={user.profile_photo || DEFAULT_AVATAR}
                      alt="avatar"
                      className="search-avatar"
                    />
                    <div className="search-info">
                      <div className="search-name">{user.full_name}</div>
                      <div className="search-dept">
                        {user.department || "Bölüm Yok"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* SIDEBAR */}
        <div className={`sidebar ${menuAcik ? "open" : ""}`}>
          <button className="close-btn" onClick={toggleMenu}>
            &times;
          </button>
          <ul className="sidebar-links">
            <li>
              <a onClick={handleProfileClick} style={{ cursor: "pointer" }}>
                Profil
              </a>
            </li>

            <li>
              <a
                onClick={() => navigate("/universiteler")}
                style={{ cursor: "pointer" }}
              >
                Üniversite
              </a>
            </li>

            {/* 🔥 BURASI GÜNCELLENDİ: ARTIK YENİ SAYFAYA GİDİYOR */}
            <li>
              <a
                onClick={() => navigate("/tum-etkinlikler")}
                style={{ cursor: "pointer" }}
              >
                Etkinlikler
              </a>
            </li>

            <li>
              <a
                onClick={() => navigate("/feedback")}
                style={{ cursor: "pointer" }}
              >
                İstek & Şikayet
              </a>
            </li>
            <li>
              <a
                onClick={() => navigate("/sss")}
                style={{ cursor: "pointer" }}
              >
                SSS
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

        <div className="main-layout">
          {/* SOL KOLON */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "25px" }}
          >
            {/* ÜNİVERSİTE BÖLÜMÜ ID */}
            <div className="filter-header" id="universite">
              <h2 className="page-title">Güncel Etkinlikler</h2>
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

            {/* ETKİNLİKLER BÖLÜMÜ ID */}
            <div className="events-grid" id="etkinlikler">
              {dbEtkinlikler.length > 0 ? (
                dbEtkinlikler
                  .filter((etkinlik) => {
                    // Sadece gelecek etkinlikleri göster (bugünden sonra)
                    if (!etkinlik.date) return false;
                    const bugün = new Date();
                    bugün.setHours(0, 0, 0, 0);
                    const etkinlikTarihi = new Date(etkinlik.date);
                    return etkinlikTarihi >= bugün;
                  })
                  .map((etkinlik, index) => {
                    let gun = "??",
                      ayAdi = "AY";
                    if (etkinlik.date) {
                      const parcalar = etkinlik.date.split("-");
                      if (parcalar.length === 3) {
                        gun = parcalar[2];
                        ayAdi = ayIsimleri[parseInt(parcalar[1]) - 1] || "AY";
                      }
                    }
                    const isFav = favoriler.includes(etkinlik.id);

                    return (
                      <div
                        key={index}
                        className="etkinlik-kutu"
                        // TIKLAMA KAPALI
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
                            onClick={() => toggleFavori(etkinlik)}
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

            {/* İLETİŞİM / FOOTER BÖLÜMÜ */}
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
              <p>📧 campushub06@gmail.com</p>
            </div>
          </div>

          {/* SAĞ KOLON */}
          <div className="sticky-sidebar">
            <Calendar
              onChange={setDate}
              value={date}
              tileContent={tileContent}
              locale="tr-TR"
            />
            <div className="calendar-legend">
              <span>
                <span style={{ color: "#0d60beff" }}>●</span> Tatil
              </span>
              <span>
                <span style={{ color: "#fbbf24" }}>●</span> Etkinlik
              </span>
              <span>
                <span style={{ color: "#ce1a03ff" }}>●</span> Favorilerim
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MainPage;
