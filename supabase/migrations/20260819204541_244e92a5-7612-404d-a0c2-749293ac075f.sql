ALTER TABLE public.card_events DROP CONSTRAINT card_events_event_type_check;
ALTER TABLE public.card_events ADD CONSTRAINT card_events_event_type_check
  CHECK (event_type = ANY (ARRAY['view','whatsapp','email','telefone','rede_social','kit_view']));

DROP FUNCTION IF EXISTS public.card_event_stats(timestamp with time zone);
CREATE FUNCTION public.card_event_stats(_since timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(collaborator_id uuid, views bigint, clicks bigint, whatsapp bigint, email bigint, telefone bigint, rede_social bigint, kit_views bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT
    e.collaborator_id,
    count(*) FILTER (WHERE e.event_type = 'view') AS views,
    count(*) FILTER (WHERE e.event_type NOT IN ('view','kit_view')) AS clicks,
    count(*) FILTER (WHERE e.event_type = 'whatsapp') AS whatsapp,
    count(*) FILTER (WHERE e.event_type = 'email') AS email,
    count(*) FILTER (WHERE e.event_type = 'telefone') AS telefone,
    count(*) FILTER (WHERE e.event_type = 'rede_social') AS rede_social,
    count(*) FILTER (WHERE e.event_type = 'kit_view') AS kit_views
  FROM public.card_events e
  WHERE (_since IS NULL OR e.created_at >= _since)
    AND e.collaborator_id IS NOT NULL
  GROUP BY e.collaborator_id;
$function$;
REVOKE ALL ON FUNCTION public.card_event_stats(timestamp with time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.card_event_stats(timestamp with time zone) TO authenticated, service_role;