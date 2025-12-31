import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Sayfalar
import LoginPage from "./Pages/LoginPage";
import MainPage from "./Pages/MainPage";
import UserProfile from "./Pages/UserProfile";
import ResetPassword from "./Pages/ResetPassword";
import PublicProfile from "./Pages/PublicProfile";
import EventDetails from "./Pages/EventDetails";
import EventsPage from "./Pages/EventsPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/anasayfa" element={<MainPage />} />
        <Route path="/sifre-sifirla" element={<ResetPassword />} />
        <Route path="/profil" element={<UserProfile />} />
        <Route path="/profil/:id" element={<PublicProfile />} />
        <Route path="/etkinlik/:id" element={<EventDetails />} />
        <Route path="/tum-etkinlikler" element={<EventsPage />} />
      </Routes>
    </Router>
  );
}

export default App;
