const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  refreshTokenHash: { type: String, default: null },
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null }
}, { timestamps: true });

const messageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true, maxlength: 4000 }
}, { timestamps: true });
messageSchema.index({ userId: 1, createdAt: -1 });

const moodSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mood: { type: String, required: true, enum: ['low', 'uneasy', 'okay', 'good', 'bright'] },
  note: { type: String, maxlength: 500, default: '' },
  date: { type: String, required: true }
}, { timestamps: true });
moodSchema.index({ userId: 1, date: 1 }, { unique: true });

const journalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, maxlength: 120 },
  content: { type: String, required: true, maxlength: 10000 },
  exerciseType: { type: String, default: null, maxlength: 80 }
}, { timestamps: true });

module.exports = {
  User: mongoose.model('User', userSchema),
  Message: mongoose.model('Message', messageSchema),
  Mood: mongoose.model('Mood', moodSchema),
  Journal: mongoose.model('Journal', journalSchema)
};
