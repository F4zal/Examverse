// api/quiz/start.js — Create Quiz Session

const connectDB = require('../../lib/db');
const { Question, QuizSession } = require('../../lib/models');
const { requireAuth, handleCors, success, error } = require('../../lib/auth');

const QUIZ_CONFIGS = {
  quick:    { count: 10, time: 600 },
  practice: { count: 20, time: 0 },
  chapter:  { count: 20, time: 1800 },
  daily:    { count: 15, time: 1350 },
  mock:     { count: 50, time: 3600 },
  pyq:      { count: 25, time: 2250 },
  speed:    { count: 20, time: 600 },
  adaptive: { count: 30, time: 2700 },
  revision: { count: 15, time: 0 }
};

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return error(res, 'Method not allowed', 405);
  try {
    await connectDB();
    await new Promise((resolve, reject) => requireAuth(req, res, (err) => err ? reject(err) : resolve()));

    const {
      exam, subject, chapter, topic, difficulty,
      mode = 'practice', count, time, year, title
    } = req.body;

    if (!exam) return error(res, 'Exam is required');

    const config = QUIZ_CONFIGS[mode] || QUIZ_CONFIGS.practice;
    const questionCount = Math.min(count || config.count, 100);
    const totalTime = time !== undefined ? time : config.time;

    // Build filter
    const filter = { exam, isActive: true };
    if (subject) filter.subject = subject;
    if (chapter) filter.chapter = chapter;
    if (topic) filter.topic = topic;
    if (difficulty) filter.difficulty = difficulty;
    if (year || mode === 'pyq') { if (year) filter.year = year; else filter.year = { $ne: '' }; }

    // For adaptive: prioritize weak topics (would need user data)
    const pipeline = [
      { $match: filter },
      { $sample: { size: questionCount } },
      { $project: { correctAnswer: 0 } } // Don't send answer to client!
    ];

    const questions = await Question.aggregate(pipeline);
    if (questions.length === 0)
      return error(res, 'No questions found for selected criteria. Try different filters.', 404);

    // Get correct answers separately (server keeps them)
    const questionIds = questions.map(q => q._id);
    const answers = await Question.find({ _id: { $in: questionIds } })
      .select('_id correctAnswer marks negativeMarks explanation aiHint').lean();
    const answerMap = {};
    answers.forEach(a => { answerMap[a._id.toString()] = a; });

    // Create session
    const session = await QuizSession.create({
      user: req.user.id,
      exam,
      subject: subject || 'Mixed',
      mode,
      title: title || `${exam} ${mode.charAt(0).toUpperCase() + mode.slice(1)}`,
      questions: questionIds,
      totalTime,
      totalMarks: questions.length * 4
    });

    return success(res, {
      data: {
        sessionId: session._id,
        questions, // No correctAnswer
        totalTime,
        totalMarks: session.totalMarks,
        questionCount: questions.length,
        mode,
        exam
      }
    }, 'Quiz started');

  } catch (err) {
    console.error('Quiz start error:', err);
    return error(res, 'Failed to start quiz', 500);
  }
};
