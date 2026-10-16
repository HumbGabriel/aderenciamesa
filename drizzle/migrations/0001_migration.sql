CREATE TABLE public.members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  status public.presence_status NOT NULL DEFAULT 'online',
  status_updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX members_name_unique ON public.members (lower(trim(display_name)));
GRANT SELECT, INSERT, UPDATE ON public.members TO anon, authenticated;
GRANT ALL ON public.members TO service_role;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view members" ON public.members FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can join" ON public.members FOR INSERT TO anon, authenticated WITH CHECK (length(trim(display_name)) BETWEEN 1 AND 60);
CREATE POLICY "Anyone can update status" ON public.members FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (length(trim(display_name)) BETWEEN 1 AND 60);
CREATE TRIGGER members_touch_status BEFORE UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION public.touch_status();
ALTER TABLE public.members REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.members;