alter table public.assets drop constraint assets_code_length_check;
alter table public.assets add constraint assets_code_length_check check(char_length(btrim(codigo_patrimonial)) between 1 and 60);
-- User-entered asset codes. Existing UUIDs, uniqueness, permissions, history and audits are retained.
create or replace function nexlab_asset_private.save_asset_v02682(p_id uuid,p_payload jsonb,p_occurrence jsonb default null,p_expected timestamptz default null) returns jsonb
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
 end if;
 if char_length(btrim(coalesce(payload->>'nome',''))) not between 2 and 160 then raise exception 'O nome deve ter entre 2 e 160 caracteres.' using errcode='22023';end if;
 if coalesce(payload->>'categoria','') not in ('Equipamento','Mobiliário','Infraestrutura') then raise exception 'Escolha uma categoria patrimonial válida.' using errcode='22023';end if;
 new_code:=upper(btrim(coalesce(payload->>'codigo_patrimonial','')));
 if char_length(new_code) not between 1 and 60 or new_code ~ '[[:cntrl:]]' then raise exception 'Digite o código patrimonial do bem, com até 60 caracteres.' using errcode='22023';end if;
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
  insert into public.assets(nome,categoria,quantidade,valor_unitario,valor,valor_aquisicao,localizacao,descricao,quantidade_manutencao,quantidade_danificada,qt_manutencao,qt_danificado,qt_disponivel,qt_uso,codigo_patrimonial,tombamento,inconsistente,inconsistencia_motivo,group_id,tipo,observacoes)
  values(btrim(payload->>'nome'),payload->>'categoria',1,val,val,val,nullif(btrim(payload->>'localizacao'),''),nullif(btrim(payload->>'descricao'),''),0,0,0,0,1,0,new_code,tag,false,null,target_group,nullif(btrim(payload->>'tipo'),''),nullif(btrim(payload->>'observacoes'),'')) returning * into saved;
 else
  update public.assets set codigo_patrimonial=new_code,nome=btrim(payload->>'nome'),categoria=payload->>'categoria',valor_aquisicao=val,valor_unitario=val,valor=val,localizacao=nullif(btrim(payload->>'localizacao'),''),descricao=nullif(btrim(payload->>'descricao'),''),tombamento=tag,group_id=target_group,tipo=nullif(btrim(payload->>'tipo'),''),observacoes=nullif(btrim(payload->>'observacoes'),'') where id=p_id returning * into saved;
 end if;
 details:=public.nexlab_set_asset_details_v26120(saved.id,payload||jsonb_build_object('valor_aquisicao',val::text));
 if not coalesce((details->>'ok')::boolean,false) then raise exception 'Não foi possível salvar os detalhes do bem.';end if;
 perform public.record_security_audit(case when p_id is null then 'asset_created' else 'asset_updated' end,null::text,jsonb_build_object('entity_id',saved.id,'entity_name',saved.nome,'module','patrimonio','codigo_patrimonial',saved.codigo_patrimonial,'previous_codigo_patrimonial',before_row.codigo_patrimonial,'tombamento',tag,'operation',case when p_id is null then 'create' else 'update' end,'group_id',target_group,'unit_value',val));
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
exception when unique_violation then raise exception 'Código patrimonial, etiqueta, tombamento ou número de série já cadastrado.' using errcode='23505';
end;$f$;

notify pgrst,'reload schema';
