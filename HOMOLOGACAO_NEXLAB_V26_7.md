-- NEXLAB v26.7 — Observabilidade, monitoramento e retenção
-- Execute no Supabase Dashboard:
-- SQL Editor > New query > cole todo este conteúdo > Run.
--
-- Pré-requisito recomendado:
-- supabase_v26_4_1_seguranca_integridade_CORRIGIDO.sql
--
-- Esta migration:
-- - é idempotente;
-- - não apaga dados existentes;
-- - cria um repositório técnico de erros do cliente;
-- - não concede INSERT direto na tabela;
-- - aceita registros apenas por RPC autenticada;
-- - limita volume, tamanho e frequência;
-- - disponibiliza resumo somente para Administradores;
-- - não automatiza backup do banco.

begin;

create extension if not exists pgcrypto;

-- -------------------------------------------------------------------
-- 1. Verificação administrativa independente
-- -------------------------------------------------------------------
create or replace function public.nexlab_v267_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth, extensions, pg_temp
as $$
  select exists (
    select 1
      from public.profiles p
     where p.id = auth.uid()
       and lower(coalesce(p.role::text, '')) in ('admin', 'administrador')
       and coalesce(p.ativo, true)
  );
$$;

revoke all on function public.nexlab_v267_is_admin() from public;
revoke all on function public.nexlab_v267_is_admin() from anon;
grant execute on function public.nexlab_v267_is_admin() to authenticated;

-- -------------------------------------------------------------------
-- 2. Tabela técnica de erros do cliente
-- -------------------------------------------------------------------
create table if not exists public.nexlab_client_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  app_version text not null,
  environment text not null default 'production',
  source text not null,
  severity text not null default 'error',
  message text not null,
  stack text null,
  module text null,
  page text null,
  url_path text null,
  user_agent text null,
  metadata jsonb not null default '{}'::jsonb,
  fingerprint text null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.nexlab_client_errors is
  'Erros técnicos e degradações do cliente NEXLAB. Não deve armazenar senhas, tokens ou conteúdo de formulários.';

alter table public.nexlab_client_errors enable row level security;

revoke all on table public.nexlab_client_errors from public;
revoke all on table public.nexlab_client_errors from anon;
revoke all on table public.nexlab_client_errors from authenticated;

drop policy if exists nexlab_client_errors_admin_select on public.nexlab_client_errors;
create policy nexlab_client_errors_admin_select
on public.nexlab_client_errors
for select
to authenticated
using (public.nexlab_v267_is_admin());

-- O acesso operacional ocorre por RPC. O SELECT direto continua bloqueado
-- por privilégio de tabela, mesmo com a policy administrativa.

-- -------------------------------------------------------------------
-- 3. Índices
-- -------------------------------------------------------------------
create index if not exists idx_nexlab_client_errors_created
  on public.nexlab_client_errors (created_at desc);

create index if not exists idx_nexlab_client_errors_user_created
  on public.nexlab_client_errors (user_id, created_at desc);

create index if not exists idx_nexlab_client_errors_version_created
  on public.nexlab_client_errors (app_version, created_at desc);

create index if not exists idx_nexlab_client_errors_severity_created
  on public.nexlab_client_errors (severity, created_at desc);

create index if not exists idx_nexlab_client_errors_module_created
  on public.nexlab_client_errors (module, created_at desc);

create index if not exists idx_nexlab_client_errors_fingerprint_created
  on public.nexlab_client_errors (fingerprint, created_at desc);

-- -------------------------------------------------------------------
-- 4. Registro autenticado, limitado e sanitizado
-- -------------------------------------------------------------------
create or replace function public.nexlab_record_client_error_v26_7(
  p_app_version text,
  p_source text,
  p_severity text,
  p_message text,
  p_stack text default null,
  p_module text default null,
  p_page text default null,
  p_url_path text default null,
  p_user_agent text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_fingerprint text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
  v_metadata jsonb;
  v_recent_count integer;
  v_message text;
  v_stack text;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado.'
      using errcode = '42501';
  end if;

  v_message := left(
    regexp_replace(
      coalesce(nullif(btrim(p_message), ''), 'Erro técnico sem mensagem.'),
      E'[\\r\\n\\t]+',
      ' ',
      'g'
    ),
    1000
  );

  v_stack := nullif(
    left(
      regexp_replace(coalesce(p_stack, ''), E'[\\r\\n]{4,}', E'\\n\\n\\n', 'g'),
      5000
    ),
    ''
  );

  select count(*)
    into v_recent_count
    from public.nexlab_client_errors e
   where e.user_id = v_user_id
     and e.created_at >= now() - interval '1 minute';

  if v_recent_count >= 30 then
    return null;
  end if;

  v_metadata := coalesce(p_metadata, '{}'::jsonb);
  if octet_length(v_metadata::text) > 8000 then
    v_metadata := jsonb_build_object(
      'truncated', true,
      'reason', 'metadata_exceeded_8000_bytes'
    );
  end if;

  insert into public.nexlab_client_errors (
    user_id,
    app_version,
    environment,
    source,
    severity,
    message,
    stack,
    module,
    page,
    url_path,
    user_agent,
    metadata,
    fingerprint,
    occurred_at
  )
  values (
    v_user_id,
    left(coalesce(nullif(btrim(p_app_version), ''), 'unknown'), 40),
    'production',
    left(coalesce(nullif(btrim(p_source), ''), 'client'), 80),
    case lower(coalesce(p_severity, 'error'))
      when 'critical' then 'critical'
      when 'warning' then 'warning'
      when 'info' then 'info'
      else 'error'
    end,
    v_message,
    v_stack,
    nullif(left(btrim(coalesce(p_module, '')), 120), ''),
    nullif(left(btrim(coalesce(p_page, '')), 120), ''),
    nullif(
      left(
        split_part(
          regexp_replace(coalesce(p_url_path, ''), E'[\\r\\n\\t]+', '', 'g'),
          '?',
          1
        ),
        500
      ),
      ''
    ),
    nullif(left(btrim(coalesce(p_user_agent, '')), 500), ''),
    v_metadata,
    nullif(left(btrim(coalesce(p_fingerprint, '')), 160), ''),
    now()
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.nexlab_record_client_error_v26_7(
  text, text, text, text, text, text, text, text, text, jsonb, text
) from public;

revoke all on function public.nexlab_record_client_error_v26_7(
  text, text, text, text, text, text, text, text, text, jsonb, text
) from anon;

grant execute on function public.nexlab_record_client_error_v26_7(
  text, text, text, text, text, text, text, text, text, jsonb, text
) to authenticated;

-- -------------------------------------------------------------------
-- 5. Resumo administrativo
-- -------------------------------------------------------------------
create or replace function public.nexlab_get_observability_summary_v26_7(
  p_hours integer default 24
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  v_hours integer := greatest(1, least(coalesce(p_hours, 24), 720));
  v_since timestamptz;
  v_total bigint;
  v_critical bigint;
  v_error bigint;
  v_warning bigint;
  v_users bigint;
  v_latest timestamptz;
  v_top_modules jsonb;
  v_versions jsonb;
  v_latest_errors jsonb;
begin
  if not public.nexlab_v267_is_admin() then
    raise exception 'Acesso restrito ao Administrador do NEXLAB.'
      using errcode = '42501';
  end if;

  v_since := now() - make_interval(hours => v_hours);

  select
    count(*),
    count(*) filter (where severity = 'critical'),
    count(*) filter (where severity = 'error'),
    count(*) filter (where severity = 'warning'),
    count(distinct user_id),
    max(created_at)
  into
    v_total,
    v_critical,
    v_error,
    v_warning,
    v_users,
    v_latest
  from public.nexlab_client_errors
  where created_at >= v_since;

  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
    into v_top_modules
    from (
      select coalesce(nullif(module, ''), 'não identificado') as module,
             count(*)::bigint as total
        from public.nexlab_client_errors
       where created_at >= v_since
       group by 1
       order by total desc, module
       limit 8
    ) x;

  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
    into v_versions
    from (
      select app_version,
             count(*)::bigint as total
        from public.nexlab_client_errors
       where created_at >= v_since
       group by app_version
       order by total desc, app_version desc
       limit 8
    ) x;

  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
    into v_latest_errors
    from (
      select id,
             app_version,
             source,
             severity,
             left(message, 240) as message,
             module,
             page,
             fingerprint,
             created_at
        from public.nexlab_client_errors
       where created_at >= v_since
       order by created_at desc
       limit 10
    ) x;

  return jsonb_build_object(
    'version', '26.7',
    'period_hours', v_hours,
    'since', v_since,
    'generated_at', now(),
    'total', coalesce(v_total, 0),
    'critical', coalesce(v_critical, 0),
    'errors', coalesce(v_error, 0),
    'warnings', coalesce(v_warning, 0),
    'affected_users', coalesce(v_users, 0),
    'latest_event_at', v_latest,
    'top_modules', v_top_modules,
    'app_versions', v_versions,
    'latest_errors', v_latest_errors
  );
end;
$$;

revoke all on function public.nexlab_get_observability_summary_v26_7(integer) from public;
revoke all on function public.nexlab_get_observability_summary_v26_7(integer) from anon;
grant execute on function public.nexlab_get_observability_summary_v26_7(integer) to authenticated;

-- -------------------------------------------------------------------
-- 6. Retenção manual administrativa
-- -------------------------------------------------------------------
create or replace function public.nexlab_cleanup_client_errors_v26_7(
  p_keep_days integer default 90
)
returns integer
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  v_keep_days integer := greatest(30, least(coalesce(p_keep_days, 90), 365));
  v_deleted integer := 0;
begin
  if not public.nexlab_v267_is_admin() then
    raise exception 'Acesso restrito ao Administrador do NEXLAB.'
      using errcode = '42501';
  end if;

  delete from public.nexlab_client_errors
   where created_at < now() - make_interval(days => v_keep_days);

  get diagnostics v_deleted = row_count;
  return coalesce(v_deleted, 0);
end;
$$;

revoke all on function public.nexlab_cleanup_client_errors_v26_7(integer) from public;
revoke all on function public.nexlab_cleanup_client_errors_v26_7(integer) from anon;
grant execute on function public.nexlab_cleanup_client_errors_v26_7(integer) to authenticated;

-- -------------------------------------------------------------------
-- 7. Verificação de instalação
-- -------------------------------------------------------------------
create or replace function public.nexlab_observability_readiness_v26_7()
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  v_rls boolean := false;
  v_policy_count integer := 0;
  v_indexes integer := 0;
begin
  if not public.nexlab_v267_is_admin() then
    raise exception 'Acesso restrito ao Administrador do NEXLAB.'
      using errcode = '42501';
  end if;

  select c.relrowsecurity
    into v_rls
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname = 'nexlab_client_errors';

  select count(*)
    into v_policy_count
    from pg_policy p
   where p.polrelid = 'public.nexlab_client_errors'::regclass;

  select count(*)
    into v_indexes
    from pg_indexes i
   where i.schemaname = 'public'
     and i.tablename = 'nexlab_client_errors'
     and i.indexname like 'idx_nexlab_client_errors_%';

  return jsonb_build_object(
    'version', '26.7',
    'table_exists', to_regclass('public.nexlab_client_errors') is not null,
    'rls_enabled', coalesce(v_rls, false),
    'policy_count', v_policy_count,
    'index_count', v_indexes,
    'record_rpc_exists',
      to_regprocedure(
        'public.nexlab_record_client_error_v26_7(text,text,text,text,text,text,text,text,text,jsonb,text)'
      ) is not null,
    'summary_rpc_exists',
      to_regprocedure('public.nexlab_get_observability_summary_v26_7(integer)') is not null,
    'cleanup_rpc_exists',
      to_regprocedure('public.nexlab_cleanup_client_errors_v26_7(integer)') is not null,
    'generated_at', now()
  );
end;
$$;

revoke all on function public.nexlab_observability_readiness_v26_7() from public;
revoke all on function public.nexlab_observability_readiness_v26_7() from anon;
grant execute on function public.nexlab_observability_readiness_v26_7() to authenticated;

-- -------------------------------------------------------------------
-- 8. Registro opcional da versão
-- -------------------------------------------------------------------
do $$
declare
  v_columns integer;
begin
  if to_regclass('public.nexlab_app_versions') is null then
    raise notice 'Tabela public.nexlab_app_versions não existe; registro da versão ignorado.';
    return;
  end if;

  select count(*)
    into v_columns
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'nexlab_app_versions'
     and column_name = any (array[
       'version',
       'title',
       'release_status',
       'notes',
       'installed_at'
     ]);

  if v_columns < 5 then
    raise notice 'Estrutura de nexlab_app_versions diferente da esperada; registro ignorado.';
    return;
  end if;

  begin
    insert into public.nexlab_app_versions (
      version,
      title,
      release_status,
      notes,
      installed_at
    )
    select
      '26.7',
      'Monitoramento e Prontidão Final',
      'stable',
      'Observabilidade autenticada, resumo administrativo, retenção e documentação de recuperação.',
      now()
    where not exists (
      select 1
        from public.nexlab_app_versions
       where version = '26.7'
    );
  exception
    when others then
      raise notice 'Registro opcional da versão ignorado: %', sqlerrm;
  end;
end
$$;

commit;
