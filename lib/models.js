// lib/models.js — All MongoDB Schemas & Models

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ============================================================
// USER MODEL
// ============================================================
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 50 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, minlength: 6 },
  googleId: { type: String },
  avatar: { type: String, default: '' },
  role: { type: String, enum: ['student','teacher','moderator','admin','superadmin'], default: 'student' },

  // Exam Profile
  selectedExam: { type: String, default: '' },
  targetYear: { type: Number },
  stream: { type: String, default: '' },

  // Gamification
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  streak: { type: Number, default: 0 },
  lastActive: { type: Date },
  badges: [{ type: String }],
  achievements: [{ id: String, unlockedAt: Date }],

  // Stats
  totalQuestions: { type: Number, default: 0 },
  totalCorrect: { type: Number, default: 0 },
  totalQuizzes: { type: Number, default: 0 },
  totalTimeSpent: { type: Number, default: 0 }, // in minutes

  // Weak Topics
  weakTopics: { type: Map, of: Number, default: {} },
  strongTopics: { type: Map, of: Number, default: {} },

  // Subscription
  plan: { type: String, enum: ['free','premium','pro'], default: 'free' },
  planExpiry: { type: Date },

  // Auth
  isVerified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpiry: { type: Date },
  refreshTokens: [{ type: String }],
  passwordResetToken: { type: String },
  passwordResetExpiry: { type: Date },

  // Settings
  settings: {
    theme: { type: String, default: 'dark' },
    language: { type: String, default: 'en' },
    notifications: { type: Boolean, default: true },
    soundEffects: { type: Boolean, default: true }
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.updatedAt = new Date();
  next();
});

userSchema.methods.comparePassword = async function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.otp;
  delete obj.otpExpiry;
  delete obj.refreshTokens;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpiry;
  return obj;
};

// ============================================================
// QUESTION MODEL
// ============================================================
const questionSchema = new mongoose.Schema({
  exam: { type: String, required: true, index: true }, // CUET, NEET, JEE, etc.
  subject: { type: String, required: true, index: true },
  chapter: { type: String, required: true },
  topic: { type: String, required: true },

  question: { type: String, required: true },
  questionImage: { type: String, default: '' }, // Cloudinary URL
  options: [{ type: String, required: true }], // Array of 4 options
  correctAnswer: { type: Number, required: true }, // 0-indexed
  explanation: { type: String, default: '' },
  explanationImage: { type: String, default: '' },
  videoSolution: { type: String, default: '' }, // YouTube URL

  difficulty: { type: String, enum: ['easy','medium','hard'], default: 'medium' },
  marks: { type: Number, default: 4 },
  negativeMarks: { type: Number, default: 1 },
  year: { type: String, default: '' }, // PYQ year
  tags: [{ type: String }],
  language: { type: String, enum: ['en','hi','both'], default: 'en' },
  aiHint: { type: String, default: '' },

  // Stats
  attemptCount: { type: Number, default: 0 },
  correctCount: { type: Number, default: 0 },
  avgTimeSpent: { type: Number, default: 0 }, // seconds

  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

questionSchema.index({ exam: 1, subject: 1, difficulty: 1 });
questionSchema.index({ exam: 1, chapter: 1 });
questionSchema.index({ tags: 1 });

// ============================================================
// QUIZ SESSION MODEL
// ============================================================
const quizSessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  exam: { type: String, required: true },
  subject: { type: String, default: 'Mixed' },
  mode: { type: String, required: true }, // practice, mock, daily, pyq, etc.
  title: { type: String, default: 'Quiz' },

  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  answers: { type: Map, of: Number, default: {} }, // questionIndex -> selectedOption
  flagged: [{ type: Number }],
  bookmarked: [{ type: Number }],
  notes: { type: Map, of: String, default: {} },

  // Timing
  totalTime: { type: Number, default: 3600 }, // seconds
  timeSpent: { type: Number, default: 0 },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  isCompleted: { type: Boolean, default: false },
  isPaused: { type: Boolean, default: false },

  // Results
  score: { type: Number, default: 0 },
  totalMarks: { type: Number, default: 0 },
  correct: { type: Number, default: 0 },
  wrong: { type: Number, default: 0 },
  skipped: { type: Number, default: 0 },
  accuracy: { type: Number, default: 0 },
  xpEarned: { type: Number, default: 0 },

  // Analytics
  subjectWise: { type: Map, of: Object, default: {} },
  topicWise: { type: Map, of: Object, default: {} },
  difficultyWise: { type: Map, of: Object, default: {} }
});

// ============================================================
// BOOKMARK MODEL
// ============================================================
const bookmarkSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  note: { type: String, default: '' },
  folder: { type: String, default: 'General' },
  createdAt: { type: Date, default: Date.now }
});
bookmarkSchema.index({ user: 1, question: 1 }, { unique: true });

// ============================================================
// FLASHCARD MODEL
// ============================================================
const flashcardSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  exam: { type: String },
  subject: { type: String },
  front: { type: String, required: true },
  back: { type: String, required: true },
  difficulty: { type: String, enum: ['easy','medium','hard'], default: 'medium' },
  nextReview: { type: Date, default: Date.now },
  reviewCount: { type: Number, default: 0 },
  isAIGenerated: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// ============================================================
// NOTE MODEL
// ============================================================
const noteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  content: { type: String, default: '' },
  exam: { type: String, default: '' },
  subject: { type: String, default: '' },
  tags: [{ type: String }],
  isPinned: { type: Boolean, default: false },
  isAIGenerated: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// ============================================================
// LEADERBOARD MODEL
// ============================================================
const leaderboardSchema = new mongoose.Schema({
  exam: { type: String, required: true },
  period: { type: String, enum: ['daily','weekly','monthly','alltime'], required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  entries: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    avatar: String,
    xp: Number,
    accuracy: Number,
    quizzes: Number,
    rank: Number
  }],
  updatedAt: { type: Date, default: Date.now }
});

// ============================================================
// EXPORTS
// ============================================================
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Question = mongoose.models.Question || mongoose.model('Question', questionSchema);
const QuizSession = mongoose.models.QuizSession || mongoose.model('QuizSession', quizSessionSchema);
const Bookmark = mongoose.models.Bookmark || mongoose.model('Bookmark', bookmarkSchema);
const Flashcard = mongoose.models.Flashcard || mongoose.model('Flashcard', flashcardSchema);
const Note = mongoose.models.Note || mongoose.model('Note', noteSchema);
const Leaderboard = mongoose.models.Leaderboard || mongoose.model('Leaderboard', leaderboardSchema);

module.exports = { User, Question, QuizSession, Bookmark, Flashcard, Note, Leaderboard };
