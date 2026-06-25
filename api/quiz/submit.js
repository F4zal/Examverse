// api/quiz/submit.js — Submit Quiz & Calculate Results

const connectDB = require('../../lib/db');
const { Question, QuizSession, User } = require('../../lib/models');
const { requireAuth, handleCors, success, error, calculateXP, getLevel } = require('../../lib/auth');

const ACHIEVEMENTS = [
  { id: 'first_quiz', check: (u) => u.totalQuizzes >= 1, title: 'First Blood', icon: '🏆' },
  { id: 'accuracy_80', check: (u, s) => s.accuracy >= 80, title: 'Sharp Shooter', icon: '🎯' },
  { id: 'perfect_score', check: (u, s) => s.accuracy === 100, title: 'Perfect!', icon: '💯' },
  { id: 'streak_3', check: (u) => u.streak >= 3, title: 'On Fire', icon: '🔥' },
  { id: 'streak_7', check: (u) => u.streak >= 7, title: 'Week Warrior', icon: '⚡' },
  { id: 'total_100', check: (u) => u.totalQuestions >= 100, title: 'Century', icon: '🎖️' },
  { id: 'total_1000', check: (u) => u.totalQuestions >= 1000, title: 'Scholar', icon: '👑' },
  { id: 'xp_1000', check: (u) => u.xp >= 1000, title: 'XP Master', icon: '⭐' },
  { id: 'xp_5000', check: (u) => u.xp >= 5000, title: 'Elite', icon: '💎' }
];

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return error(res, 'Method not allowed', 405);
  try {
    await connectDB();
    await new Promise((resolve, reject) => requireAuth(req, res, (err) => err ? reject(err) : resolve()));

    const { sessionId, answers, timeSpent, flagged = [], bookmarked = [], notes = {} } = req.body;
    if (!sessionId) return error(res, 'Session ID required');

    const session = await QuizSession.findOne({ _id: sessionId, user: req.user.id });
    if (!session) return error(res, 'Session not found', 404);
    if (session.isCompleted) return error(res, 'Quiz already submitted');

    // Get correct answers from DB
    const questions = await Question.find({ _id: { $in: session.questions } })
      .select('_id correctAnswer marks negativeMarks explanation topic subject difficulty exam').lean();

    const qMap = {};
    questions.forEach(q => { qMap[q._id.toString()] = q; });

    // Calculate results
    let correct = 0, wrong = 0, skipped = 0, totalScore = 0;
    const detailedResults = [];
    const weakTopicMap = {};
    const subjectWise = {};

    session.questions.forEach((qId, idx) => {
      const q = qMap[qId.toString()];
      if (!q) return;
      const userAnswer = answers && answers[idx] !== undefined ? parseInt(answers[idx]) : undefined;
      const isCorrect = userAnswer === q.correctAnswer;
      const isSkipped = userAnswer === undefined || userAnswer === null || userAnswer === -1;

      if (isSkipped) skipped++;
      else if (isCorrect) { correct++; totalScore += (q.marks || 4); }
      else { wrong++; totalScore -= (q.negativeMarks || 1); }

      // Track weak topics
      if (!isCorrect && !isSkipped) {
        weakTopicMap[q.topic] = (weakTopicMap[q.topic] || 0) + 1;
      }

      // Subject-wise breakdown
      const subj = q.subject || 'General';
      if (!subjectWise[subj]) subjectWise[subj] = { correct: 0, wrong: 0, skipped: 0, total: 0 };
      subjectWise[subj].total++;
      if (isCorrect) subjectWise[subj].correct++;
      else if (isSkipped) subjectWise[subj].skipped++;
      else subjectWise[subj].wrong++;

      detailedResults.push({
        questionId: qId,
        userAnswer: isSkipped ? -1 : userAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect,
        isSkipped,
        marks: isCorrect ? (q.marks || 4) : isSkipped ? 0 : -(q.negativeMarks || 1),
        explanation: q.explanation,
        topic: q.topic,
        subject: q.subject,
        difficulty: q.difficulty
      });
    });

    const total = session.questions.length;
    const accuracy = total > 0 ? Math.round(correct / total * 100) : 0;
    const xpEarned = calculateXP(correct, total, timeSpent || 60);

    // Update session
    session.answers = new Map(Object.entries(answers || {}));
    session.flagged = flagged;
    session.bookmarked = bookmarked;
    session.notes = new Map(Object.entries(notes));
    session.timeSpent = timeSpent || 0;
    session.correct = correct;
    session.wrong = wrong;
    session.skipped = skipped;
    session.score = Math.max(0, totalScore);
    session.accuracy = accuracy;
    session.xpEarned = xpEarned;
    session.isCompleted = true;
    session.completedAt = new Date();
    session.subjectWise = new Map(Object.entries(subjectWise));
    await session.save();

    // Update user stats
    const user = await User.findById(req.user.id);
    user.xp += xpEarned;
    user.totalQuestions += total;
    user.totalCorrect += correct;
    user.totalQuizzes += 1;
    // Merge weak topics
    Object.entries(weakTopicMap).forEach(([topic, count]) => {
      user.weakTopics.set(topic, (user.weakTopics.get(topic) || 0) + count);
    });
    // Check achievements
    const newAchievements = [];
    const existingIds = user.achievements.map(a => a.id);
    ACHIEVEMENTS.forEach(ach => {
      if (!existingIds.includes(ach.id) && ach.check(user, { accuracy })) {
        user.achievements.push({ id: ach.id, unlockedAt: new Date() });
        newAchievements.push(ach);
      }
    });
    // Level up check
    const oldLevel = getLevel(user.xp - xpEarned);
    const newLevel = getLevel(user.xp);
    const leveledUp = newLevel.level > oldLevel.level;
    await user.save();

    // Update question stats
    await Question.bulkWrite(
      session.questions.map((qId, idx) => {
        const r = detailedResults[idx];
        return {
          updateOne: {
            filter: { _id: qId },
            update: {
              $inc: {
                attemptCount: 1,
                correctCount: r && r.isCorrect ? 1 : 0
              }
            }
          }
        };
      })
    );

    return success(res, {
      data: {
        sessionId,
        results: {
          correct, wrong, skipped, total,
          score: Math.max(0, totalScore),
          totalMarks: session.totalMarks,
          accuracy,
          xpEarned,
          timeSpent: timeSpent || 0
        },
        detailed: detailedResults,
        subjectWise,
        weakTopics: Object.entries(weakTopicMap).map(([topic, count]) => ({ topic, count })),
        newAchievements,
        leveledUp,
        newLevel: leveledUp ? newLevel : null,
        userStats: { xp: user.xp, level: getLevel(user.xp), streak: user.streak }
      }
    }, 'Quiz submitted successfully');

  } catch (err) {
    console.error('Submit error:', err);
    return error(res, 'Failed to submit quiz', 500);
  }
};
