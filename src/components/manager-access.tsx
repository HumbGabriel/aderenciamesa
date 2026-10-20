import { useState, type FormEvent } from 'react';
import { ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useTeamSession } from '@/components/team-session';

export function ManagerAccess() {
  const { manager } = useTeamSession();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(null);
    try {
      if (sent) {
        const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
        if (error) throw error;
        const { data } = await supabase.rpc('is_manager');
        if (!data) throw new Error('Acesso de gestão não autorizado para esta conta.');
        setOpen(false);
      } else {
        const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        setSent(true); setMessage('E-mail enviado. Abra o link ou informe o código recebido.');
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível acessar. Tente novamente.'); }
    finally { setBusy(false); }
  }
  if (manager) return <Button variant="outline" size="sm" onClick={() => void supabase.auth.signOut()}><ShieldCheck className="size-4" />Sair da gestão</Button>;
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button variant="outline" size="sm"><ShieldCheck className="size-4" />Gestão</Button></DialogTrigger>
    <DialogContent className="max-w-sm">
      <DialogHeader><DialogTitle>Acesso da gestão</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="manager-email">E-mail</Label><Input id="manager-email" type="email" autoComplete="email" required value={email} disabled={sent} onChange={(e) => setEmail(e.target.value)} /></div>
        {sent && <div className="space-y-2"><Label htmlFor="manager-code">Código recebido</Label><Input id="manager-code" inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} /></div>}
        {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
        <Button className="w-full" disabled={busy}>{busy ? 'Aguarde…' : sent ? 'Confirmar código' : 'Enviar acesso por e-mail'}</Button>
        {sent && <Button type="button" variant="ghost" className="w-full" onClick={() => { setSent(false); setMessage(null); }}>Usar outro e-mail</Button>}
      </form>
    </DialogContent>
  </Dialog>;
}