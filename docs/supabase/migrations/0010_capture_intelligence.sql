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

-- Authenticated, per-person approval is atomic: no half-written CRM updates.
-- This function validates the current user's ownership on every resource.
CREATE OR REPLACE FUNCTION public.approve_capture_person(
  p_capture_id uuid,
  p_person_index integer,
  p_existing_person_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid := (SELECT auth.uid());
  v_result public.capture_analyses%ROWTYPE;
  v_item jsonb;
  v_fact jsonb;
  v_person uuid;
  v_name text;
  v_kind text;
  v_text text;
  v_facts jsonb;
  v_needs text[] := '{}'::text[];
  v_skills text[] := '{}'::text[];
  v_name_norm text;
  v_email text;
  v_phone text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Autenticação necessária'; END IF;
  SELECT * INTO v_result FROM public.capture_analyses
   WHERE capture_id=p_capture_id AND owner_id=v_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Análise não encontrada ou acesso negado'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.captures c WHERE c.id=p_capture_id AND c.owner_id=v_user) THEN
    RAISE EXCEPTION 'Captura não pertence à sua conta';
  END IF;
  IF p_person_index < 0 OR p_person_index >= jsonb_array_length(v_result.proposals->'people') THEN
    RAISE EXCEPTION 'Pessoa não consta da análise';
  END IF;
  SELECT person_id INTO v_person FROM public.capture_analysis_decisions
    WHERE capture_id=p_capture_id AND person_index=p_person_index AND owner_id=v_user;
  IF FOUND THEN RETURN v_person; END IF;
  v_item := v_result.proposals->'people'->p_person_index;
  v_name := btrim(v_item->>'name');
  IF length(v_name)<3 OR length(v_name)>130 THEN
    RAISE EXCEPTION 'Nome inválido na análise';
  END IF;
  v_email := lower(btrim(coalesce(v_item->>'email','')));
  v_phone := regexp_replace(coalesce(v_item->>'phone',''),'[^0-9]','','g');
  IF p_existing_person_id IS NOT NULL THEN
    SELECT id INTO v_person FROM public.people
      WHERE id=p_existing_person_id AND owner_id=v_user;
    IF v_person IS NULL THEN RAISE EXCEPTION 'Pessoa selecionada não pertence à sua conta'; END IF;
  ELSE
    IF EXISTS (SELECT 1 FROM public.people WHERE owner_id=v_user
       AND lower(btrim(name))=lower(v_name)) OR
       EXISTS (SELECT 1 FROM public.contact_methods cm JOIN public.people p ON p.id=cm.person_id
        WHERE p.owner_id=v_user AND
        ((v_email<>'' AND cm.kind='email' AND cm.value_normalized=v_email)
         OR (v_phone<>'' AND cm.kind IN ('phone','telefone')
             AND regexp_replace(coalesce(cm.value_normalized,''),'[^0-9]','','g')=v_phone))) THEN
      RAISE EXCEPTION 'Possível duplicata: selecione a pessoa existente antes de criar';
    END IF;
    INSERT INTO public.people(owner_id,name,company,role,source,visibility,context)
      VALUES(v_user,v_name,nullif(v_item->>'organization',''),
        nullif(v_item->>'role',''),'captura','privado',
        'Identificado após revisão da captura '||p_capture_id::text)
      RETURNING id INTO v_person;
    IF v_email<>'' THEN
      INSERT INTO public.contact_methods(person_id,kind,value_raw,value_normalized)
        VALUES(v_person,'email',v_email,v_email);
    END IF;
    IF v_phone<>'' THEN
      INSERT INTO public.contact_methods(person_id,kind,value_raw,value_normalized)
        VALUES(v_person,'telefone',v_phone,v_phone);
    END IF;
  END IF;
  v_facts := coalesce(v_item->'facts','[]'::jsonb);
  FOR v_fact IN SELECT value FROM jsonb_array_elements(v_facts)
  LOOP
    v_kind := v_fact->>'kind';
    v_text := btrim(v_fact->>'text');
    IF v_kind NOT IN ('necessidade','habilidade','contexto','compromisso','oportunidade')
       OR length(v_text)<5 OR length(v_text)>500 THEN CONTINUE; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.facts
      WHERE person_id=v_person AND source_capture_id=p_capture_id AND kind=v_kind AND text=v_text) THEN
      INSERT INTO public.facts(person_id,kind,text,is_inference,confidence,source,
        source_capture_id,status,reviewed_by,reviewed_at,author_id)
      VALUES(v_person,v_kind,v_text,false,
        (v_fact->>'confidence')::numeric,'captura',p_capture_id,'aprovado',
        v_user,now(),v_user);
    END IF;
    IF v_kind='necessidade' THEN v_needs:=array_append(v_needs,v_text); END IF;
    IF v_kind='habilidade' THEN v_skills:=array_append(v_skills,v_text); END IF;
  END LOOP;
  UPDATE public.people SET
    needs=(SELECT coalesce(array_agg(DISTINCT x),'{}'::text[]) FROM unnest(needs||v_needs) x),
    skills=(SELECT coalesce(array_agg(DISTINCT x),'{}'::text[]) FROM unnest(skills||v_skills) x),
    updated_at=now()
    WHERE id=v_person AND owner_id=v_user;
  IF NOT EXISTS(SELECT 1 FROM public.interactions
    WHERE person_id=v_person AND source_capture_id=p_capture_id) THEN
    INSERT INTO public.interactions(person_id,kind,summary,confidence,source,
      source_capture_id,status,reviewed_by,reviewed_at,author_id)
    VALUES(v_person,'reuniao',left(v_result.summary,1600),0.9,'captura',
      p_capture_id,'aprovado',v_user,now(),v_user);
  END IF;
  INSERT INTO public.capture_analysis_decisions(capture_id,person_index,person_id,owner_id)
  VALUES(p_capture_id,p_person_index,v_person,v_user);
  IF (SELECT count(*) FROM public.capture_analysis_decisions
      WHERE capture_id=p_capture_id)=jsonb_array_length(v_result.proposals->'people') THEN
    UPDATE public.capture_analyses SET status='revisado',updated_at=now()
      WHERE capture_id=p_capture_id;
  END IF;
  RETURN v_person;
END;
$$;
REVOKE ALL ON FUNCTION public.approve_capture_person(uuid,integer,uuid)
 FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.approve_capture_person(uuid,integer,uuid)
 TO authenticated;
