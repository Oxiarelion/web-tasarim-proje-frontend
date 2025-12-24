import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./Pages/LoginPage";
import MainPage from "./Pages/MainPage";
import UserProfile from "./Pages/UserProfile";
function App() {
  return (
    <Router>
      <Routes>
        {/* Site açılınca direkt Login gelsin */}
        <Route path="/" element={<LoginPage />} />

        {/* Giriş başarılı olunca buraya yönlendireceğiz */}
        <Route path="/anasayfa" element={<MainPage />} />
        <Route path="/profil" element={<UserProfile />} />
      </Routes>
    </Router>
  );
}

export default App;
