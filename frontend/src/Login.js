import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import api from './api';

const getFingerprint = () => {
  return new Promise((resolve) => {
    window.Fingerprint2.get((components) => {
      const values = components.map(component => component.value);
      const murmur = window.Fingerprint2.x64hash128(values.join(''), 31);
      resolve(murmur);
    });
  });
};

function Login({ sentence }) {
  const [email, setEmail] = useState('');
  const [text, setText] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const behavioralData = useRef([]);
  const navigate = useNavigate();
  const auth = useAuth();

  const handleEmailChange = (e) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(newEmail) && newEmail !== '') setEmailError('Please enter a valid email format.');
    else setEmailError('');
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
  };

  const handleKeyDown = (e) => {
    behavioralData.current.push({ type: 'keypress', key: e.key, timestamp: Date.now() });
  };

  const handleMouseMove = (e) => {
    if (Date.now() % 5 === 0) {
      behavioralData.current.push({ type: 'mousemove', x: e.clientX, y: e.clientY, timestamp: Date.now() });
    }
  };

  
  const handleLogin = async () => {
    if (emailError || email === '') { return toast.error("Please fix the email error."); }
    if (text.trim() !== sentence) { return toast.error("The text does not match the sentence."); }
    setLoading(true);
    try {
      const fingerprint = await getFingerprint();
      await api.post('/authenticate', { email, events: behavioralData.current, fingerprint });
      toast.success("Authentication successful!");
      auth.login(email);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <h2>Password-less Login</h2>
      <p>Enter your email and type the sentence below to authenticate with your behavior.</p>
      <div className="input-group">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
        <input type="email" placeholder="Enter your email" value={email} onChange={handleEmailChange} />
      </div>
      {emailError && <p className="error-text">{emailError}</p>}
      
      <div className="verification-box">
        <p>Please type the following sentence exactly as it appears:</p>
        <strong>{sentence}</strong>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => behavioralData.current.push({ type: 'keypress', key: e.key, timestamp: Date.now() })}
          onMouseMove={(e) => { if (Date.now() % 5 === 0) behavioralData.current.push({ type: 'mousemove', x: e.clientX, y: e.clientY, timestamp: Date.now() })}}
          placeholder="Start typing here..."
        ></textarea>
      </div>
      <button onClick={handleLogin} disabled={loading}>
        {loading ? 'Authenticating...' : 'Login'}
      </button>
    </div>
  );
}

export default Login;