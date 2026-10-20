import { describe, expect, it } from 'vitest';
import { hasLiveConnection, LEASE_MS } from '@/lib/presence-rules';

describe('Automatic Offline', () => {
  it('is offline when the last site tab closes', () => {
    expect(hasLiveConnection([{ lastSeen: 1000, closed: true }], 1001)).toBe(false);
  });
  it('keeps a member connected when another tab remains open', () => {
    expect(hasLiveConnection([{ lastSeen: 1000, closed: true }, { lastSeen: 1000, closed: false }], 1001)).toBe(true);
  });
  it('expires a lost connection after three minutes', () => {
    expect(LEASE_MS).toBe(180000);
    expect(hasLiveConnection([{ lastSeen: 1000, closed: false }], 180999)).toBe(true);
    expect(hasLiveConnection([{ lastSeen: 1000, closed: false }], 181000)).toBe(false);
  });
});