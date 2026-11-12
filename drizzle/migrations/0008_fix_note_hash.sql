CREATE OR REPLACE FUNCTION public.set_member_note(p_session uuid, p_token text, p_note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  SELECT member_id INTO v_id FROM public.member_connections WHERE session_id=p_session AND closed_at IS NULL AND token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  IF v_id IS NULL THEN RAISE EXCEPTION 'Invalid session'; END IF;
  UPDATE public.members SET note = nullif(left(trim(coalesce(p_note,'')),80),'') WHERE id=v_id;
END; $$;