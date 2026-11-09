import test from 'node:test';
import assert from 'node:assert/strict';
import {reportModules,validatePacket,validPeriod,appendSensitiveUsers,reportValue} from '../assets/nexlab-reports-schema-v02682.js';
const packet=id=>({ok:true,id,authorized:true,record_count:0,sheets:[{name:'Seção',columns:[{key:'titulo',label:'Título'}],rows:[]}]});
test('only the seven approved modules exist',()=>assert.deepEqual(reportModules.map(m=>m.id),['usuarios','equipes','projetos','inventario','reservas','marketing','eventos']));
test('general report requires all seven unique authorized packets',()=>{
 const good={ok:true,modules:reportModules.map(m=>packet(m.id))};assert.equal(validatePacket(good,'geral').length,7);
 assert.throws(()=>validatePacket({ok:true,modules:good.modules.slice(1)},'geral'));
 assert.throws(()=>validatePacket({ok:true,modules:[...good.modules.slice(1),packet('equipes')]},'geral'));
 good.modules[0].authorized=false;assert.throws(()=>validatePacket(good,'geral'));
});
test('unknown scopes, incomplete sheets and unconfirmed data cannot export',()=>{
 assert.throws(()=>validatePacket(packet('feedback'),'marketing'));
 assert.throws(()=>validatePacket({ok:false},'marketing'));
 const data=packet('marketing');data.sheets[0].columns=[];assert.throws(()=>validatePacket(data,'marketing'));
});
test('an empty confirmed section remains valid',()=>assert.equal(validatePacket(packet('inventario'),'inventario')[0].record_count,0));
test('range validation supports all-time and rejects half or reversed ranges',()=>{
 assert(validPeriod('',''));assert(validPeriod('2026-11-01','2026-11-30'));assert(!validPeriod('2026-11-30','2026-11-01'));assert(!validPeriod('2026-11-01',''));
});
test('protected users are appended to the same module with Brazil date boundaries',()=>{
 const data=[packet('usuarios')];appendSensitiveUsers(data,[{nome:'Anterior',created_at:'2026-11-01T02:59:59Z'},{nome:'Dentro',created_at:'2026-11-01T03:00:00Z'}],'2026-11-01','2026-11-01');
 assert.equal(data[0].sheets.length,2);assert.equal(data[0].sheets[1].rows.length,1);assert.equal(data[0].sheets[1].rows[0].nome,'Dentro');assert.equal(data[0].sheets[1].confidential,true);
});
test('numbers and dates preserve zeros and explicit values',()=>{
 assert.equal(reportValue(0),0);assert.equal(reportValue(false),'Não');assert.equal(reportValue(null),'');assert.equal(reportValue('2026-11-08'),'08/11/2026');assert.equal(reportValue('=HYPERLINK(\"example\")'),'=HYPERLINK(\"example\")');
});
