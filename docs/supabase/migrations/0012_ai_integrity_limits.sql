-- Seed Connection: prevent stale AI reviews and cap abuse of costly endpoints.
-- Additive-only schema, no data deletion.
ALTER TABLE public.capture_analyses
  ADD COLUMN IF NOT EXISTS source_sha256 text;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conrelid = 'public.capture_analyses'::regclass
                   AND conname='capture_analyses_source_hash_check') THEN
    ALTER TABLE public.capture_analyses
      ADD CONSTRAINT capture_analyses_source_hash_check
      CHECK (source_sha256 IS NULL OR source_sha256 ~ '^[a-f0-9]{64}$');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.ai_request_limits (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation text NOT NULL CHECK (operation IN ('sid_chat', 'meeting_analysis')),
  window_start timestamptz NOT NULL,
  requests integer NOT NULL DEFAULT 0 CHECK (requests >= 0),
  PRIMARY KEY (user_id, operation, window_start)
);
ALTER TABLE public.ai_request_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_request_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_request_limits TO service_role;

CREATE OR REPLACE FUNCTION public.claim_ai_request(
  p_user_id uuid, p_operation text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_window timestamptz := date_trunc('minute', now());
  v_max int;
  v_requests int;
BEGIN
  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id=p_user_id) THEN
    RETURN false;
  END IF;
  IF p_operation='sid_chat' THEN v_max := 20;
  ELSIF p_operation='meeting_analysis' THEN v_max := 3;
  ELSE RETURN false;
  END IF;

  INSERT INTO public.ai_request_limits(user_id, operation, window_start, requests)
  VALUES(p_user_id,p_operation,v_window,1)
  ON CONFLICT (user_id,operation,window_start)
  DO UPDATE SET requests=public.ai_request_limits.requests+1
    WHERE public.ai_request_limits.requests < v_max
  RETURNING requests INTO v_requests;
  RETURN v_requests IS NOT NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_ai_request(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_ai_request(uuid,text) TO service_role;
