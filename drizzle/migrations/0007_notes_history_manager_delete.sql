ALTER TABLE public.members ADD COLUMN IF NOT EXISTS note text;

CREATE TABLE public.status_events (
  id bigserial PRIMARY KEY,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  status public.presence_status NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.status_events TO service_role;
ALTER TABLE public.status_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX status_events_member_time ON public.status_events(member_id, started_at);

CREATE OR REPLACE FUNCTION public.log_status_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.status_events(member_id, status) VALUES (NEW.id, NEW.status);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER members_log_status AFTER INSERT OR UPDATE OF status ON public.members FOR EACH ROW EXECUTE FUNCTION public.log_status_event();

DROP FUNCTION public.list_member_presence();
CREATE FUNCTION public.list_member_presence() RETURNS SETOF public.members LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
SELECT m.id,m.display_name,
 CASE WHEN c.active OR (m.manager_set_at IS NOT NULL AND m.manager_set_at >= coalesce(c.ended,'-infinity'::timestamptz)) THEN m.status ELSE 'offline'::public.presence_status END,
 CASE WHEN c.active OR m.status='offline' OR (m.manager_set_at IS NOT NULL AND m.manager_set_at >= coalesce(c.ended,'-infinity'::timestamptz)) THEN m.status_updated_at ELSE coalesce(c.ended,m.status_updated_at) END,
 m.created_at,m.manager_set_at,
 CASE WHEN c.active OR (m.manager_set_at IS NOT NULL AND m.manager_set_at >= coalesce(c.ended,'-infinity'::timestamptz)) THEN m.note ELSE NULL END
FROM public.members m LEFT JOIN LATERAL(SELECT bool_or(closed_at IS NULL AND last_seen_at>now()-interval '3 minutes') AS active,max(coalesce(closed_at,last_seen_at+interval '3 minutes')) AS ended FROM public.member_connections WHERE member_id=m.id)c ON true; $$;
GRANT EXECUTE ON FUNCTION public.list_member_presence() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_member_note(p_session uuid, p_token text, p_note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  SELECT member_id INTO v_id FROM public.member_connections WHERE session_id=p_session AND closed_at IS NULL AND token_hash=encode(extensions.digest(convert_to(p_token,'UTF8'),'sha256'),'hex');
  IF v_id IS NULL THEN RAISE EXCEPTION 'Invalid session'; END IF;
  UPDATE public.members SET note = nullif(left(trim(coalesce(p_note,'')),80),'') WHERE id=v_id;
END; $$;
REVOKE ALL ON FUNCTION public.set_member_note(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_member_note(uuid,text,text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.manager_delete_member(p_member uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_manager() THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
  DELETE FROM public.members WHERE id=p_member;
END; $$;
REVOKE ALL ON FUNCTION public.manager_delete_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.manager_delete_member(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.manager_day_history() RETURNS TABLE(member_id uuid, status public.presence_status, seconds bigint) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_start timestamptz := date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
BEGIN
  IF NOT public.is_manager() THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
  RETURN QUERY
  WITH ev AS (
    SELECT e.member_id, e.status, greatest(e.started_at, v_start) AS s,
      coalesce(lead(e.started_at) OVER (PARTITION BY e.member_id ORDER BY e.started_at, e.id), now()) AS f
    FROM public.status_events e
    WHERE e.started_at >= v_start OR e.id = (SELECT max(x.id) FROM public.status_events x WHERE x.member_id=e.member_id AND x.started_at < v_start)
  )
  SELECT ev.member_id, ev.status, sum(greatest(0, extract(epoch FROM ev.f - ev.s)))::bigint FROM ev WHERE ev.f > v_start GROUP BY 1,2;
END; $$;
REVOKE ALL ON FUNCTION public.manager_day_history() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.manager_day_history() TO authenticated;

INSERT INTO public.status_events(member_id, status, started_at) SELECT id, status, status_updated_at FROM public.members;