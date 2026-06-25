// api/auth/reset-password.js

const crypto = require('crypto');
const connectDB = require('../../lib/db');
const { User } = require('../../lib/models');
const { handleCors, success, error } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return error(res, 'Method not allowed', 405);
  try {
    await connectDB();
    const { token, password } = req.body;
    if (!token || !password) return error(res, 'Token and password required');
    if (password.length < 6) return error(res, 'Password must be at least 6 characters');
    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashed,
      passwordResetExpiry: { $gt: new Date() }
    });
    if (!user) return error(res, 'Invalid or expired reset token', 400);
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    user.refreshTokens = []; // invalidate all sessions
    await user.save();
    return success(res, {}, 'Password reset successful. Please login.');
  } catch (err) {
    return error(res, 'Reset failed', 500);
  }
};
