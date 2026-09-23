const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { User } = require('./models');
const { jwtSecret, jwtRefreshSecret, nodeEnv } = require('./config');

const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: nodeEnv === 'production' };
const accessCookie = { ...cookieOptions, maxAge: 15 * 60 * 1000 };
const refreshCookie = { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 };

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

module.exports = { register, login, refresh, logout };
