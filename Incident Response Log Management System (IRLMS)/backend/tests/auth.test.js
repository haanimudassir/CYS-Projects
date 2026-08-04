// (validation → lookup → active check → password check → JWT issuance) 
jest.mock('../config/db', () => ({
  pool: { query: jest.fn() },
}));
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

const request = require('supertest');
const bcrypt = require('bcrypt');
const { pool } = require('../config/db');
const app = require('../server');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/auth/login', () => {
  it('rejects an invalid email with 400 before touching the database', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'whatever' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('rejects a missing password with 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@irlms.com' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 with a generic message when no user matches the email', async () => {
    pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@irlms.com', password: 'Password123!' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  it('returns 403 when the matched account is deactivated', async () => {
    pool.query.mockResolvedValueOnce([
      [{ UserID: 1, IsActive: 0, PasswordHash: 'irrelevant' }],
    ]);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'inactive@irlms.com', password: 'Password123!' });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/deactivated/i);
  });

  it('returns the same generic 401 for a wrong password as for an unknown email (no user enumeration)', async () => {
    pool.query.mockResolvedValueOnce([
      [{ UserID: 1, IsActive: 1, PasswordHash: 'stored-hash' }],
    ]);
    bcrypt.compare.mockResolvedValueOnce(false);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@irlms.com', password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  it('returns a JWT and the user profile on successful login', async () => {
    pool.query
      .mockResolvedValueOnce([
        [
          {
            UserID: 1,
            Username: 'admin',
            Email: 'admin@irlms.com',
            PasswordHash: 'stored-hash',
            Role: 'Admin',
            FullName: 'System Administrator',
            IsActive: 1,
          },
        ],
      ])
      .mockResolvedValueOnce([{ affectedRows: 1 }]); // UPDATE ... LastLogin
    bcrypt.compare.mockResolvedValueOnce(true);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@irlms.com', password: 'Password123!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.token).toBe('string');
    expect(res.body.data.user).toMatchObject({
      email: 'admin@irlms.com',
      role: 'Admin',
    });
    // The password hash must never be echoed back to the client.
    expect(res.body.data.user.PasswordHash).toBeUndefined();
  });

  it('returns 500 as a generic error when the database call itself fails', async () => {
    pool.query.mockRejectedValueOnce(new Error('connection lost'));

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@irlms.com', password: 'Password123!' });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
