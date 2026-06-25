// api/quiz/history.js — Quiz History

const connectDB = require('../../lib/db');
const { QuizSession } = require('../../lib/models');
const { requireAuth, handleCors, success, error } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return error(res, 'Method not allowed', 405);
  try {
    await connectDB();
    await new Promise((resolve, reject) => requireAuth(req, res, (err) => err ? reject(err) : resolve()));
    const { page = 1, limit = 20, exam } = req.query;
    const filter = { user: req.user.id, isCompleted: true };
    if (exam) filter.exam = exam;
    const sessions = await QuizSession.find(filter)
      .sort({ completedAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .select('exam subject mode title correct wrong skipped score accuracy xpEarned completedAt timeSpent')
      .lean();
    const total = await QuizSession.countDocuments(filter);
    return success(res, { data: { sessions, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    return error(res, 'Failed to fetch history', 500);
  }
};
