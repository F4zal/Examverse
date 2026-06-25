// api/auth/logout.js

const connectDB = require('../../lib/db');
const { User } = require('../../lib/models');
const { requireAuth, handleCors, success, error } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return error(res, 'Method not allowed', 405);
  try {
    await connectDB();
    await new Promise((resolve, reject) => requireAuth(req, res, (err) => err ? reject(err) : resolve()));
    const { refreshToken } = req.body;
    const user = await User.findById(req.user.id);
    if (user && refreshToken) {
      user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
      await user.save();
    }
    return success(res, {}, 'Logged out successfully');
  } catch (err) {
    return success(res, {}, 'Logged out');
  }
};
