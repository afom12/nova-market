import { describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env';
import { signAuthToken, verifyAuthToken } from '../../src/services/token.service';
import { AppError } from '../../src/utils/AppError';

const payload = { sub: 'user-123', email: 'user@test.io', role: 'CUSTOMER' as const };

describe('auth tokens', () => {
  it('round-trips a payload', () => {
    const decoded = verifyAuthToken(signAuthToken(payload));

    expect(decoded).toMatchObject({ sub: 'user-123', email: 'user@test.io', role: 'CUSTOMER' });
  });

  it('rejects a token signed with a different secret', () => {
    const forged = jwt.sign(payload, 'an-attacker-controlled-secret-value-123456', {
      issuer: 'nova-market',
      audience: 'nova-market-client',
    });

    expect(() => verifyAuthToken(forged)).toThrow(AppError);
  });

  it('rejects a tampered token body', () => {
    const token = signAuthToken(payload);
    const [header, , signature] = token.split('.');
    // Swap the payload for one claiming the ADMIN role.
    const escalated = Buffer.from(
      JSON.stringify({ ...payload, role: 'ADMIN' }),
      'utf8',
    ).toString('base64url');

    expect(() => verifyAuthToken(`${header}.${escalated}.${signature}`)).toThrow(AppError);
  });

  it('rejects an expired token with a clear message', () => {
    const expired = jwt.sign(payload, env.JWT_SECRET, {
      issuer: 'nova-market',
      audience: 'nova-market-client',
      expiresIn: '-1s',
    });

    expect(() => verifyAuthToken(expired)).toThrow(/expired/i);
  });

  it('rejects a token issued for a different audience', () => {
    const wrongAudience = jwt.sign(payload, env.JWT_SECRET, {
      issuer: 'nova-market',
      audience: 'some-other-app',
    });

    expect(() => verifyAuthToken(wrongAudience)).toThrow(AppError);
  });

  it('rejects malformed input', () => {
    expect(() => verifyAuthToken('')).toThrow(AppError);
    expect(() => verifyAuthToken('not.a.token')).toThrow(AppError);
  });
});

describe('AppError', () => {
  it('carries an HTTP status and a machine-readable code', () => {
    const error = AppError.conflict('Already exists', [{ field: 'email' }]);

    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('CONFLICT');
    expect(error.details).toEqual([{ field: 'email' }]);
    expect(error.isOperational).toBe(true);
    expect(error).toBeInstanceOf(Error);
  });

  it('exposes the expected status for each factory', () => {
    expect(AppError.badRequest('x').statusCode).toBe(400);
    expect(AppError.unauthorized().statusCode).toBe(401);
    expect(AppError.forbidden().statusCode).toBe(403);
    expect(AppError.notFound().statusCode).toBe(404);
    expect(AppError.validation().statusCode).toBe(422);
    expect(AppError.tooManyRequests().statusCode).toBe(429);
    expect(AppError.internal().statusCode).toBe(500);
  });
});
