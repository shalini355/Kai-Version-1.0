const request = require('supertest');
const app = require('../src/app');

describe('auth routes', () => {
  it('rejects an invalid registration payload', async () => {
    const response = await request(app).post('/api/auth/register').send({ email: 'bad', password: 'short' });
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBeTruthy();
  });

  it('protects the current-user route', async () => {
    const response = await request(app).get('/api/auth/me');
    expect(response.statusCode).toBe(401);
  });
});
