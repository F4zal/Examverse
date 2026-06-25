// api/auth/forgot-password.js

const crypto = require('crypto');
const connectDB = require('../../lib/db');
const { User } = require('../../lib/models');
const { handleCors, success, error } = require('../../lib/auth');
const { sendPasswordReset } = require('../../lib/mailer');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return error(res, 'Method not allowed', 405);
  try {
    await connectDB();
    const { email } = req.body;
    if (!email) return error(res, 'Email required');
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    // Always return success (security: don't reveal if email exists)
    if (!user) return success(res, {}, 'If this email exists, a reset link has been sent.');
    const token = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
    user.passwordResetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();
    try { await sendPasswordReset(user.email, token, user.name); } catch (e) {}
    return success(res, {}, 'If this email exists, a reset link has been sent.');
  } catch (err) {
    return error(res, 'Request failed', 500);
  }
};
