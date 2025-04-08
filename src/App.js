import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import API_URL from './config';

// Components
import CreateProfile from './CreateProfile';
import FormPage from './FormPage';
import ResultPage from './ResultPage';

// Auth handling component
const CasLogin = () => {
  // Redirect to backend CAS login endpoint
  window.location.href = `${API_URL}/cas-login`;
  return <div>Redirecting to login...</div>;
};

// Landing page component
const LandingPage = () => {
  return (
    <div className="landing-page">
      <h1>IIIT Matchmaking</h1>
      <p>Find your perfect match based on personality compatibility!</p>
      <div className="cta-button">
        <button 
          className="login-button"
          onClick={() => {
            window.location.href = `${API_URL}/cas-login`;
          }}
        >
          Login with IIIT Account
        </button>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<CasLogin />} />
        <Route path="/create-profile" element={<CreateProfile />} />
        <Route path="/fill-form" element={<FormPage />} />
        <Route path="/results" element={<ResultPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;