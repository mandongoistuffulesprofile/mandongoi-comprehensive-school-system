import { describe, it, expect } from 'vitest';

describe('App', () => {
  it('imports without crashing', async () => {
    const mod = await import('./App');
    expect(mod.default).toBeDefined();
  });
});
