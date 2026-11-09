CREATE OR REPLACE FUNCTION public.record_security_audit(action_name text, target_user_id uuid DEFAULT NULL::uuid, event_details jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions', 'pg_temp'
AS $function$
declare
  requester_role text;
  requester_active boolean;
  requester_name text;
  requester_email text;
  requester_permissions text[];
  allowed_action boolean:=false;
begin
  if auth.uid() is null then
    raise exception 'Autenticação obrigatória.' using errcode='42501';
  end if;
  select profile.role::text,profile.ativo is distinct from false,
         profile.nome::text,profile.email::text,
         coalesce(profile.effective_permissions,'{}'::text[])
    into requester_role,requester_active,requester_name,requester_email,requester_permissions
  from public.profiles profile where profile.id=auth.uid();
  if requester_role is null or not requester_active then
    raise exception 'Perfil não autorizado.' using errcode='42501';
  end if;
  if action_name in ('user_access_updated','user_deactivated','user_reactivated','user_deleted','event_deleted','project_deleted','team_deleted','meeting_deleted','reservation_deleted','marketing_deleted','asset_deleted','post_deleted') then
    allowed_action:=lower(requester_role) in ('admin','administrador');
  elsif action_name='event_created' then allowed_action:='events_create'=any(requester_permissions);
  elsif action_name='event_updated' then allowed_action:='events_manage'=any(requester_permissions);
  elsif action_name='meeting_created' then allowed_action:='meetings_create'=any(requester_permissions);
  elsif action_name in ('meeting_updated','meeting_cancelled') then allowed_action:='meetings_manage_own'=any(requester_permissions) or 'meetings_manage_all'=any(requester_permissions);
  elsif action_name='feedback_created' then allowed_action:='module_feedback'=any(requester_permissions);
  elsif action_name='feedback_status_updated' then allowed_action:='feedback_manage'=any(requester_permissions);
  elsif action_name in ('marketing_created','marketing_updated','marketing_status_updated') then allowed_action:='marketing_manage'=any(requester_permissions);
  elsif action_name='post_created' then allowed_action:='mural_publish'=any(requester_permissions);
  elsif action_name='post_updated' then allowed_action:='mural_publish'=any(requester_permissions) or 'mural_moderate'=any(requester_permissions);
  elsif action_name in ('reservation_approved','reservation_rejected') then allowed_action:='reservations_review'=any(requester_permissions);
  elsif action_name='reservation_cancelled' then allowed_action:='reservations_create'=any(requester_permissions) or 'reservations_manage_all'=any(requester_permissions);
  elsif action_name in ('project_created','project_updated','project_status_updated') then allowed_action:='projects_manage_own'=any(requester_permissions) or 'projects_manage_all'=any(requester_permissions);
  elsif action_name in ('team_created','team_updated','team_archived','team_restored') then allowed_action:='teams_manage_own'=any(requester_permissions) or 'teams_manage_all'=any(requester_permissions);
  elsif action_name in ('asset_created','asset_updated','asset_condition_updated') then allowed_action:='patrimonio_manage'=any(requester_permissions);
  elsif action_name='report_export_recorded' then
    allowed_action:=public.nexlab_can_access_reports()
      and (public.nexlab_is_gestor() or public.nexlab_has_effective_permission_v2680('reports_export'))
      and coalesce(event_details->>'scope','')=any(array['usuarios','equipes','projetos','inventario','reservas','marketing','eventos','geral'])
      and coalesce(event_details->>'file_type','') in ('pdf','xlsx')
      and jsonb_typeof(event_details->'exported_records')='number'
      and (event_details->>'exported_records')::numeric>=0
      and (coalesce((event_details->>'confidential')::boolean,false)=false or public.nexlab_can_export_sensitive_data());
  elsif action_name in ('detailed_user_report_pdf','detailed_user_report_excel') then allowed_action:='action_sensitive_export'=any(requester_permissions);
  end if;
  if not allowed_action then raise exception 'Ação de auditoria inválida ou não autorizada.' using errcode='42501'; end if;
  perform public.record_security_audit(action_name,target_user_id::text,coalesce(event_details,'{}'::jsonb)||jsonb_build_object('actor_name',requester_name,'actor_email',requester_email,'permission_source','effective_permissions','permission_catalog_version','26.26.0'));
end;
$function$
;
