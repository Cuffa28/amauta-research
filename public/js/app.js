import { AMAUTA_CONFIG } from './config.js';
import {
  AmautaDB, sendOtp, verifyOtp, captureHashSession, ensureSession, getTeamMember, signOut,
  clearCache, subscribeRealtime, onInstrumentsChanged,
} from './supabase-client.js';
import { AmautaRenderer } from './renderer.js';
import { AmautaAdmin } from './admin.js';

const CFG = AMAUTA_CONFIG;
let instruments = [];
let active = null;
let isAdmin = false;
let member = null;
let appStarted = false;
let realtimeStarted = false;

// -------------- URL routing --------------
function getUrlInstrument() {
  return new URLSearchParams(location.search).get('inst') || null;
}
function getUrlView() {
  return new URLSearchParams(location.search).get('view') || null;
}

// Puente para cedears.js (script global, no módulo): le pasamos config y navegación
window.AmautaCedearsBridge = {
  config: CFG,
  navigate: (instId) => selectInstrument(instId, 0, true),
};

// =============================================================
//  AUTH / GATE (login de equipo por código de email)
// =============================================================
async function bootstrap() {
  wireLoginHandlers();
  wireMobileMenu();
  wireStaticHandlers();

  // Si venimos de un magic link de email, capturar la sesión del hash de la URL.
  captureHashSession();

  try {
    const s = await ensureSession();
    if (s) {
      const m = await getTeamMember();
      if (m) { enterApp(m); return; }
      await signOut();
      showLogin('Tu correo no está autorizado para este portal. Escribí a tu administrador.');
      return;
    }
  } catch (_) { /* cae a login */ }
  showLogin();
}

function showLogin(errorMsg) {
  document.body.classList.remove('authed');
  resetLoginToEmail();
  const err = document.getElementById('loginError');
  if (errorMsg) { err.textContent = errorMsg; err.style.display = 'block'; }
  document.getElementById('loginEmail')?.focus();
}

let _pendingEmail = '';
function resetLoginToEmail() {
  _pendingEmail = '';
  document.getElementById('loginStepEmail').style.display = '';
  document.getElementById('loginStepCode').style.display = 'none';
  document.getElementById('loginSub').textContent = 'Ingresá tu correo y te enviamos un código de acceso.';
  const err = document.getElementById('loginError');
  if (err) err.style.display = 'none';
}

async function handleSendCode() {
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const err = document.getElementById('loginError');
  const btn = document.getElementById('loginSendBtn');
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    err.textContent = 'Ingresá un correo válido.'; err.style.display = 'block'; return;
  }
  btn.disabled = true; btn.textContent = 'Enviando…'; err.style.display = 'none';
  try {
    await sendOtp(email);
    _pendingEmail = email;
    document.getElementById('loginStepEmail').style.display = 'none';
    document.getElementById('loginStepCode').style.display = '';
    document.getElementById('loginSub').innerHTML = `Enviamos un código a <strong>${escapeHtml(email)}</strong>. Revisá tu correo.`;
    document.getElementById('loginCode').value = '';
    document.getElementById('loginCode').focus();
  } catch (e) {
    err.textContent = e.message; err.style.display = 'block';
  } finally {
    btn.disabled = false; btn.textContent = 'Enviar código';
  }
}

async function handleVerifyCode() {
  const code = document.getElementById('loginCode').value.trim();
  const err = document.getElementById('loginError');
  const btn = document.getElementById('loginVerifyBtn');
  if (!code) { err.textContent = 'Ingresá el código que recibiste.'; err.style.display = 'block'; return; }
  btn.disabled = true; btn.textContent = 'Ingresando…'; err.style.display = 'none';
  try {
    await verifyOtp(_pendingEmail, code);
    const m = await getTeamMember();
    if (!m) {
      await signOut();
      showLogin('Tu correo no está autorizado para este portal. Escribí a tu administrador.');
      return;
    }
    enterApp(m);
  } catch (e) {
    err.textContent = e.message; err.style.display = 'block';
  } finally {
    btn.disabled = false; btn.textContent = 'Ingresar';
  }
}

function enterApp(m) {
  member = m;
  isAdmin = m.role === 'admin';
  document.body.classList.add('authed');
  document.body.classList.toggle('admin-mode', isAdmin);
  const ue = document.getElementById('userEmail');
  if (ue) ue.textContent = m.email;
  init();
  if (!realtimeStarted) {
    realtimeStarted = true;
    subscribeRealtime();
    onInstrumentsChanged(async () => {
      instruments = await AmautaDB.listInstruments().catch(() => instruments);
      buildSidebar();
    });
  }
}

async function handleLogout() {
  await signOut();
  location.reload();
}

// =============================================================
//  Vista CEDEARs (nativa)
// =============================================================
let cedearsMounted = false;

function showCedears(pushHistory = true) {
  teardownNews(); teardownEmbed();
  AmautaRenderer.destroyCharts();
  document.querySelectorAll('.instrument-item').forEach(i => i.classList.remove('active'));
  document.getElementById('sidebarAdminEntry')?.classList.remove('active');
  document.getElementById('cedearsNavEntry')?.classList.add('active');
  document.getElementById('sidebar').classList.remove('open');

  const topbar = document.getElementById('topbar');
  if (topbar) topbar.style.display = 'none';

  const welcome = document.getElementById('welcomeScreen');
  if (welcome) welcome.remove();

  if (pushHistory) history.pushState({ view: 'cedears' }, '', '?view=cedears');
  active = null;

  const content = document.getElementById('contentArea');
  if (window.CedearsView) {
    cedearsMounted = true;
    window.CedearsView.mount(content);
  } else {
    content.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h2>No disponible</h2><p>El módulo del Monitor CEDEARs no se cargó.</p></div>`;
  }
}

function teardownCedears() {
  if (cedearsMounted && window.CedearsView) {
    try { window.CedearsView.unmount(); } catch (_) {}
  }
  cedearsMounted = false;
  document.getElementById('cedearsNavEntry')?.classList.remove('active');
}

// =============================================================
//  Vista Noticias (nativa)
// =============================================================
let newsMounted = false;

function showNews(pushHistory = true) {
  teardownCedears(); teardownEmbed();
  AmautaRenderer.destroyCharts();
  document.querySelectorAll('.instrument-item').forEach(i => i.classList.remove('active'));
  document.getElementById('sidebarAdminEntry')?.classList.remove('active');
  document.getElementById('newsNavEntry')?.classList.add('active');
  document.getElementById('sidebar').classList.remove('open');

  const topbar = document.getElementById('topbar');
  if (topbar) topbar.style.display = 'none';

  const welcome = document.getElementById('welcomeScreen');
  if (welcome) welcome.remove();

  if (pushHistory) history.pushState({ view: 'news' }, '', '?view=news');
  active = null;

  const content = document.getElementById('contentArea');
  if (window.NewsView) {
    newsMounted = true;
    window.NewsView.mount(content);
  } else {
    content.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h2>No disponible</h2><p>El módulo de Noticias no se cargó.</p></div>`;
  }
}

function teardownNews() {
  if (newsMounted && window.NewsView) {
    try { window.NewsView.unmount(); } catch (_) {}
  }
  newsMounted = false;
  document.getElementById('newsNavEntry')?.classList.remove('active');
}

// =============================================================
//  Secciones embebidas (Monitor FCIs / Chat / Simulador) — iframe
// =============================================================
let currentEmbed = null;

function showEmbed(view, pushHistory = true) {
  const conf = CFG.EMBEDS[view];
  if (!conf) return;
  teardownCedears(); teardownNews();
  AmautaRenderer.destroyCharts();
  document.querySelectorAll('.instrument-item').forEach(i => i.classList.remove('active'));
  document.getElementById('sidebarAdminEntry')?.classList.remove('active');
  document.querySelectorAll('.embed-nav-entry').forEach(e => e.classList.remove('active'));
  document.getElementById(`embedNav_${view}`)?.classList.add('active');
  document.getElementById('sidebar').classList.remove('open');

  const topbar = document.getElementById('topbar');
  if (topbar) topbar.style.display = 'none';

  const welcome = document.getElementById('welcomeScreen');
  if (welcome) welcome.remove();

  if (pushHistory) history.pushState({ view }, '', `?view=${view}`);
  active = null;
  currentEmbed = view;

  const content = document.getElementById('contentArea');
  if (!conf.url) {
    document.body.classList.remove('embedding');
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${escapeHtml(conf.icon || '🧩')}</div>
        <h2>${escapeHtml(conf.title)}</h2>
        <p>${escapeHtml(conf.subtitle || '')}</p>
        <p style="margin-top:10px;"><span class="soon-badge">Próximamente</span></p>
      </div>`;
    return;
  }
  document.body.classList.add('embedding');
  content.innerHTML = `<div class="embed-wrap"><iframe class="embed-frame" src="${conf.url}" title="${escapeHtml(conf.title)}" allow="clipboard-read; clipboard-write; fullscreen" referrerpolicy="no-referrer-when-downgrade"></iframe></div>`;
}

function teardownEmbed() {
  currentEmbed = null;
  document.body.classList.remove('embedding');
  document.querySelectorAll('.embed-nav-entry').forEach(e => e.classList.remove('active'));
}

function pushUrlInstrument(id, tabIdx) {
  const params = new URLSearchParams();
  if (id) params.set('inst', id);
  if (tabIdx != null && tabIdx > 0) params.set('tab', tabIdx);
  const qs = params.toString();
  history.pushState({ inst: id, tab: tabIdx ?? 0 }, '', qs ? `?${qs}` : location.pathname);
}

function replaceUrlInstrument(id, tabIdx) {
  const params = new URLSearchParams();
  if (id) params.set('inst', id);
  if (tabIdx != null && tabIdx > 0) params.set('tab', tabIdx);
  const qs = params.toString();
  history.replaceState({ inst: id, tab: tabIdx ?? 0 }, '', qs ? `?${qs}` : location.pathname);
}

// Manejar botones atrás/adelante del browser
window.addEventListener('popstate', (e) => {
  if (!document.body.classList.contains('authed')) return;
  const view = e.state?.view || getUrlView();
  const inst = e.state?.inst || getUrlInstrument();
  if (view === 'cedears') { showCedears(false); return; }
  if (view === 'news') { showNews(false); return; }
  if (view && CFG.EMBEDS[view]) { showEmbed(view, false); return; }
  if (inst) {
    selectInstrument(inst, e.state?.tab ?? 0, false);
  } else {
    teardownCedears(); teardownNews(); teardownEmbed();
    AmautaRenderer.destroyCharts();
    document.querySelectorAll('.instrument-item').forEach(i => i.classList.remove('active'));
    const topbar = document.getElementById('topbar');
    if (topbar) topbar.style.display = 'none';
    renderWelcome();
    active = null;
  }
});

// -------------- Sidebar --------------
async function init() {
  if (appStarted) return;
  appStarted = true;
  const topbar = document.getElementById('topbar');
  topbar.style.display = 'none';
  try {
    instruments = await AmautaDB.listInstruments();
    buildSidebar();
    const view = getUrlView();
    if (view === 'cedears') { showCedears(false); return; }
    if (view === 'news') { showNews(false); return; }
    if (view && CFG.EMBEDS[view]) { showEmbed(view, false); return; }
    const instFromUrl = getUrlInstrument();
    const tabFromUrl  = parseInt(new URLSearchParams(location.search).get('tab') || '0', 10);
    if (instFromUrl) {
      selectInstrument(instFromUrl, tabFromUrl, false);
    } else {
      renderWelcome();
    }
  } catch (e) {
    console.error('Error loading instruments', e);
    document.getElementById('sidebarNav').innerHTML =
      `<div style="padding:20px;color:var(--am-red);font-size:13px;">Error cargando instrumentos: ${escapeHtml(e.message)}</div>`;
  }
}

function renderWelcome() {
  document.body.classList.remove('embedding');
  const content = document.getElementById('contentArea');
  content.innerHTML = `
    <div class="welcome" id="welcomeScreen">
      <div class="welcome-hero">
        <span class="welcome-hero-icon">✦</span>
        <h2>Amauta <span>Local</span></h2>
        <p>El portal del equipo de Amauta. Research de instrumentos, monitor de CEDEARs y FCIs, noticias, simulador y chat financiero — todo en un solo lugar.</p>
        <div class="welcome-legend">
          <div class="legend-item"><span class="status-dot ready" style="display:inline-block;width:7px;height:7px;border-radius:50%;flex-shrink:0;"></span> Análisis completo</div>
          <div class="legend-item"><span class="status-dot wip" style="display:inline-block;width:7px;height:7px;border-radius:50%;flex-shrink:0;"></span> En desarrollo</div>
          <div class="legend-item"><span class="status-dot empty" style="display:inline-block;width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,0.2);flex-shrink:0;"></span> Pendiente</div>
        </div>
      </div>
    </div>`;
  buildWelcome();
}

function buildWelcome() {
  const welcome = document.getElementById('welcomeScreen');
  if (!welcome) return;
  welcome.querySelector('.welcome-title')?.remove();
  welcome.querySelector('.welcome-instruments')?.remove();

  const readyInsts = instruments.filter(i => i.status === 'ready');
  if (!readyInsts.length) return;

  const title = document.createElement('div');
  title.className = 'welcome-title';
  title.textContent = 'Instrumentos disponibles';
  welcome.appendChild(title);

  const grid = document.createElement('div');
  grid.className = 'welcome-instruments';
  grid.innerHTML = readyInsts.map(inst => `
    <div class="welcome-inst-card" data-inst-id="${escapeHtml(inst.id)}">
      <span class="wi-ticker">${escapeHtml(inst.ticker)}</span>
      <span class="wi-name">${escapeHtml(inst.name)}</span>
      <span class="wi-category"><span class="wi-dot"></span>${escapeHtml(inst.category)}</span>
    </div>`).join('');
  welcome.appendChild(grid);

  grid.querySelectorAll('.welcome-inst-card').forEach(card => {
    card.addEventListener('click', () => selectInstrument(card.dataset.instId));
  });
}

function buildSidebar() {
  const nav = document.getElementById('sidebarNav');
  const categories = {};
  const order = CFG.CATEGORY_ORDER;
  const visible = isAdmin ? instruments : instruments.filter(i => i.status === 'ready');
  visible.forEach(inst => {
    (categories[inst.category] = categories[inst.category] || []).push(inst);
  });
  const orderedCats = order.filter(c => categories[c]).concat(Object.keys(categories).filter(c => !order.includes(c)));

  // Entradas fijas de herramientas (arriba de las categorías de instrumentos)
  let html = `<div class="nav-group-label">Herramientas</div>
    <div class="cedears-nav-entry ${cedearsMounted ? 'active' : ''}" id="cedearsNavEntry">
      <span class="cedears-live-dot"></span>
      <span class="ticker">CEDEARs</span>
      <span class="inst-name">Monitor en vivo</span>
    </div>
    <div class="cedears-nav-entry embed-nav-entry" id="embedNav_fci">
      <span class="news-nav-ico">📊</span>
      <span class="ticker">FCIs</span>
      <span class="inst-name">Fondos · CAFCI</span>
    </div>
    <div class="cedears-nav-entry embed-nav-entry" id="embedNav_chat">
      <span class="news-nav-ico">💬</span>
      <span class="ticker">Chat</span>
      <span class="inst-name">Chat financiero (IA)</span>
    </div>
    <div class="cedears-nav-entry embed-nav-entry" id="embedNav_simulador">
      <span class="news-nav-ico">🧮</span>
      <span class="ticker">Simulador</span>
      <span class="inst-name">Escenarios de inversión</span>
    </div>
    <div class="cedears-nav-entry ${newsMounted ? 'active' : ''}" id="newsNavEntry">
      <span class="news-nav-ico">📰</span>
      <span class="ticker">Noticias</span>
      <span class="inst-name">Reuters · universo CEDEARs</span>
    </div>
    <div class="nav-group-label">Research</div>`;

  orderedCats.forEach(cat => {
    html += `<div class="category open" id="cat-${cssId(cat)}">
      <div class="category-header">
        <span>${escapeHtml(cat)}</span><span class="arrow">▶</span>
      </div>
      <div class="instrument-list">`;
    categories[cat].forEach(inst => {
      html += `<div class="instrument-item" data-inst-id="${escapeHtml(inst.id)}">
        <span class="ticker">${escapeHtml(inst.ticker)}</span>
        <span class="inst-name">${escapeHtml(inst.name)}</span>
        <span class="status-dot ${escapeHtml(inst.status)}"></span>
      </div>`;
    });
    html += `</div></div>`;
  });
  nav.innerHTML = html;

  nav.querySelectorAll('.category-header').forEach(h => {
    h.addEventListener('click', () => h.parentElement.classList.toggle('open'));
  });
  nav.querySelectorAll('.instrument-item').forEach(item => {
    item.addEventListener('click', () => selectInstrument(item.dataset.instId));
  });

  nav.querySelector('#cedearsNavEntry')?.addEventListener('click', () => showCedears());
  nav.querySelector('#newsNavEntry')?.addEventListener('click', () => showNews());
  nav.querySelector('#embedNav_fci')?.addEventListener('click', () => showEmbed('fci'));
  nav.querySelector('#embedNav_chat')?.addEventListener('click', () => showEmbed('chat'));
  nav.querySelector('#embedNav_simulador')?.addEventListener('click', () => showEmbed('simulador'));

  const adminEntry = document.getElementById('sidebarAdminEntry');
  if (adminEntry && !adminEntry.dataset.wired) {
    adminEntry.dataset.wired = '1';
    adminEntry.addEventListener('click', () => {
      document.querySelectorAll('.instrument-item').forEach(i => i.classList.remove('active'));
      adminEntry.classList.add('active');
      document.getElementById('sidebar').classList.remove('open');
      teardownCedears(); teardownNews(); teardownEmbed();
      AmautaAdmin.openPanel();
    });
  }

  const countEl = document.getElementById('sidebarInstrumentCount');
  if (countEl) {
    const readyCount = instruments.filter(i => i.status === 'ready').length;
    countEl.textContent = `${readyCount} de ${instruments.length} instrumentos con análisis`;
  }

  // Reafirmar estado activo de la sección embebida si corresponde
  if (currentEmbed) document.getElementById(`embedNav_${currentEmbed}`)?.classList.add('active');
}

let _filterTimer;
function filterInstruments() {
  clearTimeout(_filterTimer);
  _filterTimer = setTimeout(() => {
    const q = document.getElementById('searchInput').value.toLowerCase();
    document.querySelectorAll('.instrument-item').forEach(item => {
      const text = (item.dataset.ticker || item.textContent).toLowerCase();
      item.style.display = text.includes(q) ? '' : 'none';
    });
  }, 200);
}

// pushHistory=true cuando el usuario hace clic; false cuando se restaura desde URL/popstate
async function selectInstrument(id, initialTab = 0, pushHistory = true) {
  teardownCedears(); teardownNews(); teardownEmbed();
  AmautaRenderer.destroyCharts();
  document.querySelectorAll('.instrument-item').forEach(i => i.classList.remove('active'));
  document.querySelector(`.instrument-item[data-inst-id="${cssEscape(id)}"]`)?.classList.add('active');
  document.getElementById('sidebarAdminEntry')?.classList.remove('active');

  const welcome = document.getElementById('welcomeScreen');
  if (welcome) welcome.remove();
  document.getElementById('sidebar').classList.remove('open');

  const content = document.getElementById('contentArea');
  content.innerHTML = `<div class="loading"><div class="spinner"></div><div>Cargando ${escapeHtml(id)}…</div></div>`;

  if (pushHistory) {
    pushUrlInstrument(id, initialTab > 0 ? initialTab : null);
  } else {
    replaceUrlInstrument(id, initialTab > 0 ? initialTab : null);
  }

  try {
    const [inst, blocks] = await Promise.all([
      AmautaDB.getInstrument(id),
      AmautaDB.getBlocks(id),
    ]);
    if (!inst) throw new Error('Instrumento no encontrado');

    const topbar = document.getElementById('topbar');
    topbar.style.display = 'flex';
    topbar.innerHTML = `
      <div class="topbar-left">
        <span class="topbar-ticker">${escapeHtml(inst.ticker)}</span>
        <span class="topbar-name">${escapeHtml(inst.name)}</span>
        <span class="topbar-type type-${escapeHtml(inst.type)}">${inst.type === 'equity' ? 'Equity' : 'Renta Fija'}</span>
      </div>
      <div class="topbar-right">
        ${inst.tv_symbol ? `<div class="tv-price-widget" id="tvPriceWidget"></div>` : `<span class="topbar-price">${escapeHtml(inst.price || '')}</span>`}
        ${inst.change_text ? `<span class="topbar-change ${inst.change_dir === 'down' ? 'change-down' : 'change-up'}">${escapeHtml(inst.change_text)}</span>` : ''}
        ${inst.updated_text ? `<span class="topbar-updated">Actualizado: ${escapeHtml(inst.updated_text)}</span>` : ''}
      </div>
    `;
    if (inst.tv_symbol) loadTVTickerWidget(inst.tv_symbol);

    active = { id, instrument: inst, blocks };
    const res = AmautaRenderer.renderInstrument(content, inst, blocks, initialTab);
    active.switchTab = res.switchTab;

    if (res.onTabChange) {
      res.onTabChange((tabIdx) => {
        pushUrlInstrument(id, tabIdx > 0 ? tabIdx : null);
      });
    }
  } catch (e) {
    content.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h2>Error</h2><p>${escapeHtml(e.message)}</p></div>`;
  }
}

// -------------- TradingView --------------
function loadTVTickerWidget(symbol) {
  const container = document.getElementById('tvPriceWidget');
  if (!container) return;
  container.innerHTML = '';
  const div = document.createElement('div');
  div.className = 'tradingview-widget-container';
  div.innerHTML = `<div class="tradingview-widget-container__widget"></div>`;
  container.appendChild(div);
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js';
  script.async = true;
  script.textContent = JSON.stringify({
    symbol, width: '320', isTransparent: true, colorTheme: 'light', locale: 'es'
  });
  div.appendChild(script);
}

// -------------- Home --------------
function goHome() {
  teardownCedears(); teardownNews(); teardownEmbed();
  AmautaRenderer.destroyCharts();
  active = null;
  document.querySelectorAll('.instrument-item').forEach(i => i.classList.remove('active'));
  document.getElementById('sidebarAdminEntry')?.classList.remove('active');
  document.getElementById('sidebar').classList.remove('open');
  const topbar = document.getElementById('topbar');
  if (topbar) topbar.style.display = 'none';
  history.pushState({}, '', location.pathname);
  renderWelcome();
}

// -------------- Utils --------------
function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function cssId(s) { return String(s).replace(/\s+/g, ''); }
function cssEscape(s) {
  if (window.CSS && window.CSS.escape) return window.CSS.escape(s);
  return String(s).replace(/[^a-zA-Z0-9_-]/g, c => `\\${c}`);
}

// -------------- Mobile menu --------------
function wireMobileMenu() {
  const menuLink = document.getElementById('mobileMenuLink');
  const closeLink = document.getElementById('sidebarCloseLink');
  if (menuLink) {
    const open = e => { e.preventDefault(); e.stopPropagation(); document.getElementById('sidebar').classList.add('open'); };
    menuLink.addEventListener('click', open);
    menuLink.addEventListener('touchend', open);
  }
  if (closeLink) {
    const close = e => { e.preventDefault(); document.getElementById('sidebar').classList.remove('open'); };
    closeLink.addEventListener('click', close);
    closeLink.addEventListener('touchend', close);
  }
}

// -------------- Login / handlers --------------
function wireLoginHandlers() {
  document.getElementById('loginSendBtn')?.addEventListener('click', handleSendCode);
  document.getElementById('loginVerifyBtn')?.addEventListener('click', handleVerifyCode);
  document.getElementById('loginBackLink')?.addEventListener('click', resetLoginToEmail);
  document.getElementById('loginEmail')?.addEventListener('keydown', e => { if (e.key === 'Enter') handleSendCode(); });
  document.getElementById('loginCode')?.addEventListener('keydown', e => { if (e.key === 'Enter') handleVerifyCode(); });
}

function wireStaticHandlers() {
  document.getElementById('searchInput')?.addEventListener('input', filterInstruments);
  document.querySelector('.sidebar-logo')?.addEventListener('click', goHome);
  document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
}

bootstrap();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
