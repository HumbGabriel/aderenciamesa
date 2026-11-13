import { useEffect, useRef, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTeamSession } from '@/components/team-session';
import { needsPauseReminder } from '@/lib/presence-rules';

type Person = { id: string; status: string; status_updated_at: string };

export function PauseReminder({ people, now }: { people: Person[]; now: number }) {
  const { memberId } = useTeamSession();
  const me = people.find((person) => person.id === memberId);
  const pauseKey = me ? `stoneverso-pause:${me.id}:${me.status_updated_at}` : null;
  const due = Boolean(me && needsPauseReminder(me.status, Date.parse(me.status_updated_at), now));
  const [dismissed, setDismissed] = useState<string | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const sounded = useRef<string | null>(null);

  useEffect(() => {
    if (!window.AudioContext) return;
    const context = new AudioContext();
    audio.current = context;
    const unlock = () => { void context.resume().catch(() => {}); };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      audio.current = null;
      void context.close().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!due || !pauseKey) return;
    if (sessionStorage.getItem(`${pauseKey}:dismissed`)) setDismissed(pauseKey);
    if (sounded.current === pauseKey || sessionStorage.getItem(`${pauseKey}:sounded`)) return;
    const context = audio.current;
    if (!context) return;
    const chime = () => {
      if (context.state !== 'running' || sounded.current === pauseKey) return;
      sounded.current = pauseKey;
      sessionStorage.setItem(`${pauseKey}:sounded`, '1');
      for (const [offset, frequency] of [[0, 660], [0.22, 880]] as const) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = context.currentTime + offset;
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.08, start + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.4);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      }
    };
    chime();
    context.addEventListener('statechange', chime);
    return () => context.removeEventListener('statechange', chime);
  }, [due, pauseKey]);

  if (!due || !pauseKey || dismissed === pauseKey) return null;
  return (
    <div role="status" className="mt-6 flex items-start gap-3 rounded-lg border border-status-away/40 bg-status-away/10 px-4 py-3">
      <Bell className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <p className="flex-1 text-sm text-foreground">Oi, você está aí? Lembre-se de atualizar seu status.</p>
      <Button variant="ghost" size="icon" className="size-7 shrink-0" aria-label="Fechar lembrete de pausa" title="Fechar lembrete de pausa" onClick={() => {
        sessionStorage.setItem(`${pauseKey}:dismissed`, '1');
        setDismissed(pauseKey);
      }}><X className="size-4" /></Button>
    </div>
  );
}