
-- Read-only report composition. Existing report RPCs retain their authorization.
create or replace function public.nexlab_filter_report_rows_v02682(p_rows jsonb,p_key text,p_start date,p_end date,p_keep_undated boolean default false)
returns jsonb language sql stable security invoker set search_path=public,pg_temp as $f$
 select coalesce(jsonb_agg(e.value order by e.ordinality),'[]'::jsonb)
 from jsonb_array_elements(coalesce(p_rows,'[]'::jsonb)) with ordinality e(value,ordinality)
 where p_start is null or p_key is null or
   (nullif(e.value->>p_key,'') is null and p_keep_undated) or
   (case when p_key in ('created_at','inicio') then ((e.value->>p_key)::timestamptz at time zone 'America/Sao_Paulo')::date
    else nullif(e.value->>p_key,'')::date end between p_start and p_end);
$f$;
revoke all on function public.nexlab_filter_report_rows_v02682(jsonb,text,date,date,boolean) from public,anon;
grant execute on function public.nexlab_filter_report_rows_v02682(jsonb,text,date,date,boolean) to authenticated,service_role;

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
  rows_data:=coalesce(common_data->'assets','[]'::jsonb);
  children:=public.nexlab_filter_report_rows_v02682(src#>'{sheets,1,rows}','created_at',p_start,p_end);
  sheets:=jsonb_build_array(jsonb_build_object('name','Estoque - posição atual','columns',src#>'{sheets,0,columns}','rows',src#>'{sheets,0,rows}'),jsonb_build_object('name','Patrimônio - posição atual','columns','[{"key": "nome", "label": "Bem"}, {"key": "categoria", "label": "Categoria"}, {"key": "codigo_patrimonial", "label": "Código patrimonial"}, {"key": "localizacao", "label": "Localização"}, {"key": "responsavel_nome", "label": "Responsável"}, {"key": "quantidade", "label": "Quantidade"}, {"key": "quantidade_manutencao", "label": "Em manutenção"}, {"key": "quantidade_danificada", "label": "Danificados"}, {"key": "estado", "label": "Condição"}, {"key": "valor_aquisicao", "label": "Valor de aquisição"}, {"key": "valor_unitario", "label": "Valor unitário"}]'::jsonb,'rows',rows_data),jsonb_build_object('name','Movimentações','columns',src#>'{sheets,1,columns}','rows',children));
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
