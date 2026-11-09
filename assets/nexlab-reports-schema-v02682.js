export const reportModules=[
 {id:'usuarios',title:'Usuários',group:'Gestão',icon:'users',color:'#347ac4',light:'#edf4ff',description:'Cadastros, perfis e participação dos usuários em uma única exportação.',sections:['Cadastros e vínculos','Perfis e participação']},
 {id:'equipes',title:'Equipes',group:'Gestão',icon:'network',color:'#338b75',light:'#edf8f4',description:'Equipes, integrantes e vínculos operacionais reunidos no mesmo arquivo.',sections:['Equipes','Integrantes','Vínculos operacionais']},
 {id:'projetos',title:'Projetos',group:'Operação',icon:'folder',color:'#ca7b19',light:'#fff5e7',description:'Projetos, tarefas, responsáveis e vínculos em um relatório completo.',sections:['Projetos','Tarefas','Vínculos por projeto']},
 {id:'inventario',title:'Estoque e Patrimônio',group:'Operação',icon:'package',color:'#8b63c2',light:'#f5effc',description:'Posições de estoque e patrimônio, com as movimentações do período.',sections:['Estoque','Patrimônio','Movimentações']},
 {id:'reservas',title:'Reservas e Reuniões',group:'Operação',icon:'calendar',color:'#31905c',light:'#edf9f1',description:'Reservas e reuniões juntas, com responsáveis, participantes e recursos.',sections:['Reservas','Reuniões']},
 {id:'marketing',title:'Marketing',group:'Comunicação',icon:'megaphone',color:'#347ac4',light:'#edf4ff',description:'Postagens, calendário de publicação e visão dos canais em um só arquivo.',sections:['Postagens','Calendário de publicação','Canais']},
 {id:'eventos',title:'Eventos',group:'Comunicação',icon:'events',color:'#c08032',light:'#fff7eb',description:'Eventos, programação, locais e responsáveis em uma exportação conjunta.',sections:['Eventos','Programação']}
];
export const fold=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export const validPeriod=(start,end)=>!start&&!end||!!start&&!!end&&/^\d{4}-\d{2}-\d{2}$/.test(start)&&/^\d{4}-\d{2}-\d{2}$/.test(end)&&start<=end;
export const periodLabel=(start,end)=>start&&end?start.split('-').reverse().join('/')+' a '+end.split('-').reverse().join('/'):'Todo o período';
export function validatePacket(data,scope){
 if(!data||data.ok!==true)throw new Error('O servidor não confirmou os dados do relatório.');
 const packets=scope==='geral'?data.modules:[data],expected=scope==='geral'?reportModules.map(m=>m.id):[scope];
 if(!Array.isArray(packets)||packets.length!==expected.length||new Set(packets.map(p=>p.id)).size!==expected.length)throw new Error('O relatório não retornou todos os módulos esperados.');
 for(const p of packets){
  if(!expected.includes(p?.id)||p.authorized!==true||!Array.isArray(p.sheets)||!p.sheets.length||!Number.isInteger(p.record_count)||p.record_count<0)throw new Error('Uma seção do relatório não foi confirmada pelo servidor.');
  for(const s of p.sheets)if(!s.name||!Array.isArray(s.columns)||!Array.isArray(s.rows)||!s.columns.length||s.columns.some(c=>typeof c.key!=='string'||!c.key))throw new Error('O formato de uma seção do relatório está incompleto.');
 }
 return packets;
}
export function reportValue(value){
 if(value==null)return '';
 if(typeof value==='boolean')return value?'Sim':'Não';
 if(typeof value==='number')return Number.isFinite(value)?value:'';
 if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value))return value.split('-').reverse().join('/');
 if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(value)){const d=new Date(value);if(!Number.isNaN(d.getTime()))return d.toLocaleString('pt-BR');}
 return typeof value==='object'?JSON.stringify(value):String(value);
}
export function appendSensitiveUsers(packets,rows,start,end){
 if(!Array.isArray(rows)||rows.some(r=>!r||typeof r!=='object'))throw new Error('O servidor não confirmou os dados pessoais de Usuários.');
 const users=packets.find(p=>p.id==='usuarios');if(!users)throw new Error('O relatório não contém o módulo Usuários.');
 const filtered=rows.filter(r=>{if(!start)return true;if(!r.created_at)return false;const date=new Date(r.created_at);if(Number.isNaN(date.getTime()))return false;const key=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(date);return key>=start&&key<=end;});
 users.sheets.push({name:'Dados pessoais autorizados',columns:[['nome','Nome'],['email','E-mail'],['data_nascimento','Nascimento'],['curso','Curso'],['matricula','Matrícula'],['vinculo_solicitado','Vínculo'],['role','Perfil'],['ativo','Ativo'],['cadastro_completo','Cadastro completo']].map(([key,label])=>({key,label})),rows:filtered,confidential:true});
}
