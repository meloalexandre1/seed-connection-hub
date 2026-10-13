-- Seed Connection: align evidence-backed AI categories with CRM database.
-- Additive constraint expansion; preserves every existing fact and user record.
BEGIN;
ALTER TABLE public.facts DROP CONSTRAINT IF EXISTS facts_kind_check;
ALTER TABLE public.facts ADD CONSTRAINT facts_kind_check
  CHECK (kind = ANY (ARRAY[
    'necessidade','habilidade','recurso','outro',
    'contexto','compromisso','oportunidade'
  ]::text[]));
COMMIT;
