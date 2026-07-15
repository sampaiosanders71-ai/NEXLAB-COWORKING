(function(){
  'use strict';
  if (window.__NEXLAB_PENDENCIAS_RECOVERY_R5546__) return;
  window.__NEXLAB_PENDENCIAS_RECOVERY_R5546__ = true;

  const VERSION = '26.30.10';
  const FALLBACK_TEXT = 'Não foi possível exibir Pendências';
  let rendering = false;
  let scheduled = false;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[char]));

  function findFallbackTitle(){
    return [...document.querySelectorAll('h1,h2,h3,strong')]
      .find((element) => (element.textContent || '').trim() === FALLBACK_TEXT) || null;
  }

  function findBoundary(title){
    if (!title) return null;
    let current = title;
    let candidate = title.parentElement;
    while (current?.parentElement && current.parentElement !== document.body) {
      current = current.parentElement;
      const text = current.textContent || '';
      if (text.includes(FALLBACK_TEXT) && [...current.querySelectorAll('button')].some((button) => /tentar novamente/i.test(button.textContent || ''))) {
        candidate = current;
      }
      if (current.tagName === 'MAIN') break;
    }
    return candidate;
  }

  async function getClient(){
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const client = window.__NEXLAB_SUPABASE__;
      if (client?.rpc) return client;
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    throw new Error('A conexão com o Supabase ainda não está disponível.');
  }

  function normalize(payload){
    const value = payload && typeof payload === 'object' ? payload : {};
    if (value.ok === false) throw new Error(value.error || value.message || 'O servidor não confirmou a consulta.');
    const items = [];
    const push = (kind, rows, build) => {
      for (const row of Array.isArray(rows) ? rows : []) {
        const item = build(row || {});
        if (item) items.push({ kind, ...item });
      }
    };

    push('profile', value.profiles, (row) => {
      if (String(row.role_request_status || '').toLowerCase() !== 'pending' && !row.vinculo_solicitado) return null;
      return {
        id: row.id,
        title: row.nome || 'Solicitação de vínculo',
        description: `Solicitação para ${row.vinculo_solicitado || 'novo vínculo'}`,
        status: 'Aguardando análise',
        target: 'Usuários'
      };
    });
    push('reservation', value.reservations, (row) => ({
      id: row.id,
      title: row.titulo || row.finalidade || 'Reserva pendente',
      description: [row.data, row.hora_inicio && row.hora_fim ? `${row.hora_inicio}–${row.hora_fim}` : '', row.owner_name].filter(Boolean).join(' · '),
      status: 'Pendente',
      target: 'Reservas e Reuniões'
    }));
    push('feedback', value.feedback, (row) => ({
      id: row.id,
      title: row.titulo || 'Feedback pendente',
      description: row.descricao || row.owner_name || '',
      status: row.prioridade || row.status || 'Em análise',
      target: 'Feedback'
    }));
    push('project', value.projects, (row) => ({
      id: row.id,
      title: row.nome || 'Projeto atrasado',
      description: [row.prazo ? `Prazo: ${row.prazo}` : '', row.owner_name].filter(Boolean).join(' · '),
      status: 'Atrasado',
      target: 'Projetos'
    }));
    push('asset', value.assets, (row) => ({
      id: row.id,
      title: row.nome || 'Patrimônio com atenção',
      description: `Manutenção: ${Number(row.quantidade_manutencao || 0)} · Danificados: ${Number(row.quantidade_danificada || 0)}`,
      status: 'Atenção',
      target: 'Patrimônio'
    }));
    push('task', value.tasks, (row) => ({
      id: row.id,
      title: row.title || row.titulo || 'Tarefa pendente',
      description: [row.project_name, row.project_deadline ? `Prazo: ${row.project_deadline}` : ''].filter(Boolean).join(' · '),
      status: 'Pendente',
      target: 'Projetos'
    }));

    return {
      items,
      metrics: value.metrics || {},
      warnings: Array.isArray(value.warnings) ? value.warnings : [],
      generatedAt: value.generated_at || null
    };
  }

  function navigateTo(label){
    const normalized = String(label || '').trim().toLowerCase();
    const candidates = [...document.querySelectorAll('button,a,[role="button"]')];
    const target = candidates.find((element) => (element.textContent || '').trim().toLowerCase() === normalized);
    if (target) target.click();
  }

  function renderShell(boundary){
    boundary.id = 'nexlab-pendencias-recovery-r5546';
    boundary.className = 'nexlab-pending-recovery';
    boundary.innerHTML = `
      <section class="nexlab-pending-card" aria-labelledby="nexlab-pending-title">
        <header class="nexlab-pending-header">
          <div>
            <p class="nexlab-pending-eyebrow">Fila de decisões e acompanhamento</p>
            <h2 id="nexlab-pending-title">Central de Pendências</h2>
            <p>Solicitações, tarefas, atrasos e pontos de atenção do laboratório.</p>
          </div>
          <button type="button" data-nexlab-pending-refresh>Atualizar</button>
        </header>
        <div class="nexlab-pending-metrics" aria-live="polite"></div>
        <div class="nexlab-pending-message">Carregando pendências...</div>
        <div class="nexlab-pending-list"></div>
      </section>`;
    boundary.querySelector('[data-nexlab-pending-refresh]').addEventListener('click', () => load(boundary));
  }

  function renderData(boundary, data){
    const metrics = data.metrics || {};
    boundary.querySelector('.nexlab-pending-metrics').innerHTML = [
      ['Total', metrics.total ?? data.items.length],
      ['Decisões', metrics.decisions ?? 0],
      ['Alertas', metrics.alerts ?? 0],
      ['Tarefas', metrics.tasks ?? 0],
      ['Urgentes', metrics.urgent ?? 0]
    ].map(([label, value]) => `<article><span>${escapeHtml(label)}</span><strong>${Number(value || 0)}</strong></article>`).join('');

    const message = boundary.querySelector('.nexlab-pending-message');
    if (data.warnings.length) {
      message.className = 'nexlab-pending-message nexlab-pending-warning';
      message.textContent = `Algumas fontes não responderam: ${data.warnings.join(', ')}.`;
    } else if (!data.items.length) {
      message.className = 'nexlab-pending-message nexlab-pending-empty';
      message.textContent = 'Nenhuma pendência encontrada. A fila está limpa no momento.';
    } else {
      message.className = 'nexlab-pending-message';
      message.textContent = data.generatedAt ? `Atualizado em ${new Date(data.generatedAt).toLocaleString('pt-BR')}.` : '';
    }

    const list = boundary.querySelector('.nexlab-pending-list');
    list.innerHTML = data.items.map((item) => `
      <article class="nexlab-pending-item">
        <div>
          <span class="nexlab-pending-kind">${escapeHtml(item.kind)}</span>
          <h3>${escapeHtml(item.title)}</h3>
          ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}
        </div>
        <div class="nexlab-pending-side">
          <span>${escapeHtml(item.status)}</span>
          <button type="button" data-target="${escapeHtml(item.target)}">Abrir módulo</button>
        </div>
      </article>`).join('');
    list.querySelectorAll('[data-target]').forEach((button) => button.addEventListener('click', () => navigateTo(button.dataset.target)));
  }

  async function load(boundary){
    const button = boundary.querySelector('[data-nexlab-pending-refresh]');
    const message = boundary.querySelector('.nexlab-pending-message');
    if (button) { button.disabled = true; button.textContent = 'Atualizando...'; }
    if (message) { message.className = 'nexlab-pending-message'; message.textContent = 'Carregando pendências...'; }
    try {
      const client = await getClient();
      const { data, error } = await client.rpc('nexlab_get_pending_center_v2690', { p_page: 1, p_page_size: 8 });
      if (error) throw error;
      renderData(boundary, normalize(data));
    } catch (error) {
      console.error(`Pendências ${VERSION}:`, error);
      if (message) {
        message.className = 'nexlab-pending-message nexlab-pending-error';
        message.textContent = error?.message || 'Não foi possível carregar as pendências.';
      }
    } finally {
      if (button) { button.disabled = false; button.textContent = 'Atualizar'; }
    }
  }

  async function recover(){
    scheduled = false;
    if (rendering) return;
    const title = findFallbackTitle();
    if (!title) return;
    const boundary = findBoundary(title);
    if (!boundary || boundary.id === 'nexlab-pendencias-recovery-r5546') return;
    rendering = true;
    try {
      document.querySelectorAll('.nexlab-p2-history,.nexlab-p2-status,.nexlab-r550-delegation-summary,.nexlab-r550-assistant-preset').forEach((element) => element.remove());
      renderShell(boundary);
      await load(boundary);
    } finally {
      rendering = false;
    }
  }

  function schedule(){
    if (scheduled) return;
    scheduled = true;
    setTimeout(recover, 80);
  }

  new MutationObserver(schedule).observe(document.getElementById('root') || document.documentElement, { childList: true, subtree: true });
  window.addEventListener('popstate', schedule);
  window.addEventListener('hashchange', schedule);
  document.addEventListener('click', schedule, true);
  schedule();
})();
