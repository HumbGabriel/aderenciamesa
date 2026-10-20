import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { HEARTBEAT_MS } from '@/lib/presence-rules';
import type { Database } from '@/integrations/supabase/types';

type Device = { memberId: string; token: string };
type Connection = Device & { sessionId: string };
type TeamContext = {
  memberId: string | null; ready: boolean; manager: boolean; connectionError: string | null;
  join: (name: string) => Promise<void>; leave: () => void;
  changeStatus: (status: Database['public']['Enums']['presence_status']) => Promise<void>;
};
const Context = createContext<TeamContext | null>(null);
const KEY = 'stoneverso-device';

function closeConnection(connection: Connection) {
  // A same-origin server request would require CSRF handling on unload. The
  // capability-protected RPC accepts only this particular connection token.
  void fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/close_member`, {
    method: 'POST', keepalive: true,
    headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_session: connection.sessionId, p_token: connection.token }),
  }).catch(() => {});
}

export function TeamSessionProvider({ children }: { children: ReactNode }) {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [ready, setReady] = useState(false);
  const [manager, setManager] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    let authRevision = 0;
    async function updateManager(signedIn: boolean) {
      const revision = ++authRevision;
      if (!signedIn) { setManager(false); return; }
      const { data } = await supabase.rpc('is_manager');
      if (mounted && revision === authRevision) setManager(data === true);
    }
    void supabase.auth.getSession().then(({ data }) => updateManager(Boolean(data.session)));
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        // Do not call Auth asynchronously inside its own callback lock.
        setTimeout(() => void updateManager(Boolean(session)), 0);
      }
    });
    async function restore() {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        try {
          const device = JSON.parse(raw) as Device;
          if (typeof device.memberId !== 'string' || typeof device.token !== 'string') throw new Error('Invalid device');
          const sessionId = crypto.randomUUID();
          const { data, error } = await supabase.rpc('connect_member', { p_name: null, p_member: device.memberId, p_token: device.token, p_session: sessionId });
          if (error || !data) {
            if (mounted) setConnectionError('Não foi possível reconectar. Entre pelo nome novamente.');
          } else if (mounted) setConnection({ ...device, sessionId });
          else closeConnection({ ...device, sessionId });
        } catch { localStorage.removeItem(KEY); }
      }
      if (mounted) setReady(true);
    }
    void restore();
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!connection) return;
    const heartbeat = async () => {
      const { error } = await supabase.rpc('heartbeat_member', { p_session: connection.sessionId, p_token: connection.token });
      setConnectionError(error ? 'Conexão interrompida. Tentando reconectar…' : null);
    };
    const hide = () => closeConnection(connection);
    const show = () => void heartbeat();
    const timer = setInterval(() => void heartbeat(), HEARTBEAT_MS);
    window.addEventListener('pagehide', hide);
    window.addEventListener('pageshow', show);
    window.addEventListener('online', show);
    return () => { clearInterval(timer); window.removeEventListener('pagehide', hide); window.removeEventListener('pageshow', show); window.removeEventListener('online', show); closeConnection(connection); };
  }, [connection]);

  async function join(name: string) {
    const token = crypto.randomUUID() + crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    const { data, error } = await supabase.rpc('connect_member', { p_name: name.trim(), p_member: null, p_token: token, p_session: sessionId });
    if (error || !data) throw new Error('Não foi possível entrar. Tente novamente.');
    localStorage.setItem(KEY, JSON.stringify({ memberId: data, token }));
    localStorage.removeItem('mesa-member-id');
    setConnectionError(null);
    setConnection({ memberId: data, token, sessionId });
  }
  function leave() { localStorage.removeItem(KEY); setConnection(null); }
  async function changeStatus(status: Database['public']['Enums']['presence_status']) {
    if (!connection) throw new Error('Entre novamente.');
    const { error } = await supabase.rpc('set_member_status', { p_session: connection.sessionId, p_token: connection.token, p_status: status });
    if (error) throw new Error('Não foi possível mudar o status. Tente novamente.');
  }
  return <Context.Provider value={{ memberId: connection?.memberId ?? null, ready, manager, connectionError, join, leave, changeStatus }}>{children}</Context.Provider>;
}

export function useTeamSession() {
  const context = useContext(Context);
  if (!context) throw new Error('Missing TeamSessionProvider');
  return context;
}