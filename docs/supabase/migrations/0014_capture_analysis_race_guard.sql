-- Prevent a race where a capture is edited during the LLM response.
-- The server must present the hash of the exact text it sent to the model.
-- The database compares it with the current capture immediately on INSERT.
CREATE OR REPLACE FUNCTION private.capture_analysis_source_fingerprint()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public, private, extensions, pg_temp
AS $$
DECLARE v_current_hash text;
BEGIN
  SELECT encode(extensions.digest(convert_to(c.note,'UTF8'),'sha256'),'hex')
    INTO v_current_hash
    FROM public.captures c
    WHERE c.id=NEW.capture_id AND c.owner_id=NEW.owner_id;
  IF v_current_hash IS NULL THEN
    RAISE EXCEPTION 'Captura de origem não encontrada';
  END IF;
  IF NEW.source_sha256 IS NULL OR NEW.source_sha256<>v_current_hash THEN
    RAISE EXCEPTION 'A anotação foi modificada durante a análise; solicite uma nova análise';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.capture_analysis_source_fingerprint() FROM PUBLIC,anon,authenticated;
