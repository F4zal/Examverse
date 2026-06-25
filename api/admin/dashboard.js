// api/admin/dashboard.js — Admin Dashboard

const connectDB = require('../../lib/db');
const { User, Question, QuizSession } = require('../../lib/models');
const { requireAuth, handleCors, success, error } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return error(res, 'Method not allowed', 405);
  try {
    await connectDB();
    await new Promise((resolve, reject) => requireAuth(req, res, (err) => err ? reject(err) : resolve()));
    if (!['admin','superadmin'].includes(req.user.role))
      return error(res, 'Admin access required', 403);

    const [
      totalUsers, totalQuestions, totalSessions,
      todayUsers, todaySessions,
      examBreakdown, recentUsers
    ] = await Promise.all([
      User.countDocuments(),
      Question.countDocuments({ isActive: true }),
      QuizSession.countDocuments({ isCompleted: true }),
      User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 86400000) } }),
      QuizSession.countDocuments({ completedAt: { $gte: new Date(Date.now() - 86400000) } }),
      Question.aggregate([{ $group: { _id: '$exam', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      User.find().sort({ createdAt: -1 }).limit(10)
        .select('name email role xp streak selectedExam createdAt plan').lean()
    ]);

    // Weekly user growth
    const weeklyGrowth = [];
    for (let i = 6; i >= 0; i--) {
      const start = new Date(Date.now() - i * 86400000);
      start.setHours(0,0,0,0);
      const end = new Date(start); end.setHours(23,59,59,999);
      const count = await User.countDocuments({ createdAt: { $gte: start, $lte: end } });
      weeklyGrowth.push({ date: start.toISOString().split('T')[0], users: count });
    }

    return success(res, {
      data: {
        overview: { totalUsers, totalQuestions, totalSessions, todayUsers, todaySessions },
        examBreakdown: examBreakdown.map(e => ({ exam: e._id, count: e.count })),
        weeklyGrowth,
        recentUsers
      }
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    return error(res, 'Failed to fetch dashboard', 500);
  }
};
