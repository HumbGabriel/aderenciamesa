import { createFileRoute, Link } from "@tanstack/react-router";
import mysticBg from "@/assets/mystic-bg.jpg";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Status = Database["public"]["Enums"]["presence_status"];
type Profile = Database["public"]["Tables"]["members"]["Row"];

const STATUS: Record<Status, { label: string; dot: string; badge: string }> = {
  online: { label: "On-line", dot: "bg-status-online", badge: "bg-status-online/15 text-foreground border-status-online/40" },
  away: { label: "Ausente", dot: "bg-status-away", badge: "bg-status-away/20 text-foreground border-status-away/50" },
  lunch: { label: "Em Almoço", dot: "bg-status-lunch", badge: "bg-status-lunch/15 text-foreground border-status-lunch/40" },
  offline: { label: "Off-line", dot: "bg-status-offline", badge: "bg-status-offline/15 text-muted-foreground border-status-offline/40" },
};
const ORDER: Status[] = ["online", "away", "lunch", "offline"];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Stoneverso — Status da equipe em tempo real" },
      { name: "description", content: "Veja quem da equipe está on-line, ausente, em almoço ou off-line, atualizado em tempo real." },
      { property: "og:title", content: "Stoneverso — Status da equipe em tempo real" },
      { property: "og:description", content: "Disponibilidade da equipe atualizada ao vivo." },
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

const KEY = "mesa-member-id";

function Index() {
  const [memberId, setMemberId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setMemberId(localStorage.getItem(KEY));
    setReady(true);
  }, []);
  const choose = (id: string | null) => {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
    setMemberId(id);
  };
  if (!ready) return <div className="min-h-screen bg-background" />;
  return memberId ? <Dashboard userId={memberId} onLeave={() => choose(null)} /> : <NameForm onPick={choose} />;
}

function NameForm({ onPick }: { onPick: (id: string) => void }) {
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    setBusy(true);
    setMsg(null);
    const { data: list } = await supabase.from("members").select("id, display_name");
    const found = list?.find((m) => m.display_name.trim().toLowerCase() === clean.toLowerCase());
    if (found) {
      await supabase.from("members").update({ status: "online" }).eq("id", found.id);
      onPick(found.id);
    } else {
      const { data, error } = await supabase.from("members").insert({ display_name: clean }).select("id").single();
      if (error || !data) setMsg("Não foi possível entrar. Tente novamente.");
      else onPick(data.id);
    }
    setBusy(false);
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-background bg-cover bg-center px-5"
      style={{ backgroundImage: `url(${mysticBg})` }}
    >
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
          {msg && <p className="text-sm text-destructive">{msg}</p>}
          <Button type="submit" className="w-full" disabled={busy}>Entrar</Button>
        </form>
      </div>
    </main>
  );
}

function Dashboard({ userId, onLeave }: { userId: string; onLeave: () => void }) {
  const [people, setPeople] = useState<Profile[]>([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    supabase.from("members").select("*").then(({ data }) => data && setPeople(data));
    const channel = supabase
      .channel("members-status")
      .on("postgres_changes", { event: "*", schema: "public", table: "members" }, (payload) => {
        setPeople((prev) => {
          if (payload.eventType === "DELETE") return prev.filter((p) => p.id !== (payload.old as Profile).id);
          const row = payload.new as Profile;
          const exists = prev.some((p) => p.id === row.id);
          return exists ? prev.map((p) => (p.id === row.id ? row : p)) : [...prev, row];
        });
      })
      .subscribe();
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => { supabase.removeChannel(channel); clearInterval(t); };
  }, []);

  const me = people.find((p) => p.id === userId);
  const sorted = [...people].sort(
    (a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || a.display_name.localeCompare(b.display_name),
  );
  const counts = ORDER.map((s) => ({ s, n: people.filter((p) => p.status === s).length }));

  async function setStatus(status: Status) {
    setPeople((prev) => prev.map((p) => (p.id === userId ? { ...p, status, status_updated_at: new Date().toISOString() } : p)));
    await supabase.from("members").update({ status }).eq("id", userId);
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-primary">Stoneverso</h1>
            <p className="text-sm text-muted-foreground">
              {counts[0]?.n ?? 0} de {people.length} on-line agora
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" asChild><Link to="/ausentes">Ver ausentes</Link></Button>
            <Button variant="ghost" size="sm" onClick={onLeave}>Trocar nome</Button>
          </div>
        </header>

        <section className="mt-8 rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Olá, <span className="font-medium text-foreground">{me?.display_name ?? "…"}</span>. Seu status:
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ORDER.map((s) => {
              const active = me?.status === s;
              return (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition-all ${
                    active ? "border-primary bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-accent"
                  }`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${STATUS[s].dot}`} />
                  {STATUS[s].label}
                </button>
              );
            })}
          </div>
        </section>

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
                  <p className="text-xs text-muted-foreground">{timeAgo(p.status_updated_at, now)}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS[p.status].badge}`}>
                  {STATUS[p.status].label}
                </span>
              </li>
            ))}
            {people.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted-foreground">Carregando equipe…</li>}
          </ul>
        </section>
      </div>
    </main>
  );
}
