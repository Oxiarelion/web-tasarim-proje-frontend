import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../Styles/AdminPanel.css";

const AdminPanel = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [messages, setMessages] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mesaj, setMesaj] = useState("");
  const [userSearch, setUserSearch] = useState("");

  // Modal states
  const [showBanModal, setShowBanModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showUniversityModal, setShowUniversityModal] = useState(false);
  const [showUniversityCreateModal, setShowUniversityCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedUniversity, setSelectedUniversity] = useState(null);
  
  // Form states
  const [banReason, setBanReason] = useState("");
  const [banUntil, setBanUntil] = useState("");
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    location: "",
    university_id: "",
    start_datetime: "",
    end_datetime: "",
    image_url: "",
    max_participants: "",
    is_active: true
  });
  const [universityLogoUrl, setUniversityLogoUrl] = useState("");
  const [universityForm, setUniversityForm] = useState({
    name: "",
    logo_url: ""
  });

  // Reply Modal States
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    if (!token || !user.is_admin) {
      navigate("/", { replace: true });
    }
  }, [token, user.is_admin, navigate]);

  useEffect(() => {
    switch (activeTab) {
      case "dashboard":
        fetchDashboard();
        break;
      case "users":
        fetchUsers();
        break;
      case "events":
        fetchEvents();
        fetchUniversities();
        break;
      case "messages":
        fetchMessages();
        break;
      case "feedbacks":
        fetchFeedbacks();
        break;
      case "universities":
        fetchUniversities();
        break;
      default:
        break;
    }
  }, [activeTab]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/admin/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.basarili) {
        setDashboard(data.stats);
      }
    } catch (err) {
      setMesaj("❌ Dashboard yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.basarili) {
        setUsers(data.users);
      }
    } catch (err) {
      setMesaj("❌ Kullanıcılar yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/admin/events", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.basarili) {
        setEvents(data.events);
      }
    } catch (err) {
      setMesaj("❌ Etkinlikler yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const fetchUniversities = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/admin/universities", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.basarili) {
        setUniversities(data.universities);
      }
    } catch (err) {
      console.error("Üniversiteler yüklenemedi:", err);
    }
  };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/admin/messages", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.basarili) {
        setMessages(data.messages);
      }
    } catch (err) {
      setMesaj("❌ Mesajlar yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/admin/feedbacks", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.basarili) {
        setFeedbacks(data.feedbacks);
      }
    } catch (err) {
      setMesaj("❌ Feedbackler yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  // Ban/Unban işlemleri
  const openBanModal = (user) => {
    setSelectedUser(user);
    setBanReason("");
    setBanUntil("");
    setShowBanModal(true);
  };

  const handleBan = async () => {
    if (!selectedUser) return;
    
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/admin/users/${selectedUser.user_id}/ban`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ban_reason: banReason || "Belirsiz neden",
          ban_until: banUntil || null
        })
      });
      const data = await res.json();
      
      if (data.basarili) {
        setMesaj("✅ Kullanıcı banlandı");
        setShowBanModal(false);
        fetchUsers();
      } else {
        setMesaj(`❌ ${data.mesaj}`);
      }
    } catch (err) {
      setMesaj("❌ Ban işlemi başarısız");
    }
  };

  const handleUnban = async (userId) => {
    if (!confirm("Bu kullanıcının banını kaldırmak istediğinizden emin misiniz?")) return;
    
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/admin/users/${userId}/unban`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      
      if (data.basarili) {
        setMesaj("✅ Ban kaldırıldı");
        fetchUsers();
      } else {
        setMesaj(`❌ ${data.mesaj}`);
      }
    } catch (err) {
      setMesaj("❌ Unban işlemi başarısız");
    }
  };

  // Etkinlik işlemleri
  const openEventModal = async (event = null) => {
    if (event) {
      // Düzenleme modu
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/admin/events/${event.event_id}/edit`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        
        if (data.basarili) {
          setSelectedEvent(data.event);
          setEventForm({
            title: data.event.title || "",
            description: data.event.description || "",
            location: data.event.location || "",
            university_id: data.event.university_id || "",
            start_datetime: data.event.start_datetime || "",
            end_datetime: data.event.end_datetime || "",
            image_url: data.event.image_url || "",
            max_participants: data.event.max_participants || "",
            is_active: data.event.is_active
          });
        }
      } catch (err) {
        setMesaj("❌ Etkinlik bilgileri yüklenemedi");
      }
    } else {
      // Yeni etkinlik modu
      setSelectedEvent(null);
      setEventForm({
        title: "",
        description: "",
        location: "",
        university_id: "",
        start_datetime: "",
        end_datetime: "",
        image_url: "",
        max_participants: "",
        is_active: true
      });
    }
    setShowEventModal(true);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEventForm({...eventForm, image_url: reader.result});
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEventSubmit = async (e) => {
    e.preventDefault();
    
    const url = selectedEvent 
      ? `http://127.0.0.1:8000/api/admin/events/${selectedEvent.event_id}`
      : `http://127.0.0.1:8000/api/admin/events`;
    
    const method = selectedEvent ? "PUT" : "POST";
    
    try {
      const res = await fetch(url, {
        method: method,
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(eventForm)
      });
      const data = await res.json();
      
      if (data.basarili) {
        setMesaj(`✅ Etkinlik ${selectedEvent ? "güncellendi" : "oluşturuldu"}`);
        setShowEventModal(false);
        fetchEvents();
      } else {
        setMesaj(`❌ ${data.mesaj}`);
      }
    } catch (err) {
      setMesaj("❌ İşlem başarısız");
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm("Bu kullanıcıyı silmek istediğinizden emin misiniz?")) return;
    
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.basarili) {
        setMesaj("✅ Kullanıcı silindi");
        fetchUsers();
      } else {
        setMesaj(`❌ ${data.mesaj}`);
      }
    } catch (err) {
      setMesaj("❌ Kullanıcı silinirken hata oluştu");
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!confirm("Bu etkinliği silmek istediğinizden emin misiniz?")) return;
    
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/admin/events/${eventId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.basarili) {
        setMesaj("✅ Etkinlik silindi");
        fetchEvents();
      } else {
        setMesaj(`❌ ${data.mesaj}`);
      }
    } catch (err) {
      setMesaj("❌ Etkinlik silinirken hata oluştu");
    }
  };

  const handleDeleteMessage = async (contactId) => {
    if (!confirm("Bu mesajı silmek istediğinizden emin misiniz?")) return;
    
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/admin/messages/${contactId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.basarili) {
        setMesaj("✅ Mesaj silindi");
        fetchMessages();
      } else {
        setMesaj(`❌ ${data.mesaj}`);
      }
    } catch (err) {
      setMesaj("❌ Mesaj silinirken hata oluştu");
    }
  };

  // Üniversite işlemleri
  const openUniversityModal = (university) => {
    setSelectedUniversity(university);
    setUniversityLogoUrl(university.logo_url || "");
    setShowUniversityModal(true);
  };

  const openUniversityCreateModal = () => {
    setUniversityForm({ name: "", logo_url: "" });
    setShowUniversityCreateModal(true);
  };

  const handleUniversityUpdate = async () => {
    if (!selectedUniversity) return;
    
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/admin/universities/${selectedUniversity.university_id}`, {
        method: "PUT",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          logo_url: universityLogoUrl
        })
      });
      const data = await res.json();
      
      if (data.basarili) {
        setMesaj("✅ Üniversite logosu güncellendi");
        setShowUniversityModal(false);
        fetchUniversities();
      } else {
        setMesaj(`❌ ${data.mesaj}`);
      }
    } catch (err) {
      setMesaj("❌ Güncelleme başarısız");
    }
  };

  const handleUniversityCreate = async (e) => {
    e.preventDefault();
    
    if (!universityForm.name.trim()) {
      setMesaj("❌ Üniversite adı gerekli");
      return;
    }
    
    try {
      const res = await fetch("http://127.0.0.1:8000/api/admin/universities", {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(universityForm)
      });
      const data = await res.json();
      
      if (data.basarili) {
        setMesaj("✅ Üniversite eklendi");
        setShowUniversityCreateModal(false);
        fetchUniversities();
      } else {
        setMesaj(`❌ ${data.mesaj}`);
      }
    } catch (err) {
      setMesaj("❌ Üniversite eklenirken hata oluştu");
    }
  };

  const handleDeleteUniversity = async (universityId, universityName) => {
    if (!confirm(`${universityName} üniversitesini silmek istediğinizden emin misiniz?`)) return;
    
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/admin/universities/${universityId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.basarili) {
        setMesaj("✅ Üniversite silindi");
        fetchUniversities();
      } else {
        setMesaj(`❌ ${data.mesaj}`);
      }
    } catch (err) {
      setMesaj("❌ Üniversite silinirken hata oluştu");
    }
  };

  // Feedback Yanıtlama İşlemleri
  const openReplyModal = (feedback) => {
    setSelectedFeedback(feedback);
    setReplyMessage("");
    setShowReplyModal(true);
  };

  const handleReplySubmit = async () => {
    if (!replyMessage.trim()) {
      setMesaj("❌ Yanıt mesajı boş olamaz");
      return;
    }

    try {
      const res = await fetch(`http://127.0.0.1:8000/api/admin/feedbacks/${selectedFeedback.feedback_id}/reply`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: replyMessage })
      });
      const data = await res.json();
      
      if (data.basarili) {
        setMesaj("✅ Yanıt başarıyla gönderildi");
        setShowReplyModal(false);
        fetchFeedbacks();
      } else {
        setMesaj(`❌ ${data.mesaj}`);
      }
    } catch (err) {
      setMesaj("❌ Yanıt gönderme başarısız");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/", { replace: true });
  };

  return (
    <div className="admin-panel">
      {/* Sidebar */}
      <div className="admin-sidebar">
        <div className="admin-logo">
          <h2>🔐 Admin Panel</h2>
          <p className="admin-user">{user.email}</p>
        </div>
        
        <nav className="admin-nav">
          <button
            className={activeTab === "dashboard" ? "active" : ""}
            onClick={() => setActiveTab("dashboard")}
          >
            📊 Dashboard
          </button>
          <button
            className={activeTab === "users" ? "active" : ""}
            onClick={() => setActiveTab("users")}
          >
            👥 Kullanıcılar
          </button>
          <button
            className={activeTab === "events" ? "active" : ""}
            onClick={() => setActiveTab("events")}
          >
            📅 Etkinlikler
          </button>
          <button
            className={activeTab === "messages" ? "active" : ""}
            onClick={() => setActiveTab("messages")}
          >
            📧 İletişim Mesajları
          </button>
          <button
            className={activeTab === "feedbacks" ? "active" : ""}
            onClick={() => setActiveTab("feedbacks")}
          >
            💬 Geri Bildirimler
          </button>
          <button
            className={activeTab === "universities" ? "active" : ""}
            onClick={() => setActiveTab("universities")}
          >
            🏛️ Üniversiteler
          </button>
        </nav>
        
        <button className="logout-btn" onClick={handleLogout}>
          🚪 Çıkış Yap
        </button>
      </div>

      {/* Main Content */}
      <div className="admin-main">
        {mesaj && (
          <div className={`admin-alert ${mesaj.includes("✅") ? "success" : "error"}`}>
            {mesaj}
            <button onClick={() => setMesaj("")}>✕</button>
          </div>
        )}

        {loading ? (
          <div className="loading">Yükleniyor...</div>
        ) : (
          <>
            {/* DASHBOARD */}
            {activeTab === "dashboard" && dashboard && (
              <div className="dashboard">
                <h1>📊 Dashboard</h1>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-info">
                      <h3>{dashboard.total_users}</h3>
                      <p>Toplam Kullanıcı</p>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">📅</div>
                    <div className="stat-info">
                      <h3>{dashboard.total_events}</h3>
                      <p>Toplam Etkinlik</p>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">✅</div>
                    <div className="stat-info">
                      <h3>{dashboard.active_events}</h3>
                      <p>Aktif Etkinlik</p>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">📧</div>
                    <div className="stat-info">
                      <h3>{dashboard.total_messages}</h3>
                      <p>İletişim Mesajı</p>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">💬</div>
                    <div className="stat-info">
                      <h3>{dashboard.total_feedbacks}</h3>
                      <p>Geri Bildirim</p>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">⏳</div>
                    <div className="stat-info">
                      <h3>{dashboard.pending_feedbacks}</h3>
                      <p>Bekleyen Feedback</p>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">🆕</div>
                    <div className="stat-info">
                      <h3>{dashboard.new_users_week}</h3>
                      <p>Bu Hafta Kayıt</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* KULLANICILAR */}
            {activeTab === "users" && (
              <div className="content-section">
                <div className="section-header">
                  <h1>👥 Kullanıcı Yönetimi</h1>
                  <div className="header-actions">
                    <input
                      type="text"
                      className="admin-search-input"
                      placeholder="🔍 Kullanıcı ara (isim, email)..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                    />
                    <p className="count">{users.filter(u => 
                      (u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) || 
                       u.email?.toLowerCase().includes(userSearch.toLowerCase()))
                    ).length} kullanıcı</p>
                  </div>
                </div>
                <div className="table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Ad Soyad</th>
                        <th>Email</th>
                        <th>Rol</th>
                        <th>Durum</th>
                        <th>Ban</th>
                        <th>Kayıt Tarihi</th>
                        <th>İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users
                        .filter(u => 
                          userSearch === "" || 
                          u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) || 
                          u.email?.toLowerCase().includes(userSearch.toLowerCase())
                        )
                        .map((u) => (
                        <tr key={u.user_id}>
                          <td>{u.user_id}</td>
                          <td>{u.full_name || "—"}</td>
                          <td>{u.email}</td>
                          <td>
                            <span className={`badge ${u.is_admin ? "admin" : "user"}`}>
                              {u.is_admin ? "Admin" : "Kullanıcı"}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${u.is_active ? "active" : "inactive"}`}>
                              {u.is_active ? "Aktif" : "Pasif"}
                            </span>
                          </td>
                          <td>
                            {u.is_banned ? (
                              <span className="badge banned" title={u.ban_reason}>
                                Banlı ⛔
                              </span>
                            ) : (
                              <span className="badge">—</span>
                            )}
                          </td>
                          <td>{u.created_at ? new Date(u.created_at).toLocaleDateString("tr-TR") : "—"}</td>
                          <td className="action-buttons">
                            {u.is_banned ? (
                              <button 
                                className="btn-unban"
                                onClick={() => handleUnban(u.user_id)}
                                title="Ban Kaldır"
                              >
                                ✅
                              </button>
                            ) : (
                              <button 
                                className="btn-ban"
                                onClick={() => openBanModal(u)}
                                title="Banla"
                              >
                                ⛔
                              </button>
                            )}
                            <button 
                              className="btn-delete"
                              onClick={() => handleDeleteUser(u.user_id)}
                              title="Sil"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ETKİNLİKLER */}
            {activeTab === "events" && (
              <div className="content-section">
                <div className="section-header">
                  <h1>📅 Etkinlik Yönetimi</h1>
                  <div>
                    <button className="btn-add" onClick={() => openEventModal()}>
                      ➕ Yeni Etkinlik
                    </button>
                    <p className="count">{events.length} etkinlik</p>
                  </div>
                </div>
                <div className="table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Fotoğraf</th>
                        <th>Başlık</th>
                        <th>Üniversite</th>
                        <th>Lokasyon</th>
                        <th>Başlangıç</th>
                        <th>Max Katılımcı</th>
                        <th>Durum</th>
                        <th>İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((e) => (
                        <tr key={e.event_id}>
                          <td>{e.event_id}</td>
                          <td>
                            {e.image_url ? (
                              <img src={e.image_url} alt={e.title} className="event-thumb" />
                            ) : (
                              <div className="event-thumb-placeholder">📅</div>
                            )}
                          </td>
                          <td>{e.title}</td>
                          <td>{e.university || "—"}</td>
                          <td>{e.location || "—"}</td>
                          <td>
                            {e.start_datetime ? new Date(e.start_datetime).toLocaleString("tr-TR") : "—"}
                          </td>
                          <td>{e.max_participants || "—"}</td>
                          <td>
                            <span className={`badge ${e.is_active ? "active" : "inactive"}`}>
                              {e.is_active ? "Aktif" : "Pasif"}
                            </span>
                          </td>
                          <td className="action-buttons">
                            <button 
                              className="btn-edit"
                              onClick={() => openEventModal(e)}
                              title="Düzenle"
                            >
                              ✏️
                            </button>
                            <button 
                              className="btn-delete"
                              onClick={() => handleDeleteEvent(e.event_id)}
                              title="Sil"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* MESAJLAR */}
            {activeTab === "messages" && (
              <div className="content-section">
                <div className="section-header">
                  <h1>📧 İletişim Mesajları</h1>
                  <p className="count">{messages.length} mesaj</p>
                </div>
                <div className="messages-grid">
                  {messages.map((m) => (
                    <div key={m.contact_id} className="message-card">
                      <div className="message-header">
                        <div>
                          <h3>{m.full_name}</h3>
                          <p className="email">{m.email}</p>
                        </div>
                        <button 
                          className="btn-delete-small"
                          onClick={() => handleDeleteMessage(m.contact_id)}
                        >
                          🗑️
                        </button>
                      </div>
                      <div className="message-meta">
                        <span className="badge">{m.user_type}</span>
                        <span className="badge">{m.topic_type}</span>
                      </div>
                      <p className="message-content">{m.message}</p>
                      <p className="message-date">
                        {m.created_at ? new Date(m.created_at).toLocaleString("tr-TR") : "—"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FEEDBACKLER */}
            {activeTab === "feedbacks" && (
              <div className="content-section">
                <div className="section-header">
                  <h1>💬 Geri Bildirimler</h1>
                  <p className="count">{feedbacks.length} feedback</p>
                </div>
                <div className="table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Kullanıcı</th>
                        <th>Etkinlik</th>
                        <th>Tür</th>
                        <th>Başlık</th>
                        <th>Mesaj</th>
                        <th>Durum</th>
                        <th>Tarih</th>
                        <th>İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feedbacks.map((f) => (
                        <tr key={f.feedback_id}>
                          <td>{f.feedback_id}</td>
                          <td>{f.user_email || "—"}</td>
                          <td>{f.event_title || "—"}</td>
                          <td>{f.type || "—"}</td>
                          <td>{f.title || "—"}</td>
                          <td className="truncate">{f.message}</td>
                          <td>
                            <span className={`badge ${f.status === "pending" ? "pending" : "resolved"}`}>
                              {f.status}
                            </span>
                          </td>
                          <td>
                            {f.created_at ? new Date(f.created_at).toLocaleDateString("tr-TR") : "—"}
                          </td>
                          <td className="action-buttons">
                            {f.status === "pending" && (
                              <button 
                                className="btn-edit" 
                                onClick={() => openReplyModal(f)}
                                title="Yanıtla"
                              >
                                ✉️
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ÜNİVERSİTELER */}
            {activeTab === "universities" && (
              <div className="content-section">
                <div className="section-header">
                  <h1>🏛️ Üniversiteler</h1>
                  <div>
                    <button className="btn-add" onClick={openUniversityCreateModal}>
                      ➕ Yeni Üniversite
                    </button>
                    <p className="count">{universities.length} üniversite</p>
                  </div>
                </div>
                <div className="table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Logo</th>
                        <th>Üniversite Adı</th>
                        <th>Logo URL</th>
                        <th>İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {universities.map((uni) => (
                        <tr key={uni.university_id}>
                          <td>{uni.university_id}</td>
                          <td>
                            <div className="table-logo-preview">
                              {uni.logo_url ? (
                                <img src={uni.logo_url} alt={uni.name} />
                              ) : (
                                <span className="no-logo">🚫</span>
                              )}
                            </div>
                          </td>
                          <td className="highlight-text">{uni.name}</td>
                          <td className="truncate" style={{maxWidth: "300px"}}>
                            {uni.logo_url || <span className="text-muted">Logo yok</span>}
                          </td>
                          <td className="action-buttons">
                            <button 
                              className="btn-edit"
                              onClick={() => openUniversityModal(uni)}
                              title="Logo Düzenle"
                            >
                              ✏️
                            </button>
                            <button 
                              className="btn-delete"
                              onClick={() => handleDeleteUniversity(uni.university_id, uni.name)}
                              title="Sil"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* BAN MODAL */}
      {showBanModal && (
        <div className="modal-overlay" onClick={() => setShowBanModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>⛔ Kullanıcıyı Banla</h2>
            <p className="modal-user">Kullanıcı: <strong>{selectedUser?.email}</strong></p>
            
            <label>
              Ban Nedeni:
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Ban nedenini yazın..."
                rows="3"
              />
            </label>
            
            <label>
              Ban Bitiş Tarihi (opsiyonel - boş bırakılırsa kalıcı):
              <input
                type="datetime-local"
                value={banUntil}
                onChange={(e) => setBanUntil(e.target.value)}
              />
            </label>
            
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowBanModal(false)}>
                İptal
              </button>
              <button className="btn-confirm-ban" onClick={handleBan}>
                Banla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ETKİNLİK MODAL */}
      {showEventModal && (
        <div className="modal-overlay" onClick={() => setShowEventModal(false)}>
          <div className="modal-content event-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedEvent ? "✏️ Etkinlik Düzenle" : "➕ Yeni Etkinlik"}</h2>
            
            <form onSubmit={handleEventSubmit}>
              <label>
                Başlık *:
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                  required
                />
              </label>
              
              <label>
                Açıklama:
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                  rows="4"
                />
              </label>
              
              <label>
                Lokasyon:
                <input
                  type="text"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({...eventForm, location: e.target.value})}
                />
              </label>
              
              <label>
                Üniversite:
                <select
                  value={eventForm.university_id}
                  onChange={(e) => setEventForm({...eventForm, university_id: e.target.value})}
                >
                  <option value="">Seçiniz</option>
                  {universities.map(uni => (
                    <option key={uni.university_id} value={uni.university_id}>
                      {uni.name}
                    </option>
                  ))}
                </select>
              </label>
              
              <label>
                Maksimum Katılımcı Sayısı:
                <input
                  type="number"
                  min="0"
                  value={eventForm.max_participants}
                  onChange={(e) => setEventForm({...eventForm, max_participants: e.target.value})}
                  placeholder="Örn: 100"
                />
              </label>
              
              <div className="form-row">
                <label>
                  Başlangıç:
                  <input
                    type="datetime-local"
                    value={eventForm.start_datetime}
                    onChange={(e) => setEventForm({...eventForm, start_datetime: e.target.value})}
                  />
                </label>
                
                <label>
                  Bitiş:
                  <input
                    type="datetime-local"
                    value={eventForm.end_datetime}
                    onChange={(e) => setEventForm({...eventForm, end_datetime: e.target.value})}
                  />
                </label>
              </div>
              
              <label>
                Fotoğraf:
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
                {eventForm.image_url && (
                  <img src={eventForm.image_url} alt="Preview" className="image-preview" />
                )}
              </label>
              
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={eventForm.is_active}
                  onChange={(e) => setEventForm({...eventForm, is_active: e.target.checked})}
                />
                Aktif
              </label>
              
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowEventModal(false)}>
                  İptal
                </button>
                <button type="submit" className="btn-confirm">
                  {selectedEvent ? "Güncelle" : "Oluştur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ÜNİVERSİTE MODAL */}
      {showUniversityModal && selectedUniversity && (
        <div className="modal-overlay" onClick={() => setShowUniversityModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>✏️ Logo Düzenle</h2>
            <p className="modal-user"><strong>{selectedUniversity.name}</strong></p>

            <div style={{textAlign: "center", margin: "20px 0"}}>
              <img 
                src={universityLogoUrl || "https://placehold.co/100?text=No+Logo"} 
                alt="Logo Önizleme" 
                style={{width: "100px", height: "100px", objectFit: "contain", borderRadius: "50%", background: "#fff", padding: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.2)"}}
                onError={(e) => e.target.src = "https://placehold.co/100?text=Error"}
              />
            </div>
            
            <label>
              Logo URL'si:
              <input
                type="text"
                value={universityLogoUrl}
                onChange={(e) => setUniversityLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                style={{width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.2)", color: "white"}}
              />
            </label>
            
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowUniversityModal(false)}>
                İptal
              </button>
              <button className="btn-confirm" onClick={handleUniversityUpdate}>
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* YENİ ÜNİVERSİTE EKLEME MODAL */}
      {showUniversityCreateModal && (
        <div className="modal-overlay" onClick={() => setShowUniversityCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>➕ Yeni Üniversite Ekle</h2>
            
            <form onSubmit={handleUniversityCreate}>
              <label>
                Üniversite Adı *:
                <input
                  type="text"
                  value={universityForm.name}
                  onChange={(e) => setUniversityForm({...universityForm, name: e.target.value})}
                  placeholder="Örn: Bilkent Üniversitesi"
                  required
                  style={{width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.2)", color: "white"}}
                />
              </label>
              
              <label>
                Logo URL'si (opsiyonel):
                <input
                  type="text"
                  value={universityForm.logo_url}
                  onChange={(e) => setUniversityForm({...universityForm, logo_url: e.target.value})}
                  placeholder="https://example.com/logo.png"
                  style={{width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.2)", color: "white"}}
                />
              </label>

              {universityForm.logo_url && (
                <div style={{textAlign: "center", margin: "15px 0"}}>
                  <p style={{fontSize: "12px", color: "#aaa", marginBottom: "8px"}}>Logo Önizleme:</p>
                  <img 
                    src={universityForm.logo_url} 
                    alt="Logo Önizleme" 
                    style={{width: "80px", height: "80px", objectFit: "contain", borderRadius: "50%", background: "#fff", padding: "8px", boxShadow: "0 2px 10px rgba(0,0,0,0.2)"}}
                    onError={(e) => e.target.src = "https://placehold.co/80?text=Error"}
                  />
                </div>
              )}
              
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowUniversityCreateModal(false)}>
                  İptal
                </button>
                <button type="submit" className="btn-confirm">
                  Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FEEDBACK YANITLAMA MODALI */}
      {showReplyModal && selectedFeedback && (
        <div className="modal-overlay" onClick={() => setShowReplyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>✉️ Feedback Yanıtla</h2>
            <div style={{marginBottom: "1rem", padding: "10px", background: "rgba(255,255,255,0.05)", borderRadius: "8px"}}>
              <p><strong>Kullanıcı:</strong> {selectedFeedback.user_full_name || selectedFeedback.user_email}</p>
              <p><strong>Konu:</strong> {selectedFeedback.title || "Başlıksız"}</p>
              <p><strong>Mesaj:</strong> {selectedFeedback.message}</p>
            </div>
            
            <label>
              Yanıtınız:
              <textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Kullanıcıya gönderilecek yanıtı yazın..."
                rows="5"
                style={{width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.2)", color: "white", marginTop: "5px"}}
              />
            </label>
            
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowReplyModal(false)}>
                İptal
              </button>
              <button className="btn-confirm" onClick={handleReplySubmit}>
                Gönder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
