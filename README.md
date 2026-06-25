# ExamVerse OS 🎓
### India's Most Advanced Exam Preparation Platform

Built by **OG FAZAL** · t.me/codexstudys · @fazal.893

---

## 🚀 Quick Deploy (15 minutes)

### Step 1 — MongoDB Atlas (Free)
1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create free account → New Project → Free Cluster (M0)
3. Database Access → Add User → username + password (save it)
4. Network Access → Add IP → Allow from anywhere (0.0.0.0/0)
5. Clusters → Connect → Connect your application → Copy URI
6. Replace `<password>` in URI with your password

### Step 2 — Cloudinary (Free)
1. Go to [cloudinary.com](https://cloudinary.com) → Free account
2. Dashboard → Copy: Cloud Name, API Key, API Secret

### Step 3 — Anthropic API
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. API Keys → Create Key → Copy it

### Step 4 — Google OAuth (optional)
1. [console.cloud.google.com](https://console.cloud.google.com)
2. New Project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID → Web application
4. Add authorized origins: your Vercel URL

### Step 5 — Deploy to Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Clone and install
git clone https://github.com/your-username/examverse-os
cd examverse-os
npm install

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: examverse-os
# - Directory: ./
# - Override settings? No
```

### Step 6 — Set Environment Variables on Vercel
Go to vercel.com → Your Project → Settings → Environment Variables

Add these one by one:

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | Your MongoDB connection string |
| `JWT_SECRET` | Any 64+ char random string |
| `JWT_REFRESH_SECRET` | Different 64+ char random string |
| `CLOUDINARY_CLOUD_NAME` | From Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | From Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | From Cloudinary dashboard |
| `ANTHROPIC_API_KEY` | Your Claude API key |
| `GOOGLE_CLIENT_ID` | From Google Console |
| `SMTP_USER` | Your Gmail address |
| `SMTP_PASS` | Gmail App Password |
| `CLIENT_URL` | https://your-app.vercel.app |
| `NODE_ENV` | production |

### Step 7 — Redeploy
```bash
vercel --prod
```

---

## 📁 Project Structure

```
examverse-os/
├── api/                    ← Vercel Serverless Functions
│   ├── auth/
│   │   ├── login.js        ← POST /api/auth/login
│   │   ├── signup.js       ← POST /api/auth/signup
│   │   ├── google.js       ← POST /api/auth/google
│   │   ├── verify-otp.js   ← POST /api/auth/verify-otp
│   │   ├── refresh.js      ← POST /api/auth/refresh
│   │   ├── forgot-password.js
│   │   ├── reset-password.js
│   │   └── logout.js
│   ├── questions/
│   │   ├── index.js        ← GET/POST /api/questions/index
│   │   └── bulk.js         ← POST /api/questions/bulk
│   ├── quiz/
│   │   ├── start.js        ← POST /api/quiz/start
│   │   ├── submit.js       ← POST /api/quiz/submit
│   │   └── history.js      ← GET /api/quiz/history
│   ├── user/
│   │   ├── profile.js      ← GET/PUT /api/user/profile
│   │   └── stats.js        ← GET /api/user/stats
│   ├── ai/
│   │   ├── chat.js         ← POST /api/ai/chat
│   │   └── generate-questions.js
│   └── admin/
│       └── dashboard.js    ← GET /api/admin/dashboard
├── lib/
│   ├── db.js               ← MongoDB connection
│   ├── models.js           ← All schemas
│   ├── auth.js             ← JWT + helpers
│   └── mailer.js           ← Email service
├── public/
│   ├── index.html          ← Main app
│   └── js/app.js           ← Frontend logic
├── .env.example            ← Copy to .env
├── vercel.json             ← Vercel config
└── package.json
```

---

## 📤 Adding Questions

### Method 1 — Bulk Import via API
```bash
curl -X POST https://your-app.vercel.app/api/questions/bulk \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "exam": "CUET",
    "questions": [
      {
        "subject": "Economics",
        "chapter": "Microeconomics",
        "topic": "Demand",
        "question": "Law of Demand states...",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": 1,
        "explanation": "Detailed explanation here",
        "difficulty": "easy",
        "year": "2023"
      }
    ]
  }'
```

### Method 2 — JSON File Format
```json
[
  {
    "exam": "NEET",
    "subject": "Biology (Zoology)",
    "chapter": "Cell Biology",
    "topic": "Cell Division",
    "question": "Which organelle is the powerhouse of cell?",
    "options": ["Nucleus", "Mitochondria", "Ribosome", "Golgi Body"],
    "correctAnswer": 1,
    "explanation": "Mitochondria produces ATP energy.",
    "difficulty": "easy",
    "year": "2023",
    "marks": 4,
    "negativeMarks": 1,
    "tags": ["biology", "cell"]
  }
]
```

### Method 3 — AI Generation
```bash
curl -X POST https://your-app.vercel.app/api/ai/generate-questions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "exam": "UPSC",
    "subject": "History",
    "topic": "Mughal Empire",
    "difficulty": "medium",
    "count": 10,
    "save": true
  }'
```

---

## 🔑 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/google` | Google OAuth |
| POST | `/api/auth/verify-otp` | Verify email OTP |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/forgot-password` | Send reset email |
| POST | `/api/auth/reset-password` | Reset password |
| POST | `/api/auth/logout` | Logout |

### Questions
| Method | Endpoint | Query Params |
|--------|----------|--------------|
| GET | `/api/questions/index` | `exam, subject, chapter, difficulty, year, limit, random` |
| POST | `/api/questions/index` | Add single question (admin) |
| POST | `/api/questions/bulk` | Bulk import (admin) |

### Quiz
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/quiz/start` | Start quiz session |
| POST | `/api/quiz/submit` | Submit quiz |
| GET | `/api/quiz/history` | Quiz history |

### User
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/profile` | Get profile |
| PUT | `/api/user/profile` | Update profile |
| GET | `/api/user/stats` | Detailed analytics |

### AI
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/chat` | AI study coach |
| POST | `/api/ai/generate-questions` | Generate MCQs |

---

## 🛡️ Make First Admin

After signup, run this in MongoDB Atlas → Collections → Users:
```javascript
db.users.updateOne(
  { email: "your@email.com" },
  { $set: { role: "superadmin" } }
)
```

---

## 📱 Supported Exams
CUET · NEET · JEE Main · JEE Advanced · NDA · UPSC · SSC CGL · SSC CHSL · Banking (IBPS/SBI) · Railway (RRB) · State PCS · Police · Teaching (CTET) · CLAT · CAT · CUET PG

---

## 🔧 Local Development
```bash
# Install dependencies
npm install

# Create .env from example
cp .env.example .env
# Fill in your values

# Run locally with Vercel
vercel dev

# App runs at http://localhost:3000
```

---

## 📞 Support
- Telegram: t.me/codexstudys
- Instagram: @fazal.893
- Built with ❤️ by OG FAZAL
