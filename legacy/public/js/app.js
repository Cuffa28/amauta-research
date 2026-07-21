import { AMAUTA_CONFIG } from './config.js';
import {
  sendOtp, verifyOtp, captureHashSession, ensureSession, getTeamMember, signOut,
} from './supabase-client.js';

const CFG = AMAUTA_CONFIG;
let member = null;
let appStarted = false;

// Herramientas del portal (fuente única para sidebar + hub). El orden acá manda.
// kind: 'cedears' | 'news' → sección nativa · 'embed' → iframe (URL en CFG.EMBEDS)
const TOOLS = [
  { view: 'cedears',   title: 'Monitor CEDEARs', subtitle: 'Cotizaciones y fundamentals en vivo', icon: '📈', kind: 'cedears', live: true },
  { view: 'fci',       title: 'Monitor FCIs',    subtitle: 'Fondos Comunes · CAFCI',              icon: '📊', kind: 'embed' },
  { view: 'chat',      title: 'Chat Financiero', subtitle: 'Asistente financiero con IA',         icon: '💬', kind: 'embed' },
  { view: 'simulador', title: 'Simulador',       subtitle: 'Comparador CPD · Banco vs Mercado',   icon: '🧮', kind: 'embed' },
  { view: 'news',      title: 'Noticias',        subtitle: 'Reuters · universo CEDEARs',          icon: '📰', kind: 'news' },
];

// Marca Amauta (rombo + asterisco de 8 puntas) — SVG nítido y themeable.
const AMAUTA_MARK = `
  <svg class="hub-hero-mark" width="48" height="48" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <polygon points="20,2.5 37.5,20 20,37.5 2.5,20" fill="#F3CF11"/>
    <g stroke="#231F20" stroke-width="1.9" stroke-linecap="round">
      <line x1="20" y1="10.4" x2="20" y2="29.6"/>
      <line x1="10.4" y1="20" x2="29.6" y2="20"/>
      <line x1="13.6" y1="13.6" x2="26.4" y2="26.4"/>
      <line x1="26.4" y1="13.6" x2="13.6" y2="26.4"/>
    </g>
  </svg>`;

// -------------- URL routing --------------
function getUrlView() {
  return new URLSearchParams(location.search).get('view') || null;
}

// Puente para cedears.js (script global, no módulo): le pasamos config.
// navigate quedó como no-op porque Research se removió del portal.
window.AmautaCedearsBridge = {
  config: CFG,
  navigate: () => {},
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
  document.body.classList.add('authed');
  const ue = document.getElementById('userEmail');
  if (ue) ue.textContent = m.email;
  init();
}

async function handleLogout() {
  await signOut();
  location.reload();
}

// =============================================================
//  Navegación entre secciones
// =============================================================
let cedearsMounted = false;
let newsMounted = false;
let currentEmbed = null;

function setActiveNav(view) {
  document.querySelectorAll('.tool-nav-entry').forEach(e => e.classList.remove('active'));
  if (view) document.getElementById(`toolNav_${view}`)?.classList.add('active');
}

function clearSections() {
  document.body.classList.remove('view-hub', 'view-cedears', 'view-news');
  teardownCedears();
  teardownNews();
  teardownEmbed();
}

// -------------- Colapso del panel lateral --------------
const isMobile = () => window.innerWidth <= 768;
function collapseNav() { document.body.classList.add('nav-collapsed'); }
function expandNav() { document.body.classList.remove('nav-collapsed'); }
function toggleNav() {
  if (isMobile()) document.getElementById('sidebar').classList.toggle('open');
  else document.body.classList.toggle('nav-collapsed');
}

// Navegación iniciada por el usuario (clic en tarjeta del hub o entrada del sidebar).
// Al entrar a una herramienta, oculta el panel para dar más espacio a la vista.
function navigate(view) {
  if (view === 'cedears') showCedears();
  else if (view === 'news') showNews();
  else if (CFG.EMBEDS[view]) showEmbed(view);
  else return;
  if (!isMobile()) collapseNav();
}

// -------------- CEDEARs (nativa) --------------
function showCedears(pushHistory = true) {
  clearSections();
  setActiveNav('cedears');
  document.body.classList.add('view-cedears');
  document.getElementById('sidebar').classList.remove('open');
  document.body.classList.remove('embedding');
  if (pushHistory) history.pushState({ view: 'cedears' }, '', '?view=cedears');

  const content = document.getElementById('contentArea');
  if (window.CedearsView) {
    cedearsMounted = true;
    window.CedearsView.mount(content);
  } else {
    content.innerHTML = notAvailable('Monitor CEDEARs');
  }
}
function teardownCedears() {
  if (cedearsMounted && window.CedearsView) {
    try { window.CedearsView.unmount(); } catch (_) {}
  }
  cedearsMounted = false;
}

// -------------- Noticias (nativa) --------------
function showNews(pushHistory = true) {
  clearSections();
  setActiveNav('news');
  document.body.classList.add('view-news');
  document.getElementById('sidebar').classList.remove('open');
  document.body.classList.remove('embedding');
  if (pushHistory) history.pushState({ view: 'news' }, '', '?view=news');

  const content = document.getElementById('contentArea');
  if (window.NewsView) {
    newsMounted = true;
    window.NewsView.mount(content);
  } else {
    content.innerHTML = notAvailable('Noticias');
  }
}
function teardownNews() {
  if (newsMounted && window.NewsView) {
    try { window.NewsView.unmount(); } catch (_) {}
  }
  newsMounted = false;
}

// -------------- Secciones embebidas (FCIs / Chat / Simulador) — iframe --------------
function showEmbed(view, pushHistory = true) {
  const conf = CFG.EMBEDS[view];
  if (!conf) return;
  clearSections();
  setActiveNav(view);
  document.getElementById('sidebar').classList.remove('open');
  if (pushHistory) history.pushState({ view }, '', `?view=${view}`);
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
}

// -------------- Manejar atrás/adelante del browser --------------
window.addEventListener('popstate', (e) => {
  if (!document.body.classList.contains('authed')) return;
  const view = e.state?.view || getUrlView();
  if (view === 'cedears') { showCedears(false); return; }
  if (view === 'news') { showNews(false); return; }
  if (view && CFG.EMBEDS[view]) { showEmbed(view, false); return; }
  clearSections();
  setActiveNav(null);
  renderHub();
});

// =============================================================
//  Sidebar + Hub
// =============================================================
async function init() {
  if (appStarted) return;
  appStarted = true;
  const topbar = document.getElementById('topbar');
  if (topbar) topbar.style.display = 'none';

  buildSidebar();

  const view = getUrlView();
  if (view === 'cedears') { showCedears(false); return; }
  if (view === 'news') { showNews(false); return; }
  if (view && CFG.EMBEDS[view]) { showEmbed(view, false); return; }
  renderHub();
}

function buildSidebar() {
  const nav = document.getElementById('sidebarNav');
  const shortLabel = { cedears: 'CEDEARs', fci: 'FCIs', chat: 'Chat', simulador: 'Simulador', news: 'Noticias' };

  nav.innerHTML = `<div class="nav-group-label">Herramientas</div>` + TOOLS.map(t => `
    <div class="cedears-nav-entry tool-nav-entry" data-view="${t.view}" id="toolNav_${t.view}">
      ${t.live ? '<span class="cedears-live-dot"></span>' : `<span class="news-nav-ico">${t.icon}</span>`}
      <span class="ticker">${escapeHtml(shortLabel[t.view] || t.title)}</span>
      <span class="inst-name">${escapeHtml(t.subtitle)}</span>
    </div>`).join('');

  nav.querySelectorAll('.tool-nav-entry').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.view));
  });

  if (currentEmbed) setActiveNav(currentEmbed);
}

function renderHub() {
  document.body.classList.remove('embedding');
  document.body.classList.add('view-hub');
  expandNav();
  const content = document.getElementById('contentArea');
  content.innerHTML = `
    <div class="hub">
      <div class="hub-hero">
        <div class="hub-hero-top">
          ${AMAUTA_MARK}
          <div>
            <span class="hub-hero-kicker">Portal del equipo</span>
            <h2>Amauta <span>Local</span></h2>
          </div>
        </div>
        <p>Todas las herramientas de Amauta en un solo lugar: monitor de CEDEARs, fondos comunes, simulador, chat financiero y noticias del mercado.</p>
      </div>
      <div class="hub-title">Herramientas</div>
      <div class="hub-grid">
        ${TOOLS.map(t => `
          <button class="hub-card" data-view="${t.view}" type="button">
            <span class="hub-card-ico">${t.icon}</span>
            <span class="hub-card-body">
              <span class="hub-card-name">${escapeHtml(t.title)}</span>
              <span class="hub-card-sub">${escapeHtml(t.subtitle)}</span>
            </span>
            <span class="hub-card-arrow">→</span>
          </button>`).join('')}
      </div>
    </div>`;

  content.querySelectorAll('.hub-card').forEach(card => {
    card.addEventListener('click', () => navigate(card.dataset.view));
  });
}

// -------------- Home --------------
function goHome() {
  clearSections();
  setActiveNav(null);
  document.getElementById('sidebar').classList.remove('open');
  const topbar = document.getElementById('topbar');
  if (topbar) topbar.style.display = 'none';
  history.pushState({}, '', location.pathname);
  renderHub();
}

// -------------- Utils --------------
function notAvailable(name) {
  return `<div class="empty-state"><div class="empty-icon">⚠️</div><h2>No disponible</h2><p>El módulo de ${escapeHtml(name)} no se cargó.</p></div>`;
}
function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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
  document.querySelector('.sidebar-logo')?.addEventListener('click', goHome);
  document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
  document.getElementById('navToggle')?.addEventListener('click', toggleNav);
  document.getElementById('navCollapseBtn')?.addEventListener('click', () => {
    if (isMobile()) document.getElementById('sidebar').classList.remove('open');
    else collapseNav();
  });
}

bootstrap();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
