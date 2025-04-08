import React from 'react';
import { Link } from 'react-router-dom';
import API_URL from '../config';

function Home() {
  return (
    <div className="home-container">
      <h1>Matchmaking App</h1>
      <p>Find your perfect match based on personality compatibility!</p>
      
      <div className="login-section">
        <h2>Ready to get started?</h2>
        <a href={`${API_URL}/cas-login`} className="login-button">
          Login with IIIT Account
        </a>
      </div>
    </div>
  );
}

export default Home;