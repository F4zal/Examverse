// api/ai/chat.js — AI Study Assistant (Claude API)

const connectDB = require('../../lib/db');
const { User } = require('../../lib/models');
const { requireAuth, handleCors, success, error } = require('../../lib/auth');
const fetch = require('node-fetch');

const AI_MODES = {
  coach: 'You are an expert exam coach for Indian competitive exams. Give personalized, practical study guidance.',
  doubt: 'You are an expert tutor. Solve doubts clearly with step-by-step explanations. Use simple language.',
  revision: 'Generate concise revision notes. Use bullet points, key terms, and important facts. Be structured.',
  strategy: 'You are an exam strategist. Give specific, actionable exam preparation strategies and time management tips.',
  flashcard: 'Generate flashcards in JSON format: [{"front":"...","back":"..."}]. Return only valid JSON array, no markdown.',
  analyze: 'Analyze the student performance data and give specific improvement recommendations.',
  motivate: 'You are a motivational coach for students. Give encouraging, energetic messages. Be genuine and uplifting.'
};

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return error(res, 'Method not allowed', 405);
  try {
    await connectDB();
    await new Promise((resolve, reject) => requireAuth(req, res, (err) => err ? reject(err) : resolve()));

    const { message, mode = 'coach', history = [], context = {} } = req.body;
    if (!message) return error(res, 'Message required');
    if (message.length > 2000) return error(res, 'Message too long');

    const user = await User.findById(req.user.id).select('name selectedExam xp streak weakTopics').lean();

    const systemPrompt = `${AI_MODES[mode] || AI_MODES.coach}

Student Profile:
- Name: ${user?.name || 'Scholar'}
- Preparing for: ${user?.selectedExam || context.exam || 'competitive exam'}
- XP Level: ${user?.xp || 0}
- Streak: ${user?.streak || 0} days
- Weak Topics: ${user?.weakTopics ? Object.keys(Object.fromEntries(user.weakTopics || [])).slice(0,5).join(', ') : 'Not identified yet'}
${context.subject ? `- Current Subject: ${context.subject}` : ''}
${context.score !== undefined ? `- Recent Score: ${context.score}%` : ''}

Keep responses under 200 words unless explaining a complex concept. Be encouraging and practical.`;

    const messages = [
      ...history.slice(-8).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message }
    ];

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        system: systemPrompt,
        messages
      })
    });

    const aiData = await aiRes.json();
    if (aiData.error) throw new Error(aiData.error.message);

    const reply = aiData.content?.[0]?.text || 'I could not process that. Please try again.';

    return success(res, {
      data: { reply, mode, tokens: aiData.usage?.output_tokens || 0 }
    }, 'AI response generated');

  } catch (err) {
    console.error('AI error:', err);
    // Fallback responses
    const fallbacks = [
      'Focus on high-weightage topics first. Practice 25+ MCQs daily for consistent improvement.',
      'Review your incorrect answers immediately — that is where real learning happens.',
      'Maintain a study schedule: 2hrs subject + 1hr mock practice + 30min revision daily.',
      'Attempt previous year questions — they reveal the exact pattern and important topics.',
      'Track your weak areas and dedicate extra time to them this week.'
    ];
    return success(res, {
      data: { reply: fallbacks[Math.floor(Math.random() * fallbacks.length)], mode, fallback: true }
    });
  }
};
