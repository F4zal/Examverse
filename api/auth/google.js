// api/auth/google.js — Google OAuth

const connectDB = require('../../lib/db');
const { User } = require('../../lib/models');
const { generateAccessToken, generateRefreshToken, handleCors, success, error } = require('../../lib/auth');
const fetch = require('node-fetch');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return error(res, 'Method not allowed', 405);
  try {
    await connectDB();
    const { token } = req.body;
    if (!token) return error(res, 'Google token required');

    // Verify with Google
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
    const googleData = await googleRes.json();

    if (googleData.error || !googleData.email)
      return error(res, 'Invalid Google token', 401);
    if (googleData.aud !== process.env.GOOGLE_CLIENT_ID)
      return error(res, 'Token audience mismatch', 401);

    let user = await User.findOne({ $or: [{ googleId: googleData.sub }, { email: googleData.email }] });

    if (!user) {
      // New user via Google
      user = await User.create({
        name: googleData.name || googleData.email.split('@')[0],
        email: googleData.email,
        googleId: googleData.sub,
        avatar: googleData.picture || '',
        isVerified: true
      });
    } else {
      // Link Google to existing account
      if (!user.googleId) user.googleId = googleData.sub;
      if (!user.avatar && googleData.picture) user.avatar = googleData.picture;
      user.isVerified = true;
    }

    // Update streak
    const today = new Date().toDateString();
    const lastActive = user.lastActive ? new Date(user.lastActive).toDateString() : null;
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (lastActive === yesterday) user.streak++;
    else if (lastActive !== today) user.streak = 1;
    user.lastActive = new Date();

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    user.refreshTokens = user.refreshTokens.slice(-4);
    user.refreshTokens.push(refreshToken);
    await user.save();

    return success(res, {
      data: { user: user.toSafeObject(), accessToken, refreshToken, isNew: !user.selectedExam }
    }, 'Google login successful');

  } catch (err) {
    console.error('Google auth error:', err);
    return error(res, 'Google authentication failed', 500);
  }
};
