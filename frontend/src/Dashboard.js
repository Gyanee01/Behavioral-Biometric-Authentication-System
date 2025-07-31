import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import api from './api';

// SVG Icons for Tiles
const BalanceIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="tile-icon"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path><path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z"></path></svg>;
const CardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="tile-icon"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>;
const LoanIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="tile-icon"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>;
const NetBankingIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="tile-icon"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>;

function Dashboard() {
  const navigate = useNavigate();
  const auth = useAuth();
  const behavioralData = useRef([]);
  const idleTimer = useRef(null);

  const handleLogout = (message) => {
    toast.success(message, { icon: '👋' });
    auth.logout();
    navigate('/login');
  };

  const resetIdleTimer = () => {
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      handleLogout("You have been logged out due to inactivity.");
    }, 5 * 60 * 1000);
  };

  useEffect(() => {
    if (!auth.userEmail) {
      toast.error("You must be logged in to view this page.");
      navigate('/login');
      return;
    }

    resetIdleTimer();

    const handleActivity = (e) => {
      if (e.type === 'keydown') {
        behavioralData.current.push({ type: 'keypress', key: e.key, timestamp: Date.now() });
      } else if (e.type === 'mousemove') {
        if (Date.now() % 5 === 0) {
          behavioralData.current.push({ type: 'mousemove', x: e.clientX, y: e.clientY, timestamp: Date.now() });
        }
      }
      resetIdleTimer();
    };

    window.addEventListener('keydown', handleActivity);
    window.addEventListener('mousemove', handleActivity);

    const verificationInterval = setInterval(() => {
      if (behavioralData.current.length < 50) {
        behavioralData.current = [];
        return;
      }

      api.post('/verify-session', { events: behavioralData.current })
        .then(res => {
          console.log("Session behavior verified.");
          behavioralData.current = [];
        })
        .catch(err => {
          handleLogout("Suspicious activity detected! Logging you out.");
        });
    }, 15000);

    return () => {
      clearInterval(verificationInterval);
      clearTimeout(idleTimer.current);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('mousemove', handleActivity);
    };
  }, [auth.userEmail, navigate]);

  if (!auth.userEmail) {
    return null;
  }

  return (
    <div className="auth-card dashboard-card">
      <h2>Dashboard</h2>
      <p>Welcome back, <strong>{auth.userEmail}</strong>!</p>
      
      {/* --- THIS IS THE CORRECTED TEXT --- */}
      <p>Your session is now being actively monitored. You will be logged out after 5 minutes of inactivity or if suspicious activity is detected.</p>
      
      <div className="dashboard-grid">
        <div className="dashboard-tile">
          <BalanceIcon />
          <div className="tile-label">Check Balance</div>
        </div>
        <div className="dashboard-tile">
          <CardIcon />
          <div className="tile-label">Manage Cards</div>
        </div>
        <div className="dashboard-tile">
          <LoanIcon />
          <div className="tile-label">Loans</div>
        </div>
        <div className="dashboard-tile">
          <NetBankingIcon />
          <div className="tile-label">Net Banking</div>
        </div>
      </div>

      <button onClick={() => handleLogout("You have logged out.")} style={{marginTop: '30px'}}>Logout</button>
    </div>
  );
}

export default Dashboard;
