const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { validationResult } = require('express-validator');
const { User } = require('./models');
const { clientOrigin, emailFrom, emailHost, emailPass, emailPort, emailUser, jwtSecret, jwtRefreshSecret, nodeEnv } = require('./config');

const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: nodeEnv === 'production' };
const accessCookie = { ...cookieOptions, maxAge: 15 * 60 * 1000 };
const refreshCookie = { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 };
const resetMessage = "If an account exists for this email, you'll receive a reset link shortly.";
const invalidResetMessage = 'This reset link is invalid or has expired. Request a new one to continue.';

const mailer = emailHost && emailUser && emailPass ? nodemailer.createTransport({ host: emailHost, port: emailPort, secure: emailPort === 465, auth: { user: emailUser, pass: emailPass } }) : null;

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function sendResetEmail(email, token) {
  const resetUrl = `${clientOrigin}/reset-password/${token}`;
  if (!mailer) {
    console.info(`[password reset] SMTP is not configured. Local reset URL: ${resetUrl}`);
    return;
  }
  await mailer.sendMail({
    from: emailFrom,
    to: email,
    subject: 'Reset your Kai password',
    text: `Reset your Kai password: ${resetUrl}\n\nThis link expires in 15 minutes. If you didn't request this, ignore this email.`,
    html: `<p>Reset your Kai password</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 15 minutes.</p><p>If you didn't request this, ignore this email.</p>`,
  });
}

function issueTokens(user) {
  const accessToken = jwt.sign({ id: user._id.toString(), email: user.email }, jwtSecret, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: user._id.toString() }, jwtRefreshSecret, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

async function setTokens(res, user) {
  const tokens = issueTokens(user);
  user.refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
  await user.save();
  res.cookie('accessToken', tokens.accessToken, accessCookie);
  res.cookie('refreshToken', tokens.refreshToken, refreshCookie);
}

async function register(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
    const email = req.body.email.toLowerCase().trim();
    if (await User.findOne({ email })) return res.status(409).json({ message: 'An account with that email already exists.' });
    const user = await User.create({ email, passwordHash: await bcrypt.hash(req.body.password, 12) });
    await setTokens(res, user);
    res.status(201).json({ user: { id: user._id, email: user.email } });
  } catch (err) { next(err); }
}

async function login(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
    const user = await User.findOne({ email: req.body.email.toLowerCase().trim() });
    if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) return res.status(401).json({ message: 'Email or password is incorrect.' });
    await setTokens(res, user);
    res.json({ user: { id: user._id, email: user.email } });
  } catch (err) { next(err); }
}

async function forgotPassword(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
    const email = req.body.email.toLowerCase().trim();
    const user = await User.findOne({ email });
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      user.resetPasswordToken = hashResetToken(token);
      user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
      await user.save();
      try { await sendResetEmail(user.email, token); } catch (error) { console.error('Password reset email failed:', error.message); }
    }
    res.json({ message: resetMessage });
  } catch (err) { next(err); }
}

async function resetPassword(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
    const user = await User.findOne({ resetPasswordToken: hashResetToken(req.params.token), resetPasswordExpires: { $gt: new Date() } });
    if (!user) return res.status(400).json({ message: invalidResetMessage });
    user.passwordHash = await bcrypt.hash(req.body.newPassword, 12);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.refreshTokenHash = null;
    await user.save();
    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);
    res.json({ message: 'Your password has been reset. Please sign in again.' });
  } catch (err) { next(err); }
}

async function refresh(req, res) {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ message: 'Please sign in again.' });
  try {
    const payload = jwt.verify(token, jwtRefreshSecret);
    const user = await User.findById(payload.id);
    if (!user || !user.refreshTokenHash || !(await bcrypt.compare(token, user.refreshTokenHash))) throw new Error('invalid');
    await setTokens(res, user);
    res.json({ user: { id: user._id, email: user.email } });
  } catch { res.status(401).json({ message: 'Please sign in again.' }); }
}

function logout(req, res) {
  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
  res.json({ message: 'Signed out.' });
}

module.exports = { register, login, forgotPassword, resetPassword, refresh, logout };
