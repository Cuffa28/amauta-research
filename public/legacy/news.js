/* =============================================================
   AMAUTA RESEARCH — Noticias Reuters (vista de sidebar)
   Módulo autocontenido: define window.NewsView = { mount, unmount }.
   Lee cedears_news (titulares que publica el colector cada hora) vía
   window.AmautaCedearsBridge (config + navegación), igual que cedears.js.
   ============================================================= */
(function () {
  'use strict';

  function bridge() { return window.AmautaCedearsBridge || {}; }
  function cfg() { return bridge().config || {}; }
  function REST() { return `${cfg().SUPABASE_URL}/rest/v1`; }
  function headers() {
    const key = cfg().SUPABASE_KEY;
    return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  const LIMIT = 200;
  const POLL_MS = 5 * 60 * 1000;

  let state = null;

  function freshState() {
    return {
      container: null,
      items: [],
      filterEspecie: 'Todas',
      search: '',
      pollTimer: null,
      destroyed: false,
    };
  }

  async function fetchNews() {
    const url = `${REST()}/cedears_news?select=especie,headline,source,published_at&order=published_at.desc&limit=${LIMIT}`;
    const r = await fetch(url, { headers: headers() });
    if (!r.ok) throw new Error(`cedears_news ${r.status}`);
    return r.json();
  }

  // "hace 5 min" / "hace 3 h" / "ayer" / fecha corta
  function timeAgo(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const mins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `hace ${mins} min`;
    const hs = Math.floor(mins / 60);
    if (hs < 24) return `hace ${hs} h`;
    const days = Math.floor(hs / 24);
    if (days === 1) return 'ayer';
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
  }

  function filteredItems() {
    let items = state.items;
    if (state.filterEspecie !== 'Todas') {
      items = items.filter(n => n.especie === state.filterEspecie);
    }
    const q = state.search.trim().toLowerCase();
    if (q) {
      items = items.filter(n =>
        String(n.headline || '').toLowerCase().includes(q) ||
        String(n.especie || '').toLowerCase().includes(q));
    }
    return items;
  }

  function render() {
    if (!state || !state.container) return;
    const especies = ['Todas'].concat([...new Set(state.items.map(n => n.especie).filter(Boolean))].sort());
    const opts = especies.map(e =>
      `<option value="${escapeHtml(e)}" ${e === state.filterEspecie ? 'selected' : ''}>${escapeHtml(e)}</option>`).join('');

    const items = filteredItems();
    const list = items.length ? items.map(n => `
      <div class="nw-item">
        <div class="nw-meta">
          <a href="?view=cedears" class="nw-especie" data-esp="${escapeHtml(n.especie)}">${escapeHtml(n.especie)}</a>
          <span class="nw-time">${escapeHtml(timeAgo(n.published_at))}</span>
          ${n.source ? `<span class="nw-source">${escapeHtml(String(n.source).replace(/^NS:/, ''))}</span>` : ''}
        </div>
        <div class="nw-headline">${escapeHtml(n.headline)}</div>
      </div>`).join('')
      : `<div class="nw-empty">No hay titulares que coincidan con el filtro.</div>`;

    state.container.innerHTML = `
      <style>
        .nw-view{font-family: 'Fira Sans', Arial, sans-serif;color:#F5F2F0;background:transparent;padding:12px}
        .ced-header{margin-bottom:10px}
        .ced-title{font-size:16px;margin:0;color:#F5F2F0;font-weight:600}
        .ced-title span{color:#F3CF11;font-weight:700}
        .ced-subtitle{margin:6px 0 0;color:#B8B2B3;font-size:13px}

        .nw-controls{display:flex;gap:10px;align-items:center;margin:12px 0}
        .nw-select{background:#2C2728;color:#F5F2F0;border:1px solid #3A3433;padding:8px 10px;border-radius:8px;font-size:13px}
        .ced-search{display:flex;align-items:center;gap:8px;flex:1;background:#231F20;border:1px solid #3A3433;padding:8px 10px;border-radius:8px}
        .ced-search input{background:transparent;border:0;color:#F5F2F0;outline:none;font-size:13px;width:100%}
        .ced-search-icon{color:#B8B2B3}

        .nw-list{display:grid;grid-template-columns:1fr;gap:10px;margin-top:8px}
        .nw-item{background:#231F20;border:1px solid #3A3433;border-radius:10px;padding:12px 14px;transition:transform .18s, box-shadow .18s}
        .nw-item:hover{transform:translateY(-3px);box-shadow:0 6px 18px rgba(0,0,0,0.45)}
        .nw-meta{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:6px}
        .nw-especie{background:transparent;color:#F3CF11;font-weight:700;text-decoration:none;font-size:12px;padding:2px 6px;border-radius:6px}
        .nw-time{color:#B8B2B3;font-size:12px}
        .nw-source{color:#8A8487;font-size:12px}
        .nw-headline{color:#F5F2F0;font-size:15px;font-weight:600;line-height:1.4}
        .nw-empty{color:#B8B2B3;padding:14px;background:#2C2728;border:1px solid #3A3433;border-radius:10px}

        .ced-legend-note{color:#8A8487;font-size:12px;margin-top:12px}

        .loading{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;background:transparent;color:#B8B2B3}
        .loading .spinner{width:36px;height:36px;margin-bottom:8px}
        .empty-state{padding:20px;background:#2C2728;border:1px solid #3A3433;border-radius:10px;color:#B8B2B3}
      </style>

      <div class="nw-view">
        <div class="ced-header">
          <h2 class="ced-title">Noticias <span>Reuters</span></h2>
          <p class="ced-subtitle">Titulares del universo CEDEARs · actualización horaria · ${state.items.length} notas</p>
        </div>
        <div class="nw-controls">
          <select id="nwEspecie" class="nw-select">${opts}</select>
          <div class="ced-search">
            <span class="ced-search-icon">🔍</span>
            <input type="text" id="nwSearch" placeholder="Buscar en titulares…" value="${escapeHtml(state.search)}">
          </div>
        </div>
        <div class="nw-list">${list}</div>
        <p class="ced-legend-note">Fuente: LSEG Refinitiv (Reuters News). Los titulares refieren al subyacente de cada CEDEAR.</p>
      </div>`;
    wire();
  }

  function rerenderList() {
    const listEl = state.container.querySelector('.nw-list');
    if (!listEl) { render(); return; }
    const items = filteredItems();
    listEl.innerHTML = items.length ? items.map(n => `
      <div class="nw-item">
        <div class="nw-meta">
          <a href="?view=cedears" class="nw-especie" data-esp="${escapeHtml(n.especie)}">${escapeHtml(n.especie)}</a>
          <span class="nw-time">${escapeHtml(timeAgo(n.published_at))}</span>
          ${n.source ? `<span class="nw-source">${escapeHtml(String(n.source).replace(/^NS:/, ''))}</span>` : ''}
        </div>
        <div class="nw-headline">${escapeHtml(n.headline)}</div>
      </div>`).join('')
      : `<div class="nw-empty">No hay titulares que coincidan con el filtro.</div>`;
    wireList();
  }

  function wire() {
    const sel = state.container.querySelector('#nwEspecie');
    if (sel) sel.addEventListener('change', () => { state.filterEspecie = sel.value; rerenderList(); });
    const search = state.container.querySelector('#nwSearch');
    if (search) search.addEventListener('input', () => { state.search = search.value; rerenderList(); });
    wireList();
  }

  function wireList() {
    // clic en el badge de especie → filtrar por esa especie
    state.container.querySelectorAll('.nw-especie').forEach(a => {
      a.addEventListener('click', (ev) => {
        ev.preventDefault();
        state.filterEspecie = a.dataset.esp;
        render();
      });
    });
  }

  async function refetch() {
    try {
      const items = await fetchNews();
      if (state.destroyed) return;
      state.items = items || [];
      render();
    } catch (e) {
      console.error('Noticias refetch error', e);
    }
  }

  async function mount(containerEl) {
    unmount();
    state = freshState();
    state.container = containerEl;
    containerEl.innerHTML = `<div class="loading"><div class="spinner"></div><div>Cargando noticias…</div></div>`;
    try {
      state.items = await fetchNews();
      if (state.destroyed) return;
      render();
    } catch (e) {
      containerEl.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h2>Error</h2><p>No se pudieron cargar las noticias: ${escapeHtml(e.message)}</p></div>`;
      return;
    }
    state.pollTimer = setInterval(() => {
      if (!state.destroyed && document.visibilityState === 'visible') refetch();
    }, POLL_MS);
  }

  function unmount() {
    if (!state) return;
    state.destroyed = true;
    clearInterval(state.pollTimer);
    state = null;
  }

  window.NewsView = { mount, unmount };
})();
