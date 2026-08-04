const express = require('express');
const request = require('supertest');
const { incidentValidation } = require('../middleware/validation');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.post('/api/incidents', incidentValidation, (req, res) => {
    res.status(201).json({ success: true });
  });
  return app;
}

describe('incidentValidation middleware', () => {
  const app = buildApp();

  const validPayload = {
    title: 'Suspicious login activity on prod-db-02',
    description: 'Multiple failed login attempts from an unrecognized IP.',
    typeId: 1,
    severityId: 2,
  };

  it('accepts a fully valid payload', async () => {
    const res = await request(app).post('/api/incidents').send(validPayload);

    expect(res.status).toBe(201);
  });

  it('accepts a valid payload with an optional assetId', async () => {
    const res = await request(app)
      .post('/api/incidents')
      .send({ ...validPayload, assetId: 5 });

    expect(res.status).toBe(201);
  });

  it('rejects a missing title with 400', async () => {
    const { title, ...rest } = validPayload;
    const res = await request(app).post('/api/incidents').send(rest);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors.some((e) => e.path === 'title')).toBe(true);
  });

  it('rejects a title longer than 200 characters', async () => {
    const res = await request(app)
      .post('/api/incidents')
      .send({ ...validPayload, title: 'A'.repeat(201) });

    expect(res.status).toBe(400);
    expect(res.body.errors.some((e) => e.path === 'title')).toBe(true);
  });

  it('rejects a missing description', async () => {
    const { description, ...rest } = validPayload;
    const res = await request(app).post('/api/incidents').send(rest);

    expect(res.status).toBe(400);
    expect(res.body.errors.some((e) => e.path === 'description')).toBe(true);
  });

  it('rejects a severityId outside the valid 1-4 range', async () => {
    const res = await request(app)
      .post('/api/incidents')
      .send({ ...validPayload, severityId: 7 });

    expect(res.status).toBe(400);
    expect(res.body.errors.some((e) => e.path === 'severityId')).toBe(true);
  });

  it('rejects a non-integer typeId', async () => {
    const res = await request(app)
      .post('/api/incidents')
      .send({ ...validPayload, typeId: 'not-a-number' });

    expect(res.status).toBe(400);
    expect(res.body.errors.some((e) => e.path === 'typeId')).toBe(true);
  });

  it('rejects an invalid optional assetId without rejecting the rest of the payload unnecessarily', async () => {
    const res = await request(app)
      .post('/api/incidents')
      .send({ ...validPayload, assetId: -1 });

    expect(res.status).toBe(400);
    expect(res.body.errors.some((e) => e.path === 'assetId')).toBe(true);
  });
});
