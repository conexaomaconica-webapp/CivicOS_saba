import { describe, expect, it, vi } from 'vitest';

describe('cold launch experience', () => {
  it('is claimed only once in the same application process', async () => {
    vi.resetModules();
    const { claimColdLaunch } = await import('./launch-session');
    expect(claimColdLaunch(false)).toBe(true);
    expect(claimColdLaunch(false)).toBe(false);
  });

  it('is skipped when reduced motion is preferred', async () => {
    vi.resetModules();
    const { claimColdLaunch } = await import('./launch-session');
    expect(claimColdLaunch(true)).toBe(false);
  });
});

