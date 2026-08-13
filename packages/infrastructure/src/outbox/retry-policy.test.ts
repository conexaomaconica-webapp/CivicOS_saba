import { describe, it, expect } from 'vitest';

import { ExponentialBackoffRetryPolicy, noRetryPolicy } from './retry-policy';

describe('ExponentialBackoffRetryPolicy', () => {
  it('applies the Doc 06 default backoff (1min, 5min, 15min, 1h, 6h)', () => {
    const policy = new ExponentialBackoffRetryPolicy();
    const from = new Date('2026-08-04T23:45:00.000Z');

    expect(policy.delaySecondsForAttempt(1)).toBe(60);
    expect(policy.delaySecondsForAttempt(2)).toBe(300);
    expect(policy.delaySecondsForAttempt(3)).toBe(900);
    expect(policy.delaySecondsForAttempt(4)).toBe(3600);
    expect(policy.delaySecondsForAttempt(5)).toBe(21600);

    expect(policy.nextRetryAt(2, from).toISOString()).toBe('2026-08-04T23:50:00.000Z');
    expect(policy.nextRetryAt(3, from).toISOString()).toBe('2026-08-05T00:00:00.000Z');
  });

  it('allows 5 redeliveries (6 total attempts) before DLQ promotion', () => {
    const policy = new ExponentialBackoffRetryPolicy();

    expect(policy.shouldRetry(1)).toBe(true);
    expect(policy.shouldRetry(5)).toBe(true);
    expect(policy.shouldRetry(6)).toBe(false);
  });

  it('respects a custom maxAttempts and backoff list', () => {
    const policy = new ExponentialBackoffRetryPolicy({ maxAttempts: 2, backoffSeconds: [5, 10] });

    expect(policy.shouldRetry(1)).toBe(true);
    expect(policy.shouldRetry(2)).toBe(false);
    expect(policy.nextRetryAt(1, new Date(0)).getTime()).toBe(5000);
  });

  it('clamps the delay for attempts beyond the backoff table', () => {
    const policy = new ExponentialBackoffRetryPolicy({ maxAttempts: 4, backoffSeconds: [10] });
    expect(policy.delaySecondsForAttempt(3)).toBe(10);
  });

  it('rejects invalid configuration', () => {
    expect(() => new ExponentialBackoffRetryPolicy({ maxAttempts: 0 })).toThrow(RangeError);
    expect(() => new ExponentialBackoffRetryPolicy({ backoffSeconds: [] })).toThrow(RangeError);
  });
});

describe('noRetryPolicy', () => {
  it('never retries (first failure promotes to DLQ)', () => {
    expect(noRetryPolicy.maxAttempts).toBe(1);
    expect(noRetryPolicy.shouldRetry(1)).toBe(false);
  });
});
