const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = 5001;

// Middleware
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.set('trust proxy', true);

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully.'))
  .catch(err => console.error('MongoDB connection error:', err));

// User Schema
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  behavioralProfile: {
    avgKeypressTime: { type: Number },
    keypressTimeStdDev: { type: Number },
    avgMouseSpeed: { type: Number }
  },
  deviceFingerprint: { type: String },
  country: { type: String }
});
const User = mongoose.model('User', UserSchema);

// JWT Verification Middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(403).json({ message: "No token provided." });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Failed to authenticate token." });
    }
    req.userEmail = decoded.email;
    next();
  });
};

// Signup Endpoint
app.post('/api/signup', async (req, res) => {
  const { email, events, fingerprint } = req.body;
  const userIp = req.ip;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({ message: 'An account with this email already exists.' });
  }

  let userCountry = 'Unknown';
  if (userIp !== '::1' && userIp !== '127.0.0.1') {
    try {
      const ipResponse = await axios.get(`http://ip-api.com/json/${userIp}?fields=country`);
      if (ipResponse.data.country) {
        userCountry = ipResponse.data.country;
      }
    } catch (error) {
      console.log("Could not fetch country for IP:", userIp);
    }
  }

  const keypressEvents = events.filter(e => e.type === 'keypress');
  const mouseMoveEvents = events.filter(e => e.type === 'mousemove');
  if (keypressEvents.length < 20) { return res.status(400).json({ message: 'Not enough typing data.' }); }
  const timeDiffs = [];
  for (let i = 1; i < keypressEvents.length; i++) { timeDiffs.push(keypressEvents[i].timestamp - keypressEvents[i - 1].timestamp); }
  const avgKeypressTime = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
  const squaredDiffs = timeDiffs.map(diff => Math.pow(diff - avgKeypressTime, 2));
  const keypressTimeStdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length);
  let avgMouseSpeed = 0;
  if (mouseMoveEvents.length > 1) {
    let totalDistance = 0;
    for (let i = 1; i < mouseMoveEvents.length; i++) {
        const dx = mouseMoveEvents[i].x - mouseMoveEvents[i - 1].x;
        const dy = mouseMoveEvents[i].y - mouseMoveEvents[i - 1].y;
        totalDistance += Math.sqrt(dx * dx + dy * dy);
    }
    const totalTime = (mouseMoveEvents[mouseMoveEvents.length - 1].timestamp - mouseMoveEvents[0].timestamp) / 1000;
    avgMouseSpeed = totalDistance / (totalTime || 1);
  }

  try {
    const newUser = new User({
      email,
      behavioralProfile: { avgKeypressTime, keypressTimeStdDev, avgMouseSpeed },
      deviceFingerprint: fingerprint,
      country: userCountry
    });
    await newUser.save();
    res.status(201).json({ message: 'Sign up successful! You can now log in.' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating account.' });
  }
});


// --- UPDATED /api/authenticate Endpoint with Dynamic Threshold ---
app.post('/api/authenticate', async (req, res) => {
    const { email, events, fingerprint } = req.body;
    const userIp = req.ip;

    const user = await User.findOne({ email: email });
    if (!user) {
        return res.status(404).json({ message: 'User not found.' });
    }

    let isTrustedContext = true;
    let ipScore = 15;
    if (userIp !== '::1' && userIp !== '127.0.0.1') {
        try {
            const ipResponse = await axios.get(`http://ip-api.com/json/${userIp}?fields=status,country,proxy`);
            console.log("IP API Response:", ipResponse.data);
            if(ipResponse.data.status === 'success') {
                if (ipResponse.data.proxy) { 
                    ipScore -= 10;
                    isTrustedContext = false;
                }
                if (user.country && ipResponse.data.country !== user.country) { 
                    ipScore -= 5;
                    isTrustedContext = false;
                }
            }
        } catch (error) {
            console.log("Could not verify IP reputation. Assuming neutral.");
            ipScore = 10;
            isTrustedContext = false;
        }
    } else {
        console.log("Skipping IP check for localhost.");
    }

    if (fingerprint !== user.deviceFingerprint) {
        isTrustedContext = false;
    }


    const keypressEvents = events.filter(e => e.type === 'keypress');
    const mouseMoveEvents = events.filter(e => e.type === 'mousemove');
    if (keypressEvents.length < 20) { return res.status(400).json({ message: 'Not enough typing data.' }); }
    
    const timeDiffs = [];
    for (let i = 1; i < keypressEvents.length; i++) { timeDiffs.push(keypressEvents[i].timestamp - keypressEvents[i - 1].timestamp); }
    const liveAvgKeypressTime = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
    const squaredDiffs = timeDiffs.map(diff => Math.pow(diff - liveAvgKeypressTime, 2));
    const liveKeypressTimeStdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length);
    
    let liveAvgMouseSpeed = 0;
    if (mouseMoveEvents.length > 1) {
        let totalDistance = 0;
        for (let i = 1; i < mouseMoveEvents.length; i++) {
            const dx = mouseMoveEvents[i].x - mouseMoveEvents[i - 1].x;
            const dy = mouseMoveEvents[i].y - mouseMoveEvents[i - 1].y;
            totalDistance += Math.sqrt(dx * dx + dy * dy);
        }
        const totalTime = (mouseMoveEvents[mouseMoveEvents.length - 1].timestamp - mouseMoveEvents[0].timestamp) / 1000;
        liveAvgMouseSpeed = totalDistance / (totalTime || 1);
    }

    const savedProfile = user.behavioralProfile;
    let totalScore = 0;
    
    const speedScore = Math.max(0, 30 - (Math.abs(liveAvgKeypressTime - savedProfile.avgKeypressTime) / savedProfile.avgKeypressTime) * 30);
    totalScore += speedScore;

    const rhythmScore = Math.max(0, 30 - (Math.abs(liveKeypressTimeStdDev - savedProfile.keypressTimeStdDev) / savedProfile.keypressTimeStdDev) * 30);
    totalScore += rhythmScore;
    
    const mouseScore = Math.max(0, 15 - (Math.abs(liveAvgMouseSpeed - (savedProfile.avgMouseSpeed || 0)) / (savedProfile.avgMouseSpeed || 1)) * 15);
    totalScore += mouseScore;

    if (fingerprint === user.deviceFingerprint) {
        totalScore += 25;
    }

    totalScore += ipScore;
    
    // --- DYNAMIC THRESHOLD LOGIC ---
    const requiredScore = isTrustedContext ? 65 : 80;
    console.log(`Trust Score: ${totalScore.toFixed(2)}/100. Required: ${requiredScore}. (Trusted Context: ${isTrustedContext})`);

    if (totalScore >= requiredScore) {
        const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 1000
        }).status(200).json({ status: 'approved', message: 'Authentication successful!' });
    } else {
        res.status(401).json({ status: 'denied', message: 'Authentication failed. Behavior or device did not match.' });
    }
});


// Verify Session Endpoint
app.post('/api/verify-session', verifyToken, async (req, res) => {
    console.log(`Session verified for ${req.userEmail}`);
    res.status(200).json({ status: 'valid' });
});


// Final setup
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
