// lib/auth.js — JWT & Auth Utilities

const jwt = require('jsonwebtoken');

// ── Generate Tokens ──
function generateAccessToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
}

// ── Verify Token ──
function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

// ── Extract Token from Request ──
function extractToken(req) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

// ── Auth Middleware ──
async function requireAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ success: false, message: 'Authentication required' });
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

// ── Role Middleware ──
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    next();
  };
}

// ── Generate OTP ──
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── CORS Handler ──
function handleCors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return true; }
  return false;
}

// ── Response Helpers ──
function success(res, data = {}, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({ success: true, message, ...data });
}

function error(res, message = 'Error', statusCode = 400, details = null) {
  return res.status(statusCode).json({ success: false, message, ...(details && { details }) });
}

// ── XP Calculator ──
function calculateXP(correct, total, timeSpent) {
  const accuracy = total > 0 ? correct / total : 0;
  const base = correct * 12;
  const accuracyBonus = Math.floor(accuracy * 100) * 2;
  const speedBonus = timeSpent < 30 ? 20 : timeSpent < 60 ? 10 : 0;
  const perfectBonus = accuracy === 1 && total >= 5 ? 100 : 0;
  return base + accuracyBonus + speedBonus + perfectBonus;
}

// ── Level Calculator ──
function getLevel(xp) {
  const levels = [
    { level: 1, title: 'Neural Cadet', min: 0 },
    { level: 2, title: 'Quantum Scholar', min: 500 },
    { level: 3, title: 'Data Warrior', min: 1500 },
    { level: 4, title: 'Algorithm Master', min: 3500 },
    { level: 5, title: 'Knowledge Commander', min: 7000 },
    { level: 6, title: 'ExamVerse Elite', min: 14000 },
    { level: 7, title: 'Exam Legend', min: 28000 }
  ];
  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i].min) return levels[i];
  }
  return levels[0];
}

module.exports = {
  generateAccessToken, generateRefreshToken,
  verifyAccessToken, verifyRefreshToken,
  extractToken, requireAuth, requireRole,
  generateOTP, handleCors, success, error,
  calculateXP, getLevel
};
