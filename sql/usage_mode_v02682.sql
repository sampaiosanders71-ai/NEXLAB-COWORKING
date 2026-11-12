-- Preserve the official assignment. Legacy role/permission checks continue to
-- consume the active usage role, so reduced modes also restrict SECURITY DEFINER RPCs.
do $audit_action$
declare previous_check text;
begin
 select pg_get_expr(conbin,conrelid) into previous_check from pg_constraint where conrelid='public.security_audit_logs'::regclass and conname='security_audit_logs_action_check';
 if previous_check is not null and position('usage_mode_changed' in previous_check)=0 then
  alter table public.security_audit_logs drop constraint security_audit_logs_action_check;
  execute 'alter table public.security_audit_logs add constraint security_audit_logs_action_check check (('||previous_check||') or action=''usage_mode_changed'')';
 end if;
end $audit_action$;
alter table public.profiles add column if not exists official_role public.user_role;
update public.profiles set official_role=role where official_role is null;
alter table public.profiles alter column official_role set not null;

create or replace function public.nexlab_guard_official_role_v1() returns trigger
language plpgsql security definer set search_path='' as $$
declare switching boolean:=coalesce(current_setting('nexlab.usage_mode_flow',true),'')='switch';
begin
 if tg_op='INSERT' then new.official_role:=new.role; return new; end if;
 if switching then
  if auth.uid() is distinct from old.id or old.official_role::text not in ('admin','coordenador')
     or new.official_role is distinct from old.official_role
     or (new.role::text='admin' and old.official_role::text<>'admin') then
   raise exception 'Troca de modo não autorizada.' using errcode='42501';
  end if;
  return new;
 end if;
 if new.official_role is distinct from old.official_role then
  if auth.uid() is not null and not public.nexlab_is_admin() then
   raise exception 'Somente o Administrador pode alterar o perfil oficial.' using errcode='42501';
  end if;
  new.role:=new.official_role;
 elsif new.role is distinct from old.role then
  if auth.uid() is not null and coalesce(current_setting('nexlab.profile_flow',true),'')<>'trusted' and not public.nexlab_is_admin() then
   raise exception 'Use a opção Modo de uso para trocar de perfil.' using errcode='42501';
  end if;
  new.official_role:=new.role;
 end if;
 return new;
end; $$;
revoke all on function public.nexlab_guard_official_role_v1() from public,anon,authenticated;
drop trigger if exists aab_nexlab_guard_official_role_v1 on public.profiles;
create trigger aab_nexlab_guard_official_role_v1 before insert or update on public.profiles for each row execute function public.nexlab_guard_official_role_v1();

-- Also recognize an official assignment that matches a temporary usage role.
create or replace function public.nexlab_sync_official_role_v1() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if coalesce(current_setting('nexlab.usage_mode_flow',true),'')<>'switch'
    and (auth.uid() is null or public.nexlab_is_admin() or coalesce(current_setting('nexlab.profile_flow',true),'')='trusted') then
  new.official_role:=new.role;
 end if;
 return new;
end; $$;
revoke all on function public.nexlab_sync_official_role_v1() from public,anon,authenticated;
drop trigger if exists aab0_nexlab_sync_official_role_v1 on public.profiles;
create trigger aab0_nexlab_sync_official_role_v1 before update of role on public.profiles for each row execute function public.nexlab_sync_official_role_v1();

create or replace function public.nexlab_actor_mode_context_v1() returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce((select jsonb_build_object('official_role',p.official_role::text,'usage_mode',p.role::text) from public.profiles p where p.id=auth.uid()),'{}'::jsonb);
$$;
revoke all on function public.nexlab_actor_mode_context_v1() from public,anon;
grant execute on function public.nexlab_actor_mode_context_v1() to authenticated;

create or replace function public.nexlab_notification_visible_in_usage_mode_v1(n public.notifications) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare p public.profiles; target text:=lower(coalesce(n.target_tab,'')); typ text:=lower(coalesce(n.type,'')); perms text[];
begin
 if n.recipient_id is distinct from auth.uid() then return false; end if;
 select * into p from public.profiles where id=auth.uid();
 if not found or p.ativo=false then return false; end if;
 if p.role=p.official_role then return true; end if;
 -- Account safety and changes to this person's official assignment remain visible.
 if typ ~ 'password|security|account_|privacy|profile_updated' or lower(coalesce(n.category,'')) in ('seguranca','security')
    or (n.entity_type='profile' and n.entity_id=auth.uid())
    or (target='perfil' and typ in ('profile_request','system')) then return true; end if;
 perms:=coalesce(p.effective_permissions,'{}'::text[]);
 if typ='profile_request' then return p.role='admin'; end if;
 if typ ~ 'asset|patrimonio' and not p.role::text=any(array['admin','coordenador']) then return false; end if;
 if typ ~ 'reservation_created|reservation_request|reservation_pending' and not 'reservations_review'=any(perms) then return false; end if;
 if typ ~ 'feedback_created' and not 'feedback_manage'=any(perms) then return false; end if;
 target:=case target when 'patrimonio' then 'patrimonio' when 'estoque' then 'estoque' when 'saude-sistema' then 'saude-sistema' when 'logs' then 'logs' when 'notificacoes' then 'configuracoes' else target end;
 if target='inventario' then return 'module_patrimonio'=any(perms) or 'module_estoque'=any(perms); end if;
 if target='atividades-sistema' then return 'module_logs'=any(perms) or 'module_saude-sistema'=any(perms); end if;
 if target='' then return false; end if;
 return ('module_'||target)=any(perms);
end; $$;
revoke all on function public.nexlab_notification_visible_in_usage_mode_v1(public.notifications) from public,anon;
grant execute on function public.nexlab_notification_visible_in_usage_mode_v1(public.notifications) to authenticated;


CREATE OR REPLACE FUNCTION public.nexlab_recalculate_profile_permissions(p_target_user_id text)
 RETURNS text[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  target_id uuid;
  target_role text;
  candidate_permissions text[]:='{}'::text[];
  permissions_result text[]:='{}'::text[];
  using_other_role boolean;
  explicit_denies text[]:='{}'::text[];
  legacy_tokens text[]:='{}'::text[];
begin
  select profile.id,
         case when lower(coalesce(profile.role::text,''))='administrador' then 'admin'
              else lower(coalesce(profile.role::text,'')) end
    into target_id,target_role
  from public.profiles profile
  where profile.id::text=p_target_user_id
  for update;

  select role is distinct from official_role into using_other_role from public.profiles where id=target_id;

  if target_id is null or target_role is null then
    raise exception 'Usuário não encontrado.' using errcode='P0002';
  end if;

  select coalesce(array_agg(catalog.permission_key order by catalog.sort_order,catalog.permission_key),'{}'::text[])
    into candidate_permissions
  from public.nexlab_permission_catalog catalog
  join public.nexlab_role_permission_defaults default_row
    on default_row.role_key=target_role
   and default_row.permission_key=catalog.permission_key
  left join public.nexlab_user_permission_overrides override_row
    on not using_other_role and override_row.user_id=target_id
   and override_row.permission_key=catalog.permission_key
  where catalog.active
    and (not using_other_role or not catalog.admin_only)
    and target_role=any(coalesce(catalog.eligible_roles,'{}'::text[]))
    and coalesce(default_row.assignment_state,'compatible')<>'incompatible'
    and (
      catalog.core
      or case
           when override_row.effect='allow' then true
           when override_row.effect='deny' then false
           else default_row.allowed
         end
    );

  select coalesce(array_agg(override_row.permission_key order by override_row.permission_key),'{}'::text[])
    into explicit_denies
  from public.nexlab_user_permission_overrides override_row
  join public.nexlab_permission_catalog catalog
    on catalog.permission_key=override_row.permission_key
   and catalog.active
  where not using_other_role and override_row.user_id=target_id
    and override_row.effect='deny'
    and target_role=any(coalesce(catalog.eligible_roles,'{}'::text[]));

  permissions_result:=public.nexlab_normalize_permission_set_v263036(candidate_permissions,explicit_denies);

  select coalesce(array_agg(permission_key order by permission_key),'{}'::text[])
    into permissions_result
  from unnest(permissions_result) permission_key
  join public.nexlab_permission_catalog catalog using(permission_key)
  where catalog.active
    and (not using_other_role or not catalog.admin_only)
    and target_role=any(coalesce(catalog.eligible_roles,'{}'::text[]));

  legacy_tokens:=array_remove(array[
    case when 'patrimonio_manage'=any(permissions_result) then 'patr' end,
    case when 'marketing_manage'=any(permissions_result) then 'mkt' end,
    case when 'action_sensitive_export'=any(permissions_result) then 'usr_report' end,
    case when 'events_manage'=any(permissions_result) then 'evt_manage' end
  ]::text[],null);

  perform set_config('nexlab.permission_flow','trusted',true);
  update public.profiles
     set effective_permissions=permissions_result,
         acessos=legacy_tokens
   where id=target_id;
  perform set_config('nexlab.permission_flow','',true);

  return permissions_result;
end;
$function$;

CREATE OR REPLACE FUNCTION public.notifications_profile_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  requested_role text;
  should_notify_request boolean := false;
begin
  if coalesce(current_setting('nexlab.usage_mode_flow',true),'')='switch' then return new; end if;
  requested_role :=
    NULLIF(
      trim(
        COALESCE(
          NEW.vinculo_solicitado::text,
          ''
        )
      ),
      ''
    );

  IF TG_OP = 'INSERT' THEN
    should_notify_request := (
      NEW.ativo IS DISTINCT FROM false
      AND NEW.cadastro_completo IS DISTINCT FROM false
      AND requested_role IS NOT NULL
      AND requested_role
        IS DISTINCT FROM NEW.role::text
    );
  END IF;

  IF TG_OP = 'UPDATE' THEN
    should_notify_request := (
      NEW.ativo IS DISTINCT FROM false
      AND NEW.cadastro_completo IS DISTINCT FROM false
      AND requested_role IS NOT NULL
      AND requested_role
        IS DISTINCT FROM NEW.role::text
      AND (
        NEW.vinculo_solicitado
          IS DISTINCT FROM OLD.vinculo_solicitado
        OR NEW.cadastro_completo
          IS DISTINCT FROM OLD.cadastro_completo
      )
    );
  END IF;

  IF should_notify_request THEN
    PERFORM public.notify_active_managers(
      'profile_request',
      'Nova solicitação de vínculo',
      COALESCE(
        NULLIF(trim(NEW.nome), ''),
        'Um usuário'
      )
        || ' solicitou o perfil '
        || requested_role
        || '.',
      'pendencias',
      'profile',
      NEW.id,
      'profile:request:'
        || NEW.id::text
        || ':'
        || requested_role,
      true,
      NEW.id
    );
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      PERFORM public.upsert_internal_notification(
        NEW.id,
        'profile_updated',
        'Seu perfil foi atualizado',
        'Seu perfil no NexLab agora é '
          || NEW.role::text
          || '.',
        'perfil',
        'profile',
        NEW.id,
        'profile:role:'
          || NEW.id::text
          || ':'
          || NEW.role::text
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.nexlab_capture_profile_management_history()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  actor_value profiles.id%type;
  event_reason text;
begin
  if coalesce(current_setting('nexlab.usage_mode_flow',true),'')='switch' then return new; end if;
  begin
    actor_value := auth.uid();
  exception
    when others then
      actor_value := null;
  end;

  event_reason := coalesce(
    nullif(new.account_status_reason, ''),
    nullif(new.role_request_reason, '')
  );

  if new.role is distinct from old.role then
    insert into public.profile_management_history (
      user_id,
      actor_id,
      event_type,
      previous_role,
      next_role,
      previous_active,
      next_active,
      reason,
      metadata
    )
    values (
      new.id,
      actor_value,
      'role_changed',
      old.role,
      new.role,
      old.ativo,
      new.ativo,
      event_reason,
      jsonb_build_object(
        'source',
        coalesce(
          current_setting('nexlab.profile_flow', true),
          'direct'
        ),
        'requested_role',
        new.vinculo_solicitado::text
      )
    );
  end if;

  if new.ativo is distinct from old.ativo then
    insert into public.profile_management_history (
      user_id,
      actor_id,
      event_type,
      previous_role,
      next_role,
      previous_active,
      next_active,
      reason,
      metadata
    )
    values (
      new.id,
      actor_value,
      case
        when coalesce(new.ativo, true)
          then 'account_activated'
        else 'account_deactivated'
      end,
      old.role,
      new.role,
      old.ativo,
      new.ativo,
      event_reason,
      jsonb_build_object(
        'source',
        coalesce(
          current_setting('nexlab.profile_flow', true),
          'direct'
        )
      )
    );
  end if;

  if new.role_request_status is distinct from old.role_request_status then
    insert into public.profile_management_history (
      user_id,
      actor_id,
      event_type,
      previous_role,
      next_role,
      previous_active,
      next_active,
      reason,
      metadata
    )
    values (
      new.id,
      actor_value,
      case
        when new.role_request_status = 'approved'
             and current_setting(
               'nexlab.pending_resolution',
               true
             ) = 'cancelled'
          then 'request_cancelled'
        when new.role_request_status = 'approved'
          then 'request_approved'
        when new.role_request_status = 'rejected'
          then 'request_rejected'
        when new.role_request_status = 'cancelled'
          then 'request_cancelled'
        when new.role_request_status = 'auto_approved'
          then 'request_auto_approved'
        else 'profile_corrected'
      end,
      old.role,
      new.role,
      old.ativo,
      new.ativo,
      coalesce(
        new.role_request_reason,
        event_reason
      ),
      jsonb_build_object(
        'previous_status',
        old.role_request_status,
        'next_status',
        new.role_request_status,
        'requested_role',
        new.vinculo_solicitado::text,
        'pending_resolution',
        nullif(
          current_setting(
            'nexlab.pending_resolution',
            true
          ),
          ''
        )
      )
    );
  end if;

  if coalesce(old.cadastro_completo, false) = false
     and coalesce(new.cadastro_completo, false) = true
  then
    insert into public.profile_management_history (
      user_id,
      actor_id,
      event_type,
      previous_role,
      next_role,
      previous_active,
      next_active,
      reason,
      metadata
    )
    values (
      new.id,
      actor_value,
      'profile_completed',
      old.role,
      new.role,
      old.ativo,
      new.ativo,
      event_reason,
      jsonb_build_object(
        'completed_by_admin',
        actor_value is distinct from new.id
      )
    );

  elsif new.nome is distinct from old.nome
     or new.curso is distinct from old.curso
     or new.matricula is distinct from old.matricula
  then
    insert into public.profile_management_history (
      user_id,
      actor_id,
      event_type,
      previous_role,
      next_role,
      previous_active,
      next_active,
      reason,
      metadata
    )
    values (
      new.id,
      actor_value,
      'profile_corrected',
      old.role,
      new.role,
      old.ativo,
      new.ativo,
      event_reason,
      jsonb_build_object(
        'name_changed',
        new.nome is distinct from old.nome,
        'course_changed',
        new.curso is distinct from old.curso,
        'registration_changed',
        new.matricula is distinct from old.matricula
      )
    );
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.nexlab_guard_volunteer_profile_v02652()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
 actor_role text;
begin
  if coalesce(current_setting('nexlab.usage_mode_flow',true),'')='switch' then return new; end if;
 if lower(new.role::text)='voluntario' then
  new.volunteer_start_date:=coalesce(new.volunteer_start_date,current_date);
  new.volunteer_end_date:=coalesce(new.volunteer_end_date,new.volunteer_start_date+180);
  if new.volunteer_end_date<new.volunteer_start_date then
   raise exception 'A data final do vínculo voluntário não pode ser anterior à data inicial.' using errcode='22023';
  end if;
  if new.volunteer_supervisor_id is null and auth.uid() is not null and auth.uid()<>new.id then
   select lower(role::text) into actor_role from public.profiles where id=auth.uid();
   if actor_role in('admin','administrador','coordenador') then new.volunteer_supervisor_id:=auth.uid(); end if;
  end if;
 elsif tg_op='UPDATE' and lower(old.role::text)='voluntario' then
  new.volunteer_supervisor_id:=null;
  new.volunteer_start_date:=null;
  new.volunteer_end_date:=null;
 end if;
 return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.nexlab_prevent_last_active_admin()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  remaining_admins integer;
begin
  if lower(coalesce(coalesce(old.official_role,old.role)::text, '')) in ('admin', 'administrador')
     and coalesce(old.ativo, true)
     and (
       lower(coalesce(coalesce(new.official_role,new.role)::text, '')) not in ('admin', 'administrador')
       or not coalesce(new.ativo, true)
     )
  then
    select count(*)
      into remaining_admins
    from public.profiles p
    where p.id::text <> old.id::text
      and lower(coalesce(coalesce(p.official_role,p.role)::text, '')) in ('admin', 'administrador')
      and coalesce(p.ativo, true);

    if remaining_admins = 0 then
      raise exception 'O NexLab precisa manter pelo menos um Administrador ativo.'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.nexlab_list_profiles_visible_v26311()
 RETURNS TABLE(id uuid, nome text, email text, avatar_url text, avatar_path text, role user_role, ativo boolean, acessos text[], created_at timestamp with time zone, curso text, matricula text, vinculo_solicitado text, cadastro_completo boolean, role_request_status text, role_request_reason text, role_request_created_at timestamp with time zone, role_request_reviewed_at timestamp with time zone, role_request_reviewed_by uuid, account_status_reason text, account_status_changed_at timestamp with time zone, account_status_changed_by uuid, effective_permissions text[])
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_is_manager boolean := false;
begin
  if v_uid is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  if not public.nexlab_has_approved_access() then
    raise exception 'Acesso ainda não aprovado.' using errcode = '42501';
  end if;

  v_is_manager := public.nexlab_is_gestor();

  return query
  select
    profile.id,
    profile.nome,
    case when v_is_manager or profile.id = v_uid then profile.email else null::text end,
    profile.avatar_url,
    profile.avatar_path,
    coalesce(profile.official_role,profile.role),
    profile.ativo,
    case when v_is_manager or profile.id = v_uid then profile.acessos else null::text[] end,
    profile.created_at,
    case when v_is_manager or profile.id = v_uid then profile.curso else null::text end,
    case when v_is_manager or profile.id = v_uid then profile.matricula else null::text end,
    case when v_is_manager or profile.id = v_uid then profile.vinculo_solicitado else null::text end,
    case when v_is_manager or profile.id = v_uid then profile.cadastro_completo else null::boolean end,
    case when v_is_manager or profile.id = v_uid then profile.role_request_status else null::text end,
    case when v_is_manager or profile.id = v_uid then profile.role_request_reason else null::text end,
    case when v_is_manager or profile.id = v_uid then profile.role_request_created_at else null::timestamptz end,
    case when v_is_manager or profile.id = v_uid then profile.role_request_reviewed_at else null::timestamptz end,
    case when v_is_manager or profile.id = v_uid then profile.role_request_reviewed_by else null::uuid end,
    case when v_is_manager or profile.id = v_uid then profile.account_status_reason else null::text end,
    case when v_is_manager or profile.id = v_uid then profile.account_status_changed_at else null::timestamptz end,
    case when v_is_manager or profile.id = v_uid then profile.account_status_changed_by else null::uuid end,
    case when v_is_manager or profile.id = v_uid then profile.effective_permissions else null::text[] end
  from public.profiles profile
  where profile.ativo is distinct from false or v_is_manager
  order by profile.nome, profile.id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.nexlab_admin_manage_profile(p_target_user_id text, p_next_role text DEFAULT NULL::text, p_active boolean DEFAULT NULL::boolean, p_accesses jsonb DEFAULT NULL::jsonb, p_reason text DEFAULT NULL::text, p_nome text DEFAULT NULL::text, p_curso text DEFAULT NULL::text, p_matricula text DEFAULT NULL::text, p_mark_complete boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions', 'pg_temp'
AS $function$
declare
  role_type text;
  requested_role_type text;
  accesses_type text;
  current_role_text text;
  current_requested_role_text text;
  current_request_status text;
  next_role_text text;
  current_active boolean;
  next_active boolean;
  current_accesses jsonb;
  next_nome text;
  next_curso text;
  next_matricula text;
  current_complete boolean;
  reason_required boolean := false;
  role_changed boolean := false;
  active_changed boolean := false;
  pending_request_id uuid;
  pending_requested_role_text text;
  pending_resolution text;
  result_profile jsonb;
  role_rank_current integer;
  role_rank_next integer;
begin
  if auth.uid() is null
     or not public.nexlab_is_admin()
  then
    raise exception 'Ação exclusiva de Administradores.'
      using errcode = '42501';
  end if;

  if nullif(
    btrim(coalesce(p_target_user_id, '')),
    ''
  ) is null
  then
    raise exception 'Usuário alvo não informado.'
      using errcode = '22023';
  end if;

  if p_target_user_id = auth.uid()::text then
    raise exception 'Use outro Administrador para alterar seu próprio cargo ou situação.'
      using errcode = '42501';
  end if;

  select
    coalesce(p.official_role,p.role)::text,
    p.vinculo_solicitado::text,
    p.role_request_status,
    coalesce(p.ativo, true),
    to_jsonb(p.acessos),
    p.nome,
    p.curso,
    p.matricula,
    coalesce(p.cadastro_completo, false)
  into
    current_role_text,
    current_requested_role_text,
    current_request_status,
    current_active,
    current_accesses,
    next_nome,
    next_curso,
    next_matricula,
    current_complete
  from public.profiles p
  where p.id::text = p_target_user_id
  for update;

  if current_role_text is null then
    raise exception 'Usuário não encontrado.'
      using errcode = 'P0002';
  end if;

  next_role_text := lower(
    btrim(
      coalesce(
        p_next_role,
        current_role_text
      )
    )
  );

  next_active := coalesce(
    p_active,
    current_active
  );

  next_nome := coalesce(
    nullif(btrim(p_nome), ''),
    next_nome
  );

  next_curso := coalesce(
    nullif(btrim(p_curso), ''),
    next_curso
  );

  next_matricula := coalesce(
    nullif(btrim(p_matricula), ''),
    next_matricula
  );

  if next_role_text not in (
    'coworking_junior',
    'voluntario',
    'bolsista',
    'coordenador',
    'admin'
  ) then
    raise exception 'Perfil informado é inválido.'
      using errcode = '22023';
  end if;

  role_changed :=
    lower(current_role_text)
    is distinct from
    next_role_text;

  active_changed :=
    current_active
    is distinct from
    next_active;

  role_rank_current := case lower(current_role_text)
    when 'admin' then 5
    when 'administrador' then 5
    when 'coordenador' then 4
    when 'bolsista' then 3
    when 'voluntario' then 2
    else 1
  end;

  role_rank_next := case next_role_text
    when 'admin' then 5
    when 'coordenador' then 4
    when 'bolsista' then 3
    when 'voluntario' then 2
    else 1
  end;

  reason_required :=
    (
      current_active
      and not next_active
    )
    or role_rank_next < role_rank_current;

  if reason_required
     and nullif(
       btrim(coalesce(p_reason, '')),
       ''
     ) is null
  then
    raise exception 'Informe o motivo para desativar a conta ou reduzir o perfil.'
      using errcode = '22023';
  end if;

  if p_mark_complete then
    if nullif(
      btrim(coalesce(next_nome, '')),
      ''
    ) is null
    or nullif(
      btrim(coalesce(next_curso, '')),
      ''
    ) is null
    or nullif(
      btrim(coalesce(next_matricula, '')),
      ''
    ) is null
    then
      raise exception 'Nome, curso e matrícula são obrigatórios para concluir o cadastro.'
        using errcode = '22023';
    end if;
  end if;

  select format_type(
    a.atttypid,
    a.atttypmod
  )
  into role_type
  from pg_attribute a
  where a.attrelid = 'public.profiles'::regclass
    and a.attname = 'role'
    and a.attnum > 0
    and not a.attisdropped;

  select format_type(
    a.atttypid,
    a.atttypmod
  )
  into requested_role_type
  from pg_attribute a
  where a.attrelid = 'public.profiles'::regclass
    and a.attname = 'vinculo_solicitado'
    and a.attnum > 0
    and not a.attisdropped;

  select format_type(
    a.atttypid,
    a.atttypmod
  )
  into accesses_type
  from pg_attribute a
  where a.attrelid = 'public.profiles'::regclass
    and a.attname = 'acessos'
    and a.attnum > 0
    and not a.attisdropped;

  if role_type is null
     or requested_role_type is null
  then
    raise exception 'Não foi possível identificar os tipos dos campos de perfil.';
  end if;

  if current_request_status = 'pending' then
    select
      r.id,
      r.requested_role::text
    into
      pending_request_id,
      pending_requested_role_text
    from public.profile_role_requests r
    where r.user_id::text = p_target_user_id
      and r.status = 'pending'
    order by r.created_at desc
    limit 1
    for update;
  end if;

  if pending_request_id is not null
     and role_changed
  then
    pending_resolution := case
      when lower(
        coalesce(
          pending_requested_role_text,
          ''
        )
      ) = next_role_text
        then 'approved'
      else 'cancelled'
    end;
  end if;

  perform set_config(
    'nexlab.profile_flow',
    'trusted',
    true
  );

  perform set_config(
    'nexlab.pending_resolution',
    coalesce(pending_resolution, ''),
    true
  );

  execute format(
    'update public.profiles
       set role = $1::%s,
           vinculo_solicitado = case
             when role::text is distinct from $1
               then $1::%s
             else vinculo_solicitado
           end,
           ativo = $2,
           nome = $3,
           curso = $4,
           matricula = $5,
           cadastro_completo = case
             when $6 then true
             else cadastro_completo
           end,
           role_request_status = case
             when role::text is distinct from $1
               then ''approved''
             else role_request_status
           end,
           role_request_reason = case
             when role::text is distinct from $1
               then null
             else role_request_reason
           end,
           role_request_reviewed_at = case
             when role::text is distinct from $1
               then now()
             else role_request_reviewed_at
           end,
           role_request_reviewed_by = case
             when role::text is distinct from $1
               then auth.uid()
             else role_request_reviewed_by
           end,
           account_status_reason = case
             when ativo is distinct from $2
               or role::text is distinct from $1
               then nullif(btrim($7), '''')
             else account_status_reason
           end,
           account_status_changed_at = case
             when ativo is distinct from $2
               or role::text is distinct from $1
               then now()
             else account_status_changed_at
           end,
           account_status_changed_by = case
             when ativo is distinct from $2
               or role::text is distinct from $1
               then auth.uid()
             else account_status_changed_by
           end
     where id::text = $8',
    role_type,
    requested_role_type
  )
  using
    next_role_text,
    next_active,
    next_nome,
    next_curso,
    next_matricula,
    p_mark_complete,
    coalesce(p_reason, ''),
    p_target_user_id;

  if p_accesses is not null
     and accesses_type is not null
  then
    if accesses_type = 'jsonb' then
      execute
        'update public.profiles
         set acessos = $1
         where id::text = $2'
      using
        p_accesses,
        p_target_user_id;

    elsif accesses_type = 'json' then
      execute
        'update public.profiles
         set acessos = $1::json
         where id::text = $2'
      using
        p_accesses,
        p_target_user_id;

    elsif accesses_type = 'text[]' then
      execute
        'update public.profiles
         set acessos = array(
           select jsonb_array_elements_text($1)
         )
         where id::text = $2'
      using
        p_accesses,
        p_target_user_id;
    end if;

    if p_accesses is distinct from current_accesses then
      insert into public.profile_management_history (
        user_id,
        actor_id,
        event_type,
        previous_role,
        next_role,
        previous_active,
        next_active,
        reason,
        metadata
      )
      select
        p.id,
        auth.uid(),
        'access_updated',
        p.role,
        p.role,
        p.ativo,
        p.ativo,
        nullif(
          btrim(coalesce(p_reason, '')),
          ''
        ),
        jsonb_build_object(
          'previous_access',
          current_accesses,
          'next_access',
          p_accesses
        )
      from public.profiles p
      where p.id::text = p_target_user_id;
    end if;
  end if;

  if pending_request_id is not null
     and role_changed
  then
    update public.profile_role_requests
    set
      status = pending_resolution,
      reason = case
        when pending_resolution = 'approved'
          then null
        else coalesce(
          nullif(btrim(p_reason), ''),
          'Solicitação encerrada por alteração administrativa de perfil.'
        )
      end,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
    where id = pending_request_id;
  end if;

  if role_changed
     or active_changed
     or (
       p_mark_complete
       and not current_complete
     )
  then
    perform public.nexlab_profile_flow_notification(
      p_target_user_id,
      'Cadastro atualizado pelo Administrador',
      format(
        'Seu cadastro foi atualizado. Perfil atual: %s. Situação: %s.%s',
        public.nexlab_profile_role_label(
          next_role_text
        ),
        case
          when next_active then 'ativo'
          else 'inativo'
        end,
        case
          when nullif(
            btrim(coalesce(p_reason, '')),
            ''
          ) is not null
            then format(
              ' Motivo: %s',
              btrim(p_reason)
            )
          else ''
        end
      ),
      'perfil',
      format(
        'profile-admin-management:%s:%s',
        p_target_user_id,
        extract(
          epoch from clock_timestamp()
        )::bigint
      ),
      'alta',
      jsonb_build_object(
        'previous_role',
        current_role_text,
        'next_role',
        next_role_text,
        'previous_active',
        current_active,
        'next_active',
        next_active,
        'previous_requested_role',
        current_requested_role_text,
        'previous_request_status',
        current_request_status,
        'pending_resolution',
        pending_resolution,
        'reason',
        nullif(
          btrim(coalesce(p_reason, '')),
          ''
        )
      )
    );
  end if;

  begin
    perform public.record_security_audit(
      'profile_admin_managed',
      p_target_user_id,
      jsonb_build_object(
        'previous_role',
        current_role_text,
        'next_role',
        next_role_text,
        'previous_active',
        current_active,
        'next_active',
        next_active,
        'previous_requested_role',
        current_requested_role_text,
        'previous_request_status',
        current_request_status,
        'pending_resolution',
        pending_resolution,
        'reason',
        nullif(
          btrim(coalesce(p_reason, '')),
          ''
        ),
        'profile_completed',
        p_mark_complete
        and not current_complete
      )
    );
  exception
    when undefined_function then null;
    when others then null;
  end;

  select to_jsonb(p)
    into result_profile
  from public.profiles p
  where p.id::text = p_target_user_id;

  return jsonb_build_object(
    'ok',
    true,
    'profile',
    result_profile,
    'pending_resolution',
    pending_resolution
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.nexlab_admin_manage_profile_v02617(p_target_user_id text, p_next_role text DEFAULT NULL::text, p_active boolean DEFAULT NULL::boolean, p_accesses jsonb DEFAULT NULL::jsonb, p_reason text DEFAULT NULL::text, p_nome text DEFAULT NULL::text, p_curso text DEFAULT NULL::text, p_matricula text DEFAULT NULL::text, p_mark_complete boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_before_role text;
  v_requested_role text;
  v_saved_role text;
  v_result jsonb;
  v_profile jsonb;
  v_effective text[];
  v_removed_overrides integer:=0;
  v_revision bigint;
begin
  select case when lower(coalesce(p.official_role,p.role)::text)='administrador' then 'admin' else lower(coalesce(p.official_role,p.role)::text) end
    into v_before_role
  from public.profiles p
  where p.id::text=p_target_user_id
  for update;

  if v_before_role is null then
    raise exception 'Usuário não encontrado.' using errcode='P0002';
  end if;

  v_requested_role:=lower(btrim(coalesce(p_next_role,v_before_role)));

  v_result:=public.nexlab_admin_manage_profile(
    p_target_user_id,p_next_role,p_active,p_accesses,p_reason,
    p_nome,p_curso,p_matricula,p_mark_complete
  );

  select case when lower(coalesce(p.official_role,p.role)::text)='administrador' then 'admin' else lower(coalesce(p.official_role,p.role)::text) end
    into v_saved_role
  from public.profiles p
  where p.id::text=p_target_user_id
  for update;

  if v_saved_role is distinct from v_requested_role then
    raise exception 'O perfil salvo não corresponde ao perfil selecionado. Nenhuma alteração foi mantida.'
      using errcode='P0001',detail=format('selecionado=%s salvo=%s',v_requested_role,coalesce(v_saved_role,'nulo'));
  end if;

  if v_before_role is distinct from v_saved_role then
    select count(*) into v_removed_overrides
    from public.nexlab_user_permission_overrides o
    where o.user_id::text=p_target_user_id;

    delete from public.nexlab_user_permission_overrides o
    where o.user_id::text=p_target_user_id;

    insert into public.nexlab_permission_history(
      scope,user_id,previous_value,next_value,reason,actor_id,metadata
    )
    select
      'restore_defaults',p.id,v_removed_overrides::text,'0',
      coalesce(nullif(btrim(p_reason),''),'Recalculo obrigatório após alteração de perfil.'),
      auth.uid(),jsonb_build_object(
        'previous_role',v_before_role,
        'next_role',v_saved_role,
        'removed_overrides',v_removed_overrides,
        'version','0.26.17',
        'reason','role_change_resets_user_overrides'
      )
    from public.profiles p
    where p.id::text=p_target_user_id;

    v_effective:=public.nexlab_recalculate_profile_permissions(p_target_user_id);
    v_revision:=public.nexlab_bump_permission_revision_v26260();
  else
    select coalesce(p.effective_permissions,'{}'::text[])
      into v_effective
    from public.profiles p
    where p.id::text=p_target_user_id;
  end if;

  if exists(
    select 1
    from unnest(coalesce(v_effective,'{}'::text[])) permission_key
    left join public.nexlab_permission_catalog catalog using(permission_key)
    where catalog.permission_key is null
       or not catalog.active
       or not v_saved_role=any(coalesce(catalog.eligible_roles,'{}'::text[]))
  ) then
    raise exception 'O recálculo produziu permissões incompatíveis com o novo perfil.' using errcode='23514';
  end if;

  select to_jsonb(p) into v_profile
  from public.profiles p
  where p.id::text=p_target_user_id;

  return coalesce(v_result,'{}'::jsonb)||jsonb_build_object(
    'ok',true,
    'profile',v_profile,
    'requested_role',v_requested_role,
    'saved_role',v_saved_role,
    'role_changed',v_before_role is distinct from v_saved_role,
    'removed_overrides',v_removed_overrides,
    'permissions_recalculated',v_before_role is distinct from v_saved_role,
    'permission_revision',v_revision,
    'version','0.26.17'
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.nexlab_admin_manage_profile_v02652(p_target_user_id text, p_next_role text DEFAULT NULL::text, p_active boolean DEFAULT NULL::boolean, p_accesses jsonb DEFAULT NULL::jsonb, p_reason text DEFAULT NULL::text, p_nome text DEFAULT NULL::text, p_curso text DEFAULT NULL::text, p_matricula text DEFAULT NULL::text, p_mark_complete boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
 v_target uuid;
 v_current_role text;
 v_requested_role text;
 v_current_active boolean;
 v_result jsonb;
 v_removed integer:=0;
 v_profile jsonb;
 v_revision bigint;
 v_rank_current integer;
begin
 if auth.uid() is null or not public.nexlab_is_admin() then raise exception 'Ação exclusiva de Administradores.' using errcode='42501'; end if;
 begin v_target:=p_target_user_id::uuid; exception when others then raise exception 'Usuário alvo inválido.' using errcode='22023'; end;
 if v_target=auth.uid() then raise exception 'Use outro Administrador para alterar seu próprio cargo ou situação.' using errcode='42501'; end if;
 select lower(coalesce(official_role,role)::text),coalesce(ativo,true) into v_current_role,v_current_active from public.profiles where id=v_target for update;
 if not found then raise exception 'Usuário não encontrado.' using errcode='P0002'; end if;
 v_requested_role:=lower(btrim(coalesce(p_next_role,v_current_role)));
 if v_requested_role not in('coworking_junior','voluntario','bolsista','coordenador','admin') then raise exception 'Perfil informado é inválido.' using errcode='22023'; end if;
 if v_requested_role<>'voluntario' then
  return public.nexlab_admin_manage_profile_v02617(p_target_user_id,p_next_role,p_active,p_accesses,p_reason,p_nome,p_curso,p_matricula,p_mark_complete)||jsonb_build_object('version','0.26.52');
 end if;
 v_rank_current:=case v_current_role when 'admin' then 5 when 'administrador' then 5 when 'coordenador' then 4 when 'bolsista' then 3 when 'voluntario' then 2 else 1 end;
 if ((v_rank_current>2) or (v_current_active and coalesce(p_active,v_current_active)=false)) and nullif(btrim(coalesce(p_reason,'')),'') is null then
  raise exception 'Informe o motivo para reduzir o perfil ou desativar a conta.' using errcode='22023';
 end if;
 v_result:=public.nexlab_admin_manage_profile_v02617(p_target_user_id,v_current_role,p_active,p_accesses,p_reason,p_nome,p_curso,p_matricula,p_mark_complete);
 perform set_config('nexlab.profile_flow','trusted',true);
 update public.profiles set
  role='voluntario'::public.user_role,
  vinculo_solicitado='voluntario',
  role_request_status='approved',role_request_reason=null,role_request_reviewed_at=now(),role_request_reviewed_by=auth.uid(),
  account_status_reason=coalesce(nullif(btrim(p_reason),''),account_status_reason),
  account_status_changed_at=now(),account_status_changed_by=auth.uid(),
  volunteer_supervisor_id=coalesce(volunteer_supervisor_id,auth.uid()),
  volunteer_start_date=coalesce(volunteer_start_date,current_date),
  volunteer_end_date=coalesce(volunteer_end_date,current_date+180)
 where id=v_target;
 if v_current_role is distinct from 'voluntario' then
  select count(*) into v_removed from public.nexlab_user_permission_overrides where user_id=v_target;
  delete from public.nexlab_user_permission_overrides where user_id=v_target;
  update public.profile_role_requests set status=case when requested_role='voluntario' then 'approved' else 'cancelled' end,
   reason=case when requested_role='voluntario' then null else coalesce(nullif(btrim(p_reason),''),'Solicitação encerrada por alteração administrativa.') end,
   reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now()
  where user_id=v_target and status='pending';
  perform public.nexlab_recalculate_profile_permissions(v_target::text);
  v_revision:=public.nexlab_bump_permission_revision_v26260();
  insert into public.nexlab_permission_history(scope,user_id,previous_value,next_value,reason,actor_id,metadata)
  values('restore_defaults',v_target,v_removed::text,'0',coalesce(nullif(btrim(p_reason),''),'Recalculo após alteração para Voluntário.'),auth.uid(),jsonb_build_object('previous_role',v_current_role,'next_role','voluntario','removed_overrides',v_removed,'version','0.26.52'));
 end if;
 perform public.record_security_audit('profile_admin_managed',v_target::text,jsonb_build_object('previous_role',v_current_role,'next_role','voluntario','reason',nullif(btrim(coalesce(p_reason,'')),''),'version','0.26.52'));
 select to_jsonb(p) into v_profile from public.profiles p where id=v_target;
 return coalesce(v_result,'{}'::jsonb)||jsonb_build_object('ok',true,'profile',v_profile,'requested_role','voluntario','saved_role','voluntario','role_changed',v_current_role is distinct from 'voluntario','removed_overrides',v_removed,'permission_revision',v_revision,'version','0.26.52');
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_security_audit(p_action text, p_target_user_id text DEFAULT NULL::text, p_details jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions', 'pg_temp'
 SET "TimeZone" TO 'UTC'
AS $function$
declare
  audit_id uuid := gen_random_uuid();
  actor_id uuid := auth.uid();
  target_id uuid := null;
  prior_hash text := '';
  next_hash text;
  audit_time timestamptz;
  prior_time timestamptz;
begin
  if actor_id is null then
    raise exception 'Autenticação obrigatória para registrar auditoria.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = actor_id
      and p.ativo is distinct from false
  ) then
    raise exception 'Perfil ativo do NEXLAB não encontrado.'
      using errcode = '42501';
  end if;

  if btrim(coalesce(p_action, '')) = '' then
    raise exception 'Ação de auditoria não informada.'
      using errcode = '22023';
  end if;

  if nullif(btrim(coalesce(p_target_user_id, '')), '') is not null then
    begin
      target_id := p_target_user_id::uuid;
    exception
      when invalid_text_representation then
        target_id := null;
    end;
  end if;

  perform pg_advisory_xact_lock(
    hashtext('nexlab_security_audit_chain')::bigint
  );

  -- Allocate the event time only after acquiring the chain lock.
  -- Advancing one microsecond also handles equal clock readings or clock rollback.
  select coalesce(s.integrity_hash, ''), s.created_at
    into prior_hash, prior_time
  from public.security_audit_logs s
  order by s.created_at desc, s.id desc
  limit 1;

  p_details := coalesce(p_details,'{}'::jsonb)||public.nexlab_actor_mode_context_v1();
  prior_hash := coalesce(prior_hash, '');
  audit_time := greatest(clock_timestamp(), coalesce(prior_time + interval '1 microsecond', '-infinity'::timestamptz));

  next_hash := encode(
    extensions.digest(
      concat_ws('|',
        prior_hash,
        audit_id::text,
        coalesce(actor_id::text, ''),
        coalesce(target_id::text, ''),
        btrim(p_action),
        coalesce(p_details, '{}'::jsonb)::text,
        audit_time::text
      ),
      'sha256'
    ),
    'hex'
  );

  insert into public.security_audit_logs (
    id,
    actor_user_id,
    target_user_id,
    action,
    details,
    previous_hash,
    integrity_hash,
    created_at
  ) values (
    audit_id,
    actor_id,
    target_id,
    btrim(p_action),
    coalesce(p_details, '{}'::jsonb),
    nullif(prior_hash, ''),
    next_hash,
    audit_time
  );

  return audit_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.log_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions', 'pg_temp'
AS $function$
declare
  v_action_legacy text; v_action_key text; v_module_key text; v_record jsonb; v_old_record jsonb;
  v_description text; v_entity_id uuid; v_team_id uuid; v_actor_id uuid; v_correlation_id uuid;
  v_correlation_setting text; v_changed_fields jsonb:='[]'::jsonb; v_created_at timestamptz:=transaction_timestamp();
  v_fingerprint text; v_activity_version text;
begin
  if tg_table_name='profiles' and coalesce(current_setting('nexlab.usage_mode_flow',true),'')='switch' then return coalesce(new,old); end if;
  if coalesce(current_setting('nexlab.permission_flow',true),'')='trusted' then return coalesce(new,old); end if;
  if tg_table_name='board_posts' and tg_op='DELETE' and coalesce(current_setting('nexlab.board_audit_mode',true),'')='protected' then return old; end if;
  if auth.uid() is null and session_user in ('postgres','supabase_admin') then return coalesce(new,old); end if;
  v_record:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_old_record:=case when tg_op='UPDATE' then to_jsonb(old) else '{}'::jsonb end;
  if tg_op='UPDATE' then
    select coalesce(jsonb_agg(changed.key order by changed.key),'[]'::jsonb) into v_changed_fields
    from (
      select coalesce(next_value.key,previous_value.key) as key
      from jsonb_each(v_record) next_value full join jsonb_each(v_old_record) previous_value using(key)
      where next_value.value is distinct from previous_value.value
        and coalesce(next_value.key,previous_value.key) not in ('updated_at','effective_permissions','acessos','last_seen_at','last_activity_at')
    ) changed;
    if tg_table_name='board_posts' then
      select coalesce(jsonb_agg(field order by field),'[]'::jsonb) into v_changed_fields
      from jsonb_array_elements_text(v_changed_fields) field
      where field not in ('fixado','archived_at','archived_by','archive_reason','updated_by','content_fingerprint','idempotency_key');
    end if;
    if jsonb_array_length(v_changed_fields)=0 then return new; end if;
  end if;
  v_action_legacy:=case tg_op when 'INSERT' then 'criou' when 'UPDATE' then 'editou' else 'excluiu' end;
  v_module_key:=public.nexlab_activity_module_key_v26270(tg_argv[0]);
  v_action_key:=public.nexlab_activity_canonical_action_v26270(v_action_legacy,tg_argv[0]);
  v_description:=coalesce(nullif(v_record->>'nome',''),nullif(v_record->>'titulo',''),nullif(v_record->>'finalidade',''),nullif(v_record->>'descricao',''),nullif(v_record->>'name',''),'Registro sem título');
  begin v_entity_id:=nullif(v_record->>'id','')::uuid; exception when others then v_entity_id:=null; end;
  begin v_team_id:=coalesce(nullif(v_record->>'equipe_id','')::uuid,case when v_module_key='teams' then nullif(v_record->>'id','')::uuid end,nullif(v_record->>'team_id','')::uuid); exception when others then v_team_id:=null; end;
  v_actor_id:=auth.uid();
  if v_actor_id is null then begin v_actor_id:=coalesce(nullif(v_record->>'updated_by','')::uuid,nullif(v_record->>'created_by','')::uuid,nullif(v_record->>'autor_id','')::uuid,nullif(v_record->>'usuario_id','')::uuid); exception when others then v_actor_id:=null; end; end if;
  v_actor_id:=public.nexlab_existing_profile_actor_v02650(v_actor_id);
  v_correlation_setting:=nullif(current_setting('nexlab.activity_correlation_id',true),'');
  begin v_correlation_id:=v_correlation_setting::uuid; exception when others then v_correlation_id:=gen_random_uuid(); end;
  if v_correlation_id is null then v_correlation_id:=gen_random_uuid(); end if;
  v_activity_version:=public.nexlab_current_activity_version_v02676();
  v_fingerprint:=md5(concat_ws('|',coalesce(v_actor_id::text,'system'),v_action_key,v_module_key,coalesce(v_entity_id::text,''),lower(regexp_replace(btrim(v_description),'\\s+',' ','g')),v_created_at::text));
  insert into public.logs(actor_id,acao,entidade,descricao,entidade_id,equipe_id,action_key,module_key,correlation_id,metadata,fingerprint,created_at)
  values(v_actor_id,v_action_legacy,tg_argv[0],v_description,v_entity_id,v_team_id,v_action_key,v_module_key,v_correlation_id,
    jsonb_build_object('operation',tg_op,'table_name',tg_table_name,'changed_fields',v_changed_fields,'activity_version',v_activity_version,'activity_version_source','database_current_beta')||public.nexlab_actor_mode_context_v1(),v_fingerprint,v_created_at)
  on conflict(fingerprint) where fingerprint is not null do nothing;
  return coalesce(new,old);
end;
$function$;

CREATE OR REPLACE FUNCTION public.nexlab_notification_summary_v26190(p_limit integer DEFAULT 40)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  user_id uuid := auth.uid();
  row_limit integer := greatest(5,least(coalesce(p_limit,40),100));
  result jsonb;
begin
  if user_id is null then
    raise exception 'Usuário não autenticado.' using errcode='42501';
  end if;

  with recent_items as (
    select notification.*
    from public.notifications notification
    where notification.recipient_id=user_id and public.nexlab_notification_visible_in_usage_mode_v1(notification)
      and notification.archived_at is null
    order by notification.created_at desc,notification.id desc
    limit row_limit
  ),
  totals as (
    select
      count(*) filter(where notification.archived_at is null)::integer as inbox_total,
      count(*) filter(where notification.archived_at is null and not notification.is_read)::integer as unread_total,
      count(*) filter(where notification.archived_at is not null)::integer as archived_total
    from public.notifications notification
    where notification.recipient_id=user_id and public.nexlab_notification_visible_in_usage_mode_v1(notification)
  )
  select jsonb_build_object(
    'items',coalesce(
      (select jsonb_agg(to_jsonb(recent_items) order by recent_items.created_at desc,recent_items.id desc) from recent_items),
      '[]'::jsonb
    ),
    'inbox_total',totals.inbox_total,
    'unread_total',totals.unread_total,
    'archived_total',totals.archived_total,
    'limit',row_limit,
    'checked_at',now()
  )
  into result
  from totals;

  return result;
end;
$function$;

CREATE OR REPLACE FUNCTION public.nexlab_notification_history_v02682(p_limit integer DEFAULT 25, p_cursor_created_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_cursor_id uuid DEFAULT NULL::uuid, p_direction text DEFAULT 'recent'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_limit integer := greatest(10, least(coalesce(p_limit,25),50));
  v_direction text := lower(btrim(coalesce(p_direction,'recent')));
  v_items jsonb := '[]'::jsonb;
  v_has_more boolean := false;
  v_next_created_at timestamptz := null;
  v_next_id uuid := null;
  v_inbox integer := 0;
  v_unread integer := 0;
  v_today integer := 0;
  v_week integer := 0;
begin
  if v_uid is null then
    raise exception 'Usuário não autenticado.' using errcode='42501';
  end if;
  if v_direction not in ('recent','oldest') then
    raise exception 'Ordenação inválida.' using errcode='22023';
  end if;

  select
    count(*)::integer,
    count(*) filter (where not n.is_read)::integer,
    count(*) filter (where n.created_at >= date_trunc('day', now()))::integer,
    count(*) filter (where n.created_at >= now() - interval '7 days')::integer
  into v_inbox,v_unread,v_today,v_week
  from public.notifications n
  where n.recipient_id=v_uid and public.nexlab_notification_visible_in_usage_mode_v1(n) and n.archived_at is null;

  if v_direction='recent' then
    with candidate as (
      select n.*
      from public.notifications n
      where n.recipient_id=v_uid and public.nexlab_notification_visible_in_usage_mode_v1(n)
        and n.archived_at is null
        and (
          p_cursor_created_at is null
          or n.created_at < p_cursor_created_at
          or (n.created_at = p_cursor_created_at and (p_cursor_id is null or n.id < p_cursor_id))
        )
      order by n.created_at desc,n.id desc
      limit v_limit + 1
    ), visible as (
      select * from candidate order by created_at desc,id desc limit v_limit
    )
    select
      coalesce((select jsonb_agg(to_jsonb(v) order by v.created_at desc,v.id desc) from visible v),'[]'::jsonb),
      (select count(*) > v_limit from candidate),
      (select created_at from visible order by created_at desc,id desc offset greatest(v_limit-1,0) limit 1),
      (select id from visible order by created_at desc,id desc offset greatest(v_limit-1,0) limit 1)
    into v_items,v_has_more,v_next_created_at,v_next_id;
  else
    with candidate as (
      select n.*
      from public.notifications n
      where n.recipient_id=v_uid and public.nexlab_notification_visible_in_usage_mode_v1(n)
        and n.archived_at is null
        and (
          p_cursor_created_at is null
          or n.created_at > p_cursor_created_at
          or (n.created_at = p_cursor_created_at and (p_cursor_id is null or n.id > p_cursor_id))
        )
      order by n.created_at asc,n.id asc
      limit v_limit + 1
    ), visible as (
      select * from candidate order by created_at asc,id asc limit v_limit
    )
    select
      coalesce((select jsonb_agg(to_jsonb(v) order by v.created_at asc,v.id asc) from visible v),'[]'::jsonb),
      (select count(*) > v_limit from candidate),
      (select created_at from visible order by created_at asc,id asc offset greatest(v_limit-1,0) limit 1),
      (select id from visible order by created_at asc,id asc offset greatest(v_limit-1,0) limit 1)
    into v_items,v_has_more,v_next_created_at,v_next_id;
  end if;

  return jsonb_build_object(
    'ok',true,
    'items',v_items,
    'metrics',jsonb_build_object(
      'inbox_total',v_inbox,
      'unread_total',v_unread,
      'today_total',v_today,
      'last_7_days_total',v_week
    ),
    'page',jsonb_build_object(
      'limit',v_limit,
      'direction',v_direction,
      'has_more',v_has_more,
      'next_created_at',v_next_created_at,
      'next_id',v_next_id
    ),
    'checked_at',now()
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.nexlab_notification_history_filtered_v02682(p_limit integer DEFAULT 25, p_cursor_created_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_cursor_id uuid DEFAULT NULL::uuid, p_direction text DEFAULT 'recent'::text, p_scope text DEFAULT 'all'::text, p_search text DEFAULT NULL::text, p_period text DEFAULT 'all'::text, p_read_state text DEFAULT 'all'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_limit integer := greatest(5, least(coalesce(p_limit,25), 50));
  v_direction text := lower(btrim(coalesce(p_direction,'recent')));
  v_scope text := lower(btrim(coalesce(p_scope,'all')));
  v_search text := nullif(left(lower(btrim(coalesce(p_search,''))),120),'');
  v_period text := lower(btrim(coalesce(p_period,'all')));
  v_read_state text := lower(btrim(coalesce(p_read_state,'all')));
  v_local_midnight timestamptz := (date_trunc('day', timezone('America/Fortaleza', now())) at time zone 'America/Fortaleza');
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'Usuário não autenticado.' using errcode='42501';
  end if;
  if v_direction not in ('recent','oldest') then v_direction := 'recent'; end if;
  if v_scope not in ('all','unread','projects','teams','comments','system','other') then v_scope := 'all'; end if;
  if v_period not in ('all','today','7d','30d') then v_period := 'all'; end if;
  if v_read_state not in ('all','unread','read') then v_read_state := 'all'; end if;

  with base as (
    select n.*,
      case
        when lower(coalesce(n.type,'')) like '%comment%' or lower(coalesce(n.type,'')) like '%reply%'
          or lower(coalesce(n.entity_type,'')) like '%comment%' or lower(coalesce(n.entity_type,'')) like '%reply%' then 'comments'
        when lower(coalesce(n.target_tab,''))='equipes' or lower(coalesce(n.type,'')) like '%team%'
          or lower(coalesce(n.type,'')) like '%message%' then 'teams'
        when lower(coalesce(n.target_tab,''))='projetos' or lower(coalesce(n.type,'')) like '%project%' then 'projects'
        when lower(coalesce(n.type,''))='system' or lower(coalesce(n.target_tab,'')) like '%sistema%'
          or lower(coalesce(n.category,''))='sistema' then 'system'
        else 'other'
      end as history_scope
    from public.notifications n
    where n.recipient_id=v_uid and public.nexlab_notification_visible_in_usage_mode_v1(n) and n.archived_at is null
  ),
  filtered as (
    select b.*
    from base b
    where
      (v_scope='all' or (v_scope='unread' and not b.is_read) or (v_scope not in ('all','unread') and b.history_scope=v_scope))
      and (v_read_state='all' or (v_read_state='unread' and not b.is_read) or (v_read_state='read' and b.is_read))
      and (
        v_period='all'
        or (v_period='today' and b.created_at >= v_local_midnight)
        or (v_period='7d' and b.created_at >= now()-interval '7 days')
        or (v_period='30d' and b.created_at >= now()-interval '30 days')
      )
      and (
        v_search is null
        or lower(b.title) like '%'||v_search||'%'
        or lower(b.message) like '%'||v_search||'%'
      )
  ),
  cursor_filtered as (
    select f.*
    from filtered f
    where p_cursor_created_at is null or p_cursor_id is null
       or (v_direction='recent' and (f.created_at,f.id) < (p_cursor_created_at,p_cursor_id))
       or (v_direction='oldest' and (f.created_at,f.id) > (p_cursor_created_at,p_cursor_id))
  ),
  page_rows as (
    select * from cursor_filtered
    order by
      case when v_direction='recent' then created_at end desc,
      case when v_direction='recent' then id end desc,
      case when v_direction='oldest' then created_at end asc,
      case when v_direction='oldest' then id end asc
    limit v_limit+1
  ),
  limited as (
    select * from page_rows
    order by
      case when v_direction='recent' then created_at end desc,
      case when v_direction='recent' then id end desc,
      case when v_direction='oldest' then created_at end asc,
      case when v_direction='oldest' then id end asc
    limit v_limit
  ),
  last_row as (
    select created_at,id from limited
    order by
      case when v_direction='recent' then created_at end asc,
      case when v_direction='recent' then id end asc,
      case when v_direction='oldest' then created_at end desc,
      case when v_direction='oldest' then id end desc
    limit 1
  ),
  metrics as (
    select
      count(*)::integer as inbox_total,
      count(*) filter(where not b.is_read)::integer as unread_total,
      count(*) filter(where b.created_at >= v_local_midnight)::integer as today_total,
      count(*) filter(where b.created_at >= now()-interval '7 days')::integer as last_7_days_total
    from base b
  ),
  filtered_total as (
    select count(*)::integer as total from filtered
  )
  select jsonb_build_object(
    'ok',true,
    'items',coalesce((select jsonb_agg(to_jsonb(l)-'history_scope' order by
      case when v_direction='recent' then l.created_at end desc,
      case when v_direction='recent' then l.id end desc,
      case when v_direction='oldest' then l.created_at end asc,
      case when v_direction='oldest' then l.id end asc) from limited l),'[]'::jsonb),
    'metrics',jsonb_build_object(
      'inbox_total',m.inbox_total,
      'unread_total',m.unread_total,
      'today_total',m.today_total,
      'last_7_days_total',m.last_7_days_total,
      'filtered_total',ft.total
    ),
    'page',jsonb_build_object(
      'limit',v_limit,
      'direction',v_direction,
      'has_more',(select count(*)>v_limit from page_rows),
      'next_created_at',(select created_at from last_row),
      'next_id',(select id from last_row)
    ),
    'filters',jsonb_build_object('scope',v_scope,'search',v_search,'period',v_period,'read_state',v_read_state),
    'checked_at',now()
  ) into v_result
  from metrics m cross join filtered_total ft;

  return v_result;
end;
$function$;

CREATE OR REPLACE FUNCTION public.nexlab_list_notifications_v26190(p_status text DEFAULT 'inbox'::text, p_type text DEFAULT NULL::text, p_search text DEFAULT NULL::text, p_page integer DEFAULT 0, p_page_size integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  user_id uuid := auth.uid();
  normalized_status text := lower(btrim(coalesce(p_status,'inbox')));
  normalized_type text := nullif(lower(btrim(coalesce(p_type,''))),'');
  normalized_search text := nullif(lower(btrim(coalesce(p_search,''))),'');
  page_number integer := greatest(0,coalesce(p_page,0));
  page_size integer := greatest(5,least(coalesce(p_page_size,20),100));
  result jsonb;
begin
  if user_id is null then
    raise exception 'Usuário não autenticado.' using errcode='42501';
  end if;

  if normalized_status not in ('all','inbox','unread','archived') then
    normalized_status := 'inbox';
  end if;

  with filtered as (
    select notification.*
    from public.notifications notification
    where notification.recipient_id=user_id and public.nexlab_notification_visible_in_usage_mode_v1(notification)
      and (
        normalized_status='all'
        or (normalized_status='inbox' and notification.archived_at is null)
        or (normalized_status='unread' and notification.archived_at is null and not notification.is_read)
        or (normalized_status='archived' and notification.archived_at is not null)
      )
      and (
        normalized_type is null
        or (
          normalized_type in ('reservation_reminder','meeting_reminder','meetings','project_updates')
          and notification.preference_key=normalized_type
        )
        or (
          normalized_type not in ('reservation_reminder','meeting_reminder','meetings','project_updates')
          and notification.type=normalized_type
        )
      )
      and (
        normalized_search is null
        or lower(notification.title) like '%'||normalized_search||'%'
        or lower(notification.message) like '%'||normalized_search||'%'
        or lower(coalesce(notification.category,'')) like '%'||normalized_search||'%'
      )
  ),
  page_rows as (
    select filtered.*
    from filtered
    order by filtered.created_at desc,filtered.id desc
    offset page_number*page_size
    limit page_size
  ),
  page_json as (
    select coalesce(
      jsonb_agg(to_jsonb(page_rows) order by page_rows.created_at desc,page_rows.id desc),
      '[]'::jsonb
    ) as rows
    from page_rows
  ),
  delivery_json as (
    select coalesce(
      jsonb_object_agg(
        page_rows.id::text,
        coalesce(deliveries.items,'[]'::jsonb)
      ),
      '{}'::jsonb
    ) as delivery_map
    from page_rows
    left join lateral (
      select jsonb_agg(
        jsonb_build_object(
          'id',delivery.id,
          'notification_id',delivery.notification_id,
          'channel',delivery.channel,
          'status',delivery.status,
          'attempts',delivery.attempts,
          'next_attempt_at',delivery.next_attempt_at,
          'last_error',delivery.last_error,
          'sent_at',delivery.sent_at,
          'last_provider_status',delivery.last_provider_status,
          'last_attempt_outcome',delivery.last_attempt_outcome,
          'created_at',delivery.created_at
        ) order by delivery.created_at desc
      ) as items
      from public.notification_deliveries delivery
      where delivery.notification_id=page_rows.id
        and delivery.channel='push'
    ) deliveries on true
  ),
  filtered_count as (
    select count(*)::integer as total from filtered
  ),
  totals as (
    select
      count(*) filter(where notification.archived_at is null)::integer as inbox_total,
      count(*) filter(where notification.archived_at is null and not notification.is_read)::integer as unread_total,
      count(*) filter(where notification.archived_at is not null)::integer as archived_total,
      count(*)::integer as all_total
    from public.notifications notification
    where notification.recipient_id=user_id and public.nexlab_notification_visible_in_usage_mode_v1(notification)
  )
  select jsonb_build_object(
    'rows',page_json.rows,
    'total',filtered_count.total,
    'delivery_map',delivery_json.delivery_map,
    'counts',jsonb_build_object(
      'inbox',totals.inbox_total,
      'unread',totals.unread_total,
      'archived',totals.archived_total,
      'all',totals.all_total
    ),
    'page',page_number,
    'page_size',page_size,
    'page_count',case
      when filtered_count.total=0 then 1
      else ceil(filtered_count.total::numeric/page_size::numeric)::integer
    end
  )
  into result
  from page_json,delivery_json,filtered_count,totals;

  return result;
end;
$function$;

CREATE OR REPLACE FUNCTION public.nexlab_get_my_day_communication_v1(p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'nexlab_private', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit,20),1),25);
  v_items jsonb := '[]'::jsonb;
  v_total integer := 0;
begin
  if v_uid is null
     or not public.nexlab_has_approved_access()
     or not public.nexlab_has_effective_permission_v2680('module_pendencias')
  then
    raise exception 'Você não possui acesso às Pendências.' using errcode='42501';
  end if;

  with eligible as (
    select n.*
    from public.notifications n
    where n.recipient_id=v_uid and public.nexlab_notification_visible_in_usage_mode_v1(n)
      and coalesce(n.is_read,false)=false
      and n.archived_at is null
      and (
        (
          lower(n.type::text)='communication_mention'
          and coalesce((n.metadata->>'mentioned')::boolean,false)=true
          and lower(coalesce(n.metadata->>'communication_event','')) in ('team_message','project_comment','project_comment_reply')
        )
        or (
          lower(n.type::text)='project_comment_reply'
          and lower(coalesce(n.metadata->>'communication_event',''))='project_comment_reply'
        )
      )
      and (
        (lower(coalesce(n.entity_type,''))='team' and nexlab_private.user_can_view_team_chat_v1(v_uid,n.entity_id))
        or
        (lower(coalesce(n.entity_type,''))='project' and nexlab_private.user_can_view_project_v1(v_uid,n.entity_id))
      )
  )
  select count(*)::integer into v_total from eligible;

  with eligible as (
    select n.*
    from public.notifications n
    where n.recipient_id=v_uid and public.nexlab_notification_visible_in_usage_mode_v1(n)
      and coalesce(n.is_read,false)=false
      and n.archived_at is null
      and (
        (
          lower(n.type::text)='communication_mention'
          and coalesce((n.metadata->>'mentioned')::boolean,false)=true
          and lower(coalesce(n.metadata->>'communication_event','')) in ('team_message','project_comment','project_comment_reply')
        )
        or (
          lower(n.type::text)='project_comment_reply'
          and lower(coalesce(n.metadata->>'communication_event',''))='project_comment_reply'
        )
      )
      and (
        (lower(coalesce(n.entity_type,''))='team' and nexlab_private.user_can_view_team_chat_v1(v_uid,n.entity_id))
        or
        (lower(coalesce(n.entity_type,''))='project' and nexlab_private.user_can_view_project_v1(v_uid,n.entity_id))
      )
    order by n.created_at desc,n.id desc
    limit v_limit
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'notification_id',e.id,
    'kind',case when lower(e.type::text)='communication_mention' then 'mention' else 'official_reply' end,
    'title',e.title,
    'message',e.message,
    'created_at',e.created_at,
    'target_tab',e.target_tab,
    'entity_type',lower(coalesce(e.entity_type,'')),
    'entity_id',e.entity_id,
    'content_id',nullif(e.metadata->>'communication_content_id',''),
    'communication_event',lower(coalesce(e.metadata->>'communication_event','')),
    'open_section',lower(coalesce(e.metadata->>'open_section','')),
    'actor_id',nullif(e.metadata->>'actor_id',''),
    'actor_name',nullif(e.metadata->>'actor_name',''),
    'priority',coalesce(nullif(lower(e.priority),''),'normal')
  ) order by e.created_at desc,e.id desc),'[]'::jsonb)
  into v_items
  from eligible e;

  return jsonb_build_object(
    'ok',true,
    'items',v_items,
    'total',v_total,
    'generated_at',now()
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions', 'pg_temp'
AS $function$
DECLARE
  affected integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION
      'Autenticação obrigatória.'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.notifications
  SET
    is_read = true,
    read_at = COALESCE(read_at, now())
  WHERE recipient_id = auth.uid()
    AND is_read = false
    AND public.nexlab_notification_visible_in_usage_mode_v1(notifications);

  GET DIAGNOSTICS affected = ROW_COUNT;

  RETURN affected;
END;
$function$;

CREATE OR REPLACE FUNCTION nexlab_maintenance_private.notification_history_page_v02682(p_limit integer DEFAULT 10, p_page integer DEFAULT 1, p_direction text DEFAULT 'recent'::text, p_scope text DEFAULT 'all'::text, p_search text DEFAULT NULL::text, p_period text DEFAULT 'all'::text, p_read_state text DEFAULT 'all'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_limit integer := greatest(5, least(coalesce(p_limit,10), 50));
  v_page integer := greatest(1, coalesce(p_page,1));
  v_offset bigint := (greatest(1, coalesce(p_page,1))::bigint - 1) * greatest(5, least(coalesce(p_limit,10), 50));
  v_direction text := lower(btrim(coalesce(p_direction,'recent')));
  v_scope text := lower(btrim(coalesce(p_scope,'all')));
  v_search text := nullif(left(lower(btrim(coalesce(p_search,''))),120),'');
  v_period text := lower(btrim(coalesce(p_period,'all')));
  v_read_state text := lower(btrim(coalesce(p_read_state,'all')));
  v_local_midnight timestamptz := (date_trunc('day', timezone('America/Fortaleza', now())) at time zone 'America/Fortaleza');
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'Usuário não autenticado.' using errcode='42501';
  end if;
  if v_direction not in ('recent','oldest') then v_direction := 'recent'; end if;
  if v_scope not in ('all','unread','projects','teams','comments','system','other') then v_scope := 'all'; end if;
  if v_period not in ('all','today','7d','30d') then v_period := 'all'; end if;
  if v_read_state not in ('all','unread','read') then v_read_state := 'all'; end if;

  with base as (
    select n.*,
      case
        when lower(coalesce(n.type,'')) like '%comment%' or lower(coalesce(n.type,'')) like '%reply%'
          or lower(coalesce(n.entity_type,'')) like '%comment%' or lower(coalesce(n.entity_type,'')) like '%reply%' then 'comments'
        when lower(coalesce(n.target_tab,''))='equipes' or lower(coalesce(n.type,'')) like '%team%'
          or lower(coalesce(n.type,'')) like '%message%' then 'teams'
        when lower(coalesce(n.target_tab,''))='projetos' or lower(coalesce(n.type,'')) like '%project%' then 'projects'
        when lower(coalesce(n.type,''))='system' or lower(coalesce(n.target_tab,'')) like '%sistema%'
          or lower(coalesce(n.category,''))='sistema' then 'system'
        else 'other'
      end as history_scope
    from public.notifications n
    where n.recipient_id=v_uid and public.nexlab_notification_visible_in_usage_mode_v1(n) and n.archived_at is null
  ),
  filtered as (
    select b.*
    from base b
    where
      (v_scope='all' or (v_scope='unread' and not b.is_read) or (v_scope not in ('all','unread') and b.history_scope=v_scope))
      and (v_read_state='all' or (v_read_state='unread' and not b.is_read) or (v_read_state='read' and b.is_read))
      and (
        v_period='all'
        or (v_period='today' and b.created_at >= v_local_midnight)
        or (v_period='7d' and b.created_at >= now()-interval '7 days')
        or (v_period='30d' and b.created_at >= now()-interval '30 days')
      )
      and (
        v_search is null
        or lower(b.title) like '%'||v_search||'%'
        or lower(b.message) like '%'||v_search||'%'
      )
  ),
  page_rows as (
    select * from filtered
    order by
      case when v_direction='recent' then created_at end desc,
      case when v_direction='recent' then id end desc,
      case when v_direction='oldest' then created_at end asc,
      case when v_direction='oldest' then id end asc
    limit v_limit+1 offset v_offset
  ),
  limited as (
    select * from page_rows
    order by
      case when v_direction='recent' then created_at end desc,
      case when v_direction='recent' then id end desc,
      case when v_direction='oldest' then created_at end asc,
      case when v_direction='oldest' then id end asc
    limit v_limit
  ),
  last_row as (
    select created_at,id from limited
    order by
      case when v_direction='recent' then created_at end asc,
      case when v_direction='recent' then id end asc,
      case when v_direction='oldest' then created_at end desc,
      case when v_direction='oldest' then id end desc
    limit 1
  ),
  metrics as (
    select
      count(*)::integer as inbox_total,
      count(*) filter(where not b.is_read)::integer as unread_total,
      count(*) filter(where b.created_at >= v_local_midnight)::integer as today_total,
      count(*) filter(where b.created_at >= now()-interval '7 days')::integer as last_7_days_total
    from base b
  ),
  filtered_total as (
    select count(*)::integer as total from filtered
  )
  select jsonb_build_object(
    'ok',true,
    'items',coalesce((select jsonb_agg(to_jsonb(l)-'history_scope' order by
      case when v_direction='recent' then l.created_at end desc,
      case when v_direction='recent' then l.id end desc,
      case when v_direction='oldest' then l.created_at end asc,
      case when v_direction='oldest' then l.id end asc) from limited l),'[]'::jsonb),
    'metrics',jsonb_build_object(
      'inbox_total',m.inbox_total,
      'unread_total',m.unread_total,
      'today_total',m.today_total,
      'last_7_days_total',m.last_7_days_total,
      'filtered_total',ft.total
    ),
    'page',jsonb_build_object(
      'limit',v_limit,
      'number',v_page,
      'offset',v_offset,
      'direction',v_direction,
      'has_more',(select count(*)>v_limit from page_rows),
      'next_created_at',(select created_at from last_row),
      'next_id',(select id from last_row)
    ),
    'filters',jsonb_build_object('scope',v_scope,'search',v_search,'period',v_period,'read_state',v_read_state),
    'checked_at',now()
  ) into v_result
  from metrics m cross join filtered_total ft;

  return v_result;
end;
$function$;

drop policy if exists nexlab_notification_usage_mode_gate_v1 on public.notifications;
create policy nexlab_notification_usage_mode_gate_v1 on public.notifications as restrictive for select to authenticated
using (public.nexlab_notification_visible_in_usage_mode_v1(notifications));

create or replace function public.nexlab_get_usage_mode_v1() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare p public.profiles; choices jsonb; eligible boolean;
begin
 select * into p from public.profiles where id=auth.uid();
 if not found or p.ativo=false or not coalesce(p.cadastro_completo,false) or coalesce(p.role_request_status,'') not in ('approved','auto_approved') then
  raise exception 'Perfil sem acesso ativo ao NEXLAB.' using errcode='42501';
 end if;
 eligible:=p.official_role::text in ('admin','coordenador');
 select coalesce(jsonb_agg(jsonb_build_object('key',e.enumlabel,'label',public.nexlab_profile_role_label(e.enumlabel)) order by e.enumsortorder),'[]'::jsonb) into choices
 from pg_catalog.pg_enum e join pg_catalog.pg_type t on t.oid=e.enumtypid join pg_catalog.pg_namespace ns on ns.oid=t.typnamespace
 where t.typname='user_role' and ns.nspname='public' and eligible
 and (e.enumlabel<>'admin' or p.official_role::text='admin')
 and (e.enumlabel=p.official_role::text or not exists(select 1 from public.nexlab_role_permission_defaults d join public.nexlab_permission_catalog c using(permission_key) where d.role_key=e.enumlabel and d.allowed and c.active and c.admin_only));
 return jsonb_build_object('ok',true,'official_role',p.official_role::text,'mode',p.role::text,'eligible',eligible,'profiles',choices,'profile',to_jsonb(p));
end; $$;
revoke all on function public.nexlab_get_usage_mode_v1() from public,anon;
grant execute on function public.nexlab_get_usage_mode_v1() to authenticated;

create or replace function public.nexlab_set_usage_mode_v1(p_mode text,p_expected_mode text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare p public.profiles; target public.user_role; old_flow text:=coalesce(current_setting('nexlab.profile_flow',true),''); old_mode_flow text:=coalesce(current_setting('nexlab.usage_mode_flow',true),''); info jsonb;
begin
 select * into p from public.profiles where id=auth.uid() for update;
 if not found or p.ativo=false or not coalesce(p.cadastro_completo,false) or coalesce(p.role_request_status,'') not in ('approved','auto_approved') or p.official_role::text not in ('admin','coordenador') then
  raise exception 'A troca de modo está disponível somente para Coordenadores e Administradores oficiais.' using errcode='42501';
 end if;
 if p_expected_mode is not null and p.role::text<>p_expected_mode then raise exception 'O modo foi alterado em outra sessão. Atualize e tente novamente.' using errcode='40001'; end if;
 info:=public.nexlab_get_usage_mode_v1();
 if not exists(select 1 from jsonb_array_elements(info->'profiles') x where x->>'key'=p_mode) then raise exception 'Perfil de destino não autorizado.' using errcode='42501'; end if;
 target:=p_mode::public.user_role;
 if p.role=target then return info; end if;
 perform set_config('nexlab.profile_flow','trusted',true);
 perform set_config('nexlab.usage_mode_flow','switch',true);
 update public.profiles set role=target where id=p.id;
 perform set_config('nexlab.usage_mode_flow',old_mode_flow,true);
 perform set_config('nexlab.profile_flow',old_flow,true);
 perform public.record_security_audit('usage_mode_changed',p.id::text,jsonb_build_object('previous_mode',p.role::text,'next_mode',p_mode,'official_role',p.official_role::text));
 return public.nexlab_get_usage_mode_v1();
end; $$;
revoke all on function public.nexlab_set_usage_mode_v1(text,text) from public,anon;
grant execute on function public.nexlab_set_usage_mode_v1(text,text) to authenticated;
