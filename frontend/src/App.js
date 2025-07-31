// frontend/src/App.js

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import SignUp from './SignUp';
import Login from './Login';
import Dashboard from './Dashboard';
import { sentences } from './sentences';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './AuthContext';
import './App.css';

function Home() {
  return (
    <div className="auth-card">
      <h2>Secure Banking with Behavioral Authentication</h2>
      <p>Welcome! This project demonstrates a password-less login system based on your unique typing and mouse patterns. Please Sign Up to create a profile or Login if you already have one.</p>
    </div>
  );
}

function App() {
  const [signUpSentence, setSignUpSentence] = useState('');
  const [loginSentence, setLoginSentence] = useState('');
  const [navVisible, setNavVisible] = useState(true);

  useEffect(() => {
    const index1 = Math.floor(Math.random() * sentences.length);
    let index2 = Math.floor(Math.random() * sentences.length);
    while (index1 === index2) {
      index2 = Math.floor(Math.random() * sentences.length);
    }
    setSignUpSentence(sentences[index1]);
    setLoginSentence(sentences[index2]);
  }, []);

  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-center" reverseOrder={false} />
        
        <header className="app-header">
          {/* --- NEW: Wrapper for left-aligned items --- */}
          <div className="header-left">
            <button className="menu-toggle" onClick={() => setNavVisible(!navVisible)}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            <nav className={`main-nav ${navVisible ? '' : 'hidden'}`}>
              <NavLink to="/" className={({ isActive }) => isActive ? "nav-active" : ""}>Home</NavLink>
              <NavLink to="/signup" className={({ isActive }) => isActive ? "nav-active" : ""}>Sign Up</NavLink>
              <NavLink to="/login" className={({ isActive }) => isActive ? "nav-active" : ""}>Login</NavLink>
            </nav>
          </div>
          {/* You can add items here later (e.g., a user profile icon) and they will appear on the right */}
        </header>

        <main className="main-content">
          <div className="content-wrapper">
            <Routes>
              <Route path="/signup" element={<SignUp sentence={signUpSentence} />} />
              <Route path="/login" element={<Login sentence={loginSentence} />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/" element={<Home />} />
            </Routes>
          </div>
        </main>
      </Router>
    </AuthProvider>
  );
}

export default App;