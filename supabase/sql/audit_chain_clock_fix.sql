-- Serialize audit timestamps after the existing advisory lock.
-- Existing rows, hashes, permissions and historical alerts are preserved.
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

-- Hash verification must use the same timezone as the writer.
alter function public.nexlab_verify_security_audit_chain(integer) set timezone to 'UTC';

