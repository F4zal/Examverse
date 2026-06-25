// api/questions/bulk.js — Bulk Import Questions

const connectDB = require('../../lib/db');
const { Question } = require('../../lib/models');
const { requireAuth, requireRole, handleCors, success, error } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return error(res, 'Method not allowed', 405);
  try {
    await connectDB();
    await new Promise((resolve, reject) => requireAuth(req, res, (err) => err ? reject(err) : resolve()));
    if (!['admin','superadmin','moderator'].includes(req.user.role))
      return error(res, 'Insufficient permissions', 403);

    const { questions, exam } = req.body;
    if (!Array.isArray(questions) || questions.length === 0)
      return error(res, 'Questions array required');
    if (questions.length > 1000)
      return error(res, 'Max 1000 questions per bulk import');

    // Validate and prepare
    const prepared = questions.map(q => ({
      exam: q.exam || exam,
      subject: q.subject || 'General',
      chapter: q.chapter || 'General',
      topic: q.topic || 'General',
      question: q.question || q.q,
      options: q.options || q.o,
      correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : q.c,
      explanation: q.explanation || q.exp || '',
      difficulty: q.difficulty || q.d || 'medium',
      year: q.year || q.y || '',
      tags: q.tags || [],
      aiHint: q.aiHint || '',
      marks: q.marks || 4,
      negativeMarks: q.negativeMarks || 1,
      createdBy: req.user.id,
      isActive: true
    })).filter(q => q.exam && q.question && Array.isArray(q.options) && q.options.length === 4);

    if (prepared.length === 0)
      return error(res, 'No valid questions found. Check format.');

    const inserted = await Question.insertMany(prepared, { ordered: false });
    return success(res, {
      data: { inserted: inserted.length, total: questions.length, skipped: questions.length - inserted.length }
    }, `${inserted.length} questions imported successfully`);

  } catch (err) {
    if (err.code === 11000) return error(res, 'Some questions already exist', 409);
    console.error('Bulk import error:', err);
    return error(res, 'Bulk import failed', 500);
  }
};
