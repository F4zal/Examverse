// api/user/stats.js — Detailed User Analytics

const connectDB = require('../../lib/db');
const { User, QuizSession } = require('../../lib/models');
const { requireAuth, handleCors, success, error, getLevel } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return error(res, 'Method not allowed', 405);
  try {
    await connectDB();
    await new Promise((resolve, reject) => requireAuth(req, res, (err) => err ? reject(err) : resolve()));

    const user = await User.findById(req.user.id);
    if (!user) return error(res, 'User not found', 404);

    // Get recent quiz sessions
    const sessions = await QuizSession.find({ user: req.user.id, isCompleted: true })
      .sort({ completedAt: -1 }).limit(50).lean();

    // Compute analytics
    const accuracy = user.totalQuestions > 0
      ? Math.round(user.totalCorrect / user.totalQuestions * 100) : 0;

    // Daily breakdown (last 7 days)
    const daily = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      const key = d.toISOString().split('T')[0];
      daily[key] = { questions: 0, correct: 0, xp: 0, sessions: 0 };
    }
    sessions.forEach(s => {
      const key = new Date(s.completedAt).toISOString().split('T')[0];
      if (daily[key]) {
        daily[key].questions += s.questions.length;
        daily[key].correct += s.correct;
        daily[key].xp += s.xpEarned;
        daily[key].sessions++;
      }
    });

    // Subject breakdown
    const subjectMap = {};
    sessions.forEach(s => {
      const subj = s.subject || 'Mixed';
      if (!subjectMap[subj]) subjectMap[subj] = { questions: 0, correct: 0, sessions: 0 };
      subjectMap[subj].questions += s.questions.length;
      subjectMap[subj].correct += s.correct;
      subjectMap[subj].sessions++;
    });

    // Weak topics from user model
    const weakTopics = Object.entries(user.weakTopics || {})
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([topic, count]) => ({ topic, count }));

    // Exam readiness
    const readiness = Math.min(100, Math.round(
      (accuracy * 0.4) +
      (Math.min(user.totalQuizzes, 50) / 50 * 30) +
      (Math.min(user.streak, 30) / 30 * 30)
    ));

    const lvl = getLevel(user.xp);

    return success(res, {
      data: {
        overview: {
          xp: user.xp,
          level: lvl,
          streak: user.streak,
          totalQuestions: user.totalQuestions,
          totalCorrect: user.totalCorrect,
          totalQuizzes: user.totalQuizzes,
          accuracy,
          readiness
        },
        daily: Object.entries(daily).map(([date, data]) => ({ date, ...data })),
        subjects: Object.entries(subjectMap).map(([subject, data]) => ({
          subject,
          accuracy: data.questions > 0 ? Math.round(data.correct / data.questions * 100) : 0,
          ...data
        })),
        weakTopics,
        recentSessions: sessions.slice(0, 10).map(s => ({
          id: s._id,
          exam: s.exam,
          subject: s.subject,
          mode: s.mode,
          score: s.score,
          accuracy: s.accuracy,
          xpEarned: s.xpEarned,
          completedAt: s.completedAt
        }))
      }
    });
  } catch (err) {
    console.error('Stats error:', err);
    return error(res, 'Failed to fetch stats', 500);
  }
};
