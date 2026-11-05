// HTTP limitado, sem cookies; conexão fixada a um endereço IPv4 público validado.
// Redirecionamentos revalidados; imagens limitadas e validadas antes do cache privado.
export function publicIPv4(ip:string):boolean {
 const a=ip.split('.').map(Number);
 if(a.length!==4||a.some((n,i)=>!Number.isInteger(n)||n<0||n>255||String(n)!==ip.split('.')[i]))return false;
 return !(a[0]===0||a[0]===10||a[0]===127||a[0]>=224||a[0]===169&&a[1]===254||a[0]===172&&a[1]>=16&&a[1]<=31||a[0]===192&&(a[1]===168||a[1]===0||a[1]===2)||a[0]===100&&a[1]>=64&&a[1]<=127||a[0]===198&&(a[1]===18||a[1]===19||a[1]===51&&a[2]===100)||a[0]===203&&a[1]===0&&a[2]===113);
}
export function publicUrl(input:string,base?:string):URL {
 const url=base?new URL(input,base):new URL(input);
 if(url.href.length>4096||!['http:','https:'].includes(url.protocol)||url.username||url.password||url.port||!url.hostname.includes('.')||!/^[a-z0-9.-]+$/i.test(url.hostname)||/(^|\.)(localhost|local|internal|invalid|test|onion|home|lan)$/i.test(url.hostname))throw Error('Endereço indisponível');
 if(/^[0-9.]+$/.test(url.hostname)&&!publicIPv4(url.hostname))throw Error('Endereço indisponível');
 url.hash='';return url;
}
async function addresses(url:URL):Promise<string[]> {
 if(/^[0-9.]+$/.test(url.hostname))return [url.hostname];
 const ips=await Deno.resolveDns(url.hostname,'A');
 if(!ips.length||ips.some(ip=>!publicIPv4(ip)))throw Error('Endereço indisponível');
 return ips;
}
export const entities=(value:string)=>value.replace(/&(#x[0-9a-f]+|#[0-9]+|amp|quot|apos|lt|gt);/gi,(_,entity)=>{
 const known:Record<string,string>={amp:'&',quot:'"',apos:"'",lt:'<',gt:'>'};
 if(entity[0]!=='#')return known[entity.toLowerCase()]||_;
 const n=parseInt(entity.slice(entity[1].toLowerCase()==='x'?2:1),entity[1].toLowerCase()==='x'?16:10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';
});
export function imageFromHtml(html:string):string|null {
 const head=html.split(/<\/head\s*>/i)[0].replace(/<!--[\s\S]*?-->/g,'').replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,'');
 const images:Record<string,string>={};
 for(const tag of head.match(/<meta\b[^>]{0,12000}>/gi)||[]){
   const attrs:Record<string,string>={};
   for(const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g))attrs[match[1].toLowerCase()]=entities(match[2]??match[3]??match[4]);
   const key=(attrs.property||attrs.name||'').toLowerCase();
   if(['og:image:secure_url','og:image','og:image:url','twitter:image','twitter:image:src'].includes(key)&&attrs.content&&!images[key])images[key]=attrs.content.trim();
 }
 return images['og:image:secure_url']||images['og:image']||images['og:image:url']||images['twitter:image']||images['twitter:image:src']||null;
}
export function unchunk(bytes:Uint8Array,limit=786432,strict=false):Uint8Array {
 const decoder=new TextDecoder(),output:Uint8Array[]=[];let at=0,total=0,complete=false;
 while(at<bytes.length){let end=at;while(end+1<bytes.length&&!(bytes[end]===13&&bytes[end+1]===10))end++;
   if(end+1>=bytes.length)break;
   const line=decoder.decode(bytes.subarray(at,end)).split(';')[0];if(!/^[0-9a-f]+$/i.test(line))throw Error('Resposta inválida');
   const length=parseInt(line,16);if(!length){complete=true;break;}
   at=end+2;const chunk=bytes.subarray(at,Math.min(at+length,bytes.length));output.push(chunk);total+=chunk.length;
   if(total>limit)throw Error('Resposta muito grande');if(at+length+2>bytes.length){if(strict)throw Error('Resposta incompleta');break;}
   if(bytes[at+length]!==13||bytes[at+length+1]!==10)throw Error('Resposta inválida');at+=length+2;
 }
 if(strict&&!complete)throw Error('Resposta incompleta');const all=new Uint8Array(total);let pos=0;for(const chunk of output){all.set(chunk,pos);pos+=chunk.length}return all;
}
async function readPublic(url:URL,deadline:number,image=false):Promise<{status:number;headers:Map<string,string>;html:string;body:Uint8Array}> {
 const limit=image?5242880:786432;
 let conn:Deno.Conn|null=null,expired=false;
 const remaining=deadline-Date.now();if(remaining<=0)throw Error('Tempo esgotado');
 let timer:number|undefined;
 const operation=(async()=>{
   const ips=await addresses(url);if(expired)throw Error('Tempo esgotado');
   const tcp=await Deno.connect({hostname:ips[0],port:url.protocol==='https:'?443:80});
   conn=tcp;if(expired){tcp.close();throw Error('Tempo esgotado')}
   if(url.protocol==='https:'){const tls=await Deno.startTls(tcp,{hostname:url.hostname,alpnProtocols:['http/1.1']});conn=tls;if(expired){tls.close();throw Error('Tempo esgotado')}}
   const request=new TextEncoder().encode(`GET ${url.pathname}${url.search} HTTP/1.1\r\nHost: ${url.hostname}\r\nUser-Agent: NexLab-LinkPreview/1.0\r\nAccept: text/html,image/*;q=0.8\r\nAccept-Encoding: identity\r\nConnection: close\r\n\r\n`);
   let written=0;while(written<request.length)written+=await conn.write(request.subarray(written));
   const chunks:Uint8Array[]=[];let size=0,headerEnd=-1,headers=new Map<string,string>(),status=0,chunkTail='';
   while(size<limit+32768){const buf=new Uint8Array(16384),n=await conn.read(buf);if(n===null)break;chunks.push(buf.slice(0,n));size+=n;
     if(headerEnd<0){const joined=new Uint8Array(size);let pos=0;for(const c of chunks){joined.set(c,pos);pos+=c.length}for(let at=0;at+3<joined.length;at++)if(joined[at]===13&&joined[at+1]===10&&joined[at+2]===13&&joined[at+3]===10){headerEnd=at;break}if(headerEnd<0&&size>32768)throw Error('Cabeçalho muito grande');if(headerEnd>=0){if(headerEnd>32768)throw Error('Cabeçalho muito grande');const head=new TextDecoder().decode(joined.subarray(0,headerEnd));if(!/^HTTP\/1\.[01] \d{3}/.test(head))throw Error('Resposta inválida');status=Number(head.split(' ')[1]);for(const line of head.split('\r\n').slice(1)){const at=line.indexOf(':');if(at>0)headers.set(line.slice(0,at).toLowerCase(),line.slice(at+1).trim())}if(status>=300&&status<400||!image&&headers.get('content-type')?.startsWith('image/'))break;if(image?!/^image\/(jpeg|png|webp)(;|$)/i.test(headers.get('content-type')||''):!headers.get('content-type')?.toLowerCase().includes('text/html'))throw Error('Formato não suportado');if(image&&Number(headers.get('content-length')||0)>limit)throw Error('Resposta muito grande');if(headers.has('content-encoding')&&headers.get('content-encoding')!=='identity')throw Error('Formato não suportado');}}
     if(headerEnd>=0&&size-headerEnd-4>limit)throw Error('Resposta muito grande');
     if(!image&&headerEnd>=0&&new TextDecoder().decode(buf.subarray(0,n)).toLowerCase().includes('</head>'))break;
     // HTTP message framing determines completion; a CDN may omit TLS close_notify.
     if(headerEnd>=0){
      const chunked=headers.get('transfer-encoding')?.toLowerCase().includes('chunked');
      if(!chunked&&headers.has('content-length')&&size-headerEnd-4>=Number(headers.get('content-length')))break;
      if(chunked){
       chunkTail=(chunkTail+new TextDecoder().decode(buf.subarray(0,n))).slice(-128);
       if(/\r\n0(?:;[^\r\n]*)?\r\n/.test(chunkTail)){
        const received=new Uint8Array(size);let offset=0;for(const chunk of chunks){received.set(chunk,offset);offset+=chunk.length;}
        try{unchunk(received.subarray(headerEnd+4),limit,true);break;}catch(error){if((error as Error).message!=='Resposta incompleta')throw error;}
       }
      }
     }

   }
   if(headerEnd<0)throw Error('Resposta inválida');
   const all=new Uint8Array(size);let pos=0;for(const c of chunks){all.set(c,pos);pos+=c.length}
   let body=all.subarray(headerEnd+4);if(headers.get('transfer-encoding')?.toLowerCase().includes('chunked'))body=unchunk(body,limit,image);
   if(image&&headers.has('content-length')&&!headers.has('transfer-encoding')&&body.length!==Number(headers.get('content-length')))throw Error('Resposta incompleta');
   if(body.length>limit)throw Error('Resposta muito grande');
   return {status,headers,body,html:image?'':new TextDecoder().decode(body)};
 })();
 try{return await Promise.race([operation,new Promise<never>((_,reject)=>{timer=setTimeout(()=>{expired=true;try{conn?.close()}catch{}reject(Error('Tempo esgotado'))},remaining)})])}finally{clearTimeout(timer);try{conn?.close()}catch{}}
}
export async function extractPreview(value:string):Promise<string|null> {
 const deadline=Date.now()+8000;let url=publicUrl(value);
 for(let redirects=0;redirects<=3;redirects++){
   const response=await readPublic(url,deadline);
   if([301,302,303,307,308].includes(response.status)){
     const location=response.headers.get('location');if(!location||redirects===3)return null;url=publicUrl(location,url.href);continue;
   }
   if(response.status<200||response.status>=300)return null;
   if(/^image\/(jpeg|png|webp|gif|avif)(;|$)/i.test(response.headers.get('content-type')||''))return url.href;
   const image=imageFromHtml(response.html);if(!image)return null;
   const imageUrl=publicUrl(image,url.href);let timer:number|undefined;
   try{await Promise.race([addresses(imageUrl),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('Tempo esgotado')),Math.max(1,deadline-Date.now()))})])}finally{clearTimeout(timer)}
   return imageUrl.href;
 }
 return null;
}


export function validImage(bytes:Uint8Array,type:string):boolean {
 if(type==='image/jpeg')return bytes.length>=4&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255&&bytes[bytes.length-2]===255&&bytes[bytes.length-1]===217;
 if(type==='image/png')return bytes.length>=20&&[137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n);
 if(type==='image/webp')return bytes.length>=16&&new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP';
 return false;
}
export async function downloadImage(value:string):Promise<{bytes:Uint8Array;contentType:string;extension:string}> {
 const deadline=Date.now()+8000;let url=publicUrl(value);
 for(let redirects=0;redirects<=3;redirects++){
  const response=await readPublic(url,deadline,true);
  if([301,302,303,307,308].includes(response.status)){
   const location=response.headers.get('location');if(!location||redirects===3)throw Error('Imagem indisponível');url=publicUrl(location,url.href);continue;
  }
  if(response.status<200||response.status>=300)throw Error('Imagem indisponível');
  const contentType=(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
  if(!validImage(response.body,contentType))throw Error('Imagem inválida');
  return {bytes:response.body,contentType,extension:contentType==='image/jpeg'?'jpg':contentType==='image/png'?'png':'webp'};
 }
 throw Error('Imagem indisponível');
}
