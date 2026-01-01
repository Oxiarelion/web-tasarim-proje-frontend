import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../Styles/UniversitiesPage.css";
import Aurora from "../Components/Aurora";

const DEFAULT_LOGO = "https://cdn-icons-png.flaticon.com/512/31 67/3176366.png";

const UniversitiesPage = () => {
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuAcik, setMenuAcik] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) navigate("/", { replace: true });
  }, [navigate, token]);

  useEffect(() => {
    fetchUniversities();
  }, []);

  const fetchUniversities = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/universities");
      const data = await res.json();
      if (data.basarili) {
        setUniversities(data.universities);
      }
    } catch (error) {
      console.error("Üniversiteler yüklenemedi:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  const toggleMenu = () => setMenuAcik(!menuAcik);

  if (!token) return null;

  return (
    <>
      <div className="aurora-bg-wrapper">
        <Aurora colorStops={["#D8D8F6", "#4F7C82", "#B8E3E9"]} speed={0.5} />
      </div>

      <div className="main-container" style={{ overflowY: "auto", height: "100vh" }}>
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
          <div style={{ width: "50px" }}></div>
        </nav>

        {/* SIDEBAR */}
        <div className={`sidebar ${menuAcik ? "open" : ""}`}>
          <button className="close-btn" onClick={toggleMenu}>
            &times;
          </button>
          <ul className="sidebar-links">
            <li>
              <a onClick={() => navigate("/profil")} style={{ cursor: "pointer" }}>
                Profil
              </a>
            </li>
            <li>
              <a onClick={() => navigate("/anasayfa")} style={{ cursor: "pointer" }}>
                Ana Sayfa
              </a>
            </li>
            <li>
              <a style={{ fontWeight: "bold", color: "#fbbf24" }}>
                Üniversite
              </a>
            </li>
            <li>
              <a onClick={() => navigate("/tum-etkinlikler")} style={{ cursor: "pointer" }}>
                Etkinlikler
              </a>
            </li>
            <li>
              <a onClick={() => navigate("/feedback")} style={{ cursor: "pointer" }}>
                İstek & Şikayet
              </a>
            </li>
            <li>
              <a onClick={() => navigate("/sss")} style={{ cursor: "pointer" }}>
                SSS
              </a>
            </li>
            <li>
              <a onClick={handleLogout} style={{ color: "#800000", cursor: "pointer" }}>
                Çıkış
              </a>
            </li>
          </ul>
        </div>
        {menuAcik && <div className="overlay" onClick={toggleMenu}></div>}

        {/* CONTENT */}
        <div className="universities-container">
          <h1 className="universities-title">🏛️ Ankara Üniversiteleri</h1>
          <p className="universities-subtitle">
            Campushub06'da etkinliklerini takip edebileceğiniz üniversiteler
          </p>

          {loading ? (
            <div className="loading-message">Yükleniyor...</div>
          ) : universities.length > 0 ? (
            <div className="universities-grid">
              {universities.map((uni) => (
                <div key={uni.university_id} className="university-card">
                  <div className="university-logo-wrapper">
                    <img
                      src={uni.logo_url || DEFAULT_LOGO}
                      alt={uni.name}
                      className="university-logo"
                      onError={(e) => {
                        e.target.src = DEFAULT_LOGO;
                      }}
                    />
                  </div>
                  <h3 className="university-name">{uni.name}</h3>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>⚠️ Üniversite Bulunamadı</h3>
              <p>Henüz sisteme üniversite eklenmemiş.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UniversitiesPage;
