import { createFileRoute, Link } from "@tanstack/react-router";
import { usePresence } from '@/hooks/use-presence';
import { PauseReminder } from '@/components/pause-reminder';

export const Route = createFileRoute("/ausentes")({
  head: () => ({
    meta: [
      { title: "Stoneverso — Quem está ausente agora" },
      { name: "description", content: "Lista ao vivo de quem da equipe está ausente (pausado) neste momento." },
      { property: "og:title", content: "Stoneverso — Quem está ausente agora" },
      { property: "og:description", content: "Veja em tempo real quem está pausado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Ausentes,
});

function timeAgo(iso: string, now: number) {
  const m = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
  if (m < 1) return "agora mesmo";
  if (m < 60) return `há ${m} min`;
  return `há ${Math.floor(m / 60)} h ${m % 60} min`;
}

function Ausentes() {
  const { people, now, error } = usePresence();

  const away = people
    .filter((p) => p.status === "away")
    .sort((a, b) => a.status_updated_at.localeCompare(b.status_updated_at));

  return (
    <main className="min-h-screen bg-background px-5 py-8">
      <div className="mx-auto max-w-2xl">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-primary">Ausentes agora</h1>
            <p className="text-sm text-muted-foreground">{away.length} pessoa(s) pausada(s) · atualiza ao vivo</p>
          </div>
          <Link to="/" className="text-sm font-medium text-primary hover:underline">Painel completo</Link>
        </header>
        {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
        <PauseReminder people={people} now={now} />
        <ul className="mt-8 divide-y overflow-hidden rounded-2xl border bg-card">
          {away.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-4 py-3.5">
              <span className="h-3 w-3 rounded-full bg-status-away" />
              <p className="flex-1 truncate font-medium text-foreground">{p.display_name}</p>
              <span className="text-xs text-muted-foreground">{timeAgo(p.status_updated_at, now)}</span>
            </li>
          ))}
          {away.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">Ninguém ausente no momento.</li>
          )}
        </ul>
      </div>
    </main>
  );
}
