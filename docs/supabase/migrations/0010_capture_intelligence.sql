-- First, conservative AI review stage for meeting notes. Never auto-edit CRM.
CREATE TABLE IF NOT EXISTS public.capture_analyses (
  capture_id uuid PRIMARY KEY REFERENCES public.captures(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  summary text NOT NULL DEFAULT '',
  proposals jsonb NOT NULL DEFAULT '{"people":[]}'::jsonb,
  status text NOT NULL DEFAULT 'sugerido' CHECK (status IN ('sugerido','revisado')),
  model_name text NOT NULL DEFAULT 'sid',
  analyzed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT capture_analyses_limit CHECK (pg_column_size(proposals) < 150000)
);
CREATE INDEX IF NOT EXISTS capture_analyses_owner_idx ON public.capture_analyses(owner_id,analyzed_at DESC);
ALTER TABLE public.capture_analyses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.capture_analyses FROM public,anon,authenticated;
GRANT SELECT ON public.capture_analyses TO authenticated;
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
  AND tablename='capture_analyses' AND policyname='capture_analyses_own_read') THEN
   CREATE POLICY capture_analyses_own_read ON public.capture_analyses FOR SELECT
   TO authenticated USING (
     owner_id=(select auth.uid())
     AND EXISTS(SELECT 1 FROM public.captures c WHERE c.id=capture_id AND c.owner_id=(select auth.uid()))
   );
 END IF;
END $$;
-- Proposal decisions are private and server-authoritative. A successful
-- write is recorded for each person once (idempotent).
CREATE TABLE IF NOT EXISTS public.capture_analysis_decisions (
  capture_id uuid NOT NULL REFERENCES public.capture_analyses(capture_id) ON DELETE CASCADE,
  person_index integer NOT NULL CHECK (person_index >= 0 AND person_index < 20),
  person_id uuid NOT NULL REFERENCES public.people(id),
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(capture_id,person_index)
);
ALTER TABLE public.capture_analysis_decisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.capture_analysis_decisions FROM public,anon,authenticated;
GRANT SELECT ON public.capture_analysis_decisions TO authenticated;
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
  AND tablename='capture_analysis_decisions' AND policyname='capture_analysis_decisions_own_read') THEN
   CREATE POLICY capture_analysis_decisions_own_read ON public.capture_analysis_decisions FOR SELECT
   TO authenticated USING (owner_id=(select auth.uid()));
 END IF;
END $$;
