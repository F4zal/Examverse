// api/auth/login.js — User Login

const connectDB = require('../../lib/db');
const { User } = require('../../lib/models');
const { generateAccessToken, generateRefreshToken, handleCors, success, error } = require('../../lib/auth');
const validator = require('validator');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return error(res, 'Method not allowed', 405);

  try {
    await connectDB();
    const { email, password } = req.body;

    if (!email || !password) return error(res, 'Email and password required');
    if (!validator.isEmail(email)) return error(res, 'Invalid email');

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return error(res, 'Invalid email or password', 401);
    if (!user.password) return error(res, 'Please login with Google', 401);

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return error(res, 'Invalid email or password', 401);

    // Update streak
    const today = new Date().toDateString();
    const lastActive = user.lastActive ? new Date(user.lastActive).toDateString() : null;
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (lastActive === yesterday) user.streak++;
    else if (lastActive !== today) user.streak = 1;
    user.lastActive = new Date();

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    user.refreshTokens = user.refreshTokens.slice(-4); // keep last 5
    user.refreshTokens.push(refreshToken);
    await user.save();

    return success(res, {
      data: { user: user.toSafeObject(), accessToken, refreshToken }
    }, 'Login successful');

  } catch (err) {
    console.error('Login error:', err);
    return error(res, 'Login failed. Please try again.', 500);
  }
};
