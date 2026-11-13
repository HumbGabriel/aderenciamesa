import { describe, expect, it } from 'vitest';
import { Constants } from '@/integrations/supabase/types';
import { hasLiveConnection, LEASE_MS, needsPauseReminder } from '@/lib/presence-rules';

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
describe('Pause reminder', () => {
  it('supports vacation as a saved team status', () => {
    expect(Constants.public.Enums.presence_status).toContain('vacation');
  });
  it('starts after exactly 15 minutes continuously away', () => {
    expect(needsPauseReminder('away', 1000, 1000 + 899_999)).toBe(false);
    expect(needsPauseReminder('away', 1000, 1000 + 900_000)).toBe(true);
  });
  it('does not alert for online, lunch, meeting or offline', () => {
    for (const status of ['online', 'lunch', 'meeting', 'vacation', 'offline']) {
      expect(needsPauseReminder(status, 1000, 1000 + 900_000)).toBe(false);
    }
  });
  it('restarts the timer for a new pause', () => {
    expect(needsPauseReminder('away', 900_000, 900_001)).toBe(false);
  });
});
import { onlineHours as _oh } from '@/lib/presence-rules';
import { test as _t, expect as _e } from 'vitest';
_t('break alert fires after each full hour online', () => {
  _e(_oh(0, 59 * 60_000)).toBe(0);
  _e(_oh(0, 60 * 60_000)).toBe(1);
  _e(_oh(0, 125 * 60_000)).toBe(2);
});
