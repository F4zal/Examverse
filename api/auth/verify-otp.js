// api/auth/verify-otp.js

const connectDB = require('../../lib/db');
const { User } = require('../../lib/models');
const { requireAuth, handleCors, success, error } = require('../../lib/auth');
const { sendWelcome } = require('../../lib/mailer');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return error(res, 'Method not allowed', 405);
  try {
    await connectDB();
    await new Promise((resolve, reject) => requireAuth(req, res, (err) => err ? reject(err) : resolve()));
    const { otp } = req.body;
    if (!otp) return error(res, 'OTP is required');
    const user = await User.findById(req.user.id);
    if (!user) return error(res, 'User not found', 404);
    if (user.isVerified) return success(res, {}, 'Already verified');
    if (!user.otp || user.otp !== otp) return error(res, 'Invalid OTP');
    if (new Date() > user.otpExpiry) return error(res, 'OTP expired. Request a new one.');
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();
    try { await sendWelcome(user.email, user.name); } catch (e) {}
    return success(res, { data: { user: user.toSafeObject() } }, 'Email verified successfully!');
  } catch (err) {
    console.error('OTP verify error:', err);
    return error(res, 'Verification failed', 500);
  }
};
