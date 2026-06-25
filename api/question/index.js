// api/questions/index.js — Question Fetching with Filters

const connectDB = require('../../lib/db');
const { Question } = require('../../lib/models');
const { requireAuth, handleCors, success, error } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  try {
    await connectDB();
    await new Promise((resolve, reject) => requireAuth(req, res, (err) => err ? reject(err) : resolve()));

    // GET — fetch questions with filters
    if (req.method === 'GET') {
      const {
        exam, subject, chapter, topic, difficulty,
        year, limit = 20, page = 1, random = false, tags
      } = req.query;

      const filter = { isActive: true };
      if (exam) filter.exam = exam;
      if (subject) filter.subject = subject;
      if (chapter) filter.chapter = chapter;
      if (topic) filter.topic = topic;
      if (difficulty) filter.difficulty = difficulty;
      if (year) filter.year = year;
      if (tags) filter.tags = { $in: tags.split(',') };

      const limitNum = Math.min(parseInt(limit) || 20, 100);
      const pageNum = parseInt(page) || 1;
      const skip = (pageNum - 1) * limitNum;

      let query = Question.find(filter)
        .select('-__v')
        .limit(limitNum);

      if (random === 'true') {
        // Random sampling using aggregation
        const pipeline = [
          { $match: filter },
          { $sample: { size: limitNum } },
          { $project: { __v: 0 } }
        ];
        const questions = await Question.aggregate(pipeline);
        const total = await Question.countDocuments(filter);
        return success(res, { data: { questions, total, page: 1, pages: 1 } });
      }

      const [questions, total] = await Promise.all([
        query.skip(skip).lean(),
        Question.countDocuments(filter)
      ]);

      return success(res, {
        data: {
          questions,
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum)
        }
      });
    }

    // POST — add single question (admin/teacher only)
    if (req.method === 'POST') {
      if (!['admin','superadmin','teacher','moderator'].includes(req.user.role))
        return error(res, 'Insufficient permissions', 403);

      const { exam, subject, chapter, topic, question, options, correctAnswer, explanation, difficulty } = req.body;
      if (!exam || !subject || !chapter || !topic || !question || !options || correctAnswer === undefined)
        return error(res, 'Required fields missing');
      if (!Array.isArray(options) || options.length !== 4)
        return error(res, 'Exactly 4 options required');
      if (correctAnswer < 0 || correctAnswer > 3)
        return error(res, 'Correct answer must be 0-3');

      const q = await Question.create({
        ...req.body,
        createdBy: req.user.id
      });
      return success(res, { data: { question: q } }, 'Question added', 201);
    }

    return error(res, 'Method not allowed', 405);
  } catch (err) {
    console.error('Questions error:', err);
    return error(res, 'Failed to fetch questions', 500);
  }
};
