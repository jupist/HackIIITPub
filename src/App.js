import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import CreateProfile from "./CreateProfile";
import FormPage from "./FormPage";
import ResultPage from "./ResultPage";

const App = () => {
  useEffect(() => {
    // Only redirect to CAS login if the user is at the root path
    if (window.location.pathname === "/") {
      window.location.href = "http://localhost:5000/cas-login";
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
