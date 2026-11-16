import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { Role } from '@prisma/client';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { VALID_PASSWORD, createAdmin, createUser, login } from '../helpers/factories';

let app: Express;

beforeAll(() => {
  app = createApp();
});

describe('POST /api/auth/register', () => {
  it('creates a customer account and issues session cookies', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ada Lovelace', email: 'ada@test.io', password: VALID_PASSWORD })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user).toMatchObject({
      name: 'Ada Lovelace',
      email: 'ada@test.io',
      role: Role.CUSTOMER,
    });

    const cookies = response.headers['set-cookie'] as unknown as string[];
    const authCookie = cookies.find((cookie) => cookie.startsWith('nova_token='));
    expect(authCookie).toBeDefined();
    // The session cookie must be unreadable by JavaScript.
    expect(authCookie).toContain('HttpOnly');
    // The CSRF cookie must be readable, so the client can echo it back.
    expect(cookies.find((cookie) => cookie.startsWith('nova_csrf='))).not.toContain('HttpOnly');
  });

  it('never returns the password hash', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'No Leak', email: 'noleak@test.io', password: VALID_PASSWORD })
      .expect(201);

    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    expect(response.body.data.user.passwordHash).toBeUndefined();
  });

  it('stores the password as a bcrypt hash, never in plain text', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Hashed', email: 'hashed@test.io', password: VALID_PASSWORD })
      .expect(201);

    const user = await prisma.user.findUnique({ where: { email: 'hashed@test.io' } });
    expect(user?.passwordHash).not.toBe(VALID_PASSWORD);
    expect(user?.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('rejects a duplicate email with 409', async () => {
    await createUser({ email: 'taken@test.io' });

    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Second', email: 'taken@test.io', password: VALID_PASSWORD })
      .expect(409);

    expect(response.body.error.code).toBe('CONFLICT');
  });

  it('rejects a weak password with 422', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Weak', email: 'weak@test.io', password: 'short' })
      .expect(422);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('ignores a client-supplied role and never creates an admin', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Escalate',
        email: 'escalate@test.io',
        password: VALID_PASSWORD,
        role: 'ADMIN', // privilege escalation attempt
      })
      .expect(201);

    const user = await prisma.user.findUnique({ where: { email: 'escalate@test.io' } });
    expect(user?.role).toBe(Role.CUSTOMER);
  });

  it('normalises the email to lowercase', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Mixed', email: 'MiXeD@Test.IO', password: VALID_PASSWORD })
      .expect(201);

    expect(await prisma.user.findUnique({ where: { email: 'mixed@test.io' } })).not.toBeNull();
  });
});

describe('POST /api/auth/login', () => {
  it('signs in with valid credentials', async () => {
    const user = await createUser({ email: 'valid@test.io' });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: VALID_PASSWORD })
      .expect(200);

    expect(response.body.data.user.email).toBe('valid@test.io');
    expect(response.body.data.csrfToken).toBeTruthy();
  });

  it('rejects a wrong password with 401', async () => {
    const user = await createUser({ email: 'wrongpass@test.io' });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'NotThePassword1' })
      .expect(401);

    expect(response.body.error.message).toBe('Invalid email or password');
  });

  it('returns an identical message for an unknown account (no enumeration)', async () => {
    const user = await createUser({ email: 'known@test.io' });

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'NotThePassword1' })
      .expect(401);

    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'does-not-exist@test.io', password: 'NotThePassword1' })
      .expect(401);

    expect(unknownEmail.body.error.message).toBe(wrongPassword.body.error.message);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the signed-in user', async () => {
    const user = await createUser({ email: 'me@test.io', name: 'Me Myself' });
    const { agent } = await login(app, user.email);

    const response = await agent.get('/api/auth/me').expect(200);
    expect(response.body.data.user).toMatchObject({ email: 'me@test.io', name: 'Me Myself' });
  });

  it('rejects an unauthenticated request with 401', async () => {
    const response = await request(app).get('/api/auth/me').expect(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a forged token', async () => {
    await request(app)
      .get('/api/auth/me')
      .set('Cookie', 'nova_token=not.a.real.jwt')
      .expect(401);
  });

  it('reflects the role from the database, not from the token', async () => {
    const admin = await createAdmin({ email: 'admin-role@test.io' });
    const { agent } = await login(app, admin.email);

    // Demote the account after the token was issued.
    await prisma.user.update({ where: { id: admin.id }, data: { role: Role.CUSTOMER } });

    const response = await agent.get('/api/auth/me').expect(200);
    expect(response.body.data.user.role).toBe(Role.CUSTOMER);
  });

  it('rejects a session whose account has been deleted', async () => {
    const user = await createUser({ email: 'deleted@test.io' });
    const { agent } = await login(app, user.email);

    await prisma.user.delete({ where: { id: user.id } });

    await agent.get('/api/auth/me').expect(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the session cookies', async () => {
    const user = await createUser({ email: 'logout@test.io' });
    const { agent, csrfToken } = await login(app, user.email);

    await agent.get('/api/auth/me').expect(200);
    await agent.post('/api/auth/logout').set('X-CSRF-Token', csrfToken).expect(200);
    await agent.get('/api/auth/me').expect(401);
  });
});

describe('CSRF protection', () => {
  it('rejects a cookie-authenticated POST without the CSRF header', async () => {
    const user = await createUser({ email: 'csrf@test.io' });
    const { agent } = await login(app, user.email);
    const product = await (await import('../helpers/factories')).createProduct();

    // Cookies are attached automatically by the browser (and by the agent),
    // so the missing header is what proves the request is forged.
    const response = await agent
      .post('/api/checkout/validate')
      .send({ items: [{ productId: product.id, quantity: 1 }] })
      .expect(403);

    expect(response.body.error.code).toBe('CSRF_TOKEN_INVALID');
  });

  it('accepts the same request when the CSRF token is echoed back', async () => {
    const user = await createUser({ email: 'csrf-ok@test.io' });
    const { agent, csrfToken } = await login(app, user.email);
    const product = await (await import('../helpers/factories')).createProduct();

    await agent
      .post('/api/checkout/validate')
      .set('X-CSRF-Token', csrfToken)
      .send({ items: [{ productId: product.id, quantity: 1 }] })
      .expect(200);
  });
});
