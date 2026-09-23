const { Message } = require('./models');
const { mistralApiKey } = require('./config');

const SYSTEM_PROMPT = `You are Kai, a warm and empathetic mental wellness companion. You are non-clinical, fluent in English and Hinglish, and never diagnose, prescribe, or replace a qualified professional. Listen carefully, reflect feelings, ask gentle open questions, and suggest small practical steps. Keep replies concise and human. If someone may be in immediate danger, encourage contacting local emergency services and trusted people.`;
const crisisPattern = /\b(kill myself|end my life|suicid|self[- ]?harm|hurt myself|marna|jaan dena|khudkushi|khud ko nuksan)\b/i;
const unavailableReply = 'Kai is temporarily unavailable because the AI service is not enabled for this account yet. You can still use your mood tracker, journal, breathing practice, and Resources page.';
const rateLimitedReply = 'Kai is receiving many requests right now. Please wait a minute and try again. Your message was not lost.';

function isMistralUnavailable(error) {
  return error?.status === 403 || error?.statusCode === 403 || error?.code === 'tier_not_allowed';
}

async function answerWithMistral(messages) {
  if (!mistralApiKey) return 'I am here with you. I could not connect to Kai right now, but you can still write what is on your mind and take one slow breath with me.';
  const { Mistral } = await import('@mistralai/mistralai');
  const client = new Mistral({ apiKey: mistralApiKey });
  try {
    const result = await client.chat.complete({ model: 'mistral-large-latest', messages });
    return result.choices?.[0]?.message?.content || 'I am listening. Could you tell me a little more?';
  } catch (error) {
    if (error.status === 429 || error.statusCode === 429 || isMistralUnavailable(error)) {
      try {
        const fallback = await client.chat.complete({ model: 'mistral-small-latest', messages });
        return fallback.choices?.[0]?.message?.content || 'Kai is taking a short pause. Please try again in a moment.';
      } catch (fallbackError) {
        if (fallbackError.status === 429 || fallbackError.statusCode === 429) return rateLimitedReply;
        if (isMistralUnavailable(fallbackError)) return unavailableReply;
        throw fallbackError;
      }
    }
    if (error.name === 'AbortError' || /timeout/i.test(error.message || '')) return 'Kai is taking longer than expected. Please try again in a moment.';
    if (isMistralUnavailable(error)) return unavailableReply;
    throw error;
  }
}

async function streamWithMistral(messages, model = 'mistral-large-latest') {
  const { Mistral } = await import('@mistralai/mistralai');
  const client = new Mistral({ apiKey: mistralApiKey });
  return client.chat.stream({ model, messages });
}

async function postChat(req, res, next) {
  try {
    const text = String(req.body.message || '').trim();
    if (!text || text.length > 4000) return res.status(400).json({ message: 'Please send a message under 4000 characters.' });
    if (crisisPattern.test(text)) {
      const crisisReply = 'I am really sorry you are carrying this right now. You deserve immediate, human support. Please visit Resources for urgent help, contact local emergency services, or reach out to someone you trust and stay with them.';
      await Message.create([{ userId: req.user.id, role: 'user', content: text }, { userId: req.user.id, role: 'assistant', content: crisisReply }]);
      return res.json({ message: crisisReply, crisis: true });
    }
    const recent = await Message.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(12).lean();
    const history = recent.reverse().map(({ role, content }) => ({ role, content }));
    const messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...history, { role: 'user', content: text }];
    if (mistralApiKey && req.headers.accept?.includes('text/event-stream')) {
      let stream;
      let streamFallback = unavailableReply;
      try { stream = await streamWithMistral(messages); } catch (error) {
        if (error.status === 429 || error.statusCode === 429 || isMistralUnavailable(error)) {
          try { stream = await streamWithMistral(messages, 'mistral-small-latest'); } catch (fallbackError) {
            if (fallbackError.status === 429 || fallbackError.statusCode === 429) { stream = null; streamFallback = rateLimitedReply; }
            else if (isMistralUnavailable(fallbackError)) stream = null;
            else throw fallbackError;
          }
        } else if (isMistralUnavailable(error)) stream = null;
        else throw error;
      }
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      let reply = '';
      if (stream) {
        for await (const event of stream) {
          const token = event.data?.choices?.[0]?.delta?.content || '';
          if (token) { reply += token; res.write(`data: ${JSON.stringify({ token })}\n\n`); }
        }
      }
      reply = reply || streamFallback;
      res.write(`data: ${JSON.stringify({ done: true, message: reply })}\n\n`);
      res.end();
      await Message.create([{ userId: req.user.id, role: 'user', content: text }, { userId: req.user.id, role: 'assistant', content: reply }]);
      return;
    }
    const reply = await answerWithMistral(messages);
    await Message.create([{ userId: req.user.id, role: 'user', content: text }, { userId: req.user.id, role: 'assistant', content: reply }]);
    res.json({ message: reply, crisis: false });
  } catch (err) { next(err); }
}

async function getHistory(req, res, next) {
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 30), 1), 100);
    const [messages, total] = await Promise.all([
      Message.find({ userId: req.user.id }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Message.countDocuments({ userId: req.user.id })
    ]);
    res.json({ messages: messages.reverse(), page, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
}

module.exports = { postChat, getHistory, crisisPattern };
