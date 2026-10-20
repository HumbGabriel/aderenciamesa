import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { REFRESH_MS } from '@/lib/presence-rules';

export function usePresence() {
  const [people, setPeople] = useState<Tables<'members'>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    let live = true;
    let running = false;
    async function refresh() {
      if (running) return;
      running = true;
      const { data, error } = await supabase.rpc('list_member_presence');
      running = false;
      if (!live) return;
      if (error) setError('Não foi possível atualizar a equipe. Tentando novamente…');
      else { setPeople(data ?? []); setError(null); setNow(Date.now()); }
    }
    void refresh();
    const channel = supabase.channel(`members-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => void refresh())
      .subscribe((status) => { if (status === 'SUBSCRIBED') void refresh(); });
    const timer = setInterval(() => void refresh(), REFRESH_MS);
    window.addEventListener('focus', refresh);
    return () => { live = false; clearInterval(timer); window.removeEventListener('focus', refresh); void supabase.removeChannel(channel); };
  }, []);
  return { people, error, now };
}