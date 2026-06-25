// api/user/profile.js — Get & Update Profile

const connectDB = require('../../lib/db');
const { User } = require('../../lib/models');
const { requireAuth, handleCors, success, error, getLevel } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  try {
    await connectDB();
    await new Promise((resolve, reject) => requireAuth(req, res, (err) => err ? reject(err) : resolve()));
    const user = await User.findById(req.user.id);
    if (!user) return error(res, 'User not found', 404);

    // GET profile
    if (req.method === 'GET') {
      const lvl = getLevel(user.xp);
      return success(res, {
        data: {
          user: user.toSafeObject(),
          level: lvl,
          nextLevelXP: lvl.min + (lvl.level < 7 ? [500,1000,2000,3500,7000,14000][lvl.level - 1] : 999999),
          progressPct: Math.min(100, Math.round(((user.xp - lvl.min) / Math.max(1, 500)) * 100))
        }
      });
    }

    // PUT update profile
    if (req.method === 'PUT') {
      const allowed = ['name','selectedExam','stream','targetYear','settings','avatar'];
      allowed.forEach(field => {
        if (req.body[field] !== undefined) user[field] = req.body[field];
      });
      user.updatedAt = new Date();
      await user.save();
      return success(res, { data: { user: user.toSafeObject() } }, 'Profile updated');
    }

    return error(res, 'Method not allowed', 405);
  } catch (err) {
    console.error('Profile error:', err);
    return error(res, 'Failed to process request', 500);
  }
};
