// api/auth/refresh.js

const connectDB = require('../../lib/db');
const { User } = require('../../lib/models');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken, handleCors, success, error } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return error(res, 'Method not allowed', 405);
  try {
    await connectDB();
    const { refreshToken } = req.body;
    if (!refreshToken) return error(res, 'Refresh token required', 401);
    let decoded;
    try { decoded = verifyRefreshToken(refreshToken); }
    catch (e) { return error(res, 'Invalid or expired refresh token', 401); }
    const user = await User.findById(decoded.id);
    if (!user || !user.refreshTokens.includes(refreshToken))
      return error(res, 'Invalid refresh token', 401);
    // Rotate tokens
    user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
    const newAccess = generateAccessToken(user);
    const newRefresh = generateRefreshToken(user);
    user.refreshTokens.push(newRefresh);
    await user.save();
    return success(res, { data: { accessToken: newAccess, refreshToken: newRefresh } }, 'Token refreshed');
  } catch (err) {
    return error(res, 'Token refresh failed', 500);
  }
};
