-- NEXLAB v26.30.4 — R55.4
-- Homologação integrada e consolidação do backend das R55.0, R55.1 e R55.2.
-- Script idempotente. Pode ser reaplicado com segurança.

create extension if not exists pgcrypto;

-- =============================================================================
-- R55.0 — Permissões efetivas, delegação individual e dados protegidos
-- =============================================================================

do $$
begin
  if to_regclass('public.profiles') is null
     or to_regclass('public.profile_sensitive') is null
     or to_regclass('public.nexlab_permission_catalog') is null
     or to_regclass('public.nexlab_role_permission_defaults') is null
     or to_regclass('public.nexlab_user_permission_overrides') is null
  then
    raise exception 'A estrutura de perfis, dados protegidos ou permissões do NEXLAB não está instalada.';
  end if;

  if to_regprocedure('public.nexlab_recalculate_all_permissions()') is null then
    raise exception 'A função nexlab_recalculate_all_permissions() não está instalada.';
  end if;

  if to_regprocedure('public.record_security_audit(text,text,jsonb)') is null then
    raise exception 'A auditoria de segurança do NEXLAB não está instalada.';
  end if;
end
$$;

update public.nexlab_permission_catalog
set
  label = 'Usuários e vínculos',
  description = 'Consulta a lista de usuários e vínculos. Alterações administrativas continuam restritas a Administradores.',
  category = 'Administração',
  module_id = 'participantes',
  core = false,
  admin_only = false,
  grantable = true,
  eligible_roles = array['admin','coordenador','bolsista','coworking_junior']::text[],
  sort_order = 410,
  active = true,
  updated_at = now()
where permission_key = 'module_participantes';

insert into public.nexlab_permission_catalog (
  permission_key, label, description, category, module_id,
  core, admin_only, grantable, eligible_roles, sort_order, active, updated_at
)
values
  (
    'users_sensitive_view',
    'Visualizar dados pessoais protegidos',
    'Permite consultar CPF, data de nascimento e demais dados pessoais protegidos de um usuário. Toda consulta é individual e auditada.',
    'Administração', 'participantes', false, false, true,
    array['admin','coordenador','bolsista','coworking_junior']::text[], 415, true, now()
  ),
  (
    'users_manage_profiles',
    'Administrar perfis e vínculos',
    'Altera perfil-base, situação da conta e dados cadastrais de outros usuários.',
    'Administração crítica', 'participantes', false, true, false,
    array['admin']::text[], 420, true, now()
  ),
  (
    'users_delete_accounts',
    'Excluir contas de usuários',
    'Exclusão permanente de contas e dados relacionados.',
    'Administração crítica', 'participantes', false, true, false,
    array['admin']::text[], 425, true, now()
  ),
  (
    'permissions_manage_matrix',
    'Alterar a matriz de permissões',
    'Concede, revoga e restaura permissões de perfis e usuários.',
    'Administração crítica', 'permissoes', false, true, false,
    array['admin']::text[], 430, true, now()
  )
on conflict (permission_key) do update
set
  label = excluded.label,
  description = excluded.description,
  category = excluded.category,
  module_id = excluded.module_id,
  core = excluded.core,
  admin_only = excluded.admin_only,
  grantable = excluded.grantable,
  eligible_roles = excluded.eligible_roles,
  sort_order = excluded.sort_order,
  active = excluded.active,
  updated_at = now();

insert into public.nexlab_role_permission_defaults (
  role_key, permission_key, allowed, updated_at
)
select
  role_data.role_key,
  permission_data.permission_key,
  case
    when permission_data.permission_key = 'module_participantes'
      then role_data.role_key in ('admin','coordenador')
    when permission_data.permission_key = 'users_sensitive_view'
      then role_data.role_key in ('admin','coordenador')
    when permission_data.permission_key in (
      'users_manage_profiles','users_delete_accounts','permissions_manage_matrix'
    ) then role_data.role_key = 'admin'
    else false
  end,
  now()
from (values ('admin'),('coordenador'),('bolsista'),('coworking_junior')) as role_data(role_key)
cross join (
  values
    ('module_participantes'),
    ('users_sensitive_view'),
    ('users_manage_profiles'),
    ('users_delete_accounts'),
    ('permissions_manage_matrix')
) as permission_data(permission_key)
on conflict (role_key, permission_key) do update
set allowed = excluded.allowed, updated_at = now();

create or replace function public.nexlab_get_sensitive_user_profile_v2700(
  p_target_user_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_profile record;
  target_result jsonb;
  can_view boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  if nullif(btrim(coalesce(p_target_user_id, '')), '') is null then
    raise exception 'Usuário de destino não informado.' using errcode = '22023';
  end if;

  select
    lower(coalesce(p.role::text, '')) as role_key,
    coalesce(p.ativo, true) as active,
    coalesce(p.cadastro_completo, false) as complete,
    lower(coalesce(p.role_request_status::text, 'approved')) as request_status,
    coalesce(p.effective_permissions, '{}'::text[]) as permissions
  into actor_profile
  from public.profiles p
  where p.id = auth.uid()
  limit 1;

  if not found
     or not actor_profile.active
     or not actor_profile.complete
     or actor_profile.request_status in ('pending','rejected','cancelled')
  then
    raise exception 'Perfil sem acesso ativo ao NEXLAB.' using errcode = '42501';
  end if;

  can_view :=
    actor_profile.role_key in ('admin','administrador','coordenador')
    or 'users_sensitive_view' = any(actor_profile.permissions);

  if not can_view then
    raise exception 'Sem permissão para consultar dados pessoais protegidos.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'id', p.id,
    'nome', p.nome,
    'email', p.email,
    'curso', p.curso,
    'matricula', p.matricula,
    'role', p.role::text,
    'ativo', p.ativo,
    'cadastro_completo', p.cadastro_completo,
    'telefone', nullif(to_jsonb(p)->>'telefone',''),
    'bio', nullif(to_jsonb(p)->>'bio',''),
    'habilidades', nullif(to_jsonb(p)->>'habilidades',''),
    'cpf', nullif(to_jsonb(ps)->>'cpf',''),
    'data_nascimento', nullif(to_jsonb(ps)->>'data_nascimento',''),
    'profile_sensitive_updated_at', nullif(to_jsonb(ps)->>'updated_at','')
  )
  into target_result
  from public.profiles p
  left join public.profile_sensitive ps on ps.id = p.id
  where p.id::text = btrim(p_target_user_id)
  limit 1;

  if target_result is null then
    raise exception 'Usuário não encontrado.' using errcode = 'P0002';
  end if;

  perform public.record_security_audit(
    'sensitive_user_profile_viewed',
    btrim(p_target_user_id),
    jsonb_build_object(
      'source', 'participants_r554',
      'viewer_role', actor_profile.role_key,
      'delegated_access', actor_profile.role_key not in ('admin','administrador','coordenador')
    )
  );

  return jsonb_build_object('ok', true, 'profile', target_result, 'audited', true);
end;
$$;

revoke all on function public.nexlab_get_sensitive_user_profile_v2700(text) from public;
grant execute on function public.nexlab_get_sensitive_user_profile_v2700(text) to authenticated;

select public.nexlab_recalculate_all_permissions();

-- =============================================================================
-- R55.1 — Agenda íntegra e validada
-- =============================================================================

create or replace function public.nexlab_get_agenda_range_v2701(
  p_date_from text,
  p_date_to text
)
returns jsonb
language plpgsql
security invoker
set search_path = public, auth
as $$
declare
  v_date_from date;
  v_date_to date;
  v_payload jsonb;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  begin
    v_date_from := nullif(btrim(coalesce(p_date_from, '')), '')::date;
    v_date_to := nullif(btrim(coalesce(p_date_to, '')), '')::date;
  exception when others then
    return jsonb_build_object('ok', false, 'error', 'Período inválido para a Agenda.', 'error_code', 'INVALID_DATE_RANGE');
  end;

  if v_date_from is null or v_date_to is null or v_date_to < v_date_from then
    return jsonb_build_object('ok', false, 'error', 'Período inválido para a Agenda.', 'error_code', 'INVALID_DATE_RANGE');
  end if;

  if (v_date_to - v_date_from) > 120 then
    return jsonb_build_object('ok', false, 'error', 'O intervalo da Agenda excede o limite permitido.', 'error_code', 'DATE_RANGE_TOO_LARGE');
  end if;

  if to_regprocedure('public.nexlab_get_agenda_range_v2690(date,date)') is not null then
    execute 'select to_jsonb(public.nexlab_get_agenda_range_v2690($1::date,$2::date))'
      into v_payload using v_date_from, v_date_to;
  elsif to_regprocedure('public.nexlab_get_agenda_range_v2690(text,text)') is not null then
    execute 'select to_jsonb(public.nexlab_get_agenda_range_v2690($1::text,$2::text))'
      into v_payload using v_date_from::text, v_date_to::text;
  else
    return jsonb_build_object('ok', false, 'error', 'A função-base da Agenda não foi encontrada.', 'error_code', 'AGENDA_BASE_RPC_MISSING');
  end if;

  if v_payload is null or jsonb_typeof(v_payload) <> 'object' then
    return jsonb_build_object('ok', false, 'error', 'A Agenda retornou uma resposta inválida.', 'error_code', 'INVALID_AGENDA_RESPONSE');
  end if;

  if v_payload ? 'ok' and lower(coalesce(v_payload->>'ok','false')) <> 'true' then
    return v_payload || jsonb_build_object('ok', false);
  end if;

  return v_payload || jsonb_build_object(
    'ok', true,
    'range', jsonb_build_object('date_from',v_date_from,'date_to',v_date_to),
    'server_generated_at', now()
  );
exception
  when insufficient_privilege then raise;
  when others then
    return jsonb_build_object('ok', false, 'error', 'Não foi possível carregar a Agenda.', 'error_code', sqlstate);
end;
$$;

revoke all on function public.nexlab_get_agenda_range_v2701(text,text) from public;
grant execute on function public.nexlab_get_agenda_range_v2701(text,text) to authenticated;

-- =============================================================================
-- R55.2 — Notificações consistentes e automações pessoais
-- =============================================================================

create or replace function public.nexlab_set_notification_channel_v2702(
  p_channel text,
  p_enabled boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  v_channel text := lower(btrim(coalesce(p_channel, '')));
  v_changed integer := 0;
  v_rows jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado.' using errcode='42501'; end if;
  if p_enabled is null then return jsonb_build_object('ok',false,'error','O estado do canal não foi informado.','error_code','CHANNEL_STATE_REQUIRED'); end if;
  if v_channel not in ('push','email','internal') then return jsonb_build_object('ok',false,'error','Canal de notificação inválido.','error_code','INVALID_NOTIFICATION_CHANNEL'); end if;

  perform public.nexlab_ensure_notification_preferences();

  if v_channel='push' then
    update public.notification_preferences set push_enabled=p_enabled, updated_at=now() where user_id=auth.uid();
  elsif v_channel='email' then
    update public.notification_preferences set email_enabled=p_enabled, updated_at=now() where user_id=auth.uid();
  else
    update public.notification_preferences set internal_enabled=p_enabled, updated_at=now() where user_id=auth.uid();
  end if;
  get diagnostics v_changed = row_count;

  select coalesce(jsonb_agg(to_jsonb(preference) order by preference.notification_type),'[]'::jsonb)
    into v_rows
  from public.notification_preferences preference
  where preference.user_id=auth.uid();

  if jsonb_array_length(v_rows)=0 then
    return jsonb_build_object('ok',false,'error','Nenhuma preferência de notificação foi encontrada.','error_code','NOTIFICATION_PREFERENCES_NOT_FOUND');
  end if;

  return jsonb_build_object('ok',true,'channel',v_channel,'enabled',p_enabled,'changed_count',v_changed,'rule_count',jsonb_array_length(v_rows),'rows',v_rows);
end;
$$;

revoke all on function public.nexlab_set_notification_channel_v2702(text,boolean) from public;
grant execute on function public.nexlab_set_notification_channel_v2702(text,boolean) to authenticated;

create or replace function public.nexlab_notification_bulk_action_v2702(
  p_ids text[],
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  v_action text := lower(btrim(coalesce(p_action,'')));
  v_ids uuid[] := '{}'::uuid[];
  v_requested_ids text[] := '{}'::text[];
  v_affected_ids text[] := '{}'::text[];
  v_missing_ids text[] := '{}'::text[];
  v_requested_count integer := 0;
  v_affected_count integer := 0;
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado.' using errcode='42501'; end if;
  if v_action not in ('read','unread','archive','restore','delete') then
    return jsonb_build_object('ok',false,'error','Ação de notificação inválida.','error_code','INVALID_NOTIFICATION_ACTION');
  end if;

  select coalesce(array_agg(distinct value::uuid),'{}'::uuid[])
    into v_ids
  from unnest(coalesce(p_ids,'{}'::text[])) value
  where value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

  select coalesce(array_agg(value::text order by value::text),'{}'::text[])
    into v_requested_ids
  from unnest(v_ids) value;

  v_requested_count := coalesce(array_length(v_requested_ids,1),0);
  if v_requested_count=0 then
    return jsonb_build_object('ok',false,'error','Nenhuma notificação válida foi informada.','error_code','EMPTY_NOTIFICATION_SELECTION','requested_count',0,'affected_count',0,'affected_ids','[]'::jsonb,'missing_ids','[]'::jsonb);
  end if;

  if v_action='delete' then
    delete from public.notification_deliveries delivery
    using public.notifications notification
    where delivery.notification_id=notification.id
      and notification.recipient_id=auth.uid()
      and notification.id=any(v_ids);

    with affected as (
      delete from public.notifications notification
      where notification.recipient_id=auth.uid() and notification.id=any(v_ids)
      returning notification.id::text as id
    ) select coalesce(array_agg(id order by id),'{}'::text[]) into v_affected_ids from affected;
  elsif v_action='read' then
    with affected as (
      update public.notifications notification
      set is_read=true, read_at=coalesce(notification.read_at,now()), updated_at=now()
      where notification.recipient_id=auth.uid() and notification.id=any(v_ids)
      returning notification.id::text as id
    ) select coalesce(array_agg(id order by id),'{}'::text[]) into v_affected_ids from affected;
  elsif v_action='unread' then
    with affected as (
      update public.notifications notification
      set is_read=false, read_at=null, updated_at=now()
      where notification.recipient_id=auth.uid() and notification.id=any(v_ids)
      returning notification.id::text as id
    ) select coalesce(array_agg(id order by id),'{}'::text[]) into v_affected_ids from affected;
  elsif v_action='archive' then
    with affected as (
      update public.notifications notification
      set archived_at=coalesce(notification.archived_at,now()), updated_at=now()
      where notification.recipient_id=auth.uid() and notification.id=any(v_ids)
      returning notification.id::text as id
    ) select coalesce(array_agg(id order by id),'{}'::text[]) into v_affected_ids from affected;
  else
    with affected as (
      update public.notifications notification
      set archived_at=null, updated_at=now()
      where notification.recipient_id=auth.uid() and notification.id=any(v_ids)
      returning notification.id::text as id
    ) select coalesce(array_agg(id order by id),'{}'::text[]) into v_affected_ids from affected;
  end if;

  v_affected_count := coalesce(array_length(v_affected_ids,1),0);
  select coalesce(array_agg(requested_id order by requested_id),'{}'::text[])
    into v_missing_ids
  from unnest(v_requested_ids) requested_id
  where not (requested_id=any(v_affected_ids));

  return jsonb_build_object(
    'ok',true,'action',v_action,
    'requested_count',v_requested_count,'affected_count',v_affected_count,
    'requested_ids',to_jsonb(v_requested_ids),'affected_ids',to_jsonb(v_affected_ids),
    'missing_ids',to_jsonb(v_missing_ids),'partial',v_affected_count<>v_requested_count
  );
end;
$$;

revoke all on function public.nexlab_notification_bulk_action_v2702(text[],text) from public;
grant execute on function public.nexlab_notification_bulk_action_v2702(text[],text) to authenticated;

create or replace function public.nexlab_save_notification_user_settings_v2702(
  p_quiet_hours_enabled boolean,
  p_quiet_start text,
  p_quiet_end text,
  p_timezone text,
  p_reservation_reminder_minutes integer[],
  p_meeting_reminder_minutes integer[]
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  v_quiet_start time;
  v_quiet_end time;
  v_timezone text := nullif(btrim(coalesce(p_timezone,'')),'');
  v_allowed_minutes integer[] := array[15,30,60,120,1440,2880];
  v_reservation_minutes integer[] := '{}'::integer[];
  v_meeting_minutes integer[] := '{}'::integer[];
  v_settings public.notification_user_settings%rowtype;
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado.' using errcode='42501'; end if;
  begin
    v_quiet_start := nullif(btrim(coalesce(p_quiet_start,'')),'')::time;
    v_quiet_end := nullif(btrim(coalesce(p_quiet_end,'')),'')::time;
  exception when others then
    return jsonb_build_object('ok',false,'error','O horário informado é inválido.','error_code','INVALID_QUIET_HOURS');
  end;

  if v_quiet_start is null or v_quiet_end is null then
    return jsonb_build_object('ok',false,'error','Informe o início e o fim do período Não perturbe.','error_code','QUIET_HOURS_REQUIRED');
  end if;
  if coalesce(p_quiet_hours_enabled,false) and v_quiet_start=v_quiet_end then
    return jsonb_build_object('ok',false,'error','O início e o fim do período Não perturbe precisam ser diferentes.','error_code','QUIET_HOURS_EQUAL');
  end if;
  if v_timezone is null or not exists(select 1 from pg_timezone_names tz where tz.name=v_timezone) then
    return jsonb_build_object('ok',false,'error','O fuso horário informado é inválido.','error_code','INVALID_TIMEZONE');
  end if;

  select coalesce(array_agg(distinct value order by value),'{}'::integer[])
    into v_reservation_minutes
  from unnest(coalesce(p_reservation_reminder_minutes,'{}'::integer[])) value
  where value=any(v_allowed_minutes);

  select coalesce(array_agg(distinct value order by value),'{}'::integer[])
    into v_meeting_minutes
  from unnest(coalesce(p_meeting_reminder_minutes,'{}'::integer[])) value
  where value=any(v_allowed_minutes);

  perform public.nexlab_ensure_notification_user_settings();

  insert into public.notification_user_settings(
    user_id,quiet_hours_enabled,quiet_start,quiet_end,timezone,
    reservation_reminder_minutes,meeting_reminder_minutes,updated_at
  ) values (
    auth.uid(),coalesce(p_quiet_hours_enabled,false),v_quiet_start,v_quiet_end,v_timezone,
    v_reservation_minutes,v_meeting_minutes,now()
  )
  on conflict(user_id) do update set
    quiet_hours_enabled=excluded.quiet_hours_enabled,
    quiet_start=excluded.quiet_start,
    quiet_end=excluded.quiet_end,
    timezone=excluded.timezone,
    reservation_reminder_minutes=excluded.reservation_reminder_minutes,
    meeting_reminder_minutes=excluded.meeting_reminder_minutes,
    updated_at=now()
  returning * into v_settings;

  return jsonb_build_object('ok',true,'settings',to_jsonb(v_settings));
end;
$$;

revoke all on function public.nexlab_save_notification_user_settings_v2702(boolean,text,text,text,integer[],integer[]) from public;
grant execute on function public.nexlab_save_notification_user_settings_v2702(boolean,text,text,text,integer[],integer[]) to authenticated;

-- =============================================================================
-- R55.4 — Diagnóstico de prontidão e registro final
-- =============================================================================

create or replace function public.nexlab_runtime_readiness_v2704()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_role text;
  v_checks jsonb;
  v_ok boolean;
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado.' using errcode='42501'; end if;

  select lower(coalesce(role::text,'')) into v_role
  from public.profiles where id=auth.uid() limit 1;

  select jsonb_build_object(
    'permissions_rpc', to_regprocedure('public.nexlab_get_sensitive_user_profile_v2700(text)') is not null,
    'agenda_rpc', to_regprocedure('public.nexlab_get_agenda_range_v2701(text,text)') is not null,
    'notification_channel_rpc', to_regprocedure('public.nexlab_set_notification_channel_v2702(text,boolean)') is not null,
    'notification_bulk_rpc', to_regprocedure('public.nexlab_notification_bulk_action_v2702(text[],text)') is not null,
    'notification_settings_rpc', to_regprocedure('public.nexlab_save_notification_user_settings_v2702(boolean,text,text,text,integer[],integer[])') is not null,
    'coordinator_users_access', exists(
      select 1 from public.nexlab_role_permission_defaults
      where role_key='coordenador' and permission_key='module_participantes' and allowed
    ),
    'coordinator_sensitive_access', exists(
      select 1 from public.nexlab_role_permission_defaults
      where role_key='coordenador' and permission_key='users_sensitive_view' and allowed
    ),
    'critical_admin_only', not exists(
      select 1 from public.nexlab_role_permission_defaults
      where role_key<>'admin'
        and permission_key in ('users_manage_profiles','users_delete_accounts','permissions_manage_matrix')
        and allowed
    )
  ) into v_checks;

  select bool_and(value::boolean) into v_ok
  from jsonb_each_text(v_checks);

  return jsonb_build_object(
    'ok',coalesce(v_ok,false),
    'version','26.30.4',
    'role',v_role,
    'checks',v_checks,
    'checked_at',now()
  );
end;
$$;

revoke all on function public.nexlab_runtime_readiness_v2704() from public;
grant execute on function public.nexlab_runtime_readiness_v2704() to authenticated;

insert into public.nexlab_app_versions(version,title,release_status,notes)
values
  ('26.30.0','R55.0 — Permissões efetivas e delegação individual','stable','Permissões efetivas, delegação granular e consulta auditada de dados protegidos.'),
  ('26.30.1','R55.1 — Integridade e confiabilidade da Agenda','stable','Agenda com intervalo validado, cache por período, proteção contra respostas fora de ordem e Realtime recuperável.'),
  ('26.30.2','R55.2 — Consistência e automações pessoais de Notificações','stable','Canais preservados, ações confirmadas e automações pessoais para todos os usuários.'),
  ('26.30.4','R55.4 — Homologação integrada e correções finais','stable','Consolida o backend R55, adiciona diagnóstico de prontidão e valida permissões, Agenda e Notificações.')
on conflict(version) do update set
  title=excluded.title,
  release_status=excluded.release_status,
  notes=excluded.notes,
  installed_at=now();

notify pgrst, 'reload schema';

-- Validação administrativa após aplicação:
select
  to_regprocedure('public.nexlab_get_sensitive_user_profile_v2700(text)') is not null as r550_ok,
  to_regprocedure('public.nexlab_get_agenda_range_v2701(text,text)') is not null as r551_ok,
  to_regprocedure('public.nexlab_set_notification_channel_v2702(text,boolean)') is not null as r552_canal_ok,
  to_regprocedure('public.nexlab_notification_bulk_action_v2702(text[],text)') is not null as r552_acoes_ok,
  to_regprocedure('public.nexlab_save_notification_user_settings_v2702(boolean,text,text,text,integer[],integer[])') is not null as r552_automacoes_ok,
  to_regprocedure('public.nexlab_runtime_readiness_v2704()') is not null as r554_prontidao_ok;
