// api/ai/generate-questions.js — AI Question Generator

const connectDB = require('../../lib/db');
const { Question } = require('../../lib/models');
const { requireAuth, handleCors, success, error } = require('../../lib/auth');
const fetch = require('node-fetch');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return error(res, 'Method not allowed', 405);
  try {
    await connectDB();
    await new Promise((resolve, reject) => requireAuth(req, res, (err) => err ? reject(err) : resolve()));

    const { exam, subject, topic, difficulty = 'medium', count = 5, save: shouldSave = false } = req.body;
    if (!exam || !subject || !topic) return error(res, 'Exam, subject, and topic required');
    const questionCount = Math.min(count, 10);

    const prompt = `Generate exactly ${questionCount} high-quality MCQ questions for ${exam} exam.
Subject: ${subject}
Topic: ${topic}
Difficulty: ${difficulty}

Return ONLY a valid JSON array. No markdown, no backticks, no explanation outside JSON.
Format: [{"question":"...","options":["A","B","C","D"],"correctAnswer":0,"explanation":"detailed explanation","aiHint":"brief hint"}]
correctAnswer is 0-indexed (0=A, 1=B, 2=C, 3=D).
Make questions realistic, exam-appropriate, and educational.`;

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const aiData = await aiRes.json();
    const raw = aiData.content?.[0]?.text || '[]';
    const clean = raw.replace(/```json|```/g, '').trim();
    const questions = JSON.parse(clean);

    if (!Array.isArray(questions)) throw new Error('Invalid AI response format');

    const formatted = questions.map(q => ({
      exam, subject, chapter: topic, topic,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      aiHint: q.aiHint || '',
      difficulty,
      marks: 4, negativeMarks: 1,
      tags: ['ai-generated', exam.toLowerCase(), topic.toLowerCase()],
      isActive: true
    }));

    // Save to DB if admin requests
    if (shouldSave && ['admin','superadmin','moderator','teacher'].includes(req.user.role)) {
      await Question.insertMany(formatted.map(q => ({ ...q, createdBy: req.user.id })));
    }

    return success(res, {
      data: { questions: formatted, count: formatted.length, saved: shouldSave }
    }, `${formatted.length} questions generated`);

  } catch (err) {
    console.error('AI generate error:', err);
    return error(res, 'Failed to generate questions. Please try again.', 500);
  }
};
