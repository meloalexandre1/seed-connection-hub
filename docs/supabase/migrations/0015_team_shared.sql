-- 0015 · Banco compartilhado do time.
-- Decisão do dono (out/2026): pessoas, capturas e conversas SID são um banco
-- único do time — o que um usuário cadastra aparece para todos os demais.
-- 'privado' continua existindo como exceção consciente (opt-out), não como padrão.

-- 1) Novos registros nascem visíveis para a equipe.
alter table public.people alter column visibility set default 'equipe';
alter table public.captures alter column visibility set default 'equipe';
alter table public.sid_conversations alter column visibility set default 'equipe';

-- 2) Registros existentes passam a ser da equipe (pedido explícito do dono).
update public.people set visibility = 'equipe' where visibility = 'privado';
update public.captures set visibility = 'equipe' where visibility = 'privado';
update public.sid_conversations set visibility = 'equipe' where visibility = 'privado';

-- 3) Análises de captura: qualquer membro que consegue ler a captura
--    consegue ler a análise e as decisões de revisão correspondentes.
drop policy if exists capture_analyses_own_read on public.capture_analyses;
create policy capture_analyses_read on public.capture_analyses for select
to authenticated using (
  exists (select 1 from public.captures c
          where c.id = capture_id
            and private.can_read(c.owner_id, c.visibility, c.project_id))
);

drop policy if exists capture_analysis_decisions_own_read on public.capture_analysis_decisions;
create policy capture_analysis_decisions_read on public.capture_analysis_decisions for select
to authenticated using (
  exists (select 1 from public.capture_analyses a
          join public.captures c on c.id = a.capture_id
          where a.capture_id = capture_analysis_decisions.capture_id
            and private.can_read(c.owner_id, c.visibility, c.project_id))
);

-- 4) Aprovação de pessoa da análise passa a operar sobre o banco do time:
--    pessoas criadas nascem 'equipe', vínculo com ficha existente aceita
--    qualquer pessoa que o revisor consegue ler, e a checagem de duplicata
--    olha o cadastro inteiro (evita duplicar pessoas entre usuários).
create or replace function public.approve_capture_person(
  p_capture_id uuid,
  p_person_index integer,
  p_existing_person_id uuid default null
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := (select auth.uid());
  v_result public.capture_analyses%rowtype;
  v_item jsonb;
  v_fact jsonb;
  v_person uuid;
  v_name text;
  v_kind text;
  v_text text;
  v_facts jsonb;
  v_needs text[] := '{}'::text[];
  v_skills text[] := '{}'::text[];
  v_email text;
  v_phone text;
begin
  if v_user is null then raise exception 'Autenticação necessária'; end if;
  select * into v_result from public.capture_analyses
   where capture_id = p_capture_id and owner_id = v_user for update;
  if not found then raise exception 'Análise não encontrada ou acesso negado'; end if;
  if not exists (select 1 from public.captures c
                 where c.id = p_capture_id
                   and private.can_read(c.owner_id, c.visibility, c.project_id)) then
    raise exception 'Captura não disponível para a sua conta';
  end if;
  if p_person_index < 0 or p_person_index >= jsonb_array_length(v_result.proposals->'people') then
    raise exception 'Pessoa não consta da análise';
  end if;
  select person_id into v_person from public.capture_analysis_decisions
   where capture_id = p_capture_id and person_index = p_person_index and owner_id = v_user;
  if found then return v_person; end if;
  v_item := v_result.proposals->'people'->p_person_index;
  v_name := btrim(v_item->>'name');
  if length(v_name) < 3 or length(v_name) > 130 then
    raise exception 'Nome inválido na análise';
  end if;
  v_email := lower(btrim(coalesce(v_item->>'email','')));
  v_phone := regexp_replace(coalesce(v_item->>'phone',''),'[^0-9]','','g');
  if p_existing_person_id is not null then
    select id into v_person from public.people
     where id = p_existing_person_id
       and private.can_read(owner_id, visibility, project_id);
    if v_person is null then raise exception 'Pessoa selecionada não está disponível'; end if;
  else
    if exists (select 1 from public.people where lower(btrim(name)) = lower(v_name))
       or exists (select 1 from public.contact_methods cm
                  join public.people p on p.id = cm.person_id
                  where (v_email <> '' and cm.kind = 'email' and cm.value_normalized = v_email)
                     or (v_phone <> '' and cm.kind in ('phone','telefone')
                         and regexp_replace(coalesce(cm.value_normalized,''),'[^0-9]','','g') = v_phone)) then
      raise exception 'Possível duplicata: selecione a pessoa existente antes de criar';
    end if;
    insert into public.people(owner_id, name, company, role, source, visibility, context)
      values (v_user, v_name, nullif(v_item->>'organization',''),
              nullif(v_item->>'role',''), 'captura', 'equipe',
              'Identificado após revisão da captura '||p_capture_id::text)
      returning id into v_person;
    if v_email <> '' then
      insert into public.contact_methods(person_id, kind, value_raw, value_normalized)
        values (v_person, 'email', v_email, v_email);
    end if;
    if v_phone <> '' then
      insert into public.contact_methods(person_id, kind, value_raw, value_normalized)
        values (v_person, 'telefone', v_phone, v_phone);
    end if;
  end if;
  v_facts := coalesce(v_item->'facts','[]'::jsonb);
  for v_fact in select value from jsonb_array_elements(v_facts)
  loop
    v_kind := v_fact->>'kind';
    v_text := btrim(v_fact->>'text');
    if v_kind not in ('necessidade','habilidade','contexto','compromisso','oportunidade')
       or length(v_text) < 5 or length(v_text) > 500 then continue; end if;
    if not exists (select 1 from public.facts
      where person_id = v_person and source_capture_id = p_capture_id and kind = v_kind and text = v_text) then
      insert into public.facts(person_id, kind, text, is_inference, confidence, source,
        source_capture_id, status, reviewed_by, reviewed_at, author_id)
      values (v_person, v_kind, v_text, false,
        (v_fact->>'confidence')::numeric, 'captura', p_capture_id, 'aprovado',
        v_user, now(), v_user);
    end if;
    if v_kind = 'necessidade' then v_needs := array_append(v_needs, v_text); end if;
    if v_kind = 'habilidade' then v_skills := array_append(v_skills, v_text); end if;
  end loop;
  update public.people set
    needs = (select coalesce(array_agg(distinct x),'{}'::text[]) from unnest(needs||v_needs) x),
    skills = (select coalesce(array_agg(distinct x),'{}'::text[]) from unnest(skills||v_skills) x),
    updated_at = now()
    where id = v_person;
  if not exists (select 1 from public.interactions
    where person_id = v_person and source_capture_id = p_capture_id) then
    insert into public.interactions(person_id, kind, summary, confidence, source,
      source_capture_id, status, reviewed_by, reviewed_at, author_id)
    values (v_person, 'reuniao', left(v_result.summary,1600), 0.9, 'captura',
      p_capture_id, 'aprovado', v_user, now(), v_user);
  end if;
  insert into public.capture_analysis_decisions(capture_id, person_index, person_id, owner_id)
  values (p_capture_id, p_person_index, v_person, v_user);
  if (select count(*) from public.capture_analysis_decisions
      where capture_id = p_capture_id) = jsonb_array_length(v_result.proposals->'people') then
    update public.capture_analyses set status = 'revisado', updated_at = now()
      where capture_id = p_capture_id;
  end if;
  return v_person;
end;
$$;
revoke all on function public.approve_capture_person(uuid, integer, uuid) from public, anon;
grant execute on function public.approve_capture_person(uuid, integer, uuid) to authenticated;
