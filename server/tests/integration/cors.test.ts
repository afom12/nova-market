import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app';

let app: Express;

beforeAll(() => {
  app = createApp();
});

describe('CORS allow-list', () => {
  it('echoes an allowed origin with credentials enabled', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173')
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('rejects a disallowed origin with 403 FORBIDDEN, not a 500', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'https://evil.example')
      .expect(403);

    expect(response.body).toMatchObject({ success: false, error: { code: 'FORBIDDEN' } });
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('rejects a disallowed preflight with 403', async () => {
    await request(app)
      .options('/api/checkout')
      .set('Origin', 'https://evil.example')
      .set('Access-Control-Request-Method', 'POST')
      .expect(403);
  });

  it('allows requests with no Origin header (same-origin / server-to-server)', async () => {
    await request(app).get('/api/health').expect(200);
  });
});
