/* =============================================================
   AMAUTA RESEARCH — Monitor CEDEARs (vista en vivo)
   Módulo autocontenido. No ejecuta nada al cargar: solo define
   window.CedearsView = { mount(containerEl), unmount() }.

   Config de Supabase y navegación SPA se leen de window.AmautaCedearsBridge,
   que app.js publica antes de montar la vista.
   ============================================================= */
(function () {
  'use strict';

  // -------------- Puente con la app (config + navegación) --------------
  function bridge() { return window.AmautaCedearsBridge || {}; }
  function cfg() { return bridge().config || {}; }
  function REST() { return `${cfg().SUPABASE_URL}/rest/v1`; }
  function headers() {
    const key = cfg().SUPABASE_KEY;
    return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  }

  // -------------- Utilidades de texto / seguridad --------------
  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function cssEscape(s) {
    if (window.CSS && window.CSS.escape) return window.CSS.escape(String(s));
    return String(s).replace(/[^a-zA-Z0-9_-]/g, c => `\\${c}`);
  }

  // -------------- Formatos (locale es-AR) --------------
  const DASH = '—';
  const nfPrice = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const nfInt   = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
  const nfPct   = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'always' });
  const nfMult  = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  function isNum(v) { return v != null && v !== '' && !isNaN(Number(v)); }
  function fmtPrice(v) { return isNum(v) ? `$ ${nfPrice.format(Number(v))}` : DASH; }
  function fmtInt(v)   { return isNum(v) ? nfInt.format(Math.round(Number(v))) : DASH; }
  function fmtPct(v)   { return isNum(v) ? `${nfPct.format(Number(v) * 100)}%` : DASH; }        // fracción → %
  function fmtPctRaw(v){ return isNum(v) ? `${nfPct.format(Number(v))}%` : DASH; }              // ya en %
  function fmtMult(v)  { return isNum(v) ? `${nfMult.format(Number(v))}x` : DASH; }
  function fmtNum2(v)  { return isNum(v) ? nfPrice.format(Number(v)) : DASH; }

  function signClass(v) {
    if (!isNum(v)) return '';
    const n = Number(v);
    return n > 0 ? 'ced-up' : n < 0 ? 'ced-down' : '';
  }
  // Dif % semántica invertida: negativo (barato) = verde, positivo (caro) = rojo
  function difClass(v) {
    if (!isNum(v)) return '';
    const n = Number(v);
    return n < 0 ? 'ced-up' : n > 0 ? 'ced-down' : '';
  }

  function fmtTime(iso) {
    if (!iso) return DASH;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return DASH;
    return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }
  function minutesSince(iso) {
    if (!iso) return Infinity;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return Infinity;
    return (Date.now() - d.getTime()) / 60000;
  }

  // -------------- Estado interno --------------
  const SECTOR_ORDER = ['Tecnologia', 'Comunicacion', 'Cons. Discrecional', 'Cons. Defensivo',
    'Salud', 'Industria', 'Energia', 'Materiales', 'Bancos', 'ETFs'];

  const COLS = [
    { key: 'nombre',     label: 'Nombre',      sortable: true,  type: 'str' },
    { key: 'sector',     label: 'Sector',      sortable: true,  type: 'str' },
    { key: 'precio_ars', label: 'Precio ARS',  sortable: true,  type: 'num' },
    { key: 'var',        label: 'Var %',       sortable: true,  type: 'num' },
    { key: 'ccl',        label: 'CCL',         sortable: true,  type: 'num' },
    { key: 'fair_value', label: 'Fair Value',  sortable: true,  type: 'num' },
    { key: 'dif_fv',     label: 'Dif %',       sortable: true,  type: 'num' },
    { key: 'estado_fv',  label: 'Estado',      sortable: true,  type: 'str' },
    { key: 'valuacion',  label: 'Valuación',   sortable: true,  type: 'str' },
  ];

  let state = null;

  function freshState() {
    return {
      container: null,
      especies: [],
      params: null,
      instrumentIds: new Set(),
      filterSector: 'Todos',
      search: '',
      sortKey: 'dif_fv',
      sortDir: 'asc',
      expanded: new Set(),
      // recursos a limpiar
      unsubRealtime: null,
      pollTimer: null,
      refetchTimer: null,
      visibilityHandler: null,
      destroyed: false,
    };
  }

  // -------------- Fetch de datos --------------
  async function fetchEspecies() {
    const r = await fetch(`${REST()}/cedears_live?select=*`, { headers: headers() });
    if (!r.ok) throw new Error(`cedears_live ${r.status}`);
    return r.json();
  }
  async function fetchParams() {
    const r = await fetch(`${REST()}/cedears_params?id=eq.1&select=*`, { headers: headers() });
    if (!r.ok) throw new Error(`cedears_params ${r.status}`);
    const rows = await r.json();
    return rows[0] || null;
  }
  async function fetchInstrumentIds() {
    const r = await fetch(`${REST()}/instruments?select=id`, { headers: headers() });
    if (!r.ok) throw new Error(`instruments ${r.status}`);
    const rows = await r.json();
    return new Set(rows.map(x => String(x.id).toUpperCase()));
  }

  // -------------- Freshness --------------
  function freshnessBadge(params) {
    if (!params) return `<span class="ced-fresh ced-fresh-off">Sin datos</span>`;
    const mins = minutesSince(params.updated_at);
    const hhmm = fmtTime(params.updated_at);
    if (!params.market_open) {
      return `<span class="ced-fresh ced-fresh-closed">Mercado cerrado — último dato ${escapeHtml(hhmm)}</span>`;
    }
    if (mins > 15) {
      return `<span class="ced-fresh ced-fresh-off"><span class="ced-dot ced-dot-red"></span>Colector offline</span>`;
    }
    return `<span class="ced-fresh ced-fresh-live"><span class="ced-dot ced-dot-green"></span>En vivo ${escapeHtml(hhmm)}</span>`;
  }

  // -------------- Chips de estado / valuación --------------
  function estadoChip(estado) {
    if (!estado) return DASH;
    const map = { 'Barato': 'ced-chip-green', 'Justo': 'ced-chip-gray', 'Caro': 'ced-chip-red' };
    const cls = map[estado] || 'ced-chip-gray';
    return `<span class="ced-chip ${cls}">${escapeHtml(estado)}</span>`;
  }
  function valuacionChip(val) {
    if (!val) return DASH;
    const map = {
      'Barata': 'ced-chip-green',
      'Justa': 'ced-chip-gray',
      'Cara': 'ced-chip-orange',
      'Muy cara': 'ced-chip-red',
    };
    const cls = map[val] || 'ced-chip-gray';
    return `<span class="ced-chip ${cls}">${escapeHtml(val)}</span>`;
  }

  // -------------- KPIs --------------
  function renderKpis() {
    const p = state.params || {};
    let barato = 0, justo = 0, caro = 0;
    state.especies.forEach(e => {
      if (e.estado_fv === 'Barato') barato++;
      else if (e.estado_fv === 'Justo') justo++;
      else if (e.estado_fv === 'Caro') caro++;
    });
    return `
      <div class="ced-kpis">
        <div class="ced-kpi">
          <div class="ced-kpi-label">CCL ref</div>
          <div class="ced-kpi-value">${fmtPrice(p.ccl_ref)}</div>
        </div>
        <div class="ced-kpi">
          <div class="ced-kpi-label">MEP</div>
          <div class="ced-kpi-value">${fmtPrice(p.mep)}</div>
        </div>
        <div class="ced-kpi ced-kpi-chips">
          <div class="ced-kpi-label">Fair Value</div>
          <div class="ced-kpi-chiprow">
            <span class="ced-chip ced-chip-green">${barato} Barato</span>
            <span class="ced-chip ced-chip-gray">${justo} Justo</span>
            <span class="ced-chip ced-chip-red">${caro} Caro</span>
          </div>
        </div>
        <div class="ced-kpi ced-kpi-fresh">
          <div class="ced-kpi-label">Estado del colector</div>
          <div class="ced-kpi-freshwrap">${freshnessBadge(state.params)}</div>
        </div>
      </div>`;
  }

  // -------------- Controles (filtros / búsqueda) --------------
  function renderControls() {
    const sectors = ['Todos'].concat(
      SECTOR_ORDER.filter(s => state.especies.some(e => e.sector === s))
    );
    // sectores presentes que no estén en el orden conocido
    const extra = [...new Set(state.especies.map(e => e.sector).filter(Boolean))]
      .filter(s => !sectors.includes(s));
    const allSectors = sectors.concat(extra);

    const chips = allSectors.map(s =>
      `<button class="ced-sector-chip ${s === state.filterSector ? 'active' : ''}" data-sector="${escapeHtml(s)}">${escapeHtml(s)}</button>`
    ).join('');

    return `
      <div class="ced-controls">
        <div class="ced-sector-chips">${chips}</div>
        <div class="ced-search">
          <span class="ced-search-icon">🔍</span>
          <input type="text" id="cedSearch" placeholder="Buscar especie o nombre…" value="${escapeHtml(state.search)}">
        </div>
      </div>`;
  }

  // -------------- Tabla --------------
  function sortedFilteredRows() {
    let rows = state.especies.slice();
    if (state.filterSector !== 'Todos') {
      rows = rows.filter(e => e.sector === state.filterSector);
    }
    const q = state.search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(e =>
        String(e.nombre || '').toLowerCase().includes(q) ||
        String(e.especie || e.ric_usd || '').toLowerCase().includes(q)
      );
    }
    const col = COLS.find(c => c.key === state.sortKey) || { type: 'num' };
    const dir = state.sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      let av = a[state.sortKey], bv = b[state.sortKey];
      if (col.type === 'num') {
        const an = isNum(av) ? Number(av) : (dir === 1 ? Infinity : -Infinity);
        const bn = isNum(bv) ? Number(bv) : (dir === 1 ? Infinity : -Infinity);
        return (an - bn) * dir;
      }
      av = (av == null ? '' : String(av)).toLowerCase();
      bv = (bv == null ? '' : String(bv)).toLowerCase();
      return av < bv ? -dir : av > bv ? dir : 0;
    });
    return rows;
  }

  function especieKey(e) {
    return String(e.especie || e.ric_usd || e.nombre || '').toUpperCase();
  }
  function especieLabel(e) {
    return e.especie || e.ric_usd || e.nombre || DASH;
  }

  function especieCell(e) {
    const label = especieLabel(e);
    const key = especieKey(e);
    if (key && state.instrumentIds.has(key)) {
      return `<a href="?inst=${encodeURIComponent(key)}" class="ced-especie-link" data-inst="${escapeHtml(key)}">${escapeHtml(label)}</a>`;
    }
    return `<span class="ced-especie">${escapeHtml(label)}</span>`;
  }

  function detailRow(e, colspan) {
    const items = [
      ['Precio USD', fmtPrice(e.precio_usd)],
      ['Ratio', isNum(e.ratio) ? `${fmtNum2(e.ratio)}:1` : DASH],
      ['Volumen', fmtInt(e.volumen)],
      ['P/E', fmtMult(e.pe)],
      ['P/E Fwd', fmtMult(e.pe_fwd)],
      ['P/B', fmtMult(e.pb)],
      ['EV/EBITDA', fmtMult(e.ev_ebitda)],
      ['Mg Op %', fmtPctRaw(e.mg_op)],
      ['Mg Net %', fmtPctRaw(e.mg_net)],
      ['Div Yield %', fmtPctRaw(e.div_yield)],
      ['Rec', isNum(e.rec) ? `${escapeHtml(String(e.rec))}/5${e.rec_label ? ' · ' + escapeHtml(e.rec_label) : ''}` : DASH],
      ['vs Sector', e.vs_sector != null ? escapeHtml(String(e.vs_sector)) : DASH],
      ['vs Hist', e.vs_hist != null ? escapeHtml(String(e.vs_hist)) : DASH],
    ];
    const cells = items.map(([l, v]) =>
      `<div class="ced-detail-item"><span class="ced-detail-label">${escapeHtml(l)}</span><span class="ced-detail-value">${v}</span></div>`
    ).join('');
    return `<tr class="ced-detail-row" data-detail-for="${escapeHtml(especieKey(e))}"><td colspan="${colspan}"><div class="ced-detail-grid">${cells}</div></td></tr>`;
  }

  function renderTable() {
    const rows = sortedFilteredRows();
    const colspan = COLS.length + 2; // chevron + especie + cols

    const head = `
      <th class="ced-th-chevron"></th>
      <th class="ced-th ced-sortable" data-sort="especie">Especie${sortArrow('especie')}</th>
      ${COLS.map(c => c.sortable
        ? `<th class="ced-th ced-sortable ${c.type === 'num' ? 'ced-num' : ''}" data-sort="${c.key}">${escapeHtml(c.label)}${sortArrow(c.key)}</th>`
        : `<th class="ced-th ${c.type === 'num' ? 'ced-num' : ''}">${escapeHtml(c.label)}</th>`
      ).join('')}`;

    let body = '';
    if (!rows.length) {
      body = `<tr><td colspan="${colspan}" class="ced-empty">No hay especies que coincidan con el filtro.</td></tr>`;
    } else {
      rows.forEach(e => {
        const key = especieKey(e);
        const isOpen = state.expanded.has(key);
        body += `
          <tr class="ced-row ${isOpen ? 'open' : ''}" data-especie="${escapeHtml(key)}">
            <td class="ced-td-chevron"><span class="ced-chevron">▶</span></td>
            <td class="ced-td-especie">${especieCell(e)}</td>
            <td>${escapeHtml(e.nombre || DASH)}</td>
            <td>${escapeHtml(e.sector || DASH)}</td>
            <td class="ced-num">${fmtPrice(e.precio_ars)}</td>
            <td class="ced-num ${signClass(e.var)}">${fmtPct(e.var)}</td>
            <td class="ced-num">${fmtPrice(e.ccl)}</td>
            <td class="ced-num">${fmtPrice(e.fair_value)}</td>
            <td class="ced-num ${difClass(e.dif_fv)}">${fmtPct(e.dif_fv)}</td>
            <td>${estadoChip(e.estado_fv)}</td>
            <td>${valuacionChip(e.valuacion)}</td>
          </tr>`;
        if (isOpen) body += detailRow(e, colspan);
      });
    }

    return `
      <div class="ced-table-wrap">
        <table class="ced-table">
          <thead><tr>${head}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>`;
  }

  function sortArrow(key) {
    if (state.sortKey !== key) return '<span class="ced-sort-arrow">↕</span>';
    return `<span class="ced-sort-arrow active">${state.sortDir === 'asc' ? '▲' : '▼'}</span>`;
  }

  // -------------- Render completo --------------
  function render() {
    if (!state || !state.container) return;
    state.container.innerHTML = `
      <div class="ced-view">
        <div class="ced-header">
          <h2 class="ced-title">Monitor <span>CEDEARs</span></h2>
          <p class="ced-subtitle">Precios y valuación en vivo · ${state.especies.length} especies</p>
        </div>
        ${renderKpis()}
        ${renderControls()}
        ${renderTable()}
        <p class="ced-legend-note">Dif % negativa = cotiza por debajo del fair value (barato). Hacé clic en una fila para ver fundamentals.</p>
      </div>`;
    wireEvents();
  }

  // Re-render sólo del cuerpo de tabla (para sort/filtros sin perder foco de búsqueda)
  function rerenderTable() {
    const wrap = state.container.querySelector('.ced-table-wrap');
    if (!wrap) { render(); return; }
    const tmp = document.createElement('div');
    tmp.innerHTML = renderTable();
    wrap.replaceWith(tmp.firstElementChild);
    wireTableEvents();
  }

  function wireEvents() {
    // Chips de sector
    state.container.querySelectorAll('.ced-sector-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        state.filterSector = chip.dataset.sector;
        render();
      });
    });
    // Búsqueda
    const search = state.container.querySelector('#cedSearch');
    if (search) {
      search.addEventListener('input', () => {
        state.search = search.value;
        rerenderTable();
      });
    }
    wireTableEvents();
  }

  function wireTableEvents() {
    // Orden por columna
    state.container.querySelectorAll('.ced-sortable').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.sort;
        if (state.sortKey === key) {
          state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          state.sortKey = key;
          state.sortDir = 'asc';
        }
        rerenderTable();
      });
    });
    // Expandir filas
    state.container.querySelectorAll('.ced-row').forEach(row => {
      row.addEventListener('click', (ev) => {
        // No expandir si se hizo clic en el link de especie (navega)
        if (ev.target.closest('.ced-especie-link')) return;
        const key = row.dataset.especie;
        if (state.expanded.has(key)) state.expanded.delete(key);
        else state.expanded.add(key);
        rerenderTable();
      });
    });
    // Links de especie → navegación SPA
    state.container.querySelectorAll('.ced-especie-link').forEach(link => {
      link.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const inst = link.dataset.inst;
        const nav = bridge().navigate;
        if (typeof nav === 'function') nav(inst);
        else location.search = `?inst=${encodeURIComponent(inst)}`;
      });
    });
  }

  // -------------- Refetch (debounced) --------------
  async function refetchData() {
    try {
      const [especies, params] = await Promise.all([fetchEspecies(), fetchParams()]);
      if (state.destroyed) return;
      state.especies = especies || [];
      state.params = params;
      render();
    } catch (e) {
      console.error('CEDEARs refetch error', e);
    }
  }
  function scheduleRefetch() {
    clearTimeout(state.refetchTimer);
    state.refetchTimer = setTimeout(() => { if (!state.destroyed) refetchData(); }, 500);
  }

  // -------------- Realtime (UPDATE en cedears_params) --------------
  function subscribeParamsRealtime() {
    const conf = cfg();
    if (!conf.SUPABASE_URL || !conf.SUPABASE_KEY) return null;
    const wsUrl = conf.SUPABASE_URL.replace('https://', 'wss://') +
      '/realtime/v1/websocket?apikey=' + conf.SUPABASE_KEY + '&vsn=1.0.0';
    let ws, heartbeat, retryTimer, closed = false;

    function connect() {
      if (closed) return;
      ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        ws.send(JSON.stringify({
          topic: 'realtime:public:cedears_params',
          event: 'phx_join',
          payload: { config: { broadcast: { self: false }, presence: { key: '' } } },
          ref: '1',
        }));
        heartbeat = setInterval(() => {
          try { ws.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: null })); } catch (_) {}
        }, 25000);
      };
      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data);
          const ev = data?.payload?.data;
          if (ev && ['INSERT', 'UPDATE'].includes(ev.type)) scheduleRefetch();
        } catch (_) {}
      };
      ws.onclose = () => {
        clearInterval(heartbeat);
        if (!closed) retryTimer = setTimeout(connect, 5000);
      };
      ws.onerror = () => { try { ws.close(); } catch (_) {} };
    }
    connect();

    return () => {
      closed = true;
      clearTimeout(retryTimer);
      clearInterval(heartbeat);
      try { ws && ws.close(); } catch (_) {}
    };
  }

  // -------------- Polling fallback (solo visible) --------------
  function startPolling() {
    state.pollTimer = setInterval(() => {
      if (state.destroyed) return;
      if (document.visibilityState === 'visible') refetchData();
    }, 60000);
  }

  // -------------- API pública --------------
  async function mount(containerEl) {
    unmount(); // por si quedó algo montado
    state = freshState();
    state.container = containerEl;
    containerEl.innerHTML = `<div class="loading"><div class="spinner"></div><div>Cargando Monitor CEDEARs…</div></div>`;

    try {
      const [especies, params, instrumentIds] = await Promise.all([
        fetchEspecies(),
        fetchParams(),
        fetchInstrumentIds().catch(() => new Set()),
      ]);
      if (state.destroyed) return;
      state.especies = especies || [];
      state.params = params;
      state.instrumentIds = instrumentIds || new Set();
      render();
    } catch (e) {
      containerEl.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h2>Error</h2><p>No se pudo cargar el Monitor CEDEARs: ${escapeHtml(e.message)}</p></div>`;
      return;
    }

    // Realtime + polling
    state.unsubRealtime = subscribeParamsRealtime();
    startPolling();
  }

  function unmount() {
    if (!state) return;
    state.destroyed = true;
    try { state.unsubRealtime && state.unsubRealtime(); } catch (_) {}
    clearInterval(state.pollTimer);
    clearTimeout(state.refetchTimer);
    if (state.visibilityHandler) document.removeEventListener('visibilitychange', state.visibilityHandler);
    state = null;
  }

  window.CedearsView = { mount, unmount };
})();
