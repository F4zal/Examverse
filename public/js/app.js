// ============================================================
// EXAMVERSE OS — Frontend Application
// ============================================================

const API = '';  // Same domain on Vercel

// ── STATE ──
let STATE = {
  user: null, accessToken: null, refreshToken: null,
  exam: '', currentSession: null, questions: [], answers: {},
  flagged: [], bookmarked: [], notes: {}, currentQ: 0,
  timerInterval: null, timeLeft: 0, totalTime: 0,
  chatHistory: [], aiMode: 'coach', orbOpen: false
};

// ── EXAM CONFIG ──
const EXAMS = {
  CUET:    { icon:'📚', name:'CUET',    color:'#3b82f6' },
  NEET:    { icon:'🧬', name:'NEET',    color:'#10b981' },
  JEE:     { icon:'⚛️', name:'JEE Main',color:'#6366f1' },
  JEEADV:  { icon:'🚀', name:'JEE Adv', color:'#8b5cf6' },
  NDA:     { icon:'🛡️', name:'NDA',     color:'#ef4444' },
  UPSC:    { icon:'🏛️', name:'UPSC',    color:'#f59e0b' },
  SSC:     { icon:'📋', name:'SSC CGL', color:'#06b6d4' },
  SSCCHSL: { icon:'📝', name:'SSC CHSL',color:'#22d3ee' },
  BANKING: { icon:'🏦', name:'Banking', color:'#34d399' },
  RAILWAY: { icon:'🚂', name:'Railway', color:'#fbbf24' },
  STATEPCS:{ icon:'🏠', name:'State PCS',color:'#a78bfa' },
  POLICE:  { icon:'👮', name:'Police',  color:'#f87171' },
  TEACHING:{ icon:'👨‍🏫', name:'Teaching',color:'#86efac' },
  CLAT:    { icon:'⚖️', name:'CLAT',    color:'#fca5a5' },
  CAT:     { icon:'📈', name:'CAT',     color:'#c4b5fd' },
  CUETPG:  { icon:'🎓', name:'CUET PG', color:'#93c5fd' }
};

const LEVELS = [
  { level:1, title:'Neural Cadet',      min:0 },
  { level:2, title:'Quantum Scholar',   min:500 },
  { level:3, title:'Data Warrior',      min:1500 },
  { level:4, title:'Algorithm Master',  min:3500 },
  { level:5, title:'Knowledge Commander', min:7000 },
  { level:6, title:'ExamVerse Elite',   min:14000 },
  { level:7, title:'Exam Legend',       min:28000 }
];

// ── API HELPER ──
async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (STATE.accessToken) headers['Authorization'] = `Bearer ${STATE.accessToken}`;
  try {
    const res = await fetch(`${API}/api/${path}`, {
      ...options, headers: { ...headers, ...(options.headers || {}) }
    });
    const data = await res.json();
    if (res.status === 401 && data.code === 'TOKEN_EXPIRED') {
      await refreshAccessToken();
      return api(path, options); // retry
    }
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, data: { message: 'Network error. Check connection.' } };
  }
}

async function refreshAccessToken() {
  if (!STATE.refreshToken) return logout();
  const res = await fetch(`${API}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: STATE.refreshToken })
  });
  const data = await res.json();
  if (data.success) {
    STATE.accessToken = data.data.accessToken;
    STATE.refreshToken = data.data.refreshToken;
    localStorage.setItem('ev_access', STATE.accessToken);
    localStorage.setItem('ev_refresh', STATE.refreshToken);
  } else {
    logout();
  }
}

// ── UTILS ──
function $id(id) { return document.getElementById(id); }
function setText(id, val) { const el = $id(id); if (el) el.textContent = val; }
function tap(el, fn) {
  if (!el) return;
  let moved = false;
  el.addEventListener('touchstart', () => moved = false, { passive: true });
  el.addEventListener('touchmove',  () => moved = true,  { passive: true });
  el.addEventListener('touchend', e => { if (!moved) { e.preventDefault(); fn(e); } });
  el.addEventListener('click', fn);
}
function toast(msg, dur = 2400) {
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = msg;
  $id('toast-w').appendChild(el);
  setTimeout(() => el.remove(), dur);
}
function spawnXP(xp) {
  const el = document.createElement('div');
  el.className = 'xp-pop'; el.textContent = `+${xp} XP ⚡`;
  el.style.cssText = `left:${Math.random()*50+25}%;top:${Math.random()*20+40}%`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}
function confetti() {
  const colors = ['#3b82f6','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ec4899'];
  for (let i = 0; i < 30; i++) {
    setTimeout(() => {
      const c = document.createElement('div'); c.className = 'conf';
      c.style.cssText = `left:${Math.random()*100}vw;top:0;background:${colors[Math.floor(Math.random()*colors.length)]}`;
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 2100);
    }, i * 60);
  }
}
function getLevel(xp) {
  for (let i = LEVELS.length - 1; i >= 0; i--)
    if (xp >= LEVELS[i].min) return LEVELS[i];
  return LEVELS[0];
}
function initClock() {
  function tick() {
    const n = new Date();
    setText('live-clock', `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`);
  }
  tick(); setInterval(tick, 10000);
}

// ── AUTH ──
function switchAuthTab(tab) {
  ['login','signup'].forEach(t => {
    $id(`tab-${t}`).classList.toggle('active', t === tab);
    $id(`form-${t}`).style.display = t === tab ? 'block' : 'none';
  });
}
function showAuthForm(form) {
  ['login','signup','otp','forgot'].forEach(f => {
    const el = $id(`form-${f}`); if (el) el.style.display = 'none';
  });
  const target = $id(`form-${form}`); if (target) target.style.display = 'block';
}
function showForgotPassword() { showAuthForm('forgot'); }

function setAuthLoading(btnId, loading, text = '') {
  const btn = $id(btnId); if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading ? '<span class="loader"></span>' : text;
}

async function doLogin() {
  const email = $id('login-email').value.trim();
  const pass  = $id('login-pass').value;
  const err   = $id('login-err');
  if (!email || !pass) { err.textContent = 'Email and password required'; err.classList.add('show'); return; }
  err.classList.remove('show');
  setAuthLoading('btn-login', true);
  const res = await api('auth/login', { method: 'POST', body: JSON.stringify({ email, password: pass }) });
  setAuthLoading('btn-login', false, 'Login to ExamVerse');
  if (res.ok) {
    saveAuth(res.data.data);
    initApp();
  } else {
    err.textContent = res.data.message || 'Login failed';
    err.classList.add('show');
  }
}

async function doSignup() {
  const name  = $id('signup-name').value.trim();
  const email = $id('signup-email').value.trim();
  const pass  = $id('signup-pass').value;
  const exam  = $id('signup-exam').value;
  const err   = $id('signup-err');
  if (!name || !email || !pass) { err.textContent = 'All fields required'; err.classList.add('show'); return; }
  err.classList.remove('show');
  setAuthLoading('btn-signup', true);
  const res = await api('auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password: pass, selectedExam: exam }) });
  setAuthLoading('btn-signup', false, 'Create Account');
  if (res.ok) {
    saveAuth(res.data.data);
    if (res.data.data.requiresVerification) {
      $id('otp-email-hint').textContent = `Code sent to ${email}`;
      showAuthForm('otp');
    } else { initApp(); }
  } else {
    err.textContent = res.data.message || 'Signup failed';
    err.classList.add('show');
  }
}

async function doVerifyOTP() {
  const otp = [0,1,2,3,4,5].map(i => $id(`otp${i}`).value).join('');
  if (otp.length !== 6) { toast('Enter complete 6-digit OTP'); return; }
  setAuthLoading('btn-verify-otp', true);
  const res = await api('auth/verify-otp', { method: 'POST', body: JSON.stringify({ otp }) });
  setAuthLoading('btn-verify-otp', false, 'Verify Code');
  if (res.ok) { toast('✅ Email verified!'); initApp(); }
  else toast(res.data.message || 'Invalid OTP');
}

async function doForgotPassword() {
  const email = $id('forgot-email').value.trim();
  if (!email) { toast('Enter your email'); return; }
  setAuthLoading('btn-forgot', true);
  await api('auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
  setAuthLoading('btn-forgot', false, 'Send Reset Link');
  toast('📧 Reset link sent if email exists!');
}

async function doGoogleLogin() {
  toast('🔄 Google login — configure GOOGLE_CLIENT_ID in .env');
  // In production: load Google Identity Services SDK and use google.accounts.id.initialize
}

function saveAuth({ user, accessToken, refreshToken }) {
  STATE.user = user;
  STATE.accessToken = accessToken;
  STATE.refreshToken = refreshToken;
  if (user) STATE.exam = user.selectedExam || '';
  localStorage.setItem('ev_access', accessToken || '');
  localStorage.setItem('ev_refresh', refreshToken || '');
  localStorage.setItem('ev_user', JSON.stringify(user || {}));
}

function loadSavedAuth() {
  STATE.accessToken = localStorage.getItem('ev_access') || '';
  STATE.refreshToken = localStorage.getItem('ev_refresh') || '';
  try { STATE.user = JSON.parse(localStorage.getItem('ev_user') || 'null'); } catch(e) {}
  if (STATE.user) STATE.exam = STATE.user.selectedExam || '';
}

function logout() {
  if (STATE.accessToken) {
    api('auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: STATE.refreshToken }) });
  }
  STATE = { user: null, accessToken: null, refreshToken: null, exam: '', currentSession: null,
    questions: [], answers: {}, flagged: [], bookmarked: [], notes: {}, currentQ: 0,
    timerInterval: null, timeLeft: 0, totalTime: 0, chatHistory: [], aiMode: 'coach', orbOpen: false };
  localStorage.clear();
  $id('auth-wrap').classList.remove('hidden');
  showAuthForm('login');
}

// OTP inputs — auto-focus next
function initOTPInputs() {
  for (let i = 0; i < 6; i++) {
    const inp = $id(`otp${i}`);
    if (!inp) continue;
    inp.addEventListener('input', () => {
      inp.value = inp.value.slice(-1);
      if (inp.value && i < 5) $id(`otp${i+1}`).focus();
    });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !inp.value && i > 0) $id(`otp${i-1}`).focus();
    });
  }
}

// ── NAVIGATION ──
const SCREENS = ['home','examhub','chapters','mocks','dashboard','profile','aihub','results'];
function goTo(id, skipNav = false) {
  SCREENS.forEach(s => {
    const el = $id(`s-${s}`); if (el) el.classList.toggle('active', s === id);
  });
  if (!skipNav) {
    document.querySelectorAll('.ni').forEach(n => n.classList.toggle('active', n.dataset.s === id));
  }
  window.scrollTo(0, 0);
  if (id === 'dashboard') loadDashboard();
  if (id === 'profile') loadProfile();
  if (id === 'home') updateHomeUI();
  if (id === 'aihub') initAIPrompts();
  if (id === 'mocks') buildMockList();
}

// ── INIT APP ──
function initApp() {
  $id('auth-wrap').classList.add('hidden');
  updateTopBar();
  updateHomeUI();
  buildHomeExamGrid();
  buildAIModeGrid();
  buildMockList();
  loadDashboard();
}

// ── TOPBAR ──
function updateTopBar() {
  const u = STATE.user;
  setText('xp-pill', `⚡ ${u?.xp || 0}`);
  setText('streak-pill', `🔥 ${u?.streak || 0}`);
}

// ── HOME UI ──
function updateHomeUI() {
  const u = STATE.user; if (!u) return;
  const h = new Date().getHours();
  const g = h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : h < 21 ? 'Good Evening' : 'Good Night';
  setText('hero-greet', `${g}, ${u.name?.split(' ')[0] || 'Scholar'}!`);
  const acc = u.totalQuestions > 0 ? Math.round(u.totalCorrect / u.totalQuestions * 100) + '%' : '—';
  setText('h-qs', u.totalQuestions || 0);
  setText('h-mocks', u.totalQuizzes || 0);
  setText('h-acc', acc);
  setText('h-streak', `${u.streak || 0}🔥`);
  const lvl = getLevel(u.xp || 0);
  setText('h-rank', lvl.title.split(' ').pop());
  setText('home-level', `Level ${lvl.level} · ${lvl.title}`);
  const nextLvl = LEVELS[lvl.level] || LEVELS[LEVELS.length - 1];
  const pct = nextLvl ? Math.min(100, Math.round(((u.xp - lvl.min) / (nextLvl.min - lvl.min)) * 100)) : 100;
  setText('home-xp-til', `${u.xp || 0} / ${nextLvl?.min || '∞'} XP`);
  const bar = $id('home-lbar'); if (bar) bar.style.width = pct + '%';
}

// ── EXAM GRID ──
function buildHomeExamGrid() {
  const grid = $id('home-exam-grid'); if (!grid) return;
  grid.innerHTML = '';
  Object.entries(EXAMS).forEach(([key, ex]) => {
    const div = document.createElement('div');
    div.className = 'exam-card' + (STATE.exam === key ? ' sel' : '');
    div.innerHTML = `<span class="ec-count"><span class="badge b-blue" style="font-size:7px">Practice</span></span>
      <span class="ec-icon">${ex.icon}</span>
      <div class="ec-name" style="color:${ex.color}">${ex.name}</div>`;
    tap(div, () => selectExam(key));
    grid.appendChild(div);
  });
}

function selectExam(key) {
  STATE.exam = key;
  document.querySelectorAll('.exam-card').forEach(c => c.classList.remove('sel'));
  document.querySelectorAll('.ec-name').forEach(n => {
    if (n.textContent === EXAMS[key].name) n.closest('.exam-card').classList.add('sel');
  });
  toast(`✅ ${EXAMS[key].name} selected`);
  setTimeout(() => goToExamHub(key), 250);
}

// ── EXAM HUB ──
async function goToExamHub(key) {
  const ex = EXAMS[key];
  setText('eh-title', `${ex.icon} ${ex.name}`);
  setText('eh-sub', 'Loading subjects...');
  goTo('examhub');

  // Fetch subjects from DB
  const res = await api(`questions/index?exam=${key}&limit=0`);
  // Build subject grid from known exam structure
  const EXAM_SUBJECTS = {
    CUET:    ['English','General Knowledge','Economics','Political Science','Reasoning'],
    NEET:    ['Physics','Chemistry','Biology (Botany)','Biology (Zoology)'],
    JEE:     ['Physics','Chemistry','Mathematics'],
    JEEADV:  ['Physics','Chemistry','Mathematics'],
    NDA:     ['Mathematics','General Ability'],
    UPSC:    ['General Studies','CSAT'],
    SSC:     ['Quantitative Aptitude','English','Reasoning','General Awareness'],
    SSCCHSL: ['Quantitative Aptitude','English','Reasoning','General Awareness'],
    BANKING: ['Quantitative Aptitude','Reasoning','English','General Awareness','Computer'],
    RAILWAY: ['Mathematics','Reasoning','General Science','General Awareness'],
    STATEPCS:['General Studies','Reasoning'],
    POLICE:  ['General Knowledge','Reasoning','Mathematics'],
    TEACHING:['Child Development','Language I (Hindi/English)','EVS'],
    CLAT:    ['Legal Reasoning','Logical Reasoning','English','General Knowledge'],
    CAT:     ['Verbal Ability','Data Interpretation','Quantitative Aptitude'],
    CUETPG:  ['Research Aptitude','Domain Knowledge']
  };

  const subjects = EXAM_SUBJECTS[key] || ['General'];
  setText('eh-sub', `${ex.name} · ${subjects.length} Subjects`);

  const grid = $id('eh-subj-grid'); grid.innerHTML = '';
  const ICONS = { Physics:'⚡', Chemistry:'🧪', Mathematics:'📐', 'Biology (Botany)':'🌿',
    'Biology (Zoology)':'🧬', English:'🔤', 'General Knowledge':'🌐', Economics:'📊',
    'Political Science':'🏛️', Reasoning:'🧠', 'General Studies':'📚', CSAT:'🔢',
    'Quantitative Aptitude':'🔢', 'General Awareness':'📰', Computer:'💻',
    'General Ability':'🛡️', 'Legal Reasoning':'⚖️', 'Logical Reasoning':'🔍',
    'Verbal Ability':'📖', 'Data Interpretation':'📊', 'Child Development':'👶',
    'Language I (Hindi/English)':'📝', EVS:'🌍', 'General Science':'🔬',
    'Research Aptitude':'🔬', 'Domain Knowledge':'📚' };

  subjects.forEach(subj => {
    const div = document.createElement('div');
    div.className = 'card'; div.style.cssText = 'text-align:center;cursor:pointer;padding:16px 12px';
    div.innerHTML = `<div style="font-size:26px;margin-bottom:7px">${ICONS[subj] || '📚'}</div>
      <div style="font-size:10px;font-weight:700;color:${ex.color};margin-bottom:5px">${subj}</div>
      <div style="font-size:8px;color:var(--text3)">Tap to practice</div>`;
    tap(div, () => goToTopics(key, subj));
    grid.appendChild(div);
  });

  // Full mock button
  const full = document.createElement('div');
  full.style.cssText = 'grid-column:1/-1';
  full.innerHTML = `<button class="btn btn-primary" style="margin:0">🏆 Full Mock Test — ${ex.name}</button>`;
  tap(full.querySelector('button'), () => startQuiz({ exam: key, mode: 'mock', count: 50, title: `${ex.name} Full Mock` }));
  grid.appendChild(full);
}

// ── TOPICS ──
function goToTopics(examKey, subject) {
  setText('ch-title', subject);
  const list = $id('ch-list'); list.innerHTML = '';

  // Quick action buttons
  const qa = document.createElement('div'); qa.className = 'g2'; qa.style.marginBottom = '12px';
  qa.innerHTML = `<button class="btn btn-primary" id="ch-q10">⚡ Quick 10</button>
    <button class="btn btn-ghost" id="ch-full">📋 Full Set (50)</button>`;
  list.appendChild(qa);
  tap(qa.querySelector('#ch-q10'), () => startQuiz({ exam: examKey, subject, mode: 'quick', count: 10, title: `${subject} · Quick Quiz` }));
  tap(qa.querySelector('#ch-full'), () => startQuiz({ exam: examKey, subject, mode: 'practice', count: 50, title: `${subject} · Full Set` }));

  // Difficulty filter
  const df = document.createElement('div'); df.className = 'g3'; df.style.marginBottom = '12px';
  df.innerHTML = `<button class="btn btn-ghost btn-sm" style="width:100%;color:#34d399;border-color:rgba(16,185,129,0.2)" id="d-easy">🟢 Easy</button>
    <button class="btn btn-ghost btn-sm" style="width:100%;color:#fbbf24;border-color:rgba(245,158,11,0.2)" id="d-med">🟡 Medium</button>
    <button class="btn btn-ghost btn-sm" style="width:100%;color:#f87171;border-color:rgba(239,68,68,0.2)" id="d-hard">🔴 Hard</button>`;
  list.appendChild(df);
  ['easy','medium','hard'].forEach((d, i) => {
    const ids = ['d-easy','d-med','d-hard'];
    tap(df.querySelector(`#${ids[i]}`), () =>
      startQuiz({ exam: examKey, subject, difficulty: d, mode: 'practice', count: 20, title: `${subject} · ${d.charAt(0).toUpperCase()+d.slice(1)}` })
    );
  });

  // Mode cards
  const modes = [
    { icon:'📜', title:'PYQ Mode', sub:'Previous Year Questions', mode:'pyq' },
    { icon:'⏱️', title:'Speed Test', sub:'20 Qs in 10 minutes', mode:'speed', count:20, time:600 },
    { icon:'🔖', title:'Revision Mode', sub:'Key concepts', mode:'revision', count:15 },
    { icon:'🤖', title:'Adaptive Test', sub:'AI selects difficulty', mode:'adaptive', count:30 }
  ];
  const lbl = document.createElement('div'); lbl.className = 'lbl'; lbl.textContent = 'Practice Modes'; list.appendChild(lbl);
  modes.forEach(m => {
    const div = document.createElement('div'); div.className = 'card'; div.style.cssText = 'display:flex;align-items:center;gap:12px;cursor:pointer';
    div.innerHTML = `<div style="font-size:22px;flex-shrink:0">${m.icon}</div>
      <div style="flex:1"><div style="font-size:12px;font-weight:700;margin-bottom:2px">${m.title}</div>
      <div style="font-size:9px;color:var(--text3)">${m.sub}</div></div>
      <div style="font-size:11px;color:var(--blue)">→</div>`;
    tap(div, () => startQuiz({ exam: examKey, subject, mode: m.mode, count: m.count || 25, time: m.time, title: `${subject} · ${m.title}` }));
    list.appendChild(div);
  });
  goTo('chapters');
}

// ── MOCK LIST ──
function buildMockList() {
  const list = $id('mock-list'); if (!list) return;
  list.innerHTML = '';
  Object.entries(EXAMS).forEach(([key, ex]) => {
    const div = document.createElement('div');
    div.className = 'card'; div.style.cssText = 'display:flex;align-items:center;gap:12px;cursor:pointer';
    div.innerHTML = `<div style="font-size:24px;flex-shrink:0">${ex.icon}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:11px;font-weight:700;color:${ex.color};margin-bottom:2px">${ex.name} Full Mock</div>
        <div style="font-size:8px;color:var(--text3)">50 MCQs · 60 min <span class="badge b-blue" style="margin-left:4px">SIMULATION</span></div>
      </div>
      <button class="btn btn-primary btn-sm" style="flex-shrink:0">Start</button>`;
    tap(div.querySelector('button'), () => startQuiz({ exam: key, mode: 'mock', count: 50, time: 3600, title: `${ex.name} Full Mock` }));
    list.appendChild(div);
  });
}

// ── QUIZ ENGINE ──
async function startQuiz({ exam, subject, difficulty, mode, count, time, title }) {
  if (!STATE.user) { toast('Please login first'); return; }
  if (!exam) exam = STATE.exam || 'CUET';

  toast('⏳ Loading questions...');

  // Build query
  let q = `questions/index?exam=${exam}&limit=${count || 20}&random=true`;
  if (subject) q += `&subject=${encodeURIComponent(subject)}`;
  if (difficulty) q += `&difficulty=${difficulty}`;
  if (mode === 'pyq') q += '&year=2023';

  const res = await api(q);
  if (!res.ok || !res.data.data?.questions?.length) {
    // Fallback: generate with AI if no DB questions
    if (subject) {
      await startAIQuiz(exam, subject, difficulty || 'medium', count || 10);
      return;
    }
    toast('❌ No questions found. Try different filters.');
    return;
  }

  const questions = res.data.data.questions;
  STATE.questions = questions;
  STATE.answers = {}; STATE.flagged = []; STATE.bookmarked = []; STATE.notes = {};
  STATE.currentQ = 0;
  STATE.totalTime = time !== undefined ? time : (mode === 'speed' ? 600 : mode === 'mock' ? 3600 : 0);
  STATE.timeLeft = STATE.totalTime;
  STATE.currentSession = { exam, subject: subject || 'Mixed', mode, title: title || exam };

  // Start quiz API session
  const sessionRes = await api('quiz/start', {
    method: 'POST',
    body: JSON.stringify({ exam, subject, difficulty, mode, count, time: STATE.totalTime, title })
  });
  if (sessionRes.ok) STATE.currentSession.id = sessionRes.data.data?.sessionId;

  // Open quiz UI
  setText('q-title', `${EXAMS[exam]?.icon || '📚'} ${EXAMS[exam]?.name || exam}`);
  setText('q-sub', title || `${exam} · ${mode}`);
  $id('quiz-wrap').classList.add('open');
  document.body.style.overflow = 'hidden';
  renderQ(0);
  startTimer();
}

async function startAIQuiz(exam, subject, difficulty, count) {
  toast('🤖 AI generating questions...');
  const res = await api('ai/generate-questions', {
    method: 'POST',
    body: JSON.stringify({ exam, subject, topic: subject, difficulty, count, save: false })
  });
  if (!res.ok || !res.data.data?.questions?.length) {
    toast('❌ Could not generate questions. Try again.'); return;
  }
  const questions = res.data.data.questions.map((q, i) => ({
    ...q, _id: `ai_${i}`, question: q.question, options: q.options
  }));
  STATE.questions = questions;
  STATE.answers = {}; STATE.flagged = []; STATE.bookmarked = []; STATE.notes = {};
  STATE.currentQ = 0; STATE.totalTime = 0; STATE.timeLeft = 0;
  STATE.currentSession = { exam, subject, mode: 'ai', title: `AI Quiz · ${subject}` };
  setText('q-title', `🤖 AI Quiz`);
  setText('q-sub', `${exam} · ${subject} (AI Generated)`);
  $id('quiz-wrap').classList.add('open');
  document.body.style.overflow = 'hidden';
  renderQ(0);
  startTimer();
}

function renderQ(idx) {
  STATE.currentQ = idx;
  const q = STATE.questions[idx]; if (!q) return;
  setText('q-num', `Q ${idx + 1} of ${STATE.questions.length}`);
  $id('q-txt').textContent = q.question;

  // Badges
  const db = $id('q-diff-badge');
  const dc = { easy:'b-green', medium:'b-orange', hard:'b-red' };
  db.innerHTML = q.difficulty ? `<span class="badge ${dc[q.difficulty] || 'b-blue'}">${q.difficulty}</span>` : '';
  const sb = $id('q-src-badge');
  sb.innerHTML = `<span class="badge b-blue">${q.exam || STATE.currentSession?.exam || 'EXAM'}${q.year ? ' · '+q.year : ''}</span>`;

  // Explanation
  const eb = $id('exp-box'); eb.textContent = ''; eb.classList.remove('show');
  $id('q-note').value = STATE.notes[idx] || '';

  // Options
  const opts = $id('q-opts'); opts.innerHTML = '';
  const labels = ['A','B','C','D'];
  (q.options || q.o || []).forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'opt' + (STATE.answers[idx] === i ? ' sel' : '');
    btn.innerHTML = `<span class="olbl">${labels[i]}</span><span style="flex:1;text-align:left;line-height:1.5">${opt}</span>`;
    tap(btn, () => {
      opts.querySelectorAll('.opt').forEach(o => o.classList.remove('sel'));
      btn.classList.add('sel');
      STATE.answers[idx] = i;
      if (STATE.flagged.includes(idx)) STATE.flagged = STATE.flagged.filter(f => f !== idx);
      updateQProg(); updatePalette();
    });
    opts.appendChild(btn);
  });

  $id('q-note').oninput = () => { STATE.notes[idx] = $id('q-note').value; };
  updateQProg(); updatePalette();
}

function updateQProg() {
  const answered = Object.keys(STATE.answers).length;
  const pct = STATE.questions.length > 0 ? Math.round(answered / STATE.questions.length * 100) : 0;
  const bar = $id('qpbar-f'); if (bar) bar.style.width = pct + '%';
}

function qNext() { if (STATE.currentQ < STATE.questions.length - 1) renderQ(STATE.currentQ + 1); else toast('Last question!'); }
function qPrev() { if (STATE.currentQ > 0) renderQ(STATE.currentQ - 1); }
function qFlag() {
  const idx = STATE.currentQ;
  if (!STATE.flagged.includes(idx)) STATE.flagged.push(idx); else STATE.flagged = STATE.flagged.filter(f => f !== idx);
  toast(STATE.flagged.includes(idx) ? '🚩 Flagged' : '🚩 Flag removed'); updatePalette();
}
function qClear() { delete STATE.answers[STATE.currentQ]; renderQ(STATE.currentQ); }
function qBook() {
  const idx = STATE.currentQ;
  if (!STATE.bookmarked.includes(idx)) STATE.bookmarked.push(idx); else STATE.bookmarked = STATE.bookmarked.filter(b => b !== idx);
  toast(STATE.bookmarked.includes(idx) ? '🔖 Bookmarked' : '🔖 Removed'); updatePalette();
}

// ── TIMER ──
function startTimer() {
  clearInterval(STATE.timerInterval);
  if (STATE.totalTime <= 0) { setText('qtmr', '∞'); return; }
  const tick = () => {
    if (STATE.timeLeft <= 0) { clearInterval(STATE.timerInterval); submitQuiz(); return; }
    STATE.timeLeft--;
    const m = Math.floor(STATE.timeLeft / 60), s = STATE.timeLeft % 60;
    const el = $id('qtmr');
    if (el) { el.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; el.classList.toggle('urgent', STATE.timeLeft < 60); }
  };
  tick(); STATE.timerInterval = setInterval(tick, 1000);
}

// ── PALETTE ──
function openPalette() { $id('pal-ov').classList.add('open'); buildPalette(); }
function closePalette() { $id('pal-ov').classList.remove('open'); }
function buildPalette() {
  const grid = $id('pal-grid'); grid.innerHTML = '';
  STATE.questions.forEach((_, i) => {
    const btn = document.createElement('button');
    btn.className = 'pb'
      + (i === STATE.currentQ ? ' cur' : '')
      + (STATE.answers[i] !== undefined ? ' ans' : '')
      + (STATE.flagged.includes(i) ? ' flag' : '')
      + (STATE.bookmarked.includes(i) ? ' bkm' : '');
    btn.textContent = i + 1;
    tap(btn, () => { renderQ(i); closePalette(); });
    grid.appendChild(btn);
  });
  setText('pal-stats', `Answered: ${Object.keys(STATE.answers).length} / ${STATE.questions.length} · Flagged: ${STATE.flagged.length}`);
}
function updatePalette() {
  const grid = $id('pal-grid'); if (!grid || !grid.children.length) return;
  Array.from(grid.children).forEach((btn, i) => {
    btn.className = 'pb'
      + (i === STATE.currentQ ? ' cur' : '')
      + (STATE.answers[i] !== undefined ? ' ans' : '')
      + (STATE.flagged.includes(i) ? ' flag' : '')
      + (STATE.bookmarked.includes(i) ? ' bkm' : '');
  });
}

// ── SUBMIT ──
function openSubmit() {
  const ans = Object.keys(STATE.answers).length;
  setText('sub-stats', `Answered ${ans} of ${STATE.questions.length}. ${STATE.questions.length - ans} unattempted.`);
  $id('sub-cf').classList.add('open');
}
function closeSubmit() { $id('sub-cf').classList.remove('open'); }

async function submitQuiz() {
  clearInterval(STATE.timerInterval);
  closeSubmit();
  $id('quiz-wrap').classList.remove('open');
  document.body.style.overflow = '';

  const timeSpent = STATE.totalTime > 0 ? STATE.totalTime - STATE.timeLeft : 0;
  const answersObj = {};
  Object.entries(STATE.answers).forEach(([k,v]) => { answersObj[k] = v; });

  let results;
  if (STATE.currentSession?.id) {
    // Server-side grading
    const res = await api('quiz/submit', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: STATE.currentSession.id, answers: answersObj,
        timeSpent, flagged: STATE.flagged, bookmarked: STATE.bookmarked, notes: STATE.notes
      })
    });
    if (res.ok) {
      results = res.data.data.results;
      // Update local user
      if (STATE.user) {
        STATE.user.xp = res.data.data.userStats?.xp || STATE.user.xp;
        STATE.user.streak = res.data.data.userStats?.streak || STATE.user.streak;
        STATE.user.totalQuestions = (STATE.user.totalQuestions || 0) + results.total;
        STATE.user.totalCorrect = (STATE.user.totalCorrect || 0) + results.correct;
        STATE.user.totalQuizzes = (STATE.user.totalQuizzes || 0) + 1;
        localStorage.setItem('ev_user', JSON.stringify(STATE.user));
      }
      updateTopBar();
      // Level up?
      if (res.data.data.leveledUp && res.data.data.newLevel) showLevelUp(res.data.data.newLevel);
      // Achievements?
      if (res.data.data.newAchievements?.length > 0) showAchievement(res.data.data.newAchievements[0]);
    } else {
      // Fallback: local grading
      results = gradeLocally(answersObj);
    }
  } else {
    results = gradeLocally(answersObj);
  }

  showResults(results);
  goTo('results', true);
  spawnXP(results.xpEarned || 0);
  if (results.accuracy >= 80) confetti();
}

function gradeLocally(answersObj) {
  let correct = 0, wrong = 0, skipped = 0;
  STATE.questions.forEach((q, i) => {
    const ca = q.correctAnswer !== undefined ? q.correctAnswer : q.c;
    const ua = answersObj[i];
    if (ua === undefined || ua === null) skipped++;
    else if (parseInt(ua) === ca) correct++;
    else wrong++;
  });
  const total = STATE.questions.length;
  const accuracy = total > 0 ? Math.round(correct / total * 100) : 0;
  const xpEarned = correct * 12 + Math.floor(accuracy / 10) * 5 + (accuracy === 100 ? 100 : 0);
  return { correct, wrong, skipped, total, score: correct * 4 - wrong, totalMarks: total * 4, accuracy, xpEarned };
}

function showResults(r) {
  const ranks = [
    { min:95, icon:'🏆', title:'LEGENDARY SCHOLAR', sub:'Top 1% · Extraordinary' },
    { min:85, icon:'⚡', title:'QUANTUM MASTER',    sub:'Top 5% · Outstanding' },
    { min:75, icon:'🎯', title:'KNOWLEDGE WARRIOR', sub:'Top 15% · Excellent' },
    { min:60, icon:'🔥', title:'DATA CADET',        sub:'Above Average · Keep Going' },
    { min:45, icon:'💪', title:'RISING STAR',       sub:'Good Effort · Practice More' },
    { min:0,  icon:'📚', title:'NEURAL LEARNER',    sub:'Keep Going · Stay Consistent' }
  ];
  const rank = ranks.find(r2 => r.accuracy >= r2.min) || ranks[ranks.length - 1];
  setText('rank-icon', rank.icon); setText('rank-title', rank.title); setText('rank-sub', rank.sub);

  const ag = $id('analytics-grid');
  ag.innerHTML = [
    { v: `${r.correct}/${r.total}`, l: 'CORRECT', c: 'var(--green)' },
    { v: `${r.accuracy}%`,          l: 'SCORE',   c: 'var(--blue)' },
    { v: r.wrong,                   l: 'WRONG',   c: 'var(--red)' },
    { v: `+${r.xpEarned}⚡`,        l: 'XP',      c: 'var(--purple)' }
  ].map(a => `<div class="ac"><div class="av" style="color:${a.c}">${a.v}</div><div class="al">${a.l}</div></div>`).join('');

  // AI Feedback
  const fb = $id('ai-fb'); fb.innerHTML = '';
  const msgs = r.accuracy >= 80
    ? ['🌟 Excellent performance! You are exam-ready at this pace.', '⚡ Maintain this momentum and you will crack the exam!']
    : r.accuracy >= 60
    ? ['💡 Good performance! Review incorrect questions carefully.', '📚 Focus on your weak topics for further improvement.']
    : ['📖 More practice needed. Consistency beats intensity.', '🎯 Review fundamentals and attempt daily quizzes.'];
  msgs.forEach(m => {
    const d = document.createElement('div'); d.className = 'card';
    d.style.display = 'flex'; d.style.gap = '8px';
    d.innerHTML = `<span>🤖</span><span style="font-size:12px;color:var(--text2);line-height:1.5">${m}</span>`;
    fb.appendChild(d);
  });
  $id('review-section').style.display = 'none';
}

function reviewAnswers() {
  const sec = $id('review-section'), list = $id('review-list');
  sec.style.display = 'block'; list.innerHTML = '';
  STATE.questions.forEach((q, i) => {
    const ca = q.correctAnswer !== undefined ? q.correctAnswer : q.c;
    const ua = STATE.answers[i];
    const isCorrect = ua === ca;
    const isSkipped = ua === undefined;
    const opts = (q.options || q.o || []).map((o, oi) => {
      const cls = oi === ca ? 'rev-ok' : (oi === ua && !isCorrect ? 'rev-ng' : '');
      return `<div class="rev-opt ${cls}">${oi === ca ? '✓ ' : oi === ua ? '✗ ' : ''}${o}</div>`;
    }).join('');
    const div = document.createElement('div'); div.className = 'rev-item';
    div.innerHTML = `<div style="font-size:8px;color:var(--text3);margin-bottom:6px">Q${i+1} · ${isSkipped ? 'SKIPPED' : isCorrect ? '✓ CORRECT' : '✗ WRONG'}</div>
      <div style="font-size:13px;margin-bottom:8px;line-height:1.6">${q.question}</div>${opts}
      ${(q.explanation || q.exp) ? `<div style="background:rgba(59,130,246,0.04);border:1px solid rgba(59,130,246,0.1);border-radius:var(--r);padding:9px;font-size:11px;color:var(--text2);margin-top:7px;line-height:1.5">💡 ${q.explanation || q.exp}</div>` : ''}`;
    list.appendChild(div);
  });
  sec.scrollIntoView({ behavior: 'smooth' });
}

function retryQuiz() { startQuiz({ ...STATE.currentSession, count: STATE.questions.length }); }
function retryWrong() {
  const wrong = STATE.questions.filter((q, i) => {
    const ca = q.correctAnswer !== undefined ? q.correctAnswer : q.c;
    return STATE.answers[i] !== ca;
  });
  if (wrong.length === 0) { toast('🎉 No wrong answers!'); return; }
  STATE.questions = wrong;
  STATE.answers = {}; STATE.flagged = []; STATE.bookmarked = []; STATE.notes = [];
  STATE.currentQ = 0; STATE.totalTime = 0; STATE.timeLeft = 0;
  setText('q-title', '🎯 Wrong Only'); setText('q-sub', `${wrong.length} questions`);
  $id('quiz-wrap').classList.add('open'); document.body.style.overflow = 'hidden';
  renderQ(0); startTimer();
  goTo('home', true);
}

function shareScore() {
  const total = STATE.questions.length;
  const correct = Object.entries(STATE.answers).filter(([i, ua]) => {
    const q = STATE.questions[i];
    return ua === (q.correctAnswer !== undefined ? q.correctAnswer : q.c);
  }).length;
  const score = total > 0 ? Math.round(correct / total * 100) : 0;
  const text = `⚡ ExamVerse OS\n${STATE.currentSession?.exam || 'Quiz'}: ${score}% (${correct}/${total})\nt.me/codexstudys · @fazal.893`;
  if (navigator.share) navigator.share({ text });
  else if (navigator.clipboard) { navigator.clipboard.writeText(text); toast('📋 Score copied!'); }
}

// ── LEVEL UP ──
function showLevelUp(level) {
  setText('lvlup-title', `Level ${level.level}`);
  setText('lvlup-sub', level.title);
  $id('lvlup').classList.add('open');
  confetti();
}

// ── ACHIEVEMENT POPUP ──
function showAchievement(ach) {
  setText('ach-pop-icon', ach.icon || '🏆');
  setText('ach-pop-name', ach.title || 'Achievement');
  setText('ach-pop-desc', ach.desc || '');
  const el = $id('ach-pop'); el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3500);
}

// ── DASHBOARD ──
async function loadDashboard() {
  const u = STATE.user; if (!u) return;
  setText('d-streak-big', u.streak || 0);
  setText('d-xp', u.xp || 0);
  setText('d-acc', u.totalQuestions > 0 ? Math.round(u.totalCorrect / u.totalQuestions * 100) + '%' : '—');
  setText('d-quiz', u.totalQuizzes || 0);
  setText('d-qs', u.totalQuestions || 0);
  setText('d-correct', u.totalCorrect || 0);
  const lvl = getLevel(u.xp || 0);
  setText('d-rank', `Lv.${lvl.level} ${lvl.title}`);

  // Fetch detailed stats
  const res = await api('user/stats');
  if (res.ok) {
    const act = $id('d-activity'); act.innerHTML = '';
    const sessions = res.data.data?.recentSessions || [];
    if (sessions.length === 0) {
      act.innerHTML = '<div class="card" style="font-size:12px;color:var(--text2);text-align:center;padding:18px">No activity yet. Start a quiz! 🚀</div>';
      return;
    }
    sessions.slice(0, 6).forEach(s => {
      const ex = EXAMS[s.exam] || { icon: '📊', name: s.exam };
      const d = document.createElement('div'); d.className = 'act-item';
      d.innerHTML = `<span>${ex.icon}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:11px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.subject || s.exam}</div>
          <div style="font-size:8px;color:var(--text3)">${new Date(s.completedAt).toLocaleDateString()} · +${s.xpEarned}⚡</div>
        </div>
        <span class="badge ${s.accuracy >= 70 ? 'b-green' : s.accuracy >= 50 ? 'b-orange' : 'b-red'}">${s.accuracy}%</span>`;
      act.appendChild(d);
    });
  }
}

// ── PROFILE ──
async function loadProfile() {
  const u = STATE.user; if (!u) return;
  setText('pf-name', u.name || 'Scholar');
  const lvl = getLevel(u.xp || 0);
  setText('pf-level', `Level ${lvl.level} · ${u.xp || 0} XP`);
  setText('pf-exam', `Exam: ${u.selectedExam ? (EXAMS[u.selectedExam]?.name || u.selectedExam) : '—'}`);
  setText('pf-xp', u.xp || 0);
  setText('pf-acc', u.totalQuestions > 0 ? Math.round(u.totalCorrect / u.totalQuestions * 100) + '%' : '—');
  setText('pf-streak', `${u.streak || 0}🔥`);
  if (u.avatar) {
    const av = $id('pf-av-wrap');
    if (av) av.innerHTML = `<img src="${u.avatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover" onerror="this.parentNode.textContent='⚡'">`;
  }

  // Achievements
  const ACHS = [
    { id:'first_quiz', icon:'🏆', name:'First Blood',  desc:'Complete first quiz', check: u => u.totalQuizzes >= 1 },
    { id:'accuracy_80',icon:'🎯', name:'Sharp Shooter',desc:'Score 80%+',          check: u => false },
    { id:'perfect_score',icon:'💯',name:'Perfect!',    desc:'Score 100%',          check: u => false },
    { id:'streak_3',   icon:'🔥', name:'On Fire',      desc:'3 day streak',        check: u => u.streak >= 3 },
    { id:'streak_7',   icon:'⚡', name:'Week Warrior', desc:'7 day streak',        check: u => u.streak >= 7 },
    { id:'total_100',  icon:'🎖️', name:'Century',      desc:'100+ questions',      check: u => u.totalQuestions >= 100 },
    { id:'xp_1000',    icon:'⭐', name:'XP Master',    desc:'1000+ XP',            check: u => u.xp >= 1000 },
    { id:'xp_5000',    icon:'💎', name:'Elite',        desc:'5000+ XP',            check: u => u.xp >= 5000 },
    { id:'total_1000', icon:'👑', name:'Scholar',      desc:'1000+ questions',     check: u => u.totalQuestions >= 1000 }
  ];
  const grid = $id('ach-grid'); grid.innerHTML = '';
  const unlocked = (u.achievements || []).map(a => a.id || a);
  ACHS.forEach(a => {
    const on = unlocked.includes(a.id) || a.check(u);
    const div = document.createElement('div');
    div.className = 'ach-item' + (on ? ' on' : ''); div.style.opacity = on ? '1' : '0.3';
    div.innerHTML = `<div style="font-size:22px;margin-bottom:5px">${a.icon}</div>
      <div style="font-size:8px;font-weight:700;color:var(--blue);margin-bottom:2px">${a.name}</div>
      <div style="font-size:7px;color:var(--text3)">${a.desc}</div>`;
    grid.appendChild(div);
  });

  // History
  const hist = $id('pf-history'); hist.innerHTML = '';
  const res = await api('quiz/history?limit=10');
  if (res.ok) {
    const sessions = res.data.data?.sessions || [];
    if (sessions.length === 0) { hist.innerHTML = '<div class="card" style="font-size:12px;color:var(--text2);text-align:center">No quiz history yet.</div>'; return; }
    sessions.forEach(s => {
      const ex = EXAMS[s.exam] || { icon:'📊' };
      const d = document.createElement('div'); d.className = 'act-item';
      d.innerHTML = `<span>${ex.icon}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:11px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.subject || s.exam}</div>
          <div style="font-size:8px;color:var(--text3)">${new Date(s.completedAt).toLocaleDateString()} · +${s.xpEarned}⚡</div>
        </div>
        <span style="font-size:13px;font-weight:800;color:${s.accuracy >= 70 ? 'var(--green)' : s.accuracy >= 50 ? 'var(--orange)' : 'var(--red)'}">${s.accuracy}%</span>`;
      hist.appendChild(d);
    });
  }
}

// ── AI HUB ──
const AI_MODES_CONFIG = [
  { key:'coach',    icon:'🎓', name:'Study Coach',   sub:'Personalized guidance' },
  { key:'doubt',    icon:'🔍', name:'Doubt Solver',  sub:'Instant explanations' },
  { key:'revision', icon:'📋', name:'Revision',      sub:'Quick notes' },
  { key:'strategy', icon:'🎯', name:'Exam Strategy', sub:'Smart tips' },
  { key:'flashcard',icon:'🃏', name:'Flashcards',    sub:'AI generated' },
  { key:'motivate', icon:'🔥', name:'Motivator',     sub:'Stay inspired' }
];

function buildAIModeGrid() {
  const grid = $id('ai-mode-grid'); if (!grid) return; grid.innerHTML = '';
  AI_MODES_CONFIG.forEach(m => {
    const d = document.createElement('div'); d.className = 'card'; d.style.cssText = 'cursor:pointer;padding:10px';
    d.innerHTML = `<div style="font-size:18px;margin-bottom:4px">${m.icon}</div>
      <div style="font-size:10px;font-weight:700;margin-bottom:2px">${m.name}</div>
      <div style="font-size:8px;color:var(--text3)">${m.sub}</div>`;
    tap(d, () => { STATE.aiMode = m.key; toast(`✅ ${m.name} activated`); initAIPrompts(); });
    grid.appendChild(d);
  });
}

function initAIPrompts(custom) {
  const el = $id('ai-prompts'); if (!el) return; el.innerHTML = '';
  const examName = STATE.exam ? EXAMS[STATE.exam]?.name : 'my exam';
  const prompts = custom || {
    coach:    [`Best strategy for ${examName}?`, 'What to study this week?', 'How to improve accuracy?', 'Create a study schedule'],
    doubt:    ['Explain the concept of elasticity', 'What is Newton\'s 3rd law?', 'Explain DNA replication', 'Solve a time-distance problem'],
    revision: [`Key topics in ${examName}`, 'Important formulas to remember', 'Quick fact sheet for GK', 'Grammar rules summary'],
    strategy: ['Exam day tips', 'Time management during test', 'How to attempt MCQs?', 'Last month strategy'],
    flashcard: [`Generate flashcards for ${examName}`, 'Flashcards on Indian History', 'Physics formulas flashcards', 'Economics terms flashcards'],
    motivate: ['I need motivation to study', 'Feeling overwhelmed, help!', 'How to stay consistent?', 'Inspire me to keep going']
  }[STATE.aiMode] || [`Best strategy for ${examName}?`, 'Important topics?', 'How to manage time?', 'Motivate me to study'];

  prompts.slice(0, 6).forEach(p => {
    const d = document.createElement('div'); d.className = 'pchip';
    d.innerHTML = `<span style="color:var(--blue);flex-shrink:0">→</span><span>${p}</span>`;
    tap(d, () => { $id('ai-input').value = p; sendAI(); });
    el.appendChild(d);
  });
}

async function sendAI() {
  const inp = $id('ai-input');
  const text = inp.value.trim(); if (!text) return;
  inp.value = '';
  const chat = $id('ai-chat');

  const ue = document.createElement('div'); ue.className = 'ai-msg ai-user'; ue.textContent = text;
  chat.appendChild(ue);

  const te = document.createElement('div'); te.className = 'ai-msg ai-bot';
  te.innerHTML = '<div class="ai-typing"><div class="tdot"></div><div class="tdot"></div><div class="tdot"></div></div>';
  chat.appendChild(te); chat.scrollTop = 99999;

  STATE.chatHistory.push({ role: 'user', content: text });

  const res = await api('ai/chat', {
    method: 'POST',
    body: JSON.stringify({
      message: text, mode: STATE.aiMode,
      history: STATE.chatHistory.slice(-8),
      context: { exam: STATE.exam, subject: STATE.currentSession?.subject }
    })
  });

  const reply = res.ok ? res.data.data?.reply : 'Keep practicing daily and you will see improvement! 💪';
  STATE.chatHistory.push({ role: 'assistant', content: reply });
  te.innerHTML = ''; te.textContent = reply;
  chat.scrollTop = 99999;
}

// ── FLOATING ORB ──
function toggleOrb() {
  STATE.orbOpen = !STATE.orbOpen;
  $id('fpanel').classList.toggle('open', STATE.orbOpen);
  if (STATE.orbOpen) {
    const tips = [
      'Ready to study? Let\'s crush it! 🚀',
      `Your streak: ${STATE.user?.streak || 0} days 🔥`,
      `Total XP: ${STATE.user?.xp || 0} ⚡`,
      'Try a full mock for exam feel!',
      'Ask AI anything about your subject!'
    ];
    setText('f-msg', tips[Math.floor(Math.random() * tips.length)]);
  }
}

// ── MAIN INIT ──
document.addEventListener('DOMContentLoaded', () => {
  loadSavedAuth();
  initClock();
  initOTPInputs();

  if (STATE.user && STATE.accessToken) {
    initApp();
  }

  // AUTH EVENTS
  tap($id('btn-login'),         doLogin);
  tap($id('btn-signup'),        doSignup);
  tap($id('btn-verify-otp'),    doVerifyOTP);
  tap($id('btn-forgot'),        doForgotPassword);
  tap($id('btn-google-login'),  doGoogleLogin);
  tap($id('btn-google-signup'), doGoogleLogin);
  tap($id('resend-otp'), async () => {
    await api('auth/resend-otp', { method: 'POST' });
    toast('📧 OTP resent!');
  });

  // Enter key on auth forms
  $id('login-pass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  $id('signup-pass').addEventListener('keydown', e => { if (e.key === 'Enter') doSignup(); });
  $id('forgot-email').addEventListener('keydown', e => { if (e.key === 'Enter') doForgotPassword(); });

  // NAV
  document.querySelectorAll('.ni').forEach(btn => {
    tap(btn, () => goTo(btn.dataset.s));
  });

  // BACK BUTTONS
  tap($id('btn-back-eh'),    () => goTo('home'));
  tap($id('btn-back-ch'),    () => goTo('examhub'));
  tap($id('btn-back-mocks'), () => goTo('home'));

  // HOME QUICK ACTIONS
  tap($id('btn-quick'),  () => startQuiz({ exam: STATE.exam || 'CUET', mode: 'quick', count: 10, title: 'Quick 10' }));
  tap($id('btn-daily'),  () => startQuiz({ exam: STATE.exam || 'CUET', mode: 'daily', count: 15, title: 'Daily Challenge' }));
  tap($id('btn-pyq'),    () => startQuiz({ exam: STATE.exam || 'CUET', mode: 'pyq',   count: 20, title: 'PYQ Mode' }));
  tap($id('btn-aiquiz'), () => {
    const exam = STATE.exam || 'CUET';
    const ex = EXAMS[exam];
    startAIQuiz(exam, ex?.name || 'General', 'medium', 10);
  });

  // DASHBOARD BUTTONS
  tap($id('btn-dash-start'), () => goTo('home'));
  tap($id('btn-dash-mock'),  () => goTo('mocks'));
  tap($id('btn-dash-ai'),    () => goTo('aihub'));

  // QUIZ CONTROLS
  tap($id('btn-pal'),   openPalette);
  tap($id('btn-end'),   openSubmit);
  tap($id('btn-prev'),  qPrev);
  tap($id('btn-flag'),  qFlag);
  tap($id('btn-clear'), qClear);
  tap($id('btn-book'),  qBook);
  tap($id('btn-next'),  qNext);
  tap($id('btn-pal-close'), closePalette);
  tap($id('btn-cancel-sub'), closeSubmit);
  tap($id('btn-confirm-sub'), submitQuiz);

  // RESULTS
  tap($id('btn-review'),      reviewAnswers);
  tap($id('btn-retry'),       retryQuiz);
  tap($id('btn-retry-wrong'), retryWrong);
  tap($id('btn-share'),       shareScore);
  tap($id('btn-to-dash'),     () => goTo('dashboard'));

  // PROFILE
  tap($id('btn-logout'), logout);

  // AI
  tap($id('btn-ai-send'), sendAI);
  $id('ai-input').addEventListener('keydown', e => { if (e.key === 'Enter') sendAI(); });

  // FLOATING ORB
  tap($id('forb'), toggleOrb);
  tap($id('btn-orb-ai'), () => { goTo('aihub'); $id('fpanel').classList.remove('open'); STATE.orbOpen = false; });

  // LEVEL UP CLOSE
  tap($id('btn-lvlup-close'), () => $id('lvlup').classList.remove('open'));

  // CLOSE OVERLAYS ON OUTSIDE TAP
  tap($id('pal-ov'),  e => { if (e.target === $id('pal-ov'))  closePalette(); });
  tap($id('sub-cf'),  e => { if (e.target === $id('sub-cf'))  closeSubmit(); });
  tap($id('lvlup'),   e => { if (e.target === $id('lvlup'))   $id('lvlup').classList.remove('open'); });

  // KEYBOARD SHORTCUTS
  document.addEventListener('keydown', e => {
    if ($id('quiz-wrap').classList.contains('open')) {
      if (e.key === 'ArrowRight' || e.key === 'Enter') qNext();
      if (e.key === 'ArrowLeft') qPrev();
      if (e.key === '1') { const o = $id('q-opts')?.children[0]; if (o) o.click(); }
      if (e.key === '2') { const o = $id('q-opts')?.children[1]; if (o) o.click(); }
      if (e.key === '3') { const o = $id('q-opts')?.children[2]; if (o) o.click(); }
      if (e.key === '4') { const o = $id('q-opts')?.children[3]; if (o) o.click(); }
    }
  });
});
