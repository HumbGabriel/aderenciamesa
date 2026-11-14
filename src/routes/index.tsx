import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTeamSession } from '@/components/team-session';
import { ManagerAccess } from '@/components/manager-access';
import { usePresence } from '@/hooks/use-presence';
import { onlineHours } from '@/lib/presence-rules';
import { PauseReminder } from '@/components/pause-reminder';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Status = Database["public"]["Enums"]["presence_status"];

const STATUS: Record<Status, { label: string; dot: string; badge: string }> = {
  online: { label: "On-line", dot: "bg-status-online", badge: "bg-status-online/15 text-foreground border-status-online/40" },
  away: { label: "Ausente", dot: "bg-status-away", badge: "bg-status-away/20 text-foreground border-status-away/50" },
  meeting: { label: "Em Reunião", dot: "bg-status-meeting", badge: "bg-status-meeting/15 text-foreground border-status-meeting/40" },
  lunch: { label: "Em Almoço", dot: "bg-status-lunch", badge: "bg-status-lunch/15 text-foreground border-status-lunch/40" },
  vacation: { label: "Férias", dot: "bg-status-vacation", badge: "bg-status-vacation/15 text-foreground border-status-vacation/40" },
  offline: { label: "Off-line", dot: "bg-status-offline", badge: "bg-status-offline/15 text-muted-foreground border-status-offline/40" },
};
const ORDER: Status[] = ["online", "meeting", "away", "lunch", "vacation", "offline"];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Stoneverso — Status da equipe em tempo real" },
      { name: "description", content: "Veja quem da equipe está on-line, em reunião, ausente, em almoço, de férias ou off-line, atualizado em tempo real." },
      { property: "og:title", content: "Stoneverso — Status da equipe em tempo real" },
      { property: "og:description", content: "Disponibilidade da equipe atualizada ao vivo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function timeAgo(iso: string, now: number) {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "agora mesmo";
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h ${m % 60} min`;
  return `há ${Math.floor(h / 24)} d`;
}

function Index() {
  const { memberId, ready, leave, manager } = useTeamSession();
  if (!ready) return <div className="min-h-screen bg-background" />;
  return memberId || manager ? <Dashboard userId={memberId} onLeave={leave} /> : <NameForm />;
}

function NameForm() {
  const { join, connectionError } = useTeamSession();
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    setBusy(true);
    setMsg(null);
    try { await join(clean); }
    catch (error) { setMsg(error instanceof Error ? error.message : 'Não foi possível entrar.'); }
    finally { setBusy(false); }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl bg-card/85 p-4 backdrop-blur">
          <h1 className="font-display text-4xl font-bold tracking-tight text-primary">Stoneverso</h1>
          <p className="mt-2 text-muted-foreground">Quem está disponível agora, em tempo real.</p>
        </div>
        <form onSubmit={submit} className="mt-8 space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
          <div className="space-y-1.5">
            <Label htmlFor="name">Seu nome</Label>
            <Input id="name" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Ana Souza" />
          </div>
          {(msg || connectionError) && <p className="text-sm text-destructive">{msg || connectionError}</p>}
          <Button type="submit" className="w-full" disabled={busy}>Entrar</Button>
        </form>
        <div className="mt-4 flex justify-center"><ManagerAccess /></div>
      </div>
    </main>
  );
}

function Dashboard({ userId, onLeave }: { userId: string | null; onLeave: () => void }) {
  const { people, now, error: loadError } = usePresence();
  const { changeStatus, changeNote, manager, connectionError } = useTeamSession();
  const [note, setNote] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const me = people.find((p) => p.id === userId);
  const [dismissed, setDismissed] = useState<{ since: string; hours: number } | null>(null);
  const hours = me?.status === 'online' ? onlineHours(new Date(me.status_updated_at).getTime(), now) : 0;
  const dismissedHours = dismissed && me && dismissed.since === me.status_updated_at ? dismissed.hours : 0;
  const showBreak = hours >= 1 && hours > dismissedHours;
  const awayCount = people.filter((p) => p.status === 'away').length;
  const sorted = [...people].sort(
    (a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || a.display_name.localeCompare(b.display_name),
  );
  const counts = ORDER.map((s) => ({ s, n: people.filter((p) => p.status === s).length }));

  async function setStatus(status: Status) {
    setBusy(true); setError(null);
    try { await changeStatus(status); }
    catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível atualizar.'); }
    finally { setBusy(false); }
  }
  useEffect(() => { if (me && !noteSaved) setNote(me.note ?? ''); }, [me?.note]); // eslint-disable-line react-hooks/exhaustive-deps
  async function saveNote(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    try { await changeNote(note); setNoteSaved(true); setTimeout(() => setNoteSaved(false), 2000); }
    catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível salvar.'); }
    finally { setBusy(false); }
  }
  async function removeMember(id: string, name: string) {
    if (!window.confirm(`Remover ${name} da lista?`)) return;
    setBusy(true); setError(null);
    const { error } = await supabase.rpc('manager_delete_member', { p_member: id });
    if (error) setError('Não foi possível remover. Verifique seu acesso de gestão.');
    setBusy(false);
  }
  async function manageStatus(id: string, status: Status) {
    setBusy(true); setError(null);
    const { error } = await supabase.rpc('manager_set_status', { p_member: id, p_status: status });
    if (error) setError('Não foi possível alterar o status. Verifique seu acesso de gestão.');
    setBusy(false);
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8">
      <div className="mx-auto max-w-3xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-primary">Stoneverso</h1>
            <p className="text-sm text-muted-foreground">
              {counts[0]?.n ?? 0} de {people.length} on-line agora
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <ManagerAccess />
            <Button variant="outline" size="sm" asChild><Link to="/ausentes">Ver ausentes</Link></Button>
            {userId && <Button variant="ghost" size="sm" onClick={onLeave}>Trocar nome</Button>}
          </div>
        </header>

        {(error || loadError || connectionError) && <p role="alert" className="mt-4 text-sm text-destructive">{error || loadError || connectionError}</p>}
        <PauseReminder people={people} now={now} />
        {userId && showBreak && me && <div role="alert" className="mt-6 rounded-2xl border border-status-away/50 bg-status-away/15 p-4">
          <p className="font-medium text-foreground">Você está on-line há {hours} h seguida{hours > 1 ? 's' : ''}. Que tal uma pausa?</p>
          <p className="mt-1 text-sm text-foreground/80">Levante para se alongar, ande um pouco, beba uma água e vá ao banheiro.</p>
          <p className="mt-1 text-sm text-foreground/80">Antes, confira os ausentes: <strong>{awayCount} {awayCount === 1 ? 'pessoa pausada' : 'pessoas pausadas'}</strong> agora.</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" asChild><Link to="/ausentes">Ver ausentes</Link></Button>
            <Button size="sm" variant="ghost" onClick={() => setDismissed({ since: me.status_updated_at, hours })}>Agora não</Button>
          </div>
        </div>}
        {userId && <section className="mt-8 rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Olá, <span className="font-medium text-foreground">{me?.display_name ?? "…"}</span>. Seu status:
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ORDER.map((s) => {
              const active = me?.status === s;
              return (
                <Button
                  key={s}
                   disabled={busy}
                   aria-pressed={active}
                  onClick={() => setStatus(s)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition-all ${
                    active ? "border-primary bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-accent"
                  }`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${STATUS[s].dot}`} />
                  {STATUS[s].label}
                 </Button>
              );
            })}
          </div>
          <form onSubmit={saveNote} className="mt-4 flex gap-2">
            <Label htmlFor="status-note" className="sr-only">Recado</Label>
            <Input id="status-note" maxLength={80} placeholder='Recado (ex.: "volto 14h")' value={note} onChange={(e) => setNote(e.target.value)} />
            <Button type="submit" variant="outline" disabled={busy}>{noteSaved ? 'Salvo' : 'Salvar'}</Button>
          </form>
        </section>}

        <section className="mt-8">
          <div className="mb-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {counts.map(({ s, n }) => (
              <span key={s} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${STATUS[s].dot}`} />
                {STATUS[s].label} · {n}
              </span>
            ))}
          </div>
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
            {sorted.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary font-display font-bold text-secondary-foreground">
                    {p.display_name.slice(0, 1).toUpperCase()}
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card ${STATUS[p.status].dot}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">
                    {p.display_name} {p.id === userId && <span className="text-muted-foreground">(você)</span>}
                  </p>
                  {p.note && <p className="truncate text-sm text-foreground/80">“{p.note}”</p>}
                  <p className="text-xs text-muted-foreground">{timeAgo(p.status_updated_at, now)}</p>
                </div>
                {manager ? <Select value={p.status} disabled={busy} onValueChange={(status) => void manageStatus(p.id, status as Status)}>
                  <SelectTrigger aria-label={`Status de ${p.display_name}`} className="w-32 shrink-0"><SelectValue /></SelectTrigger>
                  <SelectContent>{ORDER.map((status) => <SelectItem key={status} value={status}>{STATUS[status].label}</SelectItem>)}</SelectContent>
                </Select> : <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS[p.status].badge}`}>
                  {STATUS[p.status].label}
                </span>}
                {manager && <Button variant="ghost" size="icon" disabled={busy} aria-label={`Remover ${p.display_name}`} onClick={() => void removeMember(p.id, p.display_name)}><Trash2 className="size-4" /></Button>}
              </li>
            ))}
            {people.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted-foreground">Carregando equipe…</li>}
          </ul>
        </section>
        {manager && <DayHistory people={people} />}
      </div>
    </main>
  );
}

function formatDuration(seconds: number) {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

function DayHistory({ people }: { people: { id: string; display_name: string }[] }) {
  const [rows, setRows] = useState<{ member_id: string; status: Status; seconds: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    async function load() {
      const { data, error } = await supabase.rpc('manager_day_history');
      if (!live) return;
      if (error) setError('Não foi possível carregar o histórico.');
      else { setRows(data ?? []); setError(null); }
    }
    void load();
    const timer = setInterval(() => void load(), 60_000);
    return () => { live = false; clearInterval(timer); };
  }, []);
  const named = [...people].sort((a, b) => a.display_name.localeCompare(b.display_name));
  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-bold text-foreground">Histórico de hoje</h2>
      <p className="mb-3 text-xs text-muted-foreground">Tempo de cada pessoa em cada status desde meia-noite, pelas mudanças registradas. Atualiza a cada minuto.</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-xs text-muted-foreground">
            <th className="px-4 py-2 font-medium">Pessoa</th>
            {ORDER.map((s) => <th key={s} className="px-3 py-2 font-medium">{STATUS[s].label}</th>)}
          </tr></thead>
          <tbody>
            {named.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="px-4 py-2 font-medium text-foreground">{p.display_name}</td>
                {ORDER.map((s) => {
                  const r = rows.find((x) => x.member_id === p.id && x.status === s);
                  return <td key={s} className="px-3 py-2 text-muted-foreground">{r && r.seconds >= 60 ? formatDuration(r.seconds) : '—'}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
