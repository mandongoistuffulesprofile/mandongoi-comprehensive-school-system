import { describe, it, expect, vi } from 'vitest';
import { hashPassword, comparePassword, generateToken } from '../../src/utils/auth';
import jwt from 'jsonwebtoken';
import { config } from '../../src/config';

describe('auth utilities', () => {
  it('hashes and compares password successfully', async () => {
    const password = 'Admin@1234';
    const hash = await hashPassword(password);
    expect(hash).not.toBe(password);
    expect(await comparePassword(password, hash)).toBe(true);
    expect(await comparePassword('wrong', hash)).toBe(false);
  });

  it('generates a valid JWT token', () => {
    const token = generateToken('user-1');
    const decoded = jwt.verify(token, config.jwt.secret) as { userId: string };
    expect(decoded.userId).toBe('user-1');
  });
});
