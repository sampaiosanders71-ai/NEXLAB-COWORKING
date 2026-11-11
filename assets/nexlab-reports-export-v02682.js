import {reportModules,reportValue} from './nexlab-reports-schema-v02682.js?v=app-beta-0-26-82-oficial-patrimonio-pagina-detalhes';
const title=id=>reportModules.find(m=>m.id===id)?.title||id;
const dateKey=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const slug=text=>String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'_').toLowerCase();
export async function exportModuleReport({packets,scope,format,period,profile,purpose,transfer,checkActive}){
 const libraries=await import('./nexlab-runtime-export.js?v=app-beta-0-26-82-oficial-patrimonio-pagina-detalhes');
 checkActive();
 const reportTitle=scope==='geral'?'Relatório geral':title(scope),confidential=packets.some(p=>p.sheets.some(s=>s.confidential)),by=profile?.nome||'Usuário autorizado',at=new Date().toLocaleString('pt-BR'),file='nexlab_'+slug(reportTitle)+'_'+dateKey()+'.'+format;
 const note='Período aplicado a cadastros, agenda e publicações. Estoque e patrimônio refletem a posição atual; o período filtra suas movimentações. Publicações sem data permanecem incluídas.';
 if(format==='pdf'){
  const {jsPDF}=libraries.jsPDFModule,autoTable=libraries.autoTableModule.default,doc=new jsPDF({orientation:'landscape',format:'a4',unit:'mm'});
  const header=(module,section)=>{
   doc.setFillColor(15,43,70);doc.rect(14,11,269,21,'F');doc.setFont('helvetica','bold');doc.setFontSize(13);doc.setTextColor(255,255,255);doc.text(doc.splitTextToSize(reportTitle+' | NexLab',255).slice(0,1),19,20);
   doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(208,223,237);doc.text('Gerado por: '+by+' | '+at,19,27);
   doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(19,51,80);doc.text(doc.splitTextToSize(module+' / '+section,266).slice(0,2),15,43);
   doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(91,112,133);doc.text('Período: '+period,15,52);
   if(confidential){doc.setTextColor(164,69,18);doc.text('CONFIDENCIAL - dados pessoais autorizados. Finalidade: '+String(purpose||'').slice(0,110),15,58);}
  };
  let used=false;
  if(scope==='geral'){
   header('Visão consolidada','Sete módulos reunidos');
   autoTable(doc,{startY:65,head:[['Módulo','Registros principais','Seções incluídas']],body:packets.map(p=>[title(p.id),p.record_count,p.sheets.map(s=>s.name).join(', ')]),theme:'striped',headStyles:{fillColor:[19,51,80]},styles:{fontSize:9,cellPadding:3},margin:{left:15,right:15,bottom:20}});
   doc.setFontSize(8);doc.setTextColor(91,112,133);doc.text(doc.splitTextToSize(note,262),15,Math.min(180,(doc.lastAutoTable?.finalY||120)+12));used=true;
  }
  for(const packet of packets)for(const sheet of packet.sheets){
   checkActive();if(used)doc.addPage();used=true;
   header(title(packet.id),sheet.name);
   if(sheet.rows.length)autoTable(doc,{startY:65,head:[sheet.columns.map(c=>c.label||c.key)],body:sheet.rows.map(r=>sheet.columns.map(c=>reportValue(r[c.key]))),theme:'striped',headStyles:{fillColor:[19,51,80],textColor:255,fontSize:8,halign:'left'},styles:{fontSize:7.8,cellPadding:2.1,overflow:'linebreak'},margin:{left:15,right:15,top:18,bottom:18}});
   else{doc.setFontSize(10);doc.setTextColor(100,116,139);doc.text('Nenhum registro disponível para esta seção no período selecionado.',15,73);}
   if(packet.period_note){doc.setFontSize(7.5);doc.setTextColor(100,116,139);let noteY=(sheet.rows.length?doc.lastAutoTable?.finalY:80)||80;if(noteY>174){doc.addPage();header(title(packet.id),sheet.name);noteY=60;}doc.text(doc.splitTextToSize(packet.period_note,260),15,noteY+12);}
  }
  const pages=doc.getNumberOfPages();for(let p=1;p<=pages;p++){doc.setPage(p);doc.setFontSize(7.5);doc.setTextColor(120,135,150);doc.text('NexLab | '+(confidential?'Confidencial | ':'')+'Página '+p+' de '+pages,282,203,{align:'right'});}
  checkActive();await transfer.pdfSave(doc,file);
 }else{
  const excel=libraries.excelModule.default,cell=value=>typeof value==='number'&&Number.isFinite(value)?{value,type:Number,format:Number.isInteger(value)?'#,##0':'#,##0.00'}:{value:String(reportValue(value)),type:String,wrap:true};
  const heading=value=>({value,type:String,fontWeight:'bold',backgroundColor:'#133350',textColor:'#FFFFFF',wrap:true});
  const sheets=[{sheet:'Resumo',columns:[{width:30},{width:90},{width:15}],data:[[heading(reportTitle+' | NexLab')],[cell('Gerado por'),cell(by)],[cell('Data'),cell(at)],[cell('Período'),cell(period)],...(confidential?[[heading('CONFIDENCIAL - dados pessoais autorizados')],[cell('Finalidade institucional'),cell(purpose)]]:[]),[],[heading('Módulo'),heading('Seções incluídas'),heading('Registros principais')],...packets.map(p=>[cell(title(p.id)),cell(p.sheets.map(s=>s.name).join(', ')),cell(p.record_count)]),[],[cell(note)]]}];
  const names=new Set(['resumo']);
  for(const p of packets)for(const s of p.sheets){
   let base=(scope==='geral'?title(p.id)+' - ':'')+s.name;base=base.replace(/[\\/?*\[\]:]/g,' ').slice(0,31);let name=base,n=2;while(names.has(name.toLowerCase()))name=base.slice(0,27)+' '+n++;names.add(name.toLowerCase());
   sheets.push({sheet:name,stickyRowsCount:1,columns:s.columns.map(c=>({width:/descri|motivo|link|título|projeto|publica/i.test(c.label)?42:24})),data:[s.columns.map(c=>heading(c.label||c.key)),...s.rows.map(r=>s.columns.map(c=>cell(r[c.key])))]});
  }
  checkActive();const workbook=await excel(sheets);checkActive();await workbook.toFile(file);transfer.started();
 }
 return file;
}
