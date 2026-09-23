const request = require('supertest');
const app = require('../src/app');
const { crisisPattern } = require('../src/chat');

describe('chat routes', () => {
  it('protects chat history', async () => {
    const response = await request(app).get('/api/chat/history');
    expect(response.statusCode).toBe(401);
  });

  it('protects chat posting', async () => {
    const response = await request(app).post('/api/chat').send({ message: 'hello' });
    expect(response.statusCode).toBe(401);
  });

  it('recognizes crisis language before an AI request', () => {
    expect(crisisPattern.test('I feel like I might hurt myself')).toBe(true);
    expect(crisisPattern.test('I had a difficult day')).toBe(false);
  });
});
