const request = require('supertest');
const app = require('../server');

describe('GET /api/health', () => {
  it('returns a healthy status without needing a live database connection', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/running/i);
  });
});

describe('unmatched routes', () => {
  it('returns a JSON 404 for unknown API routes rather than an HTML error page', async () => {
    const res = await request(app).get('/api/this-route-does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not found/i);
  });
});

describe('protected routes without a token', () => {
  it('rejects an unauthenticated request to a protected endpoint with 401, not a 500', async () => {
    const res = await request(app).get('/api/incidents');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
