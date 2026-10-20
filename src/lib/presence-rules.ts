export const HEARTBEAT_MS = 45_000;
export const REFRESH_MS = 15_000;
export const LEASE_MS = 180_000;

export function hasLiveConnection(connections: { lastSeen: number; closed: boolean }[], now: number) {
  return connections.some((connection) => !connection.closed && connection.lastSeen > now - LEASE_MS);
}