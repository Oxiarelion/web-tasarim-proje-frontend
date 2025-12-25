import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Sayfalar
import LoginPage from "./Pages/LoginPage";
import MainPage from "./Pages/MainPage";
import UserProfile from "./Pages/UserProfile";
import ResetPassword from "./Pages/ResetPassword"; // 🔥 1. Bunu import et

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/anasayfa" element={<MainPage />} />
        <Route path="/profil" element={<UserProfile />} />

        {/* 🔥 2. Sadece bu satırı ekle (Mail linki buraya gelecek) */}
        <Route path="/sifre-sifirla" element={<ResetPassword />} />
      </Routes>
    </Router>
  );
}

export default App;
