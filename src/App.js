import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import CreateProfile from "./CreateProfile";
import FormPage from "./FormPage";
import ResultPage from "./ResultPage";
import API_URL from './config';

const App = () => {
  useEffect(() => {
    // Only redirect to CAS login if at the root path
    if (window.location.pathname === "/") {
      window.location.href = `${API_URL}/cas-login`;
    }
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/create-profile" element={<CreateProfile />} />
        <Route path="/fill-form" element={<FormPage />} />
        <Route path="/results" element={<ResultPage />} />
      </Routes>
    </Router>
  );
};

export default App;