// lib/mailer.js — Email Service

const nodemailer = require('nodemailer');

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

async function sendOTP(email, otp, name) {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'ExamVerse OS <noreply@examverse.in>',
    to: email,
    subject: 'ExamVerse OS — Your OTP Code',
    html: `
      <div style="font-family:Inter,sans-serif;background:#050505;padding:40px;border-radius:16px;max-width:480px;margin:0 auto">
        <div style="text-align:center;margin-bottom:28px">
          <h1 style="color:#fff;font-size:28px;font-weight:900;letter-spacing:-1px;margin:0">
            <span style="color:#3b82f6">Exam</span><span style="color:#8b5cf6">Verse</span> OS
          </h1>
          <p style="color:#a1a1aa;font-size:13px;margin-top:6px">India's Largest Exam Platform</p>
        </div>
        <div style="background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:28px;text-align:center">
          <p style="color:#a1a1aa;font-size:14px;margin-bottom:16px">Hello ${name || 'Scholar'},</p>
          <p style="color:#fff;font-size:14px;margin-bottom:24px">Your OTP verification code is:</p>
          <div style="background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.2);border-radius:10px;padding:20px;margin-bottom:20px">
            <span style="color:#3b82f6;font-size:36px;font-weight:900;letter-spacing:8px">${otp}</span>
          </div>
          <p style="color:#52525b;font-size:12px">Valid for 10 minutes. Do not share with anyone.</p>
        </div>
        <p style="color:#3f3f46;font-size:11px;text-align:center;margin-top:20px">t.me/codexstudys · @fazal.893</p>
      </div>
    `
  });
}

async function sendPasswordReset(email, token, name) {
  const transporter = getTransporter();
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'ExamVerse OS <noreply@examverse.in>',
    to: email,
    subject: 'ExamVerse OS — Reset Your Password',
    html: `
      <div style="font-family:Inter,sans-serif;background:#050505;padding:40px;border-radius:16px;max-width:480px;margin:0 auto">
        <h1 style="color:#fff;font-size:24px;font-weight:900;text-align:center">
          <span style="color:#3b82f6">Exam</span><span style="color:#8b5cf6">Verse</span> OS
        </h1>
        <div style="background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:28px;margin-top:20px">
          <p style="color:#fff;font-size:14px">Hello ${name},</p>
          <p style="color:#a1a1aa;font-size:13px">Click the button below to reset your password. Link expires in 1 hour.</p>
          <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:700;font-size:14px;margin-top:16px">Reset Password</a>
          <p style="color:#52525b;font-size:11px;margin-top:16px">If you didn't request this, ignore this email.</p>
        </div>
      </div>
    `
  });
}

async function sendWelcome(email, name) {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'ExamVerse OS <noreply@examverse.in>',
    to: email,
    subject: 'Welcome to ExamVerse OS! 🎓',
    html: `
      <div style="font-family:Inter,sans-serif;background:#050505;padding:40px;border-radius:16px;max-width:480px;margin:0 auto">
        <h1 style="color:#fff;font-size:24px;font-weight:900;text-align:center">
          Welcome to <span style="color:#3b82f6">Exam</span><span style="color:#8b5cf6">Verse</span> OS! ⚡
        </h1>
        <div style="background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:28px;margin-top:20px">
          <p style="color:#fff;font-size:15px;font-weight:600">Hello ${name}! 🎉</p>
          <p style="color:#a1a1aa;font-size:13px;line-height:1.6">You've joined India's most advanced exam preparation platform. Start your journey with:</p>
          <ul style="color:#a1a1aa;font-size:13px;line-height:2">
            <li>✅ 15,000+ Questions across 16 exams</li>
            <li>🤖 AI-powered study coach</li>
            <li>⚡ Gamified learning with XP & levels</li>
            <li>📊 Advanced analytics dashboard</li>
          </ul>
          <a href="${process.env.CLIENT_URL}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:700;font-size:14px;margin-top:12px">Start Preparing →</a>
        </div>
        <p style="color:#3f3f46;font-size:11px;text-align:center;margin-top:20px">t.me/codexstudys · @fazal.893</p>
      </div>
    `
  });
}

module.exports = { sendOTP, sendPasswordReset, sendWelcome };
