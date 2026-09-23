const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const { clientOrigin } = require('./config');
const { register, login, forgotPassword, resetPassword, refresh, logout } = require('./auth');
const { postChat, getHistory } = require('./chat');
const { requireAuth, errorHandler } = require('./middleware');
const { Mood, Journal } = require('./models');

const app = express();
app.use(helmet());
app.use(cors({ origin: clientOrigin, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
const passwordResetLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 3, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many password reset attempts. Please try again later.' } });
const chatLimiter = rateLimit({ windowMs: 60 * 1000, limit: 12, standardHeaders: true, legacyHeaders: false });

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.post('/api/auth/register', authLimiter, [body('email').isEmail().withMessage('Enter a valid email.'), body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')], register);
app.post('/api/auth/login', authLimiter, [body('email').isEmail().withMessage('Enter a valid email.'), body('password').notEmpty().withMessage('Enter your password.')], login);
app.post('/api/auth/forgot-password', passwordResetLimiter, [body('email').isEmail().withMessage('Enter a valid email.')], forgotPassword);
app.post('/api/auth/reset-password/:token', passwordResetLimiter, [body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')], resetPassword);
app.post('/api/auth/refresh', refresh);
app.post('/api/auth/logout', logout);
app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: { id: req.user.id, email: req.user.email } }));
app.get('/api/chat/history', requireAuth, getHistory);
app.post('/api/chat', requireAuth, chatLimiter, postChat);

app.get('/api/moods', requireAuth, async (req, res, next) => { try { const days = Math.min(Number(req.query.days || 7), 30); res.json({ moods: await Mood.find({ userId: req.user.id }).sort({ date: -1 }).limit(days).lean() }); } catch (err) { next(err); } });
app.post('/api/moods', requireAuth, async (req, res, next) => { try { const { mood, note = '' } = req.body; const date = new Date().toISOString().slice(0, 10); const entry = await Mood.findOneAndUpdate({ userId: req.user.id, date }, { mood, note: String(note).slice(0, 500) }, { upsert: true, new: true, runValidators: true }); res.status(201).json({ mood: entry }); } catch (err) { next(err); } });

app.get('/api/journal', requireAuth, async (req, res, next) => { try { res.json({ entries: await Journal.find({ userId: req.user.id }).sort({ updatedAt: -1 }).lean() }); } catch (err) { next(err); } });
app.post('/api/journal', requireAuth, async (req, res, next) => { try { const entry = await Journal.create({ userId: req.user.id, title: req.body.title, content: req.body.content, exerciseType: req.body.exerciseType || null }); res.status(201).json({ entry }); } catch (err) { next(err); } });
app.put('/api/journal/:id', requireAuth, async (req, res, next) => { try { const entry = await Journal.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { title: req.body.title, content: req.body.content, exerciseType: req.body.exerciseType || null }, { new: true, runValidators: true }); if (!entry) return res.status(404).json({ message: 'Journal entry not found.' }); res.json({ entry }); } catch (err) { next(err); } });
app.delete('/api/journal/:id', requireAuth, async (req, res, next) => { try { await Journal.deleteOne({ _id: req.params.id, userId: req.user.id }); res.status(204).end(); } catch (err) { next(err); } });

app.use(errorHandler);
module.exports = app;
