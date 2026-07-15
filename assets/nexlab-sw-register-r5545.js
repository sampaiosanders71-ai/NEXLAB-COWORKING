(function(){
  'use strict';
  const VERSION = '26.30.9';
  function clearBlockedUpdateState(){
    try {
      document.querySelectorAll('.nexlab-update-overlay,.nexlab-update-banner').forEach((element)=>element.remove());
      document.documentElement.removeAttribute('data-nexlab-busy');
      document.body?.removeAttribute('data-nexlab-updating');
      for (const key of Object.keys(sessionStorage)) if (key.startsWith('nexlab:update:')) sessionStorage.removeItem(key);
      for (const key of Object.keys(localStorage)) if (key.startsWith('nexlab:update:')) localStorage.removeItem(key);
    } catch {}
  }
  clearBlockedUpdateState();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', clearBlockedUpdateState, { once:true });
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker.addEventListener('message', (event)=>{
    if (event.data?.type === 'NEXLAB_RECOVERY_ACTIVE') clearBlockedUpdateState();
  });
  window.addEventListener('load', async ()=>{
    clearBlockedUpdateState();
    try {
      const registration = await navigator.serviceWorker.register('./nexlab-sw.js', { scope:'./', updateViaCache:'none' });
      await registration.update();
    } catch (error) {
      console.error(`Falha ao registrar o Service Worker do NEXLAB ${VERSION}:`, error);
    }
  }, { once:true });
})();
