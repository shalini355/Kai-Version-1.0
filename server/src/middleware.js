const jwt = require('jsonwebtoken');
const { jwtSecret } = require('./config');

function requireAuth(req, res, next) {
  const token = req.cookies.accessToken;
  if (!token) return res.status(401).json({ message: 'Please sign in to continue.' });
  try {
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch {
    res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
  }
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status = err.status || 500;
  if (process.env.NODE_ENV !== 'production') console.error(err.message);
  res.status(status).json({ message: status >= 500 ? 'Something went wrong. Please try again.' : err.message });
}

module.exports = { requireAuth, errorHandler };
