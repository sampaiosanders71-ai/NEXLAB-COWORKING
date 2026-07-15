(function(){
  'use strict';
  // R55.4.5: o atualizador bloqueante foi desativado. O Service Worker atualiza em segundo plano.
  try {
    document.querySelectorAll('.nexlab-update-overlay,.nexlab-update-banner').forEach((element)=>element.remove());
    for (const key of Object.keys(sessionStorage)) if (key.startsWith('nexlab:update:')) sessionStorage.removeItem(key);
    for (const key of Object.keys(localStorage)) if (key.startsWith('nexlab:update:')) localStorage.removeItem(key);
  } catch {}
  window.__NEXLAB_UPDATE_MANAGER__ = Object.freeze({
    version: '26.30.9',
    revision: 'nonblocking-recovery-r5545',
    start: function(){},
    check: async function(){
      try { const registration = await navigator.serviceWorker?.getRegistration('./'); await registration?.update(); return registration; }
      catch { return null; }
    },
    apply: function(){},
    markDirty: function(){},
    clearDirty: function(){},
    isSafeToApply: function(){ return true; },
    snapshot: function(){ return Object.freeze({ currentVersion:'26.30.9', waiting:false, applying:false, safeToApply:true }); }
  });
})();
