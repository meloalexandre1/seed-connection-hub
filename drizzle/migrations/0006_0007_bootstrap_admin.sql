-- 0007 · Bootstrap auditável do primeiro administrador.
-- Executável SOMENTE pelo proprietário (via ferramenta de SQL do backend, role postgres).
-- Uso, após convidar o proprietário em Users:
--   select private.bootstrap_first_admin('email-do-proprietario@exemplo.com');

create or replace function private.bootstrap_first_admin(_email text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid;
begin
  if exists (select 1 from public.user_roles where role = 'admin') then
    raise exception 'Já existe administrador; use o fluxo normal de convites';
  end if;
  select id into uid from auth.users where lower(email) = lower(_email);
  if uid is null then raise exception 'Usuário não encontrado; convide-o primeiro'; end if;
  insert into public.user_roles(user_id, role, granted_by) values (uid, 'admin', uid);
  insert into public.audit_log(actor_id, table_name, row_id, action, changed_columns)
  values (uid, 'user_roles', uid::text, 'BOOTSTRAP_ADMIN', array['role']);
  return uid;
end $$;
revoke all on function private.bootstrap_first_admin(text) from public, anon, authenticated, service_role;