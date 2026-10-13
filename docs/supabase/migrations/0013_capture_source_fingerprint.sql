-- Hard-stop stale AI findings at the database boundary, including direct RPC calls.
-- The insert trigger stores a SHA-256 of the original note; the decision trigger
-- rejects approval if the note was edited after the analysis was generated.
CREATE OR REPLACE FUNCTION private.capture_analysis_source_fingerprint()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public, private, extensions, pg_temp
AS $$
DECLARE v_note text;
BEGIN
  SELECT c.note INTO v_note FROM public.captures c
    WHERE c.id=NEW.capture_id AND c.owner_id=NEW.owner_id;
  IF v_note IS NULL THEN
    RAISE EXCEPTION 'Source capture missing for meeting analysis';
  END IF;
  NEW.source_sha256 := encode(extensions.digest(convert_to(v_note,'UTF8'),'sha256'),'hex');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.reject_stale_capture_decision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public, private, extensions, pg_temp
AS $$
DECLARE v_expected text;
DECLARE v_now text;
BEGIN
  SELECT ca.source_sha256,
         encode(extensions.digest(convert_to(c.note,'UTF8'),'sha256'),'hex')
    INTO v_expected,v_now
  FROM public.capture_analyses ca
  JOIN public.captures c ON c.id=ca.capture_id AND c.owner_id=ca.owner_id
  WHERE ca.capture_id=NEW.capture_id AND ca.owner_id=NEW.owner_id;
  IF v_expected IS NULL OR v_now IS NULL OR v_expected<>v_now THEN
    RAISE EXCEPTION 'O texto original da reunião mudou; esta análise deve ser refeita';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.capture_analysis_source_fingerprint() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.reject_stale_capture_decision() FROM PUBLIC,anon,authenticated;

DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='capture_analysis_fingerprint_insert'
    AND tgrelid='public.capture_analyses'::regclass) THEN
  CREATE TRIGGER capture_analysis_fingerprint_insert
    BEFORE INSERT ON public.capture_analyses FOR EACH ROW
    EXECUTE FUNCTION private.capture_analysis_source_fingerprint();
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='capture_decision_source_guard'
    AND tgrelid='public.capture_analysis_decisions'::regclass) THEN
  CREATE TRIGGER capture_decision_source_guard
    BEFORE INSERT ON public.capture_analysis_decisions FOR EACH ROW
    EXECUTE FUNCTION private.reject_stale_capture_decision();
 END IF;
END $$;
