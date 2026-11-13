export const HEARTBEAT_MS = 45_000;
export const REFRESH_MS = 5_000;
export const LEASE_MS = 180_000;

export function hasLiveConnection(connections: { lastSeen: number; closed: boolean }[], now: number) {
  return connections.some((connection) => !connection.closed && connection.lastSeen > now - LEASE_MS);
}
export const BREAK_ALERT_MS = 3_600_000;

/** Number of full hours someone has been continuously online (0 if under 1h). */
export function onlineHours(onlineSince: number, now: number) {
  return Math.max(0, Math.floor((now - onlineSince) / BREAK_ALERT_MS));
}
