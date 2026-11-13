DO $migration$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef('public.close_member(uuid,text)'::regprocedure) INTO definition;
 definition := replace(definition, 'SET status=''offline'' WHERE id=v_id;', 'SET status=''offline'' WHERE id=v_id AND status<>''vacation'';');
 EXECUTE definition;
 SELECT pg_get_functiondef('public.connect_member_legacy(text,uuid,text,uuid)'::regprocedure) INTO definition;
 definition := replace(definition, 'SET status=''online'',status_updated_at=now() WHERE id=v_id;', 'SET status=''online'',status_updated_at=now() WHERE id=v_id AND status<>''vacation'';');
 EXECUTE definition;
 SELECT pg_get_functiondef('public.list_member_presence()'::regprocedure) INTO definition;
 definition := replace(definition, 'WHEN c.active OR', 'WHEN m.status::text=''vacation'' OR c.active OR');
 EXECUTE definition;
END;
$migration$;