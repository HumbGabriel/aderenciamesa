import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Trash2, Radio, Coffee, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence, MotionConfig, useReducedMotion, animate } from "framer-motion";
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

function CountUp({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const [from, setFrom] = useState(value);
  useEffect(() => {
    if (reduce) { setShown(value); setFrom(value); return; }
    const c = animate(from, value, { duration: 0.6, ease: "easeOut", onUpdate: (v) => setShown(Math.round(v)) });
    setFrom(value);
    return () => c.stop();
  }, [value, reduce]); // eslint-disable-line react-hooks/exhaustive-deps
  return <span className={className}>{shown}</span>;
}

function StatusDot({ status, className = "" }: { status: Status; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <span className={`relative inline-flex ${className}`}>
      {status === "online" && !reduce && (
        <motion.span className={`absolute inset-0 rounded-full ${STATUS.online.dot}`}
          animate={{ scale: [1, 2.4], opacity: [0.6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }} />
      )}
      <span className={`relative h-full w-full rounded-full ${STATUS[status].dot}`} />
    </span>
  );
}

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const rise = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

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
  return <MotionConfig reducedMotion="user">{memberId || manager ? <Dashboard userId={memberId} onLeave={leave} /> : <NameForm />}</MotionConfig>;
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

  const features = [
    { icon: Radio, title: "Tempo real", text: "Status da mesa atualizado ao vivo para todo mundo." },
    { icon: Coffee, title: "Pausa inteligente", text: "Lembretes para pausar e para atualizar o status." },
    { icon: ShieldCheck, title: "Visão de gestão", text: "Ajuste de status e histórico do dia para a gestão." },
  ];
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]" />
      <motion.div variants={stagger} initial="hidden" animate="show"
        className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-5 py-12 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <motion.p variants={rise} className="font-display text-sm font-bold uppercase tracking-widest text-primary">Stoneverso</motion.p>
          <motion.h1 variants={rise} className="mt-3 font-display text-5xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
            Quem está disponível.<br /><span className="text-primary">Agora.</span>
          </motion.h1>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <motion.div key={title} variants={rise} className="rounded-2xl border bg-card/80 p-4 backdrop-blur">
                <Icon className="size-5 text-primary" />
                <p className="mt-3 font-display font-bold text-foreground">{title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{text}</p>
              </motion.div>
            ))}
          </div>
        </div>
        <motion.div variants={rise} className="w-full rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="font-display text-xl font-bold text-foreground">Entrar na mesa</h2>
          <p className="mt-1 text-sm text-muted-foreground">Digite seu nome para aparecer na lista.</p>
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Seu nome</Label>
              <Input id="name" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Ana Souza" />
            </div>
            {(msg || connectionError) && <p className="text-sm text-destructive">{msg || connectionError}</p>}
            <Button type="submit" className="w-full" disabled={busy}>Entrar</Button>
          </form>
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />ou<span className="h-px flex-1 bg-border" />
          </div>
          <div className="flex justify-center"><ManagerAccess /></div>
        </motion.div>
      </motion.div>
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

  const [filter, setFilter] = useState<Status | null>(null);
  const visible = filter ? sorted.filter((p) => p.status === filter) : sorted;
  const hour = new Date(now).getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const onlineCount = counts[0]?.n ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-display text-sm font-bold text-primary-foreground">S</span>
              <span className="font-display text-lg font-bold tracking-tight text-foreground">Stoneverso</span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link to="/" className="rounded-lg px-3 py-1.5 font-medium text-foreground bg-accent">Equipe</Link>
              <Link to="/ausentes" className="rounded-lg px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">Ausentes</Link>
            </nav>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <ManagerAccess />
            {userId && <Button variant="ghost" size="sm" onClick={onLeave}>Trocar nome</Button>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-6">
        {(error || loadError || connectionError) && <p role="alert" className="mb-4 text-sm text-destructive">{error || loadError || connectionError}</p>}

        <section className="rounded-2xl bg-hero p-6 text-primary-foreground sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-medium">
                <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full rounded-full bg-hero-accent opacity-75 motion-safe:animate-ping" /><span className="relative inline-flex h-2 w-2 rounded-full bg-hero-accent" /></span>
                Ao vivo
              </span>
              <h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">{greeting}, {me?.display_name ?? (manager ? 'gestão' : '…')}</h1>
              <p className="mt-1 text-sm text-primary-foreground/70">Disponibilidade da equipe em tempo real.</p>
            </div>
            <div className="text-right">
              <CountUp value={onlineCount} className="block font-display text-[56px] font-bold leading-none text-hero-accent" />
              <p className="mt-1 text-sm text-primary-foreground/70">de <span className="font-mono">{people.length}</span> on-line agora</p>
            </div>
          </div>
        </section>

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

        <motion.section variants={stagger} initial="hidden" animate="show" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {counts.map(({ s, n }) => {
            const active = filter === s;
            return (
              <motion.button variants={rise} key={s} type="button" aria-pressed={active} onClick={() => setFilter(active ? null : s)}
                className={`rounded-2xl border bg-card p-4 text-left transition-all hover:shadow-sm ${active ? 'border-primary ring-2 ring-primary/30' : ''}`}>
                <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <StatusDot status={s} className="h-2.5 w-2.5" />{STATUS[s].label}
                </span>
                <CountUp value={n} className="mt-2 block font-mono text-3xl font-semibold text-foreground" />
              </motion.button>
            );
          })}
        </motion.section>

        <div className={`mt-6 grid gap-6 ${userId ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]' : ''}`}>
          {userId && <section className="h-fit rounded-2xl border bg-card p-5">
            <h2 className="font-display text-lg font-bold text-foreground">Seu status</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {ORDER.map((s) => {
                const active = me?.status === s;
                return (
                  <button key={s} type="button" disabled={busy} aria-pressed={active} onClick={() => setStatus(s)}
                    className={`relative flex items-center justify-start gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition-colors disabled:opacity-60 ${
                      active ? "border-primary text-primary-foreground" : "bg-background text-foreground hover:bg-accent"
                    }`}>
                    {active && <motion.span layoutId="status-highlight" className="absolute inset-0 rounded-xl bg-primary" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
                    <StatusDot status={s} className="relative h-2.5 w-2.5" />
                    <span className="relative">{STATUS[s].label}</span>
                  </button>
                );
              })}
            </div>
            <form onSubmit={saveNote} className="mt-4 space-y-2">
              <Label htmlFor="status-note" className="text-sm text-muted-foreground">Recado</Label>
              <div className="flex gap-2">
                <Input id="status-note" maxLength={80} placeholder='Ex.: "volto 14h"' value={note} onChange={(e) => setNote(e.target.value)} />
                <Button type="submit" variant="outline" disabled={busy}>{noteSaved ? 'Salvo' : 'Salvar'}</Button>
              </div>
            </form>
          </section>}

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-foreground">Equipe {filter && <span className="text-sm font-normal text-muted-foreground">· {STATUS[filter].label}</span>}</h2>
              {filter && <Button variant="ghost" size="sm" onClick={() => setFilter(null)}>Limpar filtro</Button>}
            </div>
            <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
              <AnimatePresence initial={false}>
              {visible.map((p) => (
                <motion.li layout="position" key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 40 }} className="flex items-center gap-3 bg-card px-4 py-3.5">
                  <div className="relative">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent font-display font-bold text-foreground">
                      {p.display_name.slice(0, 1).toUpperCase()}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 rounded-full border-2 border-card bg-card"><StatusDot status={p.status} className="h-full w-full" /></span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">
                      {p.display_name} {p.id === userId && <span className="text-muted-foreground">(você)</span>}
                    </p>
                    {p.note && <p className="truncate text-sm text-foreground/80">“{p.note}”</p>}
                    <p className="font-mono text-xs text-muted-foreground">{timeAgo(p.status_updated_at, now)}</p>
                  </div>
                  {manager ? <Select value={p.status} disabled={busy} onValueChange={(status) => void manageStatus(p.id, status as Status)}>
                    <SelectTrigger aria-label={`Status de ${p.display_name}`} className="w-32 shrink-0"><SelectValue /></SelectTrigger>
                    <SelectContent>{ORDER.map((status) => <SelectItem key={status} value={status}>{STATUS[status].label}</SelectItem>)}</SelectContent>
                  </Select> : <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS[p.status].badge}`}>
                    {STATUS[p.status].label}
                  </span>}
                  {manager && <Button variant="ghost" size="icon" disabled={busy} aria-label={`Remover ${p.display_name}`} onClick={() => void removeMember(p.id, p.display_name)}><Trash2 className="size-4" /></Button>}
                </motion.li>
              ))}
              </AnimatePresence>
              {people.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted-foreground">Carregando equipe…</li>}
              {people.length > 0 && visible.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted-foreground">Ninguém com esse status agora.</li>}
            </ul>
          </section>
        </div>
        {manager && <DayHistory people={people} />}
      </main>
    </div>
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
            <th className="min-w-40 px-3 py-2 font-medium">Proporção</th>
            {ORDER.map((s) => <th key={s} className="px-3 py-2 font-medium">{STATUS[s].label}</th>)}
          </tr></thead>
          <tbody>
            {named.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="px-4 py-2 font-medium text-foreground">{p.display_name}</td>
                <td className="px-3 py-2"><StatusBar rows={rows.filter((x) => x.member_id === p.id)} /></td>
                {ORDER.map((s) => {
                  const r = rows.find((x) => x.member_id === p.id && x.status === s);
                  return <td key={s} className="px-3 py-2 font-mono text-xs text-muted-foreground">{r && r.seconds >= 60 ? formatDuration(r.seconds) : '—'}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatusBar({ rows }: { rows: { status: Status; seconds: number }[] }) {
  const total = rows.reduce((sum, r) => sum + r.seconds, 0);
  if (total < 60) return <div className="h-2.5 w-full rounded-full bg-muted" />;
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
      {ORDER.map((s) => {
        const sec = rows.filter((r) => r.status === s).reduce((sum, r) => sum + r.seconds, 0);
        if (!sec) return null;
        return <div key={s} className={STATUS[s].dot} style={{ width: `${(sec / total) * 100}%` }} title={`${STATUS[s].label}: ${formatDuration(sec)}`} />;
      })}
    </div>
  );
}
