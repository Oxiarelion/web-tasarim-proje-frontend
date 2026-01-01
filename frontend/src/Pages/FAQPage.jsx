import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../Styles/FAQPage.css";

export default function FAQPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openFaqId, setOpenFaqId] = useState(null);

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }

    // Fetch FAQ data
    const fetchFaqs = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/faq");
        const data = await res.json();
        setFaqs(data.faqs || []);
      } catch (err) {
        console.error("FAQ fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFaqs();
  }, [token, navigate]);

  const toggleFaq = (id) => {
    setOpenFaqId(openFaqId === id ? null : id);
  };

  if (loading) {
    return (
      <div className="faq-loading">
        <div className="spinner"></div>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="faq-container">
      {/* Video Background */}
      <div className="faq-video-background">
        <video src="/video.mp4" autoPlay loop muted playsInline />
        <div className="faq-video-overlay"></div>
      </div>

      {/* Header */}
      <div className="faq-header">
        <h1>Sık Sorulan Sorular</h1>
        <p>CampusHub Ankara hakkında merak ettikleriniz</p>
      </div>

      {/* FAQ List */}
      <div className="faq-content">
        {faqs.map((faq) => (
          <div
            key={faq.id}
            className={`faq-item ${openFaqId === faq.id ? "active" : ""}`}
          >
            <div className="faq-question" onClick={() => toggleFaq(faq.id)}>
              <h3>{faq.question}</h3>
              <span className="faq-icon">
                {openFaqId === faq.id ? "−" : "+"}
              </span>
            </div>
            {openFaqId === faq.id && (
              <div className="faq-answer">
                <p>{faq.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Back Button */}
      <button className="faq-back-btn" onClick={() => navigate(-1)}>
        ← Geri Dön
      </button>
    </div>
  );
}
