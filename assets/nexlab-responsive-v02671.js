(function(){
  'use strict';
  const BUILD=globalThis.__NEXLAB_BUILD_IDENTITY__||Object.freeze({version:'0.26.82',revision:'beta-0-26-82-google-calendar-integracao'});
  if(globalThis.__NEXLAB_RESPONSIVE_V02671__?.revision===BUILD.revision)return;

  const root=document.documentElement;
  let activeMenu=null;
  let sourcePopover=null;
  let portal=null;
  let raf=0;
  let scanTimer=0;
  let closing=false;
  const detailsSelector='details.card-action-menu,details.project-details-more-v02667';
  const popoverSelector=':scope > .card-action-menu__popover,:scope > .project-details-more-menu-v02667,:scope > [role="menu"]';

  function updateViewport(){
    const vv=globalThis.visualViewport;
    const height=Math.max(320,Math.round(vv?.height||globalThis.innerHeight||document.documentElement.clientHeight||0));
    const width=Math.max(280,Math.round(vv?.width||globalThis.innerWidth||document.documentElement.clientWidth||0));
    const keyboard=Math.max(0,Math.round((globalThis.innerHeight||height)-height-(vv?.offsetTop||0)));
    root.style.setProperty('--nexlab-vvh',height+'px');
    root.style.setProperty('--nexlab-vvw',width+'px');
    root.style.setProperty('--nexlab-keyboard-inset',keyboard+'px');
    root.dataset.nexlabResponsive='02671';
    root.dataset.nexlabKeyboardOpen=keyboard>120?'true':'false';
    scheduleMenu();
  }

  function getPopover(details){return details?.querySelector?.(popoverSelector)||null;}
  function stripIds(node){
    if(!(node instanceof Element))return;
    node.removeAttribute('id');
    node.querySelectorAll?.('[id]').forEach(el=>el.removeAttribute('id'));
  }
  function mirrorAction(original){
    const clone=original.cloneNode(true);
    stripIds(clone);
    clone.removeAttribute('open');
    if(original instanceof HTMLButtonElement)clone.disabled=original.disabled;
    if(original.getAttribute('aria-disabled')==='true')clone.setAttribute('aria-disabled','true');
    clone.addEventListener('pointerdown',event=>event.stopPropagation());
    clone.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      if(original instanceof HTMLButtonElement&&original.disabled)return;
      if(original.getAttribute('aria-disabled')==='true')return;
      try{original.click();}catch(error){console.warn('NEXLAB menu action proxy',error);}
      setTimeout(()=>closeMenu(true),0);
    });
    return clone;
  }
  function buildPortal(details){
    const pop=getPopover(details);
    if(!pop)return null;
    closePortalOnly();
    sourcePopover=pop;
    pop.dataset.nexlabViewportSource='true';
    pop.setAttribute('aria-hidden','true');
    pop.style.setProperty('visibility','hidden','important');
    pop.style.setProperty('pointer-events','none','important');

    const layer=document.createElement('div');
    layer.className=((pop.className||'').trim()+' nexlab-viewport-menu-portal-v02682').trim();
    layer.dataset.nexlabViewportMenu='true';
    layer.setAttribute('role',pop.getAttribute('role')||'menu');
    layer.setAttribute('aria-label',pop.getAttribute('aria-label')||'Ações do card');

    for(const child of [...pop.children]){
      if(child.matches?.('button,a,[role="menuitem"]')) layer.appendChild(mirrorAction(child));
      else{
        const wrapper=child.cloneNode(true);
        stripIds(wrapper);
        const originalActions=[...child.querySelectorAll?.('button,a,[role="menuitem"]')||[]];
        const clonedActions=[...wrapper.querySelectorAll?.('button,a,[role="menuitem"]')||[]];
        clonedActions.forEach((clone,index)=>{
          const original=originalActions[index];
          if(!original)return;
          const proxy=mirrorAction(original);
          clone.replaceWith(proxy);
        });
        layer.appendChild(wrapper);
      }
    }
    document.body.appendChild(layer);
    portal=layer;
    return layer;
  }
  function closePortalOnly(){
    portal?.remove();portal=null;
    if(sourcePopover){
      sourcePopover.removeAttribute('data-nexlab-viewport-source');
      sourcePopover.removeAttribute('aria-hidden');
      sourcePopover.style.removeProperty('visibility');
      sourcePopover.style.removeProperty('pointer-events');
      sourcePopover=null;
    }
  }
  function closeMenu(closeDetails=false){
    if(closing)return;
    closing=true;
    const details=activeMenu;
    closePortalOnly();
    activeMenu=null;
    if(closeDetails&&details?.open){try{details.open=false;}catch{}}
    closing=false;
  }
  function positionMenu(details){
    if(!details?.open||!document.documentElement.contains(details))return closeMenu(false);
    const trigger=details.querySelector(':scope > summary');
    if(!trigger)return;
    if(!portal||!document.body.contains(portal))buildPortal(details);
    if(!portal)return;

    const vv=globalThis.visualViewport;
    const viewportLeft=vv?.offsetLeft||0;
    const viewportTop=vv?.offsetTop||0;
    const viewportWidth=vv?.width||globalThis.innerWidth||document.documentElement.clientWidth;
    const viewportHeight=vv?.height||globalThis.innerHeight||document.documentElement.clientHeight;
    const margin=12,gap=7;
    const triggerRect=trigger.getBoundingClientRect();
    const maxWidth=Math.max(180,viewportWidth-margin*2);
    const natural=Math.max(sourcePopover?.scrollWidth||0,portal.scrollWidth||0,208);
    const width=Math.min(natural,maxWidth);
    portal.style.setProperty('--nexlab-menu-width',Math.round(width)+'px');
    portal.style.width=Math.round(width)+'px';
    portal.style.maxWidth=`calc(100vw - ${margin*2}px)`;
    portal.style.maxHeight=`calc(100dvh - ${margin*2}px)`;

    const measured=portal.getBoundingClientRect();
    const height=Math.min(measured.height||portal.scrollHeight||220,viewportHeight-margin*2);
    let left=triggerRect.right-width;
    left=Math.max(viewportLeft+margin,Math.min(left,viewportLeft+viewportWidth-margin-width));
    let top=triggerRect.bottom+gap;
    if(top+height>viewportTop+viewportHeight-margin)top=Math.max(viewportTop+margin,triggerRect.top-height-gap);
    portal.style.setProperty('--nexlab-menu-left',Math.round(left)+'px');
    portal.style.setProperty('--nexlab-menu-top',Math.round(top)+'px');
    portal.style.left=Math.round(left)+'px';
    portal.style.top=Math.round(top)+'px';
  }
  function scheduleMenu(){
    cancelAnimationFrame(raf);
    raf=requestAnimationFrame(()=>{if(activeMenu?.open)positionMenu(activeMenu);});
  }

  function updateModalState(){
    const open=Boolean(document.querySelector('[aria-modal="true"],dialog[open],.nexlab-update-overlay,.nexlab-push-consent-overlay'));
    document.body?.setAttribute('data-nexlab-modal-open',open?'true':'false');
  }
  function enhanceScrollRegions(scope=document){
    scope.querySelectorAll?.('.overflow-x-auto,.nexlab-v265-table-scroll,.nexlab-v265-calendar-scroll,.project-table-wrap-v02667,.project-table-wrap-v2690,.teams-v2680__table-wrap').forEach(el=>{
      el.setAttribute('data-nexlab-horizontal-scroll','true');
      if(!el.hasAttribute('tabindex'))el.tabIndex=0;
      if(!el.hasAttribute('role'))el.setAttribute('role','region');
      if(!el.hasAttribute('aria-label'))el.setAttribute('aria-label','Conteúdo com rolagem horizontal');
    });
  }
  function scan(scope=document){updateModalState();enhanceScrollRegions(scope);if(activeMenu&&!activeMenu.isConnected)closeMenu(false);}
  function scheduleScan(scope=document){clearTimeout(scanTimer);scanTimer=setTimeout(()=>scan(scope),24);}

  document.addEventListener('toggle',event=>{
    const details=event.target instanceof Element?event.target.closest(detailsSelector):null;
    if(!details)return;
    if(details.open){
      document.querySelectorAll(detailsSelector).forEach(other=>{if(other!==details&&other.open)other.open=false;});
      if(activeMenu&&activeMenu!==details)closeMenu(false);
      activeMenu=details;
      requestAnimationFrame(()=>{buildPortal(details);positionMenu(details);});
    }else if(activeMenu===details){closeMenu(false);}
  },true);

  document.addEventListener('pointerdown',event=>{
    if(!activeMenu?.open)return;
    if(event.target instanceof Node&&(portal?.contains(event.target)||activeMenu.querySelector(':scope > summary')?.contains(event.target)))return;
    closeMenu(true);
  },true);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&activeMenu?.open){
      const trigger=activeMenu.querySelector(':scope > summary');
      closeMenu(true);trigger?.focus?.();
    }
  });

  const observer=new MutationObserver(records=>{
    let scope=document;
    for(const record of records){if(record.target instanceof Element){scope=record.target;break;}}
    scheduleScan(scope);scheduleMenu();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['open','aria-modal','class']});

  globalThis.addEventListener('resize',updateViewport,{passive:true});
  globalThis.addEventListener('orientationchange',updateViewport,{passive:true});
  globalThis.visualViewport?.addEventListener('resize',updateViewport,{passive:true});
  globalThis.visualViewport?.addEventListener('scroll',updateViewport,{passive:true});
  document.addEventListener('scroll',scheduleMenu,true);

  updateViewport();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>scan(document),{once:true});else scan(document);
  globalThis.__NEXLAB_RESPONSIVE_V02671__=Object.freeze({version:BUILD.version,revision:BUILD.revision,viewportMenus:'body-proxy-portal'});
})();
