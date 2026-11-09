-- Additive Patrimônio workspace. No example records, group seeding or asset deletion.
create schema if not exists nexlab_asset_private;
revoke all on schema nexlab_asset_private from public,anon;
grant usage on schema nexlab_asset_private to authenticated,service_role;

create table public.asset_groups (
 id uuid primary key default gen_random_uuid(),
 nome text not null check(char_length(btrim(nome)) between 1 and 40),
 icon_key text not null default 'chair' check(icon_key in ('chair','table','cabinet','monitor','inbox','tool','book','package')),
 color text not null default '#8754c7' check(color in ('#8754c7','#287cbe','#229da6','#4c953e','#cb8a28','#bd5353','#bb638d','#738293')),
 created_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(lower(btrim(nome)) not in ('sem grupo','sem-grupo'))
);
create unique index asset_groups_name_unique_v02682 on public.asset_groups(lower(btrim(nome)));
alter table public.asset_groups enable row level security;
revoke all on public.asset_groups from public,anon,authenticated;
grant select on public.asset_groups to authenticated;
grant all on public.asset_groups to service_role;
create policy asset_groups_read_v02682 on public.asset_groups for select to authenticated
 using((select auth.uid()) is not null and (select public.nexlab_has_permission_v26100('module_patrimonio')) and (select public.nexlab_has_permission_v26100('patrimonio_view')));

alter table public.assets add column group_id uuid references public.asset_groups(id) on delete restrict;
alter table public.assets add column tipo text check(tipo is null or char_length(tipo)<=80);
alter table public.assets add column observacoes text check(observacoes is null or char_length(observacoes)<=4000);
create index assets_group_id_v02682 on public.assets(group_id,id);
-- Physical tags are optional. Internal codes, individual quantities, all existing
-- permission policies and all nonblank tag uniqueness remain enforced.
alter table public.assets drop constraint assets_tombamento_length_check;
alter table public.assets add constraint assets_tombamento_length_check check(tombamento='' or char_length(btrim(tombamento)) between 2 and 80);
drop index public.assets_tombamento_unique_idx;
create unique index assets_tombamento_unique_idx on public.assets(lower(tombamento)) where nullif(btrim(tombamento),'') is not null;

create table public.asset_group_audit (
 id uuid primary key default gen_random_uuid(),group_id uuid,actor_id uuid references public.profiles(id) on delete set null,
 operation text not null check(operation in ('create','update','delete','move')),
 details jsonb not null default '{}'::jsonb,created_at timestamptz not null default now()
);
alter table public.asset_group_audit enable row level security;
revoke all on public.asset_group_audit from public,anon,authenticated;
grant select on public.asset_group_audit to authenticated;
grant all on public.asset_group_audit to service_role;
create policy asset_group_audit_read_v02682 on public.asset_group_audit for select to authenticated
 using((select auth.uid()) is not null and (select public.nexlab_has_permission_v26100('module_patrimonio')) and (select public.nexlab_has_permission_v26100('patrimonio_view')));

create table public.asset_condition_occurrences (
 id uuid primary key default gen_random_uuid(),asset_id uuid not null references public.assets(id) on delete cascade,
 actor_id uuid references public.profiles(id) on delete set null,actor_name text not null,
 kind text not null check(kind in ('Dano registrado','Envio à manutenção','Conserto concluído','Retorno ao uso','Correção da condição')),
 occurred_at timestamptz not null,description text not null check(char_length(btrim(description)) between 3 and 4000),
 previous_status text check(previous_status in ('disponivel','danificado','manutencao')),
 new_status text not null check(new_status in ('disponivel','danificado','manutencao')),
 created_at timestamptz not null default now()
);
create index asset_condition_occurrences_asset_v02682 on public.asset_condition_occurrences(asset_id,occurred_at desc,id);
alter table public.asset_condition_occurrences enable row level security;
revoke all on public.asset_condition_occurrences from public,anon,authenticated;
grant select on public.asset_condition_occurrences to authenticated;
grant all on public.asset_condition_occurrences to service_role;
create policy asset_condition_occurrences_read_v02682 on public.asset_condition_occurrences for select to authenticated
 using((select auth.uid()) is not null and (select public.nexlab_has_permission_v26100('module_patrimonio')) and (select public.nexlab_has_permission_v26100('patrimonio_view')) and exists(select 1 from public.assets a where a.id=asset_id));

create function nexlab_asset_private.require_manage_v02682() returns void
 language plpgsql security invoker set search_path='' as $f$
begin
 if auth.uid() is null or not public.nexlab_has_permission_v26100('module_patrimonio') or not public.nexlab_has_permission_v26100('patrimonio_manage') then
  raise exception 'Sem permissão para gerenciar o patrimônio.' using errcode='42501';
 end if;
end;$f$;
revoke all on function nexlab_asset_private.require_manage_v02682() from public,anon;
grant execute on function nexlab_asset_private.require_manage_v02682() to authenticated,service_role;

create function public.nexlab_get_asset_workspace_v02682() returns jsonb
 language plpgsql stable security invoker set search_path='' as $f$
begin
 if auth.uid() is null or not public.nexlab_has_permission_v26100('module_patrimonio') or not public.nexlab_has_permission_v26100('patrimonio_view') then
  raise exception 'Sem permissão para consultar o patrimônio.' using errcode='42501';
 end if;
 return jsonb_build_object('ok',true,
  'groups',coalesce((select jsonb_agg(to_jsonb(g) order by lower(g.nome),g.id) from public.asset_groups g),'[]'::jsonb),
  'assets',coalesce((select jsonb_agg(to_jsonb(a) order by lower(a.nome),a.id) from public.assets a),'[]'::jsonb),
  'responsibles',public.nexlab_list_asset_responsibles_v26120(),'generated_at',now());
end;$f$;
revoke all on function public.nexlab_get_asset_workspace_v02682() from public,anon;
grant execute on function public.nexlab_get_asset_workspace_v02682() to authenticated,service_role;

create function nexlab_asset_private.save_group_v02682(p_id uuid,p_payload jsonb,p_expected timestamptz default null) returns jsonb
 language plpgsql security definer set search_path='' as $f$
declare old_row public.asset_groups%rowtype;saved public.asset_groups%rowtype;n text;
begin
 perform nexlab_asset_private.require_manage_v02682();
 if jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'Dados do grupo inválidos.' using errcode='22023';end if;
 n:=regexp_replace(btrim(coalesce(p_payload->>'nome','')),'\s+',' ','g');
 if char_length(n) not between 1 and 40 or lower(n) in ('sem grupo','sem-grupo') then raise exception 'Informe um nome válido para o grupo.' using errcode='22023';end if;
 if p_id is null then
  insert into public.asset_groups(nome,icon_key,color,created_by) values(n,p_payload->>'icon_key',p_payload->>'color',auth.uid()) returning * into saved;
 else
  select * into old_row from public.asset_groups where id=p_id for update;
  if old_row.id is null then raise exception 'Grupo não encontrado.' using errcode='P0002';end if;
  if p_expected is null or old_row.updated_at is distinct from p_expected then raise exception 'Este grupo foi alterado. Atualize a tela antes de salvar.' using errcode='40001';end if;
  update public.asset_groups set nome=n,icon_key=p_payload->>'icon_key',color=p_payload->>'color',updated_at=clock_timestamp() where id=p_id returning * into saved;
 end if;
 insert into public.asset_group_audit(group_id,actor_id,operation,details) values(saved.id,auth.uid(),case when p_id is null then 'create' else 'update' end,jsonb_build_object('before',case when p_id is null then null else to_jsonb(old_row) end,'after',to_jsonb(saved)));
 return jsonb_build_object('ok',true,'group',to_jsonb(saved));
exception when unique_violation then raise exception 'Já existe um grupo com esse nome.' using errcode='23505';
end;$f$;
revoke all on function nexlab_asset_private.save_group_v02682(uuid,jsonb,timestamptz) from public,anon;
grant execute on function nexlab_asset_private.save_group_v02682(uuid,jsonb,timestamptz) to authenticated,service_role;
create function public.nexlab_save_asset_group_v02682(p_group_id uuid,p_payload jsonb,p_expected_updated_at timestamptz default null) returns jsonb
 language sql security invoker set search_path='' as $f$select nexlab_asset_private.save_group_v02682(p_group_id,p_payload,p_expected_updated_at);$f$;
revoke all on function public.nexlab_save_asset_group_v02682(uuid,jsonb,timestamptz) from public,anon;
grant execute on function public.nexlab_save_asset_group_v02682(uuid,jsonb,timestamptz) to authenticated,service_role;

create function nexlab_asset_private.move_assets_v02682(p_ids uuid[],p_target uuid,p_expected jsonb) returns jsonb
 language plpgsql security definer set search_path='' as $f$
declare a public.assets%rowtype;n integer:=0;expected_count integer;ids uuid[];
begin
 perform nexlab_asset_private.require_manage_v02682();
 select array_agg(distinct x order by x) into ids from unnest(p_ids) x;
 expected_count:=coalesce(cardinality(ids),0);
 if expected_count not between 1 and 500 or array_position(ids,null) is not null then raise exception 'Selecione entre 1 e 500 bens válidos.' using errcode='22023';end if;
 if p_target is not null then perform 1 from public.asset_groups where id=p_target for key share;if not found then raise exception 'Grupo de destino não encontrado.' using errcode='P0002';end if;end if;
 if (select count(*) from public.assets where id=any(ids))<>expected_count then raise exception 'Um dos bens não está mais disponível. Atualize a tela.' using errcode='40001';end if;
 for a in select * from public.assets where id=any(ids) order by id for update loop
  if nullif(p_expected->>a.id::text,'')::timestamptz is distinct from a.updated_at then raise exception 'Um dos bens foi alterado. Atualize a tela antes de mover.' using errcode='40001';end if;
  n:=n+1;
 end loop;
 if n<>expected_count then raise exception 'Um dos bens foi removido. Atualize a tela antes de mover.' using errcode='40001';end if;
 n:=0;
 for a in select * from public.assets where id=any(ids) order by id loop
  if a.group_id is distinct from p_target then
   update public.assets set group_id=p_target where id=a.id;
   insert into public.asset_group_audit(group_id,actor_id,operation,details) values(p_target,auth.uid(),'move',jsonb_build_object('asset_id',a.id,'codigo_patrimonial',a.codigo_patrimonial,'from_group',a.group_id,'to_group',p_target));
   perform public.record_security_audit('asset_updated',null::text,jsonb_build_object('entity_id',a.id,'entity_name',a.nome,'module','patrimonio','operation','group_move','from_group',a.group_id,'to_group',p_target));
   n:=n+1;
  end if;
 end loop;
 return jsonb_build_object('ok',true,'moved',n);
end;$f$;
revoke all on function nexlab_asset_private.move_assets_v02682(uuid[],uuid,jsonb) from public,anon;
grant execute on function nexlab_asset_private.move_assets_v02682(uuid[],uuid,jsonb) to authenticated,service_role;
create function public.nexlab_move_assets_to_group_v02682(p_asset_ids uuid[],p_group_id uuid,p_expected_updated_at jsonb) returns jsonb
 language sql security invoker set search_path='' as $f$select nexlab_asset_private.move_assets_v02682(p_asset_ids,p_group_id,p_expected_updated_at);$f$;
revoke all on function public.nexlab_move_assets_to_group_v02682(uuid[],uuid,jsonb) from public,anon;
grant execute on function public.nexlab_move_assets_to_group_v02682(uuid[],uuid,jsonb) to authenticated,service_role;

create function nexlab_asset_private.delete_group_v02682(p_id uuid,p_target uuid,p_expected timestamptz) returns jsonb
 language plpgsql security definer set search_path='' as $f$
declare g public.asset_groups%rowtype;a public.assets%rowtype;n integer:=0;
begin
 perform nexlab_asset_private.require_manage_v02682();
 if p_id is null or p_target=p_id then raise exception 'Escolha outro grupo de destino.' using errcode='22023';end if;
 -- Order group locks consistently for simultaneous cross-group deletions.
 perform 1 from public.asset_groups where id in(p_id,p_target) order by id for update;
 select * into g from public.asset_groups where id=p_id;
 if g.id is null then raise exception 'Grupo não encontrado.' using errcode='P0002';end if;
 if p_expected is null or g.updated_at is distinct from p_expected then raise exception 'O grupo foi alterado. Atualize a tela antes de excluir.' using errcode='40001';end if;
 if p_target is not null and not exists(select 1 from public.asset_groups where id=p_target) then raise exception 'Grupo de destino não encontrado.' using errcode='P0002';end if;
 for a in select * from public.assets where group_id=p_id order by id for update loop
  update public.assets set group_id=p_target where id=a.id;
  perform public.record_security_audit('asset_updated',null::text,jsonb_build_object('entity_id',a.id,'entity_name',a.nome,'module','patrimonio','operation','group_deleted_transfer','from_group',p_id,'to_group',p_target));n:=n+1;
 end loop;
 insert into public.asset_group_audit(group_id,actor_id,operation,details) values(p_id,auth.uid(),'delete',jsonb_build_object('before',to_jsonb(g),'transferred',n,'to_group',p_target));
 delete from public.asset_groups where id=p_id;
 return jsonb_build_object('ok',true,'transferred',n);
end;$f$;
revoke all on function nexlab_asset_private.delete_group_v02682(uuid,uuid,timestamptz) from public,anon;
grant execute on function nexlab_asset_private.delete_group_v02682(uuid,uuid,timestamptz) to authenticated,service_role;
create function public.nexlab_delete_asset_group_v02682(p_group_id uuid,p_target_group_id uuid,p_expected_updated_at timestamptz) returns jsonb
 language sql security invoker set search_path='' as $f$select nexlab_asset_private.delete_group_v02682(p_group_id,p_target_group_id,p_expected_updated_at);$f$;
revoke all on function public.nexlab_delete_asset_group_v02682(uuid,uuid,timestamptz) from public,anon;
grant execute on function public.nexlab_delete_asset_group_v02682(uuid,uuid,timestamptz) to authenticated,service_role;

create function public.nexlab_get_asset_workspace_history_v02682(p_asset_id uuid) returns jsonb
 language plpgsql stable security invoker set search_path='' as $f$
declare old jsonb;names jsonb;
begin
 if auth.uid() is null or not public.nexlab_has_permission_v26100('module_patrimonio') or not public.nexlab_has_permission_v26100('patrimonio_view') then raise exception 'Sem permissão para consultar o patrimônio.' using errcode='42501';end if;
 if not exists(select 1 from public.assets where id=p_asset_id) then raise exception 'Bem não encontrado.' using errcode='P0002';end if;
 old:=public.nexlab_get_asset_history_v26120(p_asset_id);
 return coalesce(old,'{}'::jsonb)||jsonb_build_object('ok',true,'occurrences',coalesce((select jsonb_agg(to_jsonb(o) order by o.occurred_at desc,o.id) from public.asset_condition_occurrences o where asset_id=p_asset_id),'[]'::jsonb));
end;$f$;
revoke all on function public.nexlab_get_asset_workspace_history_v02682(uuid) from public,anon;
grant execute on function public.nexlab_get_asset_workspace_history_v02682(uuid) to authenticated,service_role;

create function nexlab_asset_private.save_asset_v02682(p_id uuid,p_payload jsonb,p_occurrence jsonb default null,p_expected timestamptz default null) returns jsonb
 language plpgsql security definer set search_path='' as $f$
declare
 before_row public.assets%rowtype;saved public.assets%rowtype;payload jsonb;details jsonb;
 target_group uuid;tag text;new_code text;val numeric(18,2);status_before text;status_after text;
 occurrence_kind text;occurrence_description text;occurrence_date timestamptz;actor_name text;
 open_maintenance public.asset_maintenance%rowtype;maintenance_count integer;result jsonb;
begin
 perform nexlab_asset_private.require_manage_v02682();
 if jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'Dados do bem inválidos.' using errcode='22023';end if;
 if p_id is not null then
  select * into before_row from public.assets where id=p_id;
  if before_row.id is null then raise exception 'Bem não encontrado.' using errcode='P0002';end if;
 end if;
 payload:=coalesce(to_jsonb(before_row),'{}'::jsonb)||p_payload;
 target_group:=nullif(payload->>'group_id','')::uuid;
 -- Group references are locked before asset rows, matching group deletion/moves.
 perform 1 from public.asset_groups where id in(target_group,before_row.group_id) order by id for key share;
 if target_group is not null and not exists(select 1 from public.asset_groups where id=target_group) then raise exception 'Grupo não encontrado. Atualize a tela.' using errcode='P0002';end if;
 if p_id is not null then
  select * into before_row from public.assets where id=p_id for update;
  if before_row.inconsistente then raise exception 'Este cadastro precisa de revisão de integridade antes da edição.' using errcode='22023';end if;
  if p_expected is null or before_row.updated_at is distinct from p_expected then raise exception 'Este bem foi alterado. Atualize a tela antes de salvar.' using errcode='40001';end if;
  if p_payload ? 'codigo_patrimonial' and p_payload->>'codigo_patrimonial' is distinct from before_row.codigo_patrimonial then raise exception 'O código interno do bem não pode ser alterado.' using errcode='22023';end if;
 end if;
 if char_length(btrim(coalesce(payload->>'nome',''))) not between 2 and 160 then raise exception 'O nome deve ter entre 2 e 160 caracteres.' using errcode='22023';end if;
 if coalesce(payload->>'categoria','') not in ('Equipamento','Mobiliário','Infraestrutura') then raise exception 'Escolha uma categoria patrimonial válida.' using errcode='22023';end if;
 tag:=upper(btrim(coalesce(payload->>'tombamento','')));
 if tag<>'' and char_length(tag) not between 2 and 80 then raise exception 'A etiqueta deve ter entre 2 e 80 caracteres ou ficar vazia.' using errcode='22023';end if;
 if char_length(coalesce(payload->>'localizacao',''))>180 or char_length(coalesce(payload->>'descricao',''))>2000 or char_length(coalesce(payload->>'tipo',''))>80 or char_length(coalesce(payload->>'observacoes',''))>4000 then raise exception 'Revise o tamanho dos campos do bem.' using errcode='22023';end if;
 if replace(coalesce(payload->>'valor_aquisicao','0'),',','.') !~ '^[0-9]+([.][0-9]{1,2})?$' then raise exception 'Informe um valor de aquisição válido.' using errcode='22023';end if;
 val:=replace(coalesce(payload->>'valor_aquisicao','0'),',','.')::numeric;
 status_before:=case when p_id is null then null when before_row.quantidade_danificada=1 then 'danificado' when before_row.quantidade_manutencao=1 then 'manutencao' else 'disponivel' end;
 status_after:=coalesce(nullif(p_payload->>'condicao',''),status_before,'disponivel');
 if status_after not in ('disponivel','danificado','manutencao') then raise exception 'Condição inválida.' using errcode='22023';end if;
 if (p_id is not null and status_after is distinct from status_before) or (p_id is null and status_after<>'disponivel') then
  if jsonb_typeof(p_occurrence) is distinct from 'object' then raise exception 'Informe a ocorrência da mudança de condição.' using errcode='22023';end if;
  occurrence_kind:=p_occurrence->>'kind';occurrence_description:=btrim(coalesce(p_occurrence->>'description',''));
  if char_length(occurrence_description) not between 3 and 2000 or coalesce(p_occurrence->>'datetime_local','') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$' then raise exception 'Informe data, horário e descrição da ocorrência, com até 2.000 caracteres.' using errcode='22023';end if;
  occurrence_date:=(p_occurrence->>'datetime_local')::timestamp at time zone 'America/Sao_Paulo';
  if occurrence_kind not in ('Dano registrado','Envio à manutenção','Conserto concluído','Retorno ao uso','Correção da condição') or occurrence_kind is null then raise exception 'Tipo de ocorrência inválido.' using errcode='22023';end if;
  if occurrence_kind<>'Correção da condição' and not ((status_after='danificado' and occurrence_kind='Dano registrado') or (status_after='manutencao' and occurrence_kind='Envio à manutenção') or (status_after='disponivel' and occurrence_kind in ('Conserto concluído','Retorno ao uso'))) then raise exception 'A ocorrência não corresponde à condição escolhida.' using errcode='22023';end if;
 end if;
 if p_id is null then
  new_code:=public.nexlab_next_asset_code_v26110();
  insert into public.assets(nome,categoria,quantidade,valor_unitario,valor,valor_aquisicao,localizacao,descricao,quantidade_manutencao,quantidade_danificada,qt_manutencao,qt_danificado,qt_disponivel,qt_uso,codigo_patrimonial,tombamento,inconsistente,inconsistencia_motivo,group_id,tipo,observacoes)
  values(btrim(payload->>'nome'),payload->>'categoria',1,val,val,val,nullif(btrim(payload->>'localizacao'),''),nullif(btrim(payload->>'descricao'),''),0,0,0,0,1,0,new_code,tag,false,null,target_group,nullif(btrim(payload->>'tipo'),''),nullif(btrim(payload->>'observacoes'),'')) returning * into saved;
 else
  update public.assets set nome=btrim(payload->>'nome'),categoria=payload->>'categoria',valor_aquisicao=val,valor_unitario=val,valor=val,localizacao=nullif(btrim(payload->>'localizacao'),''),descricao=nullif(btrim(payload->>'descricao'),''),tombamento=tag,group_id=target_group,tipo=nullif(btrim(payload->>'tipo'),''),observacoes=nullif(btrim(payload->>'observacoes'),'') where id=p_id returning * into saved;
 end if;
 details:=public.nexlab_set_asset_details_v26120(saved.id,payload||jsonb_build_object('valor_aquisicao',val::text));
 if not coalesce((details->>'ok')::boolean,false) then raise exception 'Não foi possível salvar os detalhes do bem.';end if;
 perform public.record_security_audit(case when p_id is null then 'asset_created' else 'asset_updated' end,null::text,jsonb_build_object('entity_id',saved.id,'entity_name',saved.nome,'module','patrimonio','codigo_patrimonial',saved.codigo_patrimonial,'tombamento',tag,'operation',case when p_id is null then 'create' else 'update' end,'group_id',target_group,'unit_value',val));
 if occurrence_kind is not null then
  select count(*) into maintenance_count from public.asset_maintenance where asset_id=saved.id and status='aberta';
  if status_after='manutencao' then
   if maintenance_count=0 then
    result:=public.nexlab_start_asset_maintenance_v26120(saved.id,jsonb_build_object('data_envio',(occurrence_date at time zone 'America/Sao_Paulo')::date,'descricao_problema',occurrence_description,'observacoes',occurrence_description,'custo','0'));
    if not coalesce((result->>'ok')::boolean,false) then raise exception 'Não foi possível abrir a manutenção.';end if;
   else perform public.nexlab_update_asset_condition_v26100(saved.id,1,0);
   end if;
  elsif status_after='disponivel' and maintenance_count>0 then
   if maintenance_count<>1 then raise exception 'Revise as manutenções em aberto no histórico antes de liberar este bem.' using errcode='22023';end if;
   select * into open_maintenance from public.asset_maintenance where asset_id=saved.id and status='aberta' for update;
   result:=public.nexlab_finish_asset_maintenance_v26120(open_maintenance.id,jsonb_build_object('data_retorno',(occurrence_date at time zone 'America/Sao_Paulo')::date,'descricao_solucao',occurrence_description));
   if not coalesce((result->>'ok')::boolean,false) then raise exception 'Não foi possível concluir a manutenção.';end if;
  else
   if status_after='danificado' and maintenance_count>0 then raise exception 'Conclua a manutenção no histórico antes de registrar outra condição.' using errcode='22023';end if;
   perform public.nexlab_update_asset_condition_v26100(saved.id,0,case when status_after='danificado' then 1 else 0 end);
  end if;
  select coalesce(nome,'Usuário autorizado') into actor_name from public.profiles where id=auth.uid();
  insert into public.asset_condition_occurrences(asset_id,actor_id,actor_name,kind,occurred_at,description,previous_status,new_status) values(saved.id,auth.uid(),coalesce(actor_name,'Usuário autorizado'),occurrence_kind,occurrence_date,occurrence_description,status_before,status_after);
 end if;
 select * into saved from public.assets where id=saved.id;
 return jsonb_build_object('ok',true,'asset',to_jsonb(saved));
exception when unique_violation then raise exception 'Etiqueta, tombamento ou número de série já cadastrado.' using errcode='23505';
end;$f$;
revoke all on function nexlab_asset_private.save_asset_v02682(uuid,jsonb,jsonb,timestamptz) from public,anon;
grant execute on function nexlab_asset_private.save_asset_v02682(uuid,jsonb,jsonb,timestamptz) to authenticated,service_role;
create function public.nexlab_save_asset_workspace_v02682(p_asset_id uuid,p_payload jsonb,p_occurrence jsonb default null,p_expected_updated_at timestamptz default null) returns jsonb
 language sql security invoker set search_path='' as $f$select nexlab_asset_private.save_asset_v02682(p_asset_id,p_payload,p_occurrence,p_expected_updated_at);$f$;
revoke all on function public.nexlab_save_asset_workspace_v02682(uuid,jsonb,jsonb,timestamptz) from public,anon;
grant execute on function public.nexlab_save_asset_workspace_v02682(uuid,jsonb,jsonb,timestamptz) to authenticated,service_role;

do $publication$
begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='asset_groups') then
  alter publication supabase_realtime add table public.asset_groups;
 end if;
end;$publication$;
notify pgrst,'reload schema';

CREATE OR REPLACE FUNCTION public.nexlab_backup_export_payload_v1()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'storage', 'pg_temp'
AS $function$
declare
  v_tables text[] := array[
    'profiles','profile_sensitive','profile_role_requests','profile_management_history',
    'teams','team_members','team_links','team_history',
    'projects','project_tasks','project_links','project_history','tasks',
    'meetings','meeting_participants','bookings','booking_participants','booking_resources','booking_history',
    'reservations','reservation_participants','events','event_participants','spaces',
    'asset_groups','assets','asset_group_audit','asset_condition_occurrences','asset_movements','asset_maintenance','asset_changes','stock_items','nexlab_stock_movements',
    'marketing','marketing_dates','board_posts','attachments',
    'feedback','feedback_replies','nexlab_feedback_attachments',
    'notifications','notification_preferences','notification_user_settings',
    'nexlab_permission_catalog','nexlab_role_permission_defaults','nexlab_user_permission_overrides','nexlab_permission_dependencies',
    'nexlab_user_interface_settings','nexlab_system_settings',
    'nexlab_privacy_documents','nexlab_privacy_acceptances','nexlab_optional_consents','nexlab_data_requests'
  ];
  v_table text;
  v_rows jsonb;
  v_tables_json jsonb := '{}'::jsonb;
  v_counts jsonb := '{}'::jsonb;
  v_count bigint;
begin
  if coalesce(auth.role(),'') <> 'service_role' then
    raise exception 'Acesso exclusivo do serviço de backup.' using errcode='42501';
  end if;

  foreach v_table in array v_tables loop
    if to_regclass(format('public.%I',v_table)) is not null then
      execute format('select coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb), count(*) from public.%I t',v_table)
        into v_rows, v_count;
      v_tables_json := v_tables_json || jsonb_build_object(v_table, coalesce(v_rows,'[]'::jsonb));
      v_counts := v_counts || jsonb_build_object(v_table, coalesce(v_count,0));
    end if;
  end loop;

  return jsonb_build_object(
    'schema_version',1,
    'app_version','0.26.82',
    'created_at',now(),
    'tables',v_tables_json,
    'row_counts',v_counts
  );
end
$function$;

CREATE OR REPLACE FUNCTION public.nexlab_backup_restore_payload_v1(p_payload jsonb, p_backup_id uuid, p_actor uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_tables text[] := array['profiles','nexlab_privacy_documents','nexlab_permission_catalog','nexlab_system_settings','spaces','profile_sensitive','profile_role_requests','profile_management_history','teams','team_members','team_links','team_history','projects','project_tasks','project_links','project_history','meetings','meeting_participants','tasks','bookings','booking_participants','booking_resources','booking_history','reservations','reservation_participants','events','event_participants','asset_groups','assets','asset_group_audit','asset_condition_occurrences','asset_movements','asset_maintenance','asset_changes','stock_items','nexlab_stock_movements','marketing','marketing_dates','board_posts','attachments','feedback','feedback_replies','nexlab_feedback_attachments','notifications','notification_preferences','notification_user_settings','nexlab_role_permission_defaults','nexlab_user_permission_overrides','nexlab_permission_dependencies','nexlab_user_interface_settings','nexlab_privacy_acceptances','nexlab_optional_consents','nexlab_data_requests'];
  v_table text; v_rows jsonb; v_cols text; v_select_cols text; v_pk_cols text; v_updates text; v_sql text;
  v_changed bigint:=0; v_total bigint:=0; v_expected bigint:=0; v_summary jsonb:='{}'::jsonb;
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Acesso exclusivo do serviço de backup.' using errcode='42501'; end if;
  if p_actor is null or not exists(select 1 from public.profiles p where p.id=p_actor and p.ativo is distinct from false and lower(p.role::text) in ('admin','administrador')) then raise exception 'Restauração exclusiva de Administradores.' using errcode='42501'; end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' or coalesce((p_payload->>'schema_version')::int,0)<>1 or coalesce(p_payload->>'app_version','')<>'0.26.82' or jsonb_typeof(p_payload->'tables')<>'object' then raise exception 'Snapshot incompatível com o NEXLAB Beta 0.26.82.' using errcode='22023'; end if;

  perform set_config('nexlab.restore_flow','trusted',true);

  foreach v_table in array v_tables loop
    v_rows:=p_payload->'tables'->v_table;
    if v_table='nexlab_system_settings' and jsonb_typeof(v_rows)='array' then
      select coalesce(jsonb_agg(x),'[]'::jsonb) into v_rows
      from jsonb_array_elements(v_rows) x
      where coalesce(x->>'setting_key','') not in ('current_build_revision','current_asset_revision','sensitive_permission_password','vapid_rotation_r52','feedback_external_storage','notification_worker_secret_sha256');
    end if;
    if v_rows is null or jsonb_typeof(v_rows)<>'array' or jsonb_array_length(v_rows)=0 then v_summary:=v_summary||jsonb_build_object(v_table,0); continue; end if;
    if to_regclass(format('public.%I',v_table)) is null then raise exception 'Tabela de restauração ausente: %',v_table using errcode='42P01'; end if;

    select string_agg(format('%I',a.attname),', ' order by a.attnum),string_agg(format('r.%I',a.attname),', ' order by a.attnum)
      into v_cols,v_select_cols from pg_attribute a where a.attrelid=to_regclass(format('public.%I',v_table)) and a.attnum>0 and not a.attisdropped and a.attgenerated='';
    select string_agg(format('%I',a.attname),', ' order by x.ord) into v_pk_cols
      from pg_index i join lateral unnest(i.indkey) with ordinality x(attnum,ord) on true join pg_attribute a on a.attrelid=i.indrelid and a.attnum=x.attnum
      where i.indrelid=to_regclass(format('public.%I',v_table)) and i.indisprimary;
    if coalesce(v_pk_cols,'')='' then raise exception 'Tabela sem chave primária para restauração segura: %',v_table using errcode='55000'; end if;
    select string_agg(format('%1$I = excluded.%1$I',a.attname),', ' order by a.attnum) into v_updates
      from pg_attribute a where a.attrelid=to_regclass(format('public.%I',v_table)) and a.attnum>0 and not a.attisdropped and a.attgenerated='' and a.attname not in(
        select pka.attname from pg_index pi join lateral unnest(pi.indkey) pkx(attnum) on true join pg_attribute pka on pka.attrelid=pi.indrelid and pka.attnum=pkx.attnum where pi.indrelid=to_regclass(format('public.%I',v_table)) and pi.indisprimary);

    v_sql:=format('insert into public.%1$I as target (%2$s) select %3$s from jsonb_populate_recordset(null::public.%1$I,$1) as r on conflict (%4$s) %5$s',v_table,v_cols,v_select_cols,v_pk_cols,
      case when coalesce(v_updates,'')='' then 'do nothing' else 'do update set '||v_updates||' where to_jsonb(target) is distinct from to_jsonb(excluded)' end);
    execute v_sql using v_rows;
    get diagnostics v_changed=row_count;
    v_expected:=jsonb_array_length(v_rows); v_total:=v_total+v_changed;
    v_summary:=v_summary||jsonb_build_object(v_table,jsonb_build_object('snapshot_rows',v_expected,'applied_rows',v_changed,'unchanged_rows',greatest(v_expected-v_changed,0)));
  end loop;

  perform set_config('nexlab.restore_flow','',true);
  return jsonb_build_object('ok',true,'mode','logical_merge_guarded','backup_id',p_backup_id,'actor_id',p_actor,'applied_rows',v_total,'tables',v_summary,'side_effects_suppressed',true,'protected_runtime_settings',true,'note','Recuperação lógica protegida: somente diferenças são aplicadas; históricos, notificações e entregas externas não são gerados pelo restore.');
exception when others then
  perform set_config('nexlab.restore_flow','',true);
  raise;
end
$function$;

create or replace function public.nexlab_get_module_reports_v02682(p_scope text default 'catalog',p_start date default null,p_end date default null)
returns jsonb language plpgsql stable security invoker set search_path=public,auth,pg_temp as $f$
declare
 scope_name text:=lower(btrim(coalesce(p_scope,'')));
 allowed jsonb; result jsonb:='[]'::jsonb; packet jsonb; src jsonb; common_data jsonb;
 rows_data jsonb:='[]'::jsonb; children jsonb:='[]'::jsonb; extra jsonb:='[]'::jsonb;
 sheets jsonb:='[]'::jsonb; module_id text; cnt integer:=0; can_export boolean;
begin
 if auth.uid() is null then
  raise exception 'Usuário sem autorização para acessar relatórios.' using errcode='42501';
 end if;
 src:=public.nexlab_get_reports_overview_v26350();
 if (p_start is null)<>(p_end is null) or p_start>p_end then
  raise exception 'Informe um período de datas válido.' using errcode='22023';
 end if;
 can_export:=public.nexlab_has_effective_permission_v2680('reports_export') or public.nexlab_is_gestor();
 allowed:=jsonb_build_object(
  'usuarios',can_export and public.nexlab_has_effective_permission_v2680('reports_export') and public.nexlab_has_effective_permission_v2680('module_participantes'),
  'equipes',can_export and public.nexlab_has_effective_permission_v2680('module_equipes') and public.nexlab_can_view_all_teams_v2680(),
  'projetos',can_export and public.nexlab_has_project_permission_v2690('module_projetos') and (public.nexlab_has_project_permission_v2690('projects_view_all') or public.nexlab_has_project_permission_v2690('projects_manage_all')),
  'inventario',can_export and public.nexlab_has_effective_permission_v2680('reports_export') and public.nexlab_has_effective_permission_v2680('module_estoque') and public.nexlab_has_effective_permission_v2680('estoque_view') and public.nexlab_has_effective_permission_v2680('module_patrimonio') and public.nexlab_has_effective_permission_v2680('patrimonio_view') and public.nexlab_has_effective_permission_v2680('patrimonio_export'),
  'reservas',can_export and public.nexlab_has_effective_permission_v2680('reports_export') and public.nexlab_has_effective_permission_v2680('module_reserva') and public.nexlab_has_effective_permission_v2680('reservations_manage_all'),
  'marketing',can_export and public.nexlab_has_effective_permission_v2680('module_marketing'),
  'eventos',can_export and public.nexlab_has_effective_permission_v2680('module_eventos')
 );
 if scope_name in ('catalog','geral') then
  if scope_name='geral' and exists(select 1 from jsonb_each_text(allowed) x where x.value<>'true') then
   raise exception 'Seu perfil não possui acesso a todos os módulos do relatório geral.' using errcode='42501';
  end if;
  foreach module_id in array array['usuarios','equipes','projetos','inventario','reservas','marketing','eventos'] loop
   if coalesce((allowed->>module_id)::boolean,false) then
    packet:=public.nexlab_get_module_reports_v02682(module_id,p_start,p_end);
    if scope_name='catalog' then
     packet:=jsonb_build_object('id',module_id,'authorized',true,'record_count',packet->'record_count',
       'sections',(select coalesce(jsonb_agg(jsonb_build_object('name',x->>'name','records',jsonb_array_length(x->'rows'))),'[]'::jsonb) from jsonb_array_elements(packet->'sheets') x));
    end if;
   else packet:=jsonb_build_object('id',module_id,'authorized',false,'record_count',null,'sections','[]'::jsonb);
   end if;
   result:=result||jsonb_build_array(packet);
  end loop;
  return jsonb_build_object('ok',true,'modules',result,'general_authorized',not exists(select 1 from jsonb_each_text(allowed) x where x.value<>'true'),'generated_at',now());
 end if;
 if not allowed ? scope_name then raise exception 'Módulo de relatório inválido.' using errcode='22023'; end if;
 if not coalesce((allowed->>scope_name)::boolean,false) then raise exception 'Seu perfil não possui autorização para este relatório.' using errcode='42501'; end if;

 if scope_name='usuarios' then
  src:=public.nexlab_get_operational_report_v26350('usuarios_operacional',false);
  rows_data:=public.nexlab_filter_report_rows_v02682(src#>'{sheets,0,rows}','created_at',p_start,p_end);
  select coalesce(jsonb_agg(to_jsonb(q) order by q.perfil),'[]'::jsonb) into extra from
   (select x->>'perfil' perfil,count(*) quantidade from jsonb_array_elements(rows_data) x group by x->>'perfil') q;
  sheets:=jsonb_build_array(jsonb_build_object('name','Cadastros e vínculos','columns','[{"key": "nome", "label": "Nome"}, {"key": "perfil", "label": "Perfil"}, {"key": "situacao", "label": "Situação"}, {"key": "cadastro", "label": "Cadastro"}, {"key": "equipes", "label": "Equipes"}, {"key": "projetos_responsavel", "label": "Projetos"}, {"key": "created_at", "label": "Cadastrado em"}]'::jsonb,'rows',rows_data),jsonb_build_object('name','Perfis e participação','columns','[{"key": "perfil", "label": "Perfil"}, {"key": "quantidade", "label": "Usuários"}]'::jsonb,'rows',extra));
 elsif scope_name='equipes' then
  src:=public.nexlab_get_teams_report_v2681();
  rows_data:=public.nexlab_filter_report_rows_v02682(src->'teams','created_at',p_start,p_end);
  select coalesce(jsonb_agg((m.value-'user_id')||jsonb_build_object('equipe',t.value->>'nome') order by t.ordinality,m.ordinality),'[]'::jsonb) into children
   from jsonb_array_elements(rows_data) with ordinality t(value,ordinality) cross join lateral jsonb_array_elements(t.value->'members') with ordinality m(value,ordinality);
  select coalesce(jsonb_agg((l.value-'entity_id')||jsonb_build_object('equipe',t.value->>'nome') order by t.ordinality,l.ordinality),'[]'::jsonb) into extra
   from jsonb_array_elements(rows_data) with ordinality t(value,ordinality) cross join lateral jsonb_array_elements(t.value->'links') with ordinality l(value,ordinality);
  sheets:=jsonb_build_array(jsonb_build_object('name','Equipes','columns','[{"key": "nome", "label": "Equipe"}, {"key": "area", "label": "Área"}, {"key": "status", "label": "Situação"}, {"key": "responsavel", "label": "Responsável"}, {"key": "members_count", "label": "Integrantes"}, {"key": "project_links", "label": "Projetos vinculados"}, {"key": "event_links", "label": "Eventos vinculados"}, {"key": "meeting_links", "label": "Reuniões vinculadas"}, {"key": "created_at", "label": "Criada em"}, {"key": "descricao", "label": "Descrição"}]'::jsonb,'rows',rows_data),jsonb_build_object('name','Integrantes','columns','[{"key": "equipe", "label": "Equipe"}, {"key": "nome", "label": "Integrante"}, {"key": "funcao", "label": "Função"}, {"key": "adicionado_em", "label": "Adicionado em"}]'::jsonb,'rows',children),jsonb_build_object('name','Vínculos operacionais','columns','[{"key": "equipe", "label": "Equipe"}, {"key": "entity_type", "label": "Tipo"}, {"key": "label", "label": "Registro vinculado"}, {"key": "subtitle", "label": "Detalhe"}]'::jsonb,'rows',extra));
 elsif scope_name='projetos' then
  src:=public.nexlab_get_projects_report_v2690();
  rows_data:=public.nexlab_filter_report_rows_v02682(src->'projects','created_at',p_start,p_end);
  common_data:=public.nexlab_get_general_report_v26320();
  if not coalesce((common_data#>>'{sections,projetos,authorized}')::boolean,false) then raise exception 'Sem acesso ao relatório de projetos.' using errcode='42501'; end if;
  select coalesce(jsonb_agg(t.value||jsonb_build_object('projeto',p.value->>'name','situacao',case when coalesce((t.value->>'done')::boolean,false) then 'Concluída' else 'Pendente' end,'responsavel',coalesce((select u->>'nome' from jsonb_array_elements(common_data->'users') u where u->>'id'=t.value->>'responsavel_id' limit 1),'Não definido')) order by p.ordinality,t.ordinality),'[]'::jsonb) into children
   from jsonb_array_elements(rows_data) with ordinality p(value,ordinality) cross join lateral jsonb_array_elements(coalesce(common_data->'project_tasks'->(p.value->>'id'),'[]'::jsonb)) with ordinality t(value,ordinality);
  extra:=rows_data;
  sheets:=jsonb_build_array(jsonb_build_object('name','Projetos','columns','[{"key": "name", "label": "Projeto"}, {"key": "status_label", "label": "Situação"}, {"key": "priority_label", "label": "Prioridade"}, {"key": "responsible_name", "label": "Responsável"}, {"key": "team_name", "label": "Equipe"}, {"key": "deadline", "label": "Prazo"}, {"key": "progress", "label": "Progresso (%)"}, {"key": "created_at", "label": "Criado em"}, {"key": "description", "label": "Descrição"}]'::jsonb,'rows',rows_data),jsonb_build_object('name','Tarefas','columns','[{"key": "projeto", "label": "Projeto"}, {"key": "titulo", "label": "Tarefa"}, {"key": "situacao", "label": "Situação"}, {"key": "responsavel", "label": "Responsável"}, {"key": "created_at", "label": "Criada em"}]'::jsonb,'rows',children),jsonb_build_object('name','Vínculos por projeto','columns','[{"key": "name", "label": "Projeto"}, {"key": "event_links", "label": "Eventos vinculados"}, {"key": "meeting_links", "label": "Reuniões vinculadas"}]'::jsonb,'rows',extra));
 elsif scope_name='inventario' then
  src:=public.nexlab_get_operational_report_v26350('estoque',false);
  common_data:=public.nexlab_get_general_report_v26320();
  if not coalesce((common_data#>>'{sections,patrimonio,authorized}')::boolean,false) then raise exception 'Sem acesso ao relatório patrimonial.' using errcode='42501'; end if;
  select coalesce(jsonb_agg(x||jsonb_build_object('grupo',coalesce(g.nome,'Sem grupo'),'tipo',a.tipo) order by x->>'codigo_patrimonial'),'[]'::jsonb) into rows_data from jsonb_array_elements(coalesce(common_data->'assets','[]'::jsonb)) x join public.assets a on a.id=(x->>'id')::uuid left join public.asset_groups g on g.id=a.group_id;
  children:=public.nexlab_filter_report_rows_v02682(src#>'{sheets,1,rows}','created_at',p_start,p_end);
  sheets:=jsonb_build_array(jsonb_build_object('name','Estoque - posição atual','columns',src#>'{sheets,0,columns}','rows',src#>'{sheets,0,rows}'),jsonb_build_object('name','Patrimônio - posição atual','columns','[{"key": "nome", "label": "Bem"}, {"key": "grupo", "label": "Grupo"}, {"key": "tipo", "label": "Tipo"}, {"key": "categoria", "label": "Categoria"}, {"key": "codigo_patrimonial", "label": "Código patrimonial"}, {"key": "localizacao", "label": "Localização"}, {"key": "responsavel_nome", "label": "Responsável"}, {"key": "quantidade", "label": "Quantidade"}, {"key": "quantidade_manutencao", "label": "Em manutenção"}, {"key": "quantidade_danificada", "label": "Danificados"}, {"key": "estado", "label": "Condição"}, {"key": "valor_aquisicao", "label": "Valor de aquisição"}, {"key": "valor_unitario", "label": "Valor unitário"}]'::jsonb,'rows',rows_data),jsonb_build_object('name','Movimentações','columns',src#>'{sheets,1,columns}','rows',children));
  cnt:=jsonb_array_length(rows_data)+coalesce((src->>'record_count')::integer,0);
 elsif scope_name='reservas' then
  src:=public.nexlab_get_operational_report_v26350('agendamentos',false);
  rows_data:=public.nexlab_filter_report_rows_v02682(src#>'{sheets,0,rows}','inicio',p_start,p_end);
  sheets:=jsonb_build_array(jsonb_build_object('name','Reservas','columns',src#>'{sheets,0,columns}','rows',(select coalesce(jsonb_agg(x),'[]'::jsonb) from jsonb_array_elements(rows_data) x where x->>'tipo'='reserva')),
   jsonb_build_object('name','Reuniões','columns',src#>'{sheets,0,columns}','rows',(select coalesce(jsonb_agg(x),'[]'::jsonb) from jsonb_array_elements(rows_data) x where x->>'tipo'<>'reserva')));
 elsif scope_name='marketing' then
  select coalesce(jsonb_agg(to_jsonb(q) order by q.data nulls last,q.horario_postagem nulls last,q.titulo,q.id),'[]'::jsonb) into rows_data
   from (select m.id,m.titulo,m.descricao,m.tipo,m.canal,m.status,m.data,m.horario_postagem,m.link,m.created_at,coalesce(p.nome,'Não definido') responsavel from public.marketing m left join public.profiles p on p.id=m.responsavel_id) q;
  rows_data:=public.nexlab_filter_report_rows_v02682(rows_data,'data',p_start,p_end,true);
  select coalesce(jsonb_agg(x),'[]'::jsonb) into children from jsonb_array_elements(rows_data) x where nullif(x->>'data','') is not null;
  select coalesce(jsonb_agg(to_jsonb(q) order by q.canal),'[]'::jsonb) into extra from
   (select coalesce(nullif(x->>'canal',''),'Não informado') canal,count(*) quantidade from jsonb_array_elements(rows_data) x group by 1) q;
  sheets:=jsonb_build_array(jsonb_build_object('name','Postagens','columns','[{"key": "titulo", "label": "Publicação"}, {"key": "descricao", "label": "Descrição"}, {"key": "tipo", "label": "Tipo"}, {"key": "canal", "label": "Canal"}, {"key": "status", "label": "Situação"}, {"key": "data", "label": "Data"}, {"key": "horario_postagem", "label": "Horário"}, {"key": "responsavel", "label": "Responsável"}, {"key": "link", "label": "Link"}]'::jsonb,'rows',rows_data),jsonb_build_object('name','Calendário de publicação','columns','[{"key": "data", "label": "Data"}, {"key": "horario_postagem", "label": "Horário"}, {"key": "titulo", "label": "Publicação"}, {"key": "canal", "label": "Canal"}, {"key": "status", "label": "Situação"}]'::jsonb,'rows',children),jsonb_build_object('name','Canais','columns','[{"key": "canal", "label": "Canal"}, {"key": "quantidade", "label": "Publicações"}]'::jsonb,'rows',extra));
 elsif scope_name='eventos' then
  common_data:=public.nexlab_get_general_report_v26320();
  if not coalesce((common_data#>>'{sections,eventos,authorized}')::boolean,false) then raise exception 'Sem acesso ao relatório de eventos.' using errcode='42501'; end if;
  select coalesce(jsonb_agg(x||jsonb_build_object('responsavel',coalesce((select u->>'nome' from jsonb_array_elements(common_data->'users') u where u->>'id'=x->>'organizador_id' limit 1),'Não definido'))),'[]'::jsonb) into rows_data from jsonb_array_elements(common_data->'events') x;
  rows_data:=public.nexlab_filter_report_rows_v02682(rows_data,'data',p_start,p_end,true);
  sheets:=jsonb_build_array(jsonb_build_object('name','Eventos','columns','[{"key": "titulo", "label": "Evento"}, {"key": "tipo", "label": "Tipo"}, {"key": "data", "label": "Data"}, {"key": "horario", "label": "Horário"}, {"key": "local", "label": "Local"}, {"key": "vagas_limite", "label": "Vagas"}, {"key": "responsavel", "label": "Responsável"}, {"key": "descricao", "label": "Descrição"}]'::jsonb,'rows',rows_data),jsonb_build_object('name','Programação','columns','[{"key": "data", "label": "Data"}, {"key": "horario", "label": "Horário"}, {"key": "titulo", "label": "Evento"}, {"key": "responsavel", "label": "Responsável"}, {"key": "local", "label": "Local"}]'::jsonb,'rows',rows_data));
 end if;
 if scope_name<>'inventario' then cnt:=jsonb_array_length(rows_data); end if;
 return jsonb_build_object('ok',true,'id',scope_name,'authorized',true,'record_count',cnt,'sheets',sheets,'generated_at',now(),
   'period_note',case when scope_name='inventario' then 'Estoque e patrimônio mostram a posição atual; o período filtra as movimentações.' when scope_name='marketing' then 'Publicações sem data permanecem incluídas na seção Postagens.' else null end);
end;
$f$;
revoke all on function public.nexlab_get_module_reports_v02682(text,date,date) from public,anon;
grant execute on function public.nexlab_get_module_reports_v02682(text,date,date) to authenticated,service_role;
