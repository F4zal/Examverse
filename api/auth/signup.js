// api/auth/signup.js — User Registration

const connectDB = require('../../lib/db');
const { User } = require('../../lib/models');
const { generateAccessToken, generateRefreshToken, generateOTP, handleCors, success, error } = require('../../lib/auth');
const { sendOTP, sendWelcome } = require('../../lib/mailer');
const validator = require('validator');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return error(res, 'Method not allowed', 405);

  try {
    await connectDB();

    const { name, email, password, selectedExam } = req.body;

    // Validation
    if (!name || !email || !password)
      return error(res, 'Name, email and password are required');
    if (!validator.isEmail(email))
      return error(res, 'Invalid email address');
    if (password.length < 6)
      return error(res, 'Password must be at least 6 characters');
    if (name.trim().length < 2)
      return error(res, 'Name must be at least 2 characters');

    // Check existing user
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return error(res, 'Email already registered. Please login.', 409);

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      selectedExam: selectedExam || '',
      otp,
      otpExpiry,
      isVerified: false
    });

    // Send OTP email
    try {
      await sendOTP(user.email, otp, user.name);
    } catch (mailErr) {
      console.error('Mail error:', mailErr.message);
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    user.refreshTokens.push(refreshToken);
    await user.save();

    return success(res, {
      data: {
        user: user.toSafeObject(),
        accessToken,
        refreshToken,
        requiresVerification: true
      }
    }, 'Account created! Please verify your email.', 201);

  } catch (err) {
    console.error('Signup error:', err);
    return error(res, 'Registration failed. Please try again.', 500);
  }
};
