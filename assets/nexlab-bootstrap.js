(function(){
  if (window.__NEXLAB_BOOTSTRAP_V26_7__) return;
  window.__NEXLAB_BOOTSTRAP_V26_7__ = true;

  // Static-hosting frame guard. GitHub Pages cannot emit frame-ancestors/X-Frame-Options headers,
  // so the app refuses to render when embedded. A hosting-level header remains preferable when available.
  try {
    if (window.top !== window.self) {
      document.documentElement.dataset.nexlabFrameGuard = 'blocked';
      document.documentElement.style.display = 'none';
      try { window.top.location.replace(window.location.href); } catch {}
      return;
    }
  } catch {
    document.documentElement.dataset.nexlabFrameGuard = 'blocked';
    document.documentElement.style.display = 'none';
    return;
  }

  const BUILD_IDENTITY = window.__NEXLAB_BUILD_IDENTITY__ || Object.freeze({version:'0.26.82',release:'Beta',revision:'beta-0-26-82-google-calendar-integracao',assetRevision:'app-beta-0-26-82-oficial-completo',cacheName:'nexlab-app-beta-0-26-82-oficial-completo-20260928T022407Z',generatedAt:'2026-09-11T01:14:06Z'});
  const APP_VERSION = BUILD_IDENTITY.version;
  const APP_RELEASE = BUILD_IDENTITY.release;
  const APP_REVISION = BUILD_IDENTITY.revision;
  window.__NEXLAB_RELEASE__ = BUILD_IDENTITY;

  window.setTimeout(() => {
    const recovery = document.getElementById('nexlab-startup-recovery');
    if (recovery) recovery.classList.add('is-visible');
  }, 8000);

  const nativeFetch = window.fetch ? window.fetch.bind(window) : null;
  const nativeAlert = window.alert ? window.alert.bind(window) : function(){};
  const SUPABASE_RE = /https:\/\/[a-z0-9.-]+\.supabase\.co/i;
  const MUTATING_METHOD_RE = /^(POST|PUT|PATCH|DELETE)$/i;
  const READ_METHOD_RE = /^(GET|HEAD|OPTIONS)$/i;
  const RPC_REGISTRY = window.__NEXLAB_RPC_REGISTRY__ || Object.freeze({readOnly:[],mutating:[],background:[],classifyRpc:()=> 'unknown',isKnownRpc:()=>false,selfTest:()=>({ok:false,cases:[],counts:{}})});
  const READ_ONLY_RPC_NAMES = new Set(RPC_REGISTRY.readOnly || []);
  const MUTATING_RPC_NAMES = new Set(RPC_REGISTRY.mutating || []);
  const BACKGROUND_RPC_NAMES = new Set(RPC_REGISTRY.background || []);
  // Diagnósticos administrativos podem executar consultas mais pesadas sem representar queda global de conexão.
  const DIAGNOSTIC_RPC_NAMES = new Set([
    'get_system_health_snapshot',
    'nexlab_get_database_health_v02682',
    'nexlab_get_health_observability_v26220',
    'nexlab_get_production_readiness',
    'nexlab_get_production_snapshots_v26210'
  ]);

  function rpcNameFromTarget(target){
    try {
      const match = new URL(target, location.href).pathname.match(/\/rest\/v1\/rpc\/([^/]+)$/i);
      return match ? decodeURIComponent(match[1]) : '';
    } catch {
      const match = String(target || '').match(/\/rest\/v1\/rpc\/([^/?#]+)/i);
      return match ? decodeURIComponent(match[1]) : '';
    }
  }

  function classifySupabaseRequest(target, method){
    const normalizedMethod = String(method || 'GET').toUpperCase();
    const rpcName = rpcNameFromTarget(target);
    let pathname = '';
    try { pathname = new URL(target, location.href).pathname; } catch { pathname = String(target || ''); }
    const authRequest = /\/auth\/v1\//i.test(pathname);
    const rpcKind = rpcName ? RPC_REGISTRY.classifyRpc(rpcName) : 'none';
    const readOnly = !authRequest && (READ_METHOD_RE.test(normalizedMethod) || rpcKind === 'read');
    const background = authRequest || rpcKind === 'background';
    const explicitMutation = rpcKind === 'mutation';
    const unknownRpc = Boolean(rpcName && rpcKind === 'unknown');
    const mutating = MUTATING_METHOD_RE.test(normalizedMethod) && !readOnly && !background;
    return Object.freeze({ rpcName, rpcKind, authRequest, readOnly, background, explicitMutation, unknownRpc, mutating });
  }

  window.__NEXLAB_REQUEST_CLASSIFIER__ = Object.freeze({
    version: APP_VERSION,
    policy: 'explicit-default-mutation',
    classify: (target, method = 'GET') => classifySupabaseRequest(target, method),
    isReadOnlyRpc: (name) => READ_ONLY_RPC_NAMES.has(String(name || '')),
    isMutatingRpc: (name) => MUTATING_RPC_NAMES.has(String(name || '')),
    isBackgroundRpc: (name) => BACKGROUND_RPC_NAMES.has(String(name || '')),
    isKnownRpc: (name) => RPC_REGISTRY.isKnownRpc(String(name || '')),
    selfTest: () => RPC_REGISTRY.selfTest()
  });
  let readCacheGeneration = 0;

  // R55.5.1: preserva o bloqueio imediato de mutações para impedir cliques duplos antes do React atualizar a interface.
  const mutationLocks = new Map();
  window.nexlabAcquireMutation = function(key, timeoutMs = 60000){
    const normalized = String(key || 'mutation');
    const now = Date.now();
    const lockedAt = Number(mutationLocks.get(normalized) || 0);
    if (lockedAt && now - lockedAt < Math.max(5000, Number(timeoutMs) || 60000)) return false;
    mutationLocks.set(normalized, now);
    return true;
  };
  window.nexlabReleaseMutation = function(key){
    mutationLocks.delete(String(key || 'mutation'));
  };
  window.nexlabMutationConfirmed = function(data, expectedId){
    if (data === true) return true;
    if (typeof data === 'number') return Number.isFinite(data) && data > 0;
    if (typeof data === 'string') return data.trim() !== '' && !/^(?:false|0|null|undefined)$/i.test(data.trim());
    if (Array.isArray(data)) return data.length > 0;
    if (!data || typeof data !== 'object') return false;
    const negativeFlags = ['ok','success','deleted','removed','applied'];
    if (negativeFlags.some((field) => data[field] === false)) return false;
    const positiveFlags = ['ok','success','deleted','removed','updated','created','archived','cancelled','canceled','applied','linked','unlinked','responsibility_transferred'];
    if (positiveFlags.some((field) => data[field] === true)) return true;
    const expected = expectedId == null ? '' : String(expectedId);
    const candidates = [
      data.id, data.user_id, data.entity_id, data.record_id,
      data.record?.id, data.item?.id, data.asset?.id, data.team?.id,
      data.member?.user_id, data.link?.entity_id, data.booking?.id
    ].filter((value) => value !== undefined && value !== null).map(String);
    if (expected && candidates.includes(expected)) return true;
    return !expected && candidates.length > 0;
  };

  function methodFrom(input, init){
    try {
      if (init && init.method) return String(init.method).toUpperCase();
      if (input && input.method) return String(input.method).toUpperCase();
      return 'GET';
    } catch { return 'GET'; }
  }

  function urlFrom(input){
    try {
      if (typeof input === 'string') return input;
      if (input && typeof input.url === 'string') return input.url;
      return String(input || '');
    } catch { return ''; }
  }

  function signalFrom(input, init){
    try {
      if (init && init.signal) return init.signal;
      if (typeof Request !== 'undefined' && input instanceof Request && input.signal) return input.signal;
    } catch {}
    return null;
  }

  function isExpectedAbort(error, signal){
    if (signal?.aborted) return true;
    const name = String(error?.name || '');
    const message = String(error?.message || '');
    return name === 'AbortError' || /(?:signal is aborted|aborted without reason|operation was aborted|the operation was aborted)/i.test(message);
  }

  function emit(name, detail){
    try { window.dispatchEvent(new CustomEvent(name, { detail: detail || {} })); } catch {}
  }

  function invalidateReadCache(reason = 'manual', detail = {}){
    readCacheGeneration += 1;
    emit('nexlab:read-cache-invalidated', {
      reason,
      generation: readCacheGeneration,
      cacheEnabled: false,
      ...detail
    });
  }

  window.__NEXLAB_NATIVE_WEBSOCKET__ = globalThis.WebSocket;

  window.__NEXLAB_READ_CACHE__ = Object.freeze({
    enabled: false,
    invalidate: (reason = 'test-or-manual') => invalidateReadCache(reason),
    snapshot: () => Object.freeze({
      enabled: false,
      entries: 0,
      pending: 0,
      generation: readCacheGeneration,
      ttl: 0
    })
  });

  window.nexlabShowModal = function(options){
    if (!window.__NEXLAB_MODAL_READY__) {
      nativeAlert(String(options?.message || options?.text || 'Aviso do NEXLAB'));
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      emit('nexlab:modal', Object.assign({}, options || {}, { resolve }));
    });
  };

  window.alert = function(message){
    if (!window.__NEXLAB_MODAL_READY__) return nativeAlert(message);
    try {
      window.nexlabShowModal({
        title: 'Aviso do NEXLAB',
        message: String(message || ''),
        variant: 'info',
        okLabel: 'Entendi'
      });
    } catch {
      nativeAlert(message);
    }
  };

  async function nexlabFetchWithDeadline(input, init, timeoutMs){
    const deadline = Math.max(1000, Number(timeoutMs) || 0);
    if (!deadline || typeof AbortController === 'undefined' || signalFrom(input, init)) {
      return nativeFetch(input, init);
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      try { controller.abort(new DOMException('Tempo de comunicação excedido.', 'TimeoutError')); }
      catch { controller.abort(); }
    }, deadline);
    try {
      return await nativeFetch(input, Object.assign({}, init || {}, { signal: controller.signal }));
    } finally {
      window.clearTimeout(timer);
    }
  }

  // Impede que uma trava interna do armazenamento de sessão mantenha a PWA
  // indefinidamente na tela nativa de abertura.
  window.nexlabAuthSessionWithTimeout = async function(authClient, timeoutMs = 4500){
    let timer = null;
    try {
      return await Promise.race([
        authClient.getSession(),
        new Promise((resolve) => {
          timer = window.setTimeout(() => resolve({
            data: { session: null },
            error: { name: 'NexlabStartupTimeout', message: 'A restauração da sessão excedeu o tempo seguro.' },
            nexlabTimedOut: true
          }), Math.max(2500, Number(timeoutMs) || 4500));
        })
      ]);
    } catch (error) {
      return { data: { session: null }, error, nexlabFailed: true };
    } finally {
      if (timer) window.clearTimeout(timer);
    }
  };

  async function fetchAndMonitor(input, init, target, method, isSupabase){
    const requestClass = isSupabase ? classifySupabaseRequest(target, method) : { readOnly:false, background:false, mutating:false, rpcName:"" };
    const isMutatingSupabase = isSupabase && requestClass.mutating;
    const isReadOnlySupabase = isSupabase && requestClass.readOnly;
    const isDiagnosticSupabase = isSupabase && DIAGNOSTIC_RPC_NAMES.has(requestClass.rpcName);
    const startedAt = Date.now();
    const requestId = `${startedAt}-${Math.random().toString(36).slice(2,9)}`;

    if (isReadOnlySupabase) emit('nexlab:read-start', { method, url: target, rpc: requestClass.rpcName, requestId, startedAt });

    if (isMutatingSupabase) {
      invalidateReadCache('supabase-mutation', { method, url: target });
      emit('nexlab:action-start', { method, url: target, startedAt });
    }

    try {
      const deadlineMs = isSupabase
        ? (isDiagnosticSupabase ? 25000 : (requestClass.background ? 7000 : (requestClass.readOnly ? 8000 : 30000)))
        : 0;
      const response = deadlineMs
        ? await nexlabFetchWithDeadline(input, init, deadlineMs)
        : await nativeFetch(input, init);
      if (isSupabase) {
        if (response.status === 0 || response.status === 502 || response.status === 503 || response.status === 504 || response.status >= 500) {
          if (!target.includes('/rpc/nexlab_record_client_error_v26_7_4') && !target.includes('/rpc/nexlab_record_client_error_v26_7')) {
            observabilityQueueEvent({
              source: 'fetch',
              severity: 'error',
              message: `Falha HTTP ${response.status} em ${method}.`,
              metadata: {
                status: response.status,
                method,
                path: observabilitySanitize(new URL(target).pathname, 300)
              }
            });
          }
          emit('nexlab:connection-error', {
            title: 'Falha de conexão com o NEXLAB',
            message: 'O app não conseguiu confirmar a comunicação com o servidor. Verifique sua internet e tente novamente.',
            detail: `Servidor respondeu com status ${response.status}.`,
            status: response.status,
            url: target
          });
        } else if (response.ok) {
          emit('nexlab:connection-restored', { url: target });
        }
      }
      return response;
    } catch (error) {
      const requestSignal = signalFrom(input, init);
      if (isExpectedAbort(error, requestSignal)) {
        emit('nexlab:request-aborted', { method, url: target });
        throw error;
      }
      if ((isSupabase || !navigator.onLine) && (!isDiagnosticSupabase || navigator.onLine === false)) {
        emit('nexlab:connection-error', {
          title: navigator.onLine ? 'Falha de conexão com o NEXLAB' : 'Você está sem internet',
          message: navigator.onLine ? 'Não foi possível conectar ao Supabase agora. Tente novamente em alguns instantes.' : 'A conexão caiu. O app pode exibir dados já carregados, mas novas alterações dependem de internet.',
          detail: error && error.message ? error.message : 'Erro de rede não identificado.',
          url: target
        });
      } else if (isDiagnosticSupabase) {
        // O próprio módulo Saúde do Sistema exibe o diagnóstico parcial; não transformar timeout técnico em queda global.
        emit('nexlab:diagnostic-request-error', { method, url: target, rpc: requestClass.rpcName, detail: error && error.message ? error.message : 'Falha de diagnóstico.' });
      }
      throw error;
    } finally {
      const elapsed = Date.now() - startedAt;
      if (isReadOnlySupabase) emit('nexlab:read-end', { method, url: target, rpc: requestClass.rpcName, requestId, elapsed });
      if (isMutatingSupabase) {
        window.setTimeout(
          () => emit('nexlab:action-end', { method, url: target, elapsed }),
          Math.max(120, 360 - elapsed)
        );
      }
    }
  }

  window.addEventListener('nexlab:retry-module', () => invalidateReadCache('module-retry'));

  if (nativeFetch) {
    window.fetch = async function(input, init){
      const target = urlFrom(input);
      const method = methodFrom(input, init);
      const isSupabase = SUPABASE_RE.test(target);
      // Estável: o wrapper observa erros e mutações, sem cachear ou compartilhar
      // respostas REST. Deduplicação pertence aos loaders canônicos por módulo.
      return fetchAndMonitor(input, init, target, method, isSupabase);
    };
  }



  const OBSERVABILITY_VERSION = APP_VERSION;
  const OBSERVABILITY_QUEUE_KEY = 'nexlab:observability:queue:v0.26.82';
  const OBSERVABILITY_DEDUP_KEY = 'nexlab:observability:dedup:v0.26.82';
  const OBSERVABILITY_RPC = 'nexlab_record_client_error_v26_7_4';
  const OBSERVABILITY_MAX_QUEUE = 20;
  const OBSERVABILITY_DEDUP_MS = 5 * 60 * 1000;
  let observabilityFlushRunning = false;
  let observabilityRetryAfter = 0;

  function observabilityReadJson(key, fallback){
    try {
      const value = sessionStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  let observabilityQueue = observabilityReadJson(OBSERVABILITY_QUEUE_KEY, []);
  if (!Array.isArray(observabilityQueue)) observabilityQueue = [];

  const observabilityState = {
    version: OBSERVABILITY_VERSION,
    environment: observabilityEnvironment(),
    queued: observabilityQueue.length,
    sent: 0,
    dropped: 0,
    lastSentAt: null,
    lastError: null,
    sqlReady: null
  };

  function observabilityPublishState(){
    observabilityState.queued = observabilityQueue.length;
    window.__NEXLAB_OBSERVABILITY__ = Object.freeze({ ...observabilityState });
    try {
      sessionStorage.setItem(
        OBSERVABILITY_QUEUE_KEY,
        JSON.stringify(observabilityQueue.slice(-OBSERVABILITY_MAX_QUEUE))
      );
    } catch {}
    emit('nexlab:observability-status', { ...observabilityState });
  }

  function observabilitySanitize(value, maxLength = 1000){
    let text = String(value || '');
    text = text
      .replace(/eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, '[token]')
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
      .replace(/([?&](?:access_token|refresh_token|token|apikey|key)=)[^&\s]+/gi, '$1[redacted]')
      .replace(/((?:access_token|refresh_token|token|apikey|api_key|authorization|password|secret)[=:]\s*)[^&\s,;]+/gi, '$1[redacted]')
      .replace(/\bBearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]');
    return text.slice(0, maxLength);
  }

  function observabilityEnvironment(){
    const explicit = String(
      globalThis.__NEXLAB_ENVIRONMENT__ ||
      globalThis.__NEXLAB_CONFIG__?.environment ||
      ''
    ).trim().toLowerCase();

    if (['production','prod','producao'].includes(explicit)) return 'production';
    if (['homologacao','homologation','staging','hml'].includes(explicit)) return 'homologacao';
    if (['development','dev','local'].includes(explicit)) return 'development';
    if (['test','tests','testing'].includes(explicit)) return 'test';

    try {
      if (location.protocol === 'file:') return 'development';
      const address = `${location.hostname}${location.pathname}`.toLowerCase();
      if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|$)/.test(location.host)) {
        return 'development';
      }
      if (/(^|[\W_-])(homolog|homologacao|staging|hml)([\W_-]|$)/.test(address)) {
        return 'homologacao';
      }
      if (/(^|[\W_-])(test|tests|testing)([\W_-]|$)/.test(address)) {
        return 'test';
      }
    } catch {}

    return 'production';
  }

  const OBSERVABILITY_METADATA_FIELDS = Object.freeze({
    filename: 'string',
    line: 'number',
    column: 'number',
    component: 'string',
    wrapper: 'string',
    causeName: 'string',
    failures: 'string-array',
    status: 'number',
    method: 'string',
    path: 'string',
    lcpMs: 'number',
    navigationMs: 'number',
    domContentLoadedMs: 'number',
    longTasks: 'number',
    longestTaskMs: 'number',
    transferBytes: 'number',
    initialTransferBytes: 'number',
    lazyFeatureTransferBytes: 'number',
    loadedChunkCount: 'number',
    occurrences: 'number',
    chunk: 'string',
    user_notice_reference: 'string',
    user_notice_shown: 'boolean',
    user_notice_action: 'string',
    auth_flow: 'string',
    buildRevision: 'string',
    release: 'string',
    assetRevision: 'string',
    module_asset_url: 'string',
    module_error_source: 'string',
    requested_build_revision: 'string',
    resourceTag: 'string',
    resourcePath: 'pathname'
  });

  function observabilitySanitizeMetadata(value){
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const result = {};

    for (const [key, type] of Object.entries(OBSERVABILITY_METADATA_FIELDS)) {
      const item = value[key];
      if (item === undefined || item === null) continue;

      if (type === 'pathname' && typeof item === 'string') {
        try {
          const resource = new URL(item, location.href);
          if (resource.protocol === 'http:' || resource.protocol === 'https:') {
            result[key] = observabilitySanitize(resource.pathname, 300);
          }
        } catch {}
        continue;
      }

      if (type === 'string' && typeof item === 'string') {
        result[key] = observabilitySanitize(item, 300);
        continue;
      }

      if (type === 'number' && Number.isFinite(Number(item))) {
        result[key] = Number(item);
        continue;
      }

      if (type === 'boolean' && typeof item === 'boolean') {
        result[key] = item;
        continue;
      }

      if (type === 'string-array' && Array.isArray(item)) {
        result[key] = item
          .filter((entry) => typeof entry === 'string')
          .slice(0, 12)
          .map((entry) => observabilitySanitize(entry, 120));
      }
    }

    return result;
  }

  function observabilityHash(value){
    const input = String(value || '');
    let hash = 2166136261;
    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `v267-${(hash >>> 0).toString(16)}`;
  }

  const OBSERVABILITY_MODULE_ALIASES = Object.freeze({
    teamsmodule:'equipes', equipes:'equipes',
    participantsmodule:'participantes', usersmodule:'participantes', participantes:'participantes', usuarios:'participantes',
    permissionsmodule:'permissoes', permissoes:'permissoes',
    projectsmodule:'projetos', projetos:'projetos',
    profilemodule:'perfil', perfil:'perfil',
    feedbackmodulelegacy:'feedback', feedbackmodule:'feedback', feedback:'feedback',
    assetsmodule:'inventario', stockmodule:'inventario', inventario:'inventario', patrimonio:'inventario', estoque:'inventario',
    bookingsmodule:'reserva', reserva:'reserva', reservas:'reserva',
    marketingmodule:'marketing', marketing:'marketing',
    eventsmodule:'eventos', eventos:'eventos',
    boardmodule:'mural', mural:'mural',
    logsmodule:'atividades-sistema', logs:'atividades-sistema', 'saude-sistema':'atividades-sistema', 'atividades-sistema':'atividades-sistema',
    reportsmodule:'relatorios', relatorios:'relatorios',
    pendingmodule:'pendencias', pendencias:'pendencias',
    agendamodule:'agenda', agenda:'agenda'
  });

  function observabilityCanonicalModule(value){
    const raw = observabilitySanitize(value || '', 120).trim();
    if (!raw) return '';
    const key = raw.toLowerCase().replace(/[\s_-]+/g,'');
    return OBSERVABILITY_MODULE_ALIASES[key] || OBSERVABILITY_MODULE_ALIASES[raw.toLowerCase()] || raw;
  }

  function observabilityStructuralModuleMessage(message){
    const text = String(message || '');
    if (!/(?:unexpected token|invalid or unexpected token|unexpected end of input|syntaxerror|does not provide an export named|failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|chunkloaderror|loading chunk|module script)/i.test(text)) return '';
    return text
      .replace(/https?:\/\/[^\s)]+\/assets\//gi,'assets/')
      .replace(/[?&]v=[^&\s)]+/gi,'')
      .replace(/:\d+:\d+(?=\)?(?:\s|$))/g,'')
      .replace(/\s+/g,' ')
      .trim()
      .slice(0,300);
  }

  function observabilityFingerprintFor(input, source, moduleName, message){
    const provided = String(input?.fingerprint || '').trim();
    if (/^v267-[0-9a-f]+$/i.test(provided)) return provided;
    if (provided) return observabilityHash(provided);
    const structural = observabilityStructuralModuleMessage(message);
    if (structural) return observabilityHash(`module-structural|${moduleName}|${structural}`);
    return observabilityHash(`${source}|${moduleName}|${String(message || '').slice(0,300)}`);
  }

  function observabilityFindToken(value, depth = 0){
    if (!value || depth > 6) return '';
    if (typeof value === 'object' && typeof value.access_token === 'string') {
      return value.access_token;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = observabilityFindToken(item, depth + 1);
        if (found) return found;
      }
      return '';
    }
    if (typeof value === 'object') {
      for (const item of Object.values(value)) {
        const found = observabilityFindToken(item, depth + 1);
        if (found) return found;
      }
    }
    return '';
  }

  function observabilityAccessToken(){
    return globalThis.__NEXLAB_CONFIG__?.getAccessToken?.() || '';
  }

  function observabilityDedupAllowed(fingerprint){
    const dedup = observabilityReadJson(OBSERVABILITY_DEDUP_KEY, {});
    const last = Number(dedup[fingerprint] || 0);
    const now = Date.now();
    if (now - last < OBSERVABILITY_DEDUP_MS) return false;

    dedup[fingerprint] = now;
    const entries = Object.entries(dedup)
      .filter(([, timestamp]) => now - Number(timestamp) < 24 * 60 * 60 * 1000)
      .slice(-80);

    try {
      sessionStorage.setItem(
        OBSERVABILITY_DEDUP_KEY,
        JSON.stringify(Object.fromEntries(entries))
      );
    } catch {}
    return true;
  }

  function observabilityQueueEvent(input){
    try {
      const message = observabilitySanitize(input?.message || 'Erro técnico sem mensagem.', 1000);
      const source = observabilitySanitize(input?.source || 'client', 80);
      const moduleName = observabilityCanonicalModule(
        input?.module || document.body?.dataset?.nexlabPage || ''
      );
      const fingerprint = observabilityFingerprintFor(input, source, moduleName, message);

      if (!observabilityDedupAllowed(fingerprint)) {
        observabilityState.dropped += 1;
        observabilityPublishState();
        return fingerprint;
      }

      const metadata = observabilitySanitizeMetadata({...((input?.metadata&&typeof input.metadata==="object")?input.metadata:{}),buildRevision:APP_REVISION,release:APP_RELEASE,assetRevision:BUILD_IDENTITY.assetRevision||null});
      const environment = observabilityEnvironment();
      observabilityState.environment = environment;

      observabilityQueue.push({
        p_app_version: OBSERVABILITY_VERSION,
        p_environment: environment,
        p_source: source,
        p_severity: ['critical','error','warning','info'].includes(input?.severity)
          ? input.severity
          : 'error',
        p_message: message,
        p_stack: observabilitySanitize(input?.stack || '', 5000) || null,
        p_module: moduleName || null,
        p_page: observabilitySanitize(
          input?.page || document.body?.dataset?.nexlabPage || '',
          120
        ) || null,
        p_url_path: observabilitySanitize(location.pathname, 500),
        p_user_agent: observabilitySanitize(navigator.userAgent, 500),
        p_metadata: metadata,
        p_fingerprint: fingerprint
      });

      if (observabilityQueue.length > OBSERVABILITY_MAX_QUEUE) {
        observabilityQueue.splice(
          0,
          observabilityQueue.length - OBSERVABILITY_MAX_QUEUE
        );
        observabilityState.dropped += 1;
      }

      observabilityPublishState();
      window.setTimeout(observabilityFlush, 350);
      return fingerprint;
    } catch {
      return '';
    }
  }

  async function observabilityFlush(){
    if (
      observabilityFlushRunning ||
      !navigator.onLine ||
      !observabilityQueue.length ||
      Date.now() < observabilityRetryAfter
    ) return;

    const config = globalThis.__NEXLAB_CONFIG__ || {};
    const token = observabilityAccessToken();
    if (!config.supabaseUrl || !config.supabaseAnonKey || !token) {
      observabilityPublishState();
      return;
    }

    observabilityFlushRunning = true;

    try {
      let sentThisRun = 0;
      while (observabilityQueue.length && sentThisRun < 5) {
        const payload = observabilityQueue[0];
        const response = await nativeFetch(
          `${String(config.supabaseUrl).replace(/\/+$/, '')}/rest/v1/rpc/${OBSERVABILITY_RPC}`,
          {
            method: 'POST',
            headers: {
              apikey: config.supabaseAnonKey,
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          }
        );

        if (response.ok) {
          observabilityQueue.shift();
          observabilityState.sent += 1;
          observabilityState.lastSentAt = new Date().toISOString();
          observabilityState.lastError = null;
          observabilityState.sqlReady = true;
          sentThisRun += 1;
          observabilityPublishState();
          continue;
        }

        const body = await response.text().catch(() => '');
        if (
          response.status === 404 ||
          /PGRST202|nexlab_record_client_error_v26_7/i.test(body)
        ) {
          observabilityState.sqlReady = false;
          observabilityState.lastError = 'Migration v26.7.4 não instalada.';
          observabilityRetryAfter = Date.now() + 10 * 60 * 1000;
        } else if (response.status === 401 || response.status === 403) {
          observabilityState.lastError = 'Sessão sem autorização para observabilidade.';
          observabilityRetryAfter = Date.now() + 2 * 60 * 1000;
        } else {
          observabilityState.lastError = `Falha HTTP ${response.status}.`;
          observabilityRetryAfter = Date.now() + 60 * 1000;
        }
        observabilityPublishState();
        break;
      }
    } catch (error) {
      observabilityState.lastError = observabilitySanitize(error?.message || error, 300);
      observabilityRetryAfter = Date.now() + 60 * 1000;
      observabilityPublishState();
    } finally {
      observabilityFlushRunning = false;
    }
  }


  const USER_ERROR_CONTEXT_KEY = 'nexlab:feedback-assist:context:v0.26.82';
  const USER_ERROR_STATE_KEY = 'nexlab:user-error-state:v0.26.82';
  const USER_ERROR_MESSAGE = 'Erro, tente novamente. Se o erro persistir, informe o problema no Feedback para ser corrigido.';
  const USER_ERROR_REPEAT_MS = 90 * 1000;
  const USER_ERROR_BURST_MS = 5 * 60 * 1000;
  const USER_ERROR_BURST_LIMIT = 3;
  let userErrorState = observabilityReadJson(USER_ERROR_STATE_KEY, { fingerprints:{}, notices:[] });
  if (!userErrorState || typeof userErrorState !== 'object') {
    userErrorState = { fingerprints:{}, notices:[] };
  }

  function userErrorPersistState(){
    try {
      sessionStorage.setItem(USER_ERROR_STATE_KEY, JSON.stringify(userErrorState));
    } catch {}
  }

  function userErrorExpectedAccessDenial(input){
    const text = `${input?.message || ''} ${input?.stack || ''}`.toLowerCase();
    return /(?:não possui acesso|sem permissão|permission denied|not authorized|não autorizado|\b42501\b|\bpgrst301\b)/i.test(text);
  }

  function userErrorExcluded(input){
    const text = `${input?.message || ''} ${input?.stack || ''}`.toLowerCase();
    if (!text.trim()) return true;
    if (isExpectedAbort(input?.error)) return true;
    if (navigator.onLine === false) return true;
    if (userErrorExpectedAccessDenial(input)) return true;
    return /(?:failed to fetch|networkerror|network request failed|load failed|internet|offline|sem conexão|conexão caiu|http\s*(?:0|401|403|502|503|504)|jwt|token expir|session|sessão expir|não autenticad|autenticação obrigatória|password|senha|dynamic import|dynamically imported module|chunkloaderror|loading chunk|module script|service worker|update available|atualização disponível)/i.test(text);
  }

  function userErrorReference(fingerprint){
    const cleanVersion = String(APP_VERSION || '0').replace(/\D/g,'').slice(-6).padStart(3,'0');
    return `NXL-${cleanVersion}-${String(fingerprint || '00000000').toUpperCase()}`;
  }

  function userErrorActionLabel(input){
    const explicit = observabilitySanitize(input?.action || '', 120);
    if (explicit) return explicit;
    const source = String(input?.source || '');
    if (source === 'module-render') return 'abrir ou renderizar o módulo';
    if (source === 'partial-load') return 'carregar os dados do módulo';
    if (source === 'caught-error') return 'concluir a ação solicitada';
    if (source === 'react-recoverable') return 'atualizar a interface';
    return 'usar o aplicativo';
  }

  function userErrorBuildContext(input, fingerprint, reference){
    const moduleName = observabilityCanonicalModule(
      input?.module || document.body?.dataset?.nexlabPage || 'não identificado'
    ) || 'não identificado';
    return {
      reference,
      fingerprint,
      module: moduleName,
      action: userErrorActionLabel(input),
      occurredAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      revision: APP_REVISION,
      source: observabilitySanitize(input?.source || 'client', 80),
      online: navigator.onLine !== false,
      installed: Boolean(
        window.matchMedia?.('(display-mode: standalone)')?.matches ||
        navigator.standalone === true
      ),
      message: USER_ERROR_MESSAGE
    };
  }

  function userErrorNotify(input, fingerprint){
    try {
      if (userErrorExcluded(input)) return null;
      const normalizedFingerprint = String(
        fingerprint ||
        observabilityHash(`${input?.source || 'client'}|${input?.module || document.body?.dataset?.nexlabPage || ''}|${input?.message || ''}`)
      );
      const now = Date.now();
      const fingerprints = userErrorState.fingerprints && typeof userErrorState.fingerprints === 'object'
        ? userErrorState.fingerprints
        : {};
      const last = Number(fingerprints[normalizedFingerprint] || 0);
      const notices = Array.isArray(userErrorState.notices)
        ? userErrorState.notices.filter((stamp) => now - Number(stamp) < USER_ERROR_BURST_MS)
        : [];

      if (last && now - last < USER_ERROR_REPEAT_MS) return null;
      if (notices.length >= USER_ERROR_BURST_LIMIT) {
        userErrorState = { fingerprints, notices };
        userErrorPersistState();
        return null;
      }

      fingerprints[normalizedFingerprint] = now;
      const recentEntries = Object.entries(fingerprints)
        .filter(([, stamp]) => now - Number(stamp) < 24 * 60 * 60 * 1000)
        .slice(-80);
      const reference = userErrorReference(normalizedFingerprint);
      const context = userErrorBuildContext(input, normalizedFingerprint, reference);
      userErrorState = {
        fingerprints: Object.fromEntries(recentEntries),
        notices: [...notices, now]
      };
      userErrorPersistState();
      try {
        sessionStorage.setItem(USER_ERROR_CONTEXT_KEY, JSON.stringify(context));
      } catch {}
      emit('nexlab:user-error', context);
      return context;
    } catch {
      return null;
    }
  }

  function reportDetectedUserError(input){
    const raw = input && typeof input === 'object' ? input : { message:String(input || '') };
    if (userErrorExpectedAccessDenial(raw)) {
      observabilityQueueEvent({
        ...raw,
        severity: 'warning',
        metadata: {
          ...(raw.metadata && typeof raw.metadata === 'object' ? raw.metadata : {}),
          user_notice_shown: false
        }
      });
      return null;
    }
    if (userErrorExcluded(raw)) return null;
    const moduleName = observabilityCanonicalModule(raw.module || document.body?.dataset?.nexlabPage || '');
    const fingerprint = observabilityFingerprintFor(
      raw,
      observabilitySanitize(raw.source || 'client',80),
      moduleName,
      observabilitySanitize(raw.message || 'Erro técnico sem mensagem.',1000)
    );
    const reference = userErrorReference(fingerprint);
    observabilityQueueEvent({
      ...raw,
      module: moduleName,
      fingerprint,
      metadata: {
        ...(raw.metadata && typeof raw.metadata === 'object' ? raw.metadata : {}),
        user_notice_reference: reference,
        user_notice_shown: true
      }
    });
    return userErrorNotify(raw, fingerprint);
  }

  async function nexlabFunctionErrorMessageV02651(error, fallback){
    const fallbackMessage = observabilitySanitize(fallback || 'Não foi possível concluir a operação.', 500)
      || 'Não foi possível concluir a operação.';
    const directMessage = observabilitySanitize(error?.message || '', 500);
    const context = error?.context;
    let payload = null;

    if (context && (typeof context.json === 'function' || typeof context.text === 'function')) {
      try {
        const response = typeof context.clone === 'function' ? context.clone() : context;
        const contentType = String(response.headers?.get?.('content-type') || '').toLowerCase();
        if (contentType.includes('application/json') && typeof response.json === 'function') {
          payload = await response.json();
        } else if (typeof response.text === 'function') {
          const rawText = await response.text();
          try { payload = JSON.parse(rawText); }
          catch { payload = rawText; }
        }
      } catch {}
    }

    const serverMessage = payload && typeof payload === 'object'
      ? observabilitySanitize(payload.message || payload.error || '', 500)
      : observabilitySanitize(payload || '', 500);
    if (serverMessage) return serverMessage;

    if (directMessage && !/edge function returned a non-2xx status code/i.test(directMessage)) {
      return directMessage;
    }
    return fallbackMessage;
  }

  window.nexlabFunctionErrorMessage = nexlabFunctionErrorMessageV02651;
  window.nexlabReportUserError = reportDetectedUserError;
  window.__NEXLAB_ERROR_ASSIST__ = Object.freeze({
    version: APP_VERSION,
    contextKey: USER_ERROR_CONTEXT_KEY,
    report: reportDetectedUserError
  });

  window.addEventListener('error', (event) => {
    // Resource-load failures (img/link/script/etc.) also reach window in capture mode.
    // They are not JavaScript exceptions and must never open the blocking user-error modal.
    const isErrorEvent = typeof ErrorEvent !== 'undefined' && event instanceof ErrorEvent;
    if (!isErrorEvent) {
      const target = event?.target;
      const tag = observabilitySanitize(target?.tagName || 'resource', 40).toLowerCase();
      const rawResource = target?.currentSrc || target?.src || target?.href || '';
      let resourcePath = '';
      try { resourcePath = new URL(String(rawResource || ''), location.href).pathname; } catch {}
      observabilityQueueEvent({
        source: 'resource-load',
        severity: tag === 'script' ? 'warning' : 'info',
        message: `Falha protegida ao carregar recurso estático (${tag || 'resource'}).`,
        module: document.body?.dataset?.nexlabPage || '',
        metadata: {
          resourceTag: tag,
          resourcePath: observabilitySanitize(resourcePath, 300),
          user_notice_shown: false
        }
      });
      return;
    }

    const cause = event.error?.cause || event.error;
    const message = cause?.message || event.message || '';
    const filename = observabilitySanitize(event.filename || '', 300);
    const line = Number(event.lineno || 0);
    const column = Number(event.colno || 0);

    // Browsers/extensions may emit opaque ErrorEvents with no diagnostic information.
    // Logging them as a real application crash creates false-positive modals.
    if (!cause && !filename && line === 0 && column === 0 && (!message || /^script error\.?$/i.test(String(message).trim()))) {
      observabilityQueueEvent({
        source: 'window.error-opaque',
        severity: 'warning',
        message: 'Evento de erro opaco ignorado por não conter diagnóstico do aplicativo.',
        module: document.body?.dataset?.nexlabPage || '',
        metadata: { user_notice_shown:false }
      });
      return;
    }

    reportDetectedUserError({
      source: 'window.error',
      severity: 'error',
      message: message || 'Erro JavaScript não tratado.',
      stack: cause?.stack || event.error?.stack || '',
      error: cause,
      metadata: {
        filename,
        line,
        column,
        wrapper: observabilitySanitize(event.message || '', 300),
        causeName: observabilitySanitize(cause?.name || '', 120)
      }
    });
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (isExpectedAbort(reason)) {
      event.preventDefault();
      return;
    }
    reportDetectedUserError({
      source: 'unhandledrejection',
      severity: 'error',
      message: reason?.message || String(reason || 'Promise rejeitada sem tratamento.'),
      stack: reason?.stack || '',
      error: reason
    });
  });

  const reactRecoverableWindow = new Map();
  window.addEventListener('nexlab:react-recoverable-error', (event) => {
    const detail = event.detail || {};
    const moduleName = detail.module || document.body?.dataset?.nexlabPage || '';
    const combined = `${detail.message || ''} ${detail.stack || ''}`;
    const fingerprint = `${moduleName}|${detail.message || ''}`.slice(0, 600);
    const now = Date.now();
    const recent = (reactRecoverableWindow.get(fingerprint) || []).filter((stamp) => now - stamp < 30000);
    recent.push(now);
    reactRecoverableWindow.set(fingerprint, recent);
    const occurrences = recent.length;
    const serious = /removeChild|Maximum call stack|recursion|Maximum update depth|Minified React error #185/i.test(combined);
    const chunkMatch = combined.match(/assets\/(nexlab-[^\s):]+\.js|index-[^\s):]+\.js)/i);
    const recoverablePayload = {
      source: 'react-recoverable',
      severity: serious || occurrences >= 3 ? 'critical' : 'warning',
      message: detail.message || 'O React recuperou uma falha de renderização concorrente.',
      stack: detail.stack || '',
      module: moduleName,
      metadata: {
        wrapper: observabilitySanitize(detail.wrapper || '', 300),
        causeName: observabilitySanitize(detail.causeName || '', 120),
        occurrences,
        chunk: observabilitySanitize(chunkMatch?.[1] || '', 180)
      }
    };
    if (serious || occurrences >= 3) reportDetectedUserError(recoverablePayload);
    else observabilityQueueEvent(recoverablePayload);
  });

  window.addEventListener('nexlab:realtime-cleanup-error', (event) => {
    observabilityQueueEvent({
      source: 'realtime-cleanup',
      severity: 'warning',
      message: event.detail?.message || 'Falha protegida ao encerrar canal Realtime.',
      stack: event.detail?.stack || '',
      metadata: {
        component: observabilitySanitize(event.detail?.context || '', 160)
      }
    });
  });

  window.addEventListener('nexlab:module-render-error', (event) => {
    reportDetectedUserError({
      source: 'module-render',
      severity: 'critical',
      message: event.detail?.message || 'Falha protegida de renderização.',
      stack: event.detail?.stack || '',
      module: event.detail?.module || document.body?.dataset?.nexlabPage || '',
      action: 'abrir ou renderizar o módulo',
      metadata: {
        component: observabilitySanitize(event.detail?.component || '', 160),
        module_asset_url: observabilitySanitize(event.detail?.url || '', 600),
        module_error_source: observabilitySanitize(event.detail?.source || '', 120),
        requested_build_revision: observabilitySanitize(window.__NEXLAB_BUILD_IDENTITY__?.revision || '', 160)
      }
    });
  });

  window.addEventListener('nexlab:module-partial-error', (event) => {
    observabilityQueueEvent({
      source: 'partial-load',
      severity: 'warning',
      message: `Carregamento parcial: ${(event.detail?.failures || []).join(', ') || 'consulta não identificada'}.`,
      module: event.detail?.module || '',
      metadata: {
        failures: Array.isArray(event.detail?.failures)
          ? event.detail.failures.slice(0, 12)
          : []
      }
    });
  });


  const nativeConsoleError = console.error.bind(console);
  console.error = function(...args){
    nativeConsoleError(...args);
    try {
      const leadingText = args
        .filter((item) => typeof item === 'string')
        .join(' ')
        .slice(0, 1000);
      const errorObject = args.find((item) => item instanceof Error)
        || args.find((item) => item && typeof item === 'object' && typeof item.message === 'string');
      const message = errorObject?.message
        ? `${leadingText ? leadingText + ' ' : ''}${errorObject.message}`
        : leadingText;
      if (
        message &&
        /(?:^|\s)(?:erro ao|falha ao|não foi possível|erro inesperado|falha inesperada)/i.test(message)
      ) {
        reportDetectedUserError({
          source: 'caught-error',
          severity: 'error',
          message,
          stack: errorObject?.stack || '',
          error: errorObject,
          action: 'concluir a ação solicitada'
        });
      }
    } catch {}
  };

  const COMPATIBILITY_MARKER_KEY = 'nexlab:compatibility-asset:last';
  function reportCompatibilityAsset(detail){
    if (!detail || typeof detail !== 'object') return;
    const sourceVersion = observabilitySanitize(detail.sourceVersion || 'unknown', 80);
    const targetVersion = observabilitySanitize(detail.targetVersion || APP_VERSION, 80);
    const assetPath = observabilitySanitize(detail.assetPath || '', 240);
    const group = observabilitySanitize(detail.group || 'compatibility', 120);
    observabilityQueueEvent({
      source: 'compatibility-asset',
      severity: 'info',
      module: 'update',
      page: 'update',
      fingerprint: `compatibility-${sourceVersion}-${group}-${assetPath}`,
      message: `Ativo de compatibilidade utilizado por cliente ${sourceVersion}.`,
      metadata: {
        component: 'compatibility-bridge',
        sourceVersion,
        targetVersion,
        assetPath,
        group,
        mode: observabilitySanitize(detail.mode || 'bridge', 80)
      }
    });
  }
  window.addEventListener('nexlab:compatibility-asset-used', (event) => {
    reportCompatibilityAsset(event.detail || {});
  });
  try {
    const pendingCompatibilityMarker = JSON.parse(sessionStorage.getItem(COMPATIBILITY_MARKER_KEY) || 'null');
    if (pendingCompatibilityMarker) {
      reportCompatibilityAsset(pendingCompatibilityMarker);
      sessionStorage.removeItem(COMPATIBILITY_MARKER_KEY);
    }
  } catch {}

  const PERFORMANCE_ALERT_STATE_KEY = 'nexlab:performance-alert-state:v0.26.82';
  const PERFORMANCE_ALERT_MIN_INTERVAL_MS = 10 * 60 * 1000;
  let performanceAlertState = (()=>{try{return JSON.parse(localStorage.getItem(PERFORMANCE_ALERT_STATE_KEY)||'null');}catch{return null;}})() || {
    degraded: false,
    lastAlertAt: 0,
    categories: []
  };
  if (!performanceAlertState || typeof performanceAlertState !== 'object') {
    performanceAlertState = { degraded: false, lastAlertAt: 0, categories: [] };
  }

  function persistPerformanceAlertState(){
    try {
      localStorage.setItem(PERFORMANCE_ALERT_STATE_KEY, JSON.stringify(performanceAlertState));
    } catch {}
  }

  window.addEventListener('nexlab:performance-metrics', (event) => {
    const metrics = event.detail || {};
    const categories = [];
    if (Number(metrics.lcpMs || 0) > 5000) categories.push('lcp');
    if (Number(metrics.navigationMs || 0) > 8000) categories.push('navigation');
    if (Number(metrics.longestTaskMs || 0) > 2000) categories.push('long-task-duration');
    if (Number(metrics.longTasks || 0) > 20 && Number(metrics.longestTaskMs || 0) > 500) categories.push('long-task-count');

    if (!categories.length) {
      performanceAlertState.degraded = false;
      persistPerformanceAlertState();
      return;
    }

    const now = Date.now();
    const alreadyReported = new Set(Array.isArray(performanceAlertState.categories)
      ? performanceAlertState.categories
      : []);
    const newCategories = categories.filter((category) => !alreadyReported.has(category));
    const transitionedToDegraded = performanceAlertState.degraded !== true;
    const intervalElapsed = now - Number(performanceAlertState.lastAlertAt || 0)
      >= PERFORMANCE_ALERT_MIN_INTERVAL_MS;

    performanceAlertState.degraded = true;
    categories.forEach((category) => alreadyReported.add(category));
    performanceAlertState.categories = Array.from(alreadyReported);

    if (!transitionedToDegraded || !newCategories.length || !intervalElapsed) {
      persistPerformanceAlertState();
      return;
    }

    performanceAlertState.lastAlertAt = now;
    persistPerformanceAlertState();

    observabilityQueueEvent({
      source: 'performance',
      severity: 'warning',
      module: 'global',
      page: 'global',
      fingerprint: 'performance-global-v02656',
      message: 'Degradação de desempenho global detectada no carregamento do aplicativo.',
      metadata: {
        component: 'global-page-load',
        failures: newCategories,
        lcpMs: Number(metrics.lcpMs || 0),
        navigationMs: Number(metrics.navigationMs || 0),
        domContentLoadedMs: Number(metrics.domContentLoadedMs || 0),
        longTasks: Number(metrics.longTasks || 0),
        longestTaskMs: Number(metrics.longestTaskMs || 0),
        transferBytes: Number(metrics.initialTransferBytes || metrics.mainBundleTransferBytes || 0),
        initialTransferBytes: Number(metrics.initialTransferBytes || 0),
        lazyFeatureTransferBytes: Number(metrics.lazyFeatureTransferBytes || 0),
        loadedChunkCount: Number(metrics.loadedChunkCount || 0)
      }
    });
  });

  window.addEventListener('nexlab:dashboard-bundle-metrics',(event)=>{
    const detail=event.detail||{};
    window.__NEXLAB_DASHBOARD_BUNDLE_METRICS__=Object.freeze({...detail});
    try{sessionStorage.setItem('nexlab:dashboard-bundle:v0.26.82',JSON.stringify(detail));}catch{}
    if(Number(detail.total_ms||0)>5000||Number(detail.failed_section_count||0)>0){
      observabilityQueueEvent({source:'dashboard-bundle',severity:Number(detail.failed_section_count||0)>0?'warning':'info',module:'dashboard',page:'dashboard',fingerprint:'dashboard-bundle-v02656',message:Number(detail.failed_section_count||0)>0?'O pacote consolidado do Dashboard concluiu com seções indisponíveis.':'O pacote consolidado do Dashboard excedeu cinco segundos.',metadata:{...detail}});
    }
  });

  window.addEventListener('online', observabilityFlush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') observabilityFlush();
  });

  window.setInterval(observabilityFlush, 60 * 1000);
  observabilityPublishState();
  window.setTimeout(observabilityFlush, 1800);

  const performanceState = {
    version: APP_VERSION,
    longTasks: 0,
    longestTaskMs: 0,
    lcpMs: 0,
    navigationMs: 0,
    domContentLoadedMs: 0,
    mainBundleTransferBytes: 0,
    initialTransferBytes: 0,
    lazyFeatureTransferBytes: 0,
    loadedChunkCount: 0,
    capturedAt: null
  };

  function savePerformanceState(){
    performanceState.capturedAt = new Date().toISOString();
    window.__NEXLAB_PERFORMANCE__ = Object.freeze({ ...performanceState });
    try {
      sessionStorage.setItem('nexlab:performance:v0.26.82', JSON.stringify(performanceState));
    } catch {}
    emit('nexlab:performance-metrics', { ...performanceState });
  }

  function collectStaticPerformanceMetrics(){
    try {
      const navigation = performance.getEntriesByType('navigation')[0];
      if (navigation) {
        performanceState.navigationMs = Math.round(navigation.duration || 0);
        performanceState.domContentLoadedMs = Math.round(navigation.domContentLoadedEventEnd || 0);
      }

      const resources = performance.getEntriesByType('resource');
      const declaredResources = BUILD_IDENTITY?.resources || {};
      const normalizeResourcePath = (value) => {
        try {
          const url = new URL(String(value || ''), document.baseURI);
          const base = new URL('./', document.baseURI).pathname;
          return decodeURIComponent(url.pathname.startsWith(base) ? url.pathname.slice(base.length) : url.pathname.replace(/^\/+/, ''));
        } catch {
          return String(value || '').split('?')[0].replace(/^\.\//, '').replace(/^\/+/, '');
        }
      };
      const domInitial = [...document.querySelectorAll('script[src],link[rel="modulepreload"][href]')]
        .map((node) => normalizeResourcePath(node.src || node.href))
        .filter((path) => path.startsWith('assets/') && path.endsWith('.js'));
      const initialPaths = new Set([...(declaredResources.initial || []), ...domInitial].map(normalizeResourcePath));
      const lazyPaths = new Set([...(declaredResources.lazy || [])].map(normalizeResourcePath));
      const aggregateResources = (paths) => {
        const byPath = new Map();
        resources.forEach((entry) => {
          const path = normalizeResourcePath(entry.name);
          if (!paths.has(path)) return;
          const bytes = Number(entry.transferSize || entry.encodedBodySize || 0);
          const previous = byPath.get(path);
          if (!previous || bytes > previous.bytes) byPath.set(path, { entry, bytes });
        });
        return [...byPath.values()];
      };
      const initial = aggregateResources(initialPaths);
      const feature = aggregateResources(lazyPaths);
      performanceState.initialTransferBytes = Math.round(initial.reduce((sum, item) => sum + item.bytes, 0));
      performanceState.mainBundleTransferBytes = performanceState.initialTransferBytes;
      performanceState.lazyFeatureTransferBytes = Math.round(feature.reduce((sum, item) => sum + item.bytes, 0));
      performanceState.loadedChunkCount = initial.length + feature.length;
      savePerformanceState();
    } catch {}
  }

  try {
    if ('PerformanceObserver' in window) {
      try {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            performanceState.longTasks += 1;
            performanceState.longestTaskMs = Math.max(
              performanceState.longestTaskMs,
              Math.round(entry.duration || 0)
            );
          }
          savePerformanceState();
        }).observe({ type: 'longtask', buffered: true });
      } catch {}

      try {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const latest = entries[entries.length - 1];
          if (latest) {
            performanceState.lcpMs = Math.round(latest.startTime || 0);
            savePerformanceState();
          }
        }).observe({ type: 'largest-contentful-paint', buffered: true });
      } catch {}


      try {
        new PerformanceObserver((list) => {
          const lazyPaths = new Set([...(BUILD_IDENTITY?.resources?.lazy || [])].map((value) => {
            try { return new URL(value, document.baseURI).pathname; } catch { return String(value || ''); }
          }));
          if (list.getEntries().some((entry) => {
            try { return lazyPaths.has(new URL(entry.name, document.baseURI).pathname); } catch { return false; }
          })) {
            collectStaticPerformanceMetrics();
          }
        }).observe({ type: 'resource', buffered: true });
      } catch {}
    }
  } catch {}

  if (document.readyState === 'complete') {
    window.setTimeout(collectStaticPerformanceMetrics, 0);
  } else {
    window.addEventListener('load', () => window.setTimeout(collectStaticPerformanceMetrics, 0), { once: true });
  }

  window.addEventListener('offline', function(){
    emit('nexlab:connection-error', {
      title: 'Você está sem internet',
      message: 'O NEXLAB entrou em modo offline. Dados já carregados podem continuar visíveis; salvamentos e sincronizações precisam de conexão.',
      detail: 'Evento offline detectado pelo navegador.'
    });
  });
})();

/* NEXLAB Beta 0.26.82 — recursos pós-abertura com nova tentativa controlada. */
(function(){
  'use strict';
  const BUILD=globalThis.__NEXLAB_BUILD_IDENTITY__||{};
  const VERSION=BUILD.version||'0.26.82';
  const REVISION=BUILD.revision||'beta-0-26-82-google-calendar-integracao';
  if(globalThis.__NEXLAB_POST_STARTUP__?.revision===REVISION)return;
  const MAX_ATTEMPTS=3;
  const sources=(BUILD.resources?.postStartup||[
    'assets/nexlab-vapid-rotation.js',
    'assets/nexlab-push-consent.js',
    'assets/nexlab-feedback-evidence.js'
  ]).map(path=>'./'+String(path).replace(/^\.\//,'')+'?v='+(BUILD.assetRevision||'app-beta-0-26-82-oficial-completo'));
  const state={version:VERSION,revision:REVISION,status:'scheduled',loaded:[],errors:[],attempts:{},lastReason:'',startedAt:null,completedAt:null};
  const sourceState=new Map(sources.map(src=>[src,{status:'pending',attempts:0,lastError:''}]));
  let active=null;
  let retryTimer=0;
  globalThis.__NEXLAB_POST_STARTUP__=state;

  const absolute=(src)=>new URL(src,document.baseURI).href;
  const syncPublicState=()=>{
    state.loaded=sources.filter(src=>sourceState.get(src)?.status==='loaded');
    state.errors=sources.filter(src=>sourceState.get(src)?.status==='failed').map(src=>({src,error:sourceState.get(src)?.lastError||'Falha desconhecida',attempts:sourceState.get(src)?.attempts||0}));
    state.attempts=Object.fromEntries(sources.map(src=>[src,sourceState.get(src)?.attempts||0]));
  };
  function loadScript(src){
    const item=sourceState.get(src);
    if(item?.status==='loaded')return Promise.resolve(src);
    return new Promise((resolve,reject)=>{
      const url=absolute(src);
      const existing=[...document.scripts].find(script=>script.src===url);
      if(existing?.dataset?.nexlabLoadState==='loaded'){
        item.status='loaded';item.lastError='';return resolve(src);
      }
      if(existing?.dataset?.nexlabLoadState==='loading'){
        existing.addEventListener('load',()=>resolve(src),{once:true});
        existing.addEventListener('error',()=>reject(new Error('Falha ao carregar '+src)),{once:true});
        return;
      }
      if(existing)existing.remove();
      item.status='loading';item.attempts+=1;item.lastError='';
      const script=document.createElement('script');
      script.src=src;script.async=true;script.dataset.nexlabPostStartup='true';script.dataset.nexlabLoadState='loading';
      script.onload=()=>{script.dataset.nexlabLoadState='loaded';item.status='loaded';item.lastError='';resolve(src);};
      script.onerror=()=>{script.dataset.nexlabLoadState='failed';item.status='failed';item.lastError='Falha ao carregar '+src;script.remove();reject(new Error(item.lastError));};
      document.head.appendChild(script);
    });
  }
  function scheduleRetry(){
    clearTimeout(retryTimer);
    const pending=sources.filter(src=>{const item=sourceState.get(src);return item?.status==='failed'&&item.attempts<MAX_ATTEMPTS;});
    if(!pending.length||!navigator.onLine)return;
    const highest=Math.max(...pending.map(src=>sourceState.get(src)?.attempts||1));
    const delay=Math.min(8000,800*Math.pow(3,Math.max(0,highest-1)));
    retryTimer=setTimeout(()=>void loadAll('automatic-retry'),delay);
  }
  function loadAll(reason='idle'){
    if(active)return active;
    const eligible=sources.filter(src=>{const item=sourceState.get(src);return item?.status!=='loaded'&&item?.status!=='loading'&&(item?.attempts||0)<MAX_ATTEMPTS;});
    if(!eligible.length){
      syncPublicState();state.status=state.loaded.length===sources.length?'ready':(state.errors.length?'partial':'ready');
      return Promise.resolve(state);
    }
    state.status='loading';state.lastReason=reason;state.startedAt=new Date().toISOString();
    active=Promise.allSettled(eligible.map(loadScript)).then(()=>{
      syncPublicState();
      state.status=state.loaded.length===sources.length?'ready':'partial';state.completedAt=new Date().toISOString();
      globalThis.dispatchEvent(new CustomEvent('nexlab:post-startup-ready',{detail:{...state}}));
      if(state.status==='partial')scheduleRetry();
      return state;
    }).finally(()=>{active=null;});
    return active;
  }
  const schedule=()=>{
    if('requestIdleCallback'in globalThis)requestIdleCallback(()=>loadAll('idle'),{timeout:2200});
    else setTimeout(()=>loadAll('timeout'),900);
  };
  if(document.readyState==='complete')schedule();else globalThis.addEventListener('load',schedule,{once:true});
  document.addEventListener('click',event=>{
    const target=event.target?.closest?.('[data-tab="feedback"],[data-nexlab-tab="feedback"],[href*="feedback"]');
    if(target)void loadAll('feedback-navigation');
  },{capture:true});
  globalThis.addEventListener('online',()=>void loadAll('connection-restored'));
  globalThis.addEventListener('nexlab:session-ready',()=>void loadAll('session-ready'),{once:true});
  state.load=loadAll;state.retry=()=>loadAll('manual-retry');state.getSourceState=()=>Object.fromEntries([...sourceState.entries()].map(([src,value])=>[src,{...value}]));
})();
