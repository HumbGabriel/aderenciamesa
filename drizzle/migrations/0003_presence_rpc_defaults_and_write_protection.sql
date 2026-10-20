ALTER FUNCTION public.connect_member(text,uuid,text,uuid) RENAME TO connect_member_legacy;
CREATE FUNCTION public.connect_member(p_name text DEFAULT NULL,p_member uuid DEFAULT NULL,p_token text DEFAULT NULL,p_session uuid DEFAULT NULL) RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ SELECT public.connect_member_legacy(p_name,p_member,p_token,p_session); $$;
REVOKE ALL ON FUNCTION public.connect_member_legacy(text,uuid,text,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.connect_member(text,uuid,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.connect_member(text,uuid,text,uuid) TO anon,authenticated;
REVOKE INSERT,UPDATE ON public.members FROM anon,authenticated;