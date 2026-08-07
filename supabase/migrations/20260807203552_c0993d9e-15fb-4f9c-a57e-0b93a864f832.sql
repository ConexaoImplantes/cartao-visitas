CREATE TABLE public.card_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id uuid REFERENCES public.collaborators(id) ON DELETE CASCADE,
  slug text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('view','whatsapp','email','telefone','rede_social')),
  target text,
  referrer text,
  user_agent_kind text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_card_events_collaborator ON public.card_events (collaborator_id);
CREATE INDEX idx_card_events_created_at ON public.card_events (created_at DESC);

GRANT INSERT ON public.card_events TO anon;
GRANT SELECT, INSERT ON public.card_events TO authenticated;
GRANT ALL ON public.card_events TO service_role;

ALTER TABLE public.card_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log card events"
  ON public.card_events FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Dashboard viewers can read card events"
  ON public.card_events FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'dashboard.view'));

CREATE OR REPLACE FUNCTION public.card_event_stats(_since timestamptz DEFAULT NULL)
RETURNS TABLE (
  collaborator_id uuid,
  views bigint,
  clicks bigint,
  whatsapp bigint,
  email bigint,
  telefone bigint,
  rede_social bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    e.collaborator_id,
    count(*) FILTER (WHERE e.event_type = 'view') AS views,
    count(*) FILTER (WHERE e.event_type <> 'view') AS clicks,
    count(*) FILTER (WHERE e.event_type = 'whatsapp') AS whatsapp,
    count(*) FILTER (WHERE e.event_type = 'email') AS email,
    count(*) FILTER (WHERE e.event_type = 'telefone') AS telefone,
    count(*) FILTER (WHERE e.event_type = 'rede_social') AS rede_social
  FROM public.card_events e
  WHERE (_since IS NULL OR e.created_at >= _since)
    AND e.collaborator_id IS NOT NULL
  GROUP BY e.collaborator_id;
$$;

REVOKE EXECUTE ON FUNCTION public.card_event_stats(timestamptz) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.card_event_stats(timestamptz) TO authenticated, service_role;