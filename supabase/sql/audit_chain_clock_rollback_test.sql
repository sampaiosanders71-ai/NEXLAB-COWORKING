begin;
CREATE OR REPLACE FUNCTION public.record_security_audit(p_action text, p_target_user_id text DEFAULT NULL::text, p_details jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions', 'pg_temp'
 SET timezone TO 'UTC'
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

select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from public.profiles where role::text in ('admin','administrador') and ativo is distinct from false limit 1),'role','authenticated')::text,true);
set local timezone='America/Sao_Paulo';
do $test$
declare
  future_id uuid := gen_random_uuid();
  first_id uuid; second_id uuid;
  future_time timestamptz;
  a public.security_audit_logs%rowtype;
  b public.security_audit_logs%rowtype;
  anonymous_blocked boolean := false;
begin
  select greatest(clock_timestamp(),coalesce(max(created_at),clock_timestamp()))+interval '1 day'
    into future_time from public.security_audit_logs;
  insert into public.security_audit_logs(id,action,details,integrity_hash,created_at)
    values(future_id,'optional_consent_granted','{"test":true}'::jsonb,repeat('f',64),future_time);
  first_id := public.record_security_audit(p_action=>'optional_consent_granted',p_target_user_id=>null::text,p_details=>'{"test":true}'::jsonb);
  second_id := public.record_security_audit(p_action=>'optional_consent_granted',p_target_user_id=>null::text,p_details=>'{"test":true}'::jsonb);
  select * into a from public.security_audit_logs where id=first_id;
  select * into b from public.security_audit_logs where id=second_id;
  if not(a.created_at>future_time and b.created_at>a.created_at and a.previous_hash=repeat('f',64) and b.previous_hash=a.integrity_hash) then
    raise exception 'Audit order regression failed';
  end if;
  if current_setting('TimeZone')<>'America/Sao_Paulo' then raise exception 'Caller timezone not restored';end if;
  perform set_config('TimeZone','UTC',true);
  if a.integrity_hash<>encode(extensions.digest(concat_ws('|',coalesce(a.previous_hash,''),a.id::text,coalesce(a.actor_user_id::text,''),coalesce(a.target_user_id::text,''),a.action,coalesce(a.details,'{}'::jsonb)::text,a.created_at::text),'sha256'),'hex') then
    raise exception 'UTC hash regression failed';
  end if;
  perform set_config('request.jwt.claims','{}',true);
  begin
    perform public.record_security_audit(p_action=>'optional_consent_granted',p_target_user_id=>null::text,p_details=>'{}'::jsonb);
  exception when insufficient_privilege then anonymous_blocked:=true;end;
  if not anonymous_blocked then raise exception 'Anonymous writer was not blocked';end if;
  perform set_config('nexlab.audit_regression_result',jsonb_build_object('passed',true,'future_clock_handled',true,'strict_order',true,'predecessor_matches',true,'utc_hash',true,'caller_timezone_restored',true,'anonymous_blocked',anonymous_blocked,'persisted_test_records',0)::text,true);
end;
$test$;
select current_setting('nexlab.audit_regression_result')::jsonb as regression;
rollback;
