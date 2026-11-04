(function(){
  'use strict';
  const ID=globalThis.__NEXLAB_BUILD_IDENTITY__||Object.freeze({version:'0.26.82',release:'Beta',revision:'beta-0-26-82-google-calendar-integracao'});
  if(globalThis.__NEXLAB_REALTIME_CORE__?.revision===ID.revision)return;

  const VERSION=ID.version;
  const RELEASE=ID.release;
  const REVISION=ID.revision;
  const CANONICAL_TABLES=new Set([
    'profiles','spaces','bookings','booking_participants','booking_resources','meetings',
    'events','event_participants','projects','project_tasks','project_history','project_links',
    'teams','team_members','team_links','team_history','assets','asset_maintenance','asset_movements',
    'stock_items','nexlab_stock_movements','marketing','marketing_dates','board_posts','feedback',
    'notifications','notification_deliveries','notification_reminders',
    'nexlab_system_events','nexlab_client_errors','nexlab_client_error_incidents',
    'nexlab_system_settings','nexlab_app_versions','nexlab_notification_worker_runs',
    'nexlab_notification_provider_health','nexlab_production_snapshots',
    'reservations','reservation_participants','meeting_participants','booking_history',
    'profile_role_requests','notification_user_settings','logs','security_audit_logs',
    'nexlab_permission_matrix_state','nexlab_role_permission_defaults','nexlab_user_permission_overrides',
    'nexlab_history_revision_v02682'
  ]);
  const virtualChannels=new Set();
  let client=null;
  let nativeChannel=null;
  let nativeRemoveChannel=null;
  let nativeRemoveAllChannels=null;
  let physicalChannel=null;
  let physicalSequence=0;
  let connecting=null;
  let retryTimer=null;
  let retryAttempt=0;
  let idleTimer=null;
  let currentStatus='CLOSED';
  let resetGeneration=0;

  function dispatch(name,detail){try{globalThis.dispatchEvent(new CustomEvent(name,{detail:detail||{}}));}catch{}}
  function activeChannels(){return [...virtualChannels].filter(channel=>channel.active&&channel.handlers.length>0);}
  function subscriptionCount(){return activeChannels().reduce((sum,channel)=>sum+channel.handlers.length,0);}
  function notifyStatus(channel,status,force=false){
    if(!channel.active)return;
    if(!force&&channel.status===status)return;
    channel.status=status;
    if(typeof channel.statusCallback==='function'){try{channel.statusCallback(status);}catch(error){console.error('Falha no status do Realtime:',error);}}
  }
  function notifyAll(status,force=false){for(const channel of activeChannels())notifyStatus(channel,status,force);}
  async function removePhysical(target){
    if(!target)return 'ok';
    try{if(nativeRemoveChannel)return await nativeRemoveChannel(target);if(typeof target.unsubscribe==='function')return await target.unsubscribe();}
    catch(error){dispatch('nexlab:realtime-cleanup-error',{message:String(error?.message||error),revision:REVISION});}
    return 'ok';
  }
  function parseFilter(value){
    const text=String(value||'').trim();
    const match=text.match(/^([A-Za-z0-9_]+)=eq\.(.*)$/);
    return match?{column:match[1],value:decodeURIComponent(match[2])}:null;
  }
  function filterMatches(filter,payload){
    const parsed=parseFilter(filter?.filter);
    if(!parsed)return true;
    const before=payload?.old&&typeof payload.old==='object'?payload.old:{};
    const after=payload?.new&&typeof payload.new==='object'?payload.new:{};
    const hasAfter=Object.prototype.hasOwnProperty.call(after,parsed.column);
    const hasBefore=Object.prototype.hasOwnProperty.call(before,parsed.column);
    if(!hasAfter&&!hasBefore)return true;
    return String(hasAfter?after[parsed.column]:before[parsed.column])===parsed.value;
  }
  function routePayload(table,payload){
    const eventType=String(payload?.eventType||payload?.event||'').toUpperCase();
    for(const channel of activeChannels()){
      for(const handler of channel.handlers){
        const filter=handler.filter||{};
        if(String(handler.type||'postgres_changes')!=='postgres_changes')continue;
        if(filter.schema&&String(filter.schema)!=='public')continue;
        if(filter.table&&String(filter.table)!==table)continue;
        const expected=String(filter.event||'*').toUpperCase();
        if(expected!=='*'&&expected!==eventType)continue;
        if(!filterMatches(filter,payload))continue;
        try{handler.callback(payload);}catch(error){dispatch('nexlab:realtime-listener-error',{topic:channel.logicalTopic,table,message:String(error?.message||error)});}
      }
    }
  }
  function reconnectDelay(){return Math.min(30000,1000*Math.pow(2,Math.min(retryAttempt,5)));}
  function scheduleReconnect(){
    if(retryTimer||activeChannels().length===0)return;
    const delay=reconnectDelay();retryAttempt+=1;
    retryTimer=setTimeout(()=>{retryTimer=null;connectPhysical();},delay);
  }
  async function disconnectPhysical(reason='idle'){
    if(connecting){try{await connecting;}catch{}}
    const old=physicalChannel;physicalChannel=null;currentStatus='CLOSED';
    if(old)await removePhysical(old);
    dispatch('nexlab:realtime-core-status',{status:'CLOSED',reason,virtualChannels:activeChannels().length,subscriptions:subscriptionCount(),physicalChannels:0,version:VERSION,revision:REVISION});
  }
  async function connectPhysical(){
    if(physicalChannel||connecting||!nativeChannel||activeChannels().length===0)return connecting;
    if(idleTimer){clearTimeout(idleTimer);idleTimer=null;}
    connecting=(async()=>{
      const topic=`nexlab-canonical-${VERSION.replaceAll('.','-')}-${++physicalSequence}`;
      let next;
      try{next=nativeChannel(topic);}
      catch(error){currentStatus='CHANNEL_ERROR';notifyAll('CHANNEL_ERROR',true);dispatch('nexlab:realtime-core-status',{status:'CHANNEL_ERROR',message:String(error?.message||error),version:VERSION,revision:REVISION});scheduleReconnect();return;}
      for(const table of CANONICAL_TABLES)next=next.on('postgres_changes',{event:'*',schema:'public',table},payload=>routePayload(table,payload));
      physicalChannel=next;currentStatus='SUBSCRIBING';notifyAll('SUBSCRIBING',true);
      dispatch('nexlab:realtime-core-status',{status:'SUBSCRIBING',virtualChannels:activeChannels().length,subscriptions:subscriptionCount(),physicalChannels:1,tables:CANONICAL_TABLES.size,version:VERSION,revision:REVISION});
      next.subscribe(async status=>{
        if(physicalChannel!==next)return;
        if(status==='SUBSCRIBED'){currentStatus='SUBSCRIBED';retryAttempt=0;if(retryTimer){clearTimeout(retryTimer);retryTimer=null;}notifyAll('SUBSCRIBED',true);dispatch('nexlab:realtime-core-status',{status:'SUBSCRIBED',virtualChannels:activeChannels().length,subscriptions:subscriptionCount(),physicalChannels:1,tables:CANONICAL_TABLES.size,version:VERSION,release:RELEASE,revision:REVISION});return;}
        if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)){currentStatus=status;notifyAll(status,true);physicalChannel=null;await removePhysical(next);dispatch('nexlab:realtime-core-status',{status,virtualChannels:activeChannels().length,subscriptions:subscriptionCount(),physicalChannels:0,version:VERSION,revision:REVISION});scheduleReconnect();}
      });
    })().finally(()=>{connecting=null;});
    return connecting;
  }
  function scheduleIdleClose(){
    if(idleTimer)clearTimeout(idleTimer);
    idleTimer=setTimeout(()=>{idleTimer=null;if(activeChannels().length===0)disconnectPhysical('no-listeners');},3000);
  }

  class VirtualChannel{
    constructor(logicalTopic,options){this.logicalTopic=String(logicalTopic||'nexlab-realtime');this.topic=this.logicalTopic;this.options=options||{};this.handlers=[];this.statusCallback=null;this.status='CLOSED';this.active=false;this.__nexlabVirtualRealtime=true;}
    on(type,filter,callback){
      if(typeof callback==='function'){const normalized=filter||{};if(normalized.table&&!CANONICAL_TABLES.has(String(normalized.table))){console.warn('Tabela Realtime fora do catálogo canônico:',normalized.table);}this.handlers.push({type:String(type||'postgres_changes'),filter:normalized,callback});}
      return this;
    }
    subscribe(callback){
      if(typeof callback==='function')this.statusCallback=callback;
      if(!this.active){this.active=true;virtualChannels.add(this);}
      if(currentStatus==='SUBSCRIBED')notifyStatus(this,'SUBSCRIBED',true);else{notifyStatus(this,'SUBSCRIBING',true);connectPhysical();}
      return this;
    }
    unsubscribe(){
      if(!this.active)return Promise.resolve('ok');
      this.active=false;virtualChannels.delete(this);this.status='CLOSED';
      if(activeChannels().length===0)scheduleIdleClose();
      return Promise.resolve('ok');
    }
    teardown(){return this.unsubscribe();}
  }

  function patchClient(value){
    if(!value||typeof value!=='object')return value;
    if(value.__nexlabRealtimeCoreRevision===REVISION){client=value;return value;}
    nativeChannel=typeof value.channel==='function'?value.channel.bind(value):null;
    nativeRemoveChannel=typeof value.removeChannel==='function'?value.removeChannel.bind(value):null;
    nativeRemoveAllChannels=typeof value.removeAllChannels==='function'?value.removeAllChannels.bind(value):null;
    if(!nativeChannel)return value;
    value.channel=function(topic,options){return new VirtualChannel(topic,options);};
    value.removeChannel=function(channel){if(channel?.__nexlabVirtualRealtime)return channel.unsubscribe();return nativeRemoveChannel?nativeRemoveChannel(channel):Promise.resolve('ok');};
    value.removeAllChannels=async function(){for(const channel of [...virtualChannels])await channel.unsubscribe();await disconnectPhysical('remove-all');if(nativeRemoveAllChannels){try{return await nativeRemoveAllChannels();}catch{}}return [];};
    try{Object.defineProperty(value,'__nexlabRealtimeCoreRevision',{value:REVISION,enumerable:false,configurable:false});}catch{}
    client=value;dispatch('nexlab:realtime-core-ready',{version:VERSION,release:RELEASE,revision:REVISION,tables:CANONICAL_TABLES.size});return value;
  }
  async function reset(){
    resetGeneration+=1;for(const stop of [...refreshWatchers])stop();if(retryTimer){clearTimeout(retryTimer);retryTimer=null;}if(idleTimer){clearTimeout(idleTimer);idleTimer=null;}
    for(const channel of [...virtualChannels]){channel.active=false;channel.status='CLOSED';}virtualChannels.clear();retryAttempt=0;await disconnectPhysical('reset');dispatch('nexlab:realtime-core-reset',{generation:resetGeneration,version:VERSION,revision:REVISION});
  }
  // NEXLAB_LIVE_REFRESH_BEGIN
  // Events invalidate queries; their payloads never become application data.
  const refreshWatchers=new Set();
  function watch(tables,refresh,options={}){
    if(typeof refresh!=='function')return ()=>{};
    const names=[...new Set(tables||[])].filter(table=>CANONICAL_TABLES.has(table));
    if(!names.length)return ()=>{};
    let stopped=false,running=false,timer=null,firstQueuedAt=0,failures=0;
    const dirty=new Set(),controller=new AbortController();
    const visible=()=>document.visibilityState!=='hidden'&&navigator.onLine!==false;
    const later=(delay)=>{if(stopped)return;if(timer)clearTimeout(timer);timer=setTimeout(run,delay);};
    const queue=(reason='change')=>{
      if(stopped)return;
      dirty.add(reason);
      if(!firstQueuedAt)firstQueuedAt=Date.now();
      if(!running)later(Math.min(350,Math.max(0,1200-(Date.now()-firstQueuedAt))));
    };
    async function run(){
      timer=null;
      if(stopped||running||!dirty.size)return;
      if(!visible())return;
      if(options.blocked?.()){later(500);return;}
      const reasons=[...dirty];dirty.clear();firstQueuedAt=0;running=true;
      try{
        await refresh({signal:controller.signal,reasons});
        failures=0;
      }catch(error){
        if(!stopped&&error?.name!=='AbortError'){
          dirty.add('retry');failures++;
          dispatch('nexlab:live-refresh-error',{scope:options.scope||'',message:String(error?.message||error)});
        }
      }finally{
        running=false;
        if(!stopped&&dirty.size)later(failures?Math.min(30000,1000*2**Math.min(failures,5)):100);
      }
    }
    const channel=new VirtualChannel('nexlab-live-'+(options.scope||'module'));
    for(const table of names)channel.on('postgres_changes',{event:'*',schema:'public',table,...(options.filters?.[table]?{filter:String(options.filters[table])}:{})},()=>queue(table));
    // Subscribe first, then query again: closes the initial fetch/join gap and
    // also recovers changes missed while the transport was disconnected.
    channel.subscribe(status=>{options.onStatus?.(status);if(status==='SUBSCRIBED')queue('subscribed');});
    const resume=()=>{if(visible())queue('resume');};
    document.addEventListener('visibilitychange',resume);
    globalThis.addEventListener('online',resume);
    globalThis.addEventListener('focus',resume);
    const poll=setInterval(()=>{if(visible())queue('reconcile');},Math.max(30000,options.interval||90000));
    function stop(){
      if(stopped)return;stopped=true;controller.abort();
      if(timer)clearTimeout(timer);clearInterval(poll);dirty.clear();
      document.removeEventListener('visibilitychange',resume);
      globalThis.removeEventListener('online',resume);globalThis.removeEventListener('focus',resume);
      channel.unsubscribe();refreshWatchers.delete(stop);
    }
    refreshWatchers.add(stop);
    return stop;
  }
  // NEXLAB_LIVE_REFRESH_END

  const api=Object.freeze({
    version:VERSION,release:RELEASE,revision:REVISION,patchClient,reset,watch,
    refresh:async()=>{await disconnectPhysical('manual-refresh');if(activeChannels().length)await connectPhysical();},
    snapshot:()=>Object.freeze({version:VERSION,release:RELEASE,revision:REVISION,status:currentStatus,virtualChannels:activeChannels().length,subscriptions:subscriptionCount(),physicalChannels:physicalChannel?1:0,canonicalTables:CANONICAL_TABLES.size,retries:retryAttempt,generation:resetGeneration})
  });
  globalThis.__NEXLAB_REALTIME_CORE__=api;globalThis.__NEXLAB_RUNTIME_STABILITY_STABLE__=api;
  let currentClient=globalThis.__NEXLAB_SUPABASE__||null;if(currentClient)currentClient=patchClient(currentClient);
  try{const descriptor=Object.getOwnPropertyDescriptor(globalThis,'__NEXLAB_SUPABASE__');if(!descriptor||descriptor.configurable)Object.defineProperty(globalThis,'__NEXLAB_SUPABASE__',{configurable:true,enumerable:true,get(){return currentClient;},set(value){currentClient=patchClient(value);}});}catch{}
})();
