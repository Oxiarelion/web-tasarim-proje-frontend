import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./Pages/LoginPage"; // İsim değişti
import MainPage from "./Pages/MainPage"; // İsim değişti

function App() {
  return (
    <Router>
      <Routes>
        {/* Site açılınca direkt Login gelsin */}
        <Route path="/" element={<LoginPage />} />

        {/* Giriş başarılı olunca buraya yönlendireceğiz */}
        <Route path="/anasayfa" element={<MainPage />} />
      </Routes>
    </Router>
  );
}

export default App;
