-- 0006 · Políticas padronizadas, triggers (updated_at, owner, auditoria) e Storage privado.
-- Buckets 'captures' e 'sid-attachments' foram criados via Storage API (não por SQL).

-- Tabelas com dono + visibilidade.
do $$
declare t text;
begin
  foreach t in array array['projects','people','captures','opportunities','tasks','sid_conversations'] loop
    execute format('drop policy if exists %1$s_select on public.%1$I', t);
    execute format('create policy %1$s_select on public.%1$I for select to authenticated
      using (private.can_read(owner_id, visibility, project_id))', t);
    execute format('drop policy if exists %1$s_insert on public.%1$I', t);
    execute format('create policy %1$s_insert on public.%1$I for insert to authenticated
      with check (private.is_member() and owner_id = (select auth.uid())
        and (visibility <> %2$L or %3$s))', t, 'projeto',
      case when t = 'projects' then 'true' else 'private.is_project_member(project_id)' end);
    execute format('drop policy if exists %1$s_update on public.%1$I', t);
    execute format('create policy %1$s_update on public.%1$I for update to authenticated
      using (private.can_write(owner_id, visibility, project_id))
      with check (private.can_write(owner_id, visibility, project_id))', t);
    execute format('drop policy if exists %1$s_delete on public.%1$I', t);
    execute format('create policy %1$s_delete on public.%1$I for delete to authenticated
      using (private.can_delete(owner_id, visibility, project_id))', t);
    execute format('drop trigger if exists trg_protect_owner on public.%I', t);
    execute format('create trigger trg_protect_owner before update on public.%I
      for each row execute function private.protect_owner()', t);
  end loop;
end $$;

-- Tabelas filhas de pessoa / captura: herdam acesso do registro pai.
do $$
declare r record;
begin
  for r in select * from (values
      ('contact_methods','person_id','person'),
      ('people_organizations','person_id','person'),
      ('interactions','person_id','person'),
      ('facts','person_id','person'),
      ('transcripts','capture_id','capture')) v(tbl, col, parent) loop
    execute format('drop policy if exists %1$s_select on public.%1$I', r.tbl);
    execute format('create policy %1$s_select on public.%1$I for select to authenticated
      using (private.can_read_%3$s(%2$I))', r.tbl, r.col, r.parent);
    execute format('drop policy if exists %1$s_write on public.%1$I', r.tbl);
    execute format('create policy %1$s_write on public.%1$I for all to authenticated
      using (private.can_write_%3$s(%2$I)) with check (private.can_write_%3$s(%2$I))', r.tbl, r.col, r.parent);
  end loop;
end $$;

-- updated_at
do $$
declare t text;
begin
  foreach t in array array['projects','people','contact_methods','organizations','relationships',
    'sid_conversations','captures','transcripts','processing_jobs','interactions','facts',
    'opportunities','tasks','followups','imports'] loop
    execute format('drop trigger if exists trg_updated_at on public.%I', t);
    execute format('create trigger trg_updated_at before update on public.%I
      for each row execute function private.set_updated_at()', t);
  end loop;
end $$;

-- Auditoria
do $$
declare t text;
begin
  foreach t in array array['user_roles','projects','project_members','people','contact_methods',
    'relationships','captures','facts','interactions','opportunities','tasks','followups',
    'imports','sid_conversations','message_attachments'] loop
    execute format('drop trigger if exists trg_audit on public.%I', t);
    execute format('create trigger trg_audit after insert or update or delete on public.%I
      for each row execute function private.audit()', t);
  end loop;
end $$;

-- ===== Storage: políticas em storage.objects =====
create or replace function private.can_read_object(_bucket text, _name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select case _bucket
    when 'captures' then exists (select 1 from public.captures c where c.storage_path = _name
                                 and private.can_read(c.owner_id, c.visibility, c.project_id))
    when 'sid-attachments' then exists (select 1 from public.message_attachments a where a.storage_path = _name
                                 and private.can_read_message(a.message_id))
    else false end $$;
revoke execute on function private.can_read_object(text, text) from public, anon;
grant execute on function private.can_read_object(text, text) to authenticated;

-- Upload apenas na pasta <auth.uid()>/...
drop policy if exists seed_objects_insert on storage.objects;
create policy seed_objects_insert on storage.objects for insert to authenticated
  with check (bucket_id in ('captures','sid-attachments') and private.is_member()
              and (storage.foldername(name))[1] = (select auth.uid())::text);
-- Leitura: próprio arquivo, ou arquivo referenciado por registro que o usuário pode ler.
drop policy if exists seed_objects_select on storage.objects;
create policy seed_objects_select on storage.objects for select to authenticated
  using (bucket_id in ('captures','sid-attachments') and private.is_member()
         and ((storage.foldername(name))[1] = (select auth.uid())::text
              or private.can_read_object(bucket_id, name)));
-- Exclusão: só o dono do arquivo. Sem UPDATE (arquivos imutáveis).
drop policy if exists seed_objects_delete on storage.objects;
create policy seed_objects_delete on storage.objects for delete to authenticated
  using (bucket_id in ('captures','sid-attachments') and private.is_member()
         and (storage.foldername(name))[1] = (select auth.uid())::text);