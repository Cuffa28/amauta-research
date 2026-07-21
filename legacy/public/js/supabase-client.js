import { AMAUTA_CONFIG } from './config.js';

const cfg = AMAUTA_CONFIG;
const REST  = `${cfg.SUPABASE_URL}/rest/v1`;
const FN    = `${cfg.SUPABASE_URL}/functions/v1`;
const AUTH  = `${cfg.SUPABASE_URL}/auth/v1`;
const CACHE_TTL = 60 * 60 * 1000;
const SESSION_KEY = 'amauta:session';

// Sesión persistida en localStorage (portal de equipo — login por código de email)
let _session = restoreSession();
let _member  = null; // { email, role: 'admin' | 'member' }

const BASE_HEADERS = {
  apikey: cfg.SUPABASE_KEY,
  'Content-Type': 'application/json',
};

function getHeaders() {
  const token = _session?.access_token;
  return {
    ...BASE_HEADERS,
    Authorization: `Bearer ${token || cfg.SUPABASE_KEY}`,
  };
}

// -------------- Persistencia de sesión --------------
function restoreSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s?.access_token || !s?.refresh_token) return null;
    return s;
  } catch { return null; }
}

function persistSession(s) {
  _session = s;
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {}
}

function decodeJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch { return {}; }
}
function decodeExp(token) {
  return (decodeJwt(token).exp || 0) * 1000;
}
function sessionEmail() {
  if (_session?.email) return _session.email;
  if (_session?.access_token) return decodeJwt(_session.access_token).email || null;
  return null;
}

// -------------- Auth: OTP por email (código de 6 dígitos / magic link) --------------
export async function sendOtp(email) {
  const r = await fetch(`${AUTH}/otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: cfg.SUPABASE_KEY },
    // create_user: true → el equipo puede loguear la primera vez sin alta previa;
    // el acceso real se controla contra la allowlist team_members tras verificar.
    body: JSON.stringify({ email, create_user: true }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error_description || data.msg || data.error || 'No se pudo enviar el código');
  return data;
}

export async function verifyOtp(email, token) {
  const r = await fetch(`${AUTH}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: cfg.SUPABASE_KEY },
    body: JSON.stringify({ email, token: token.trim(), type: 'email' }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.access_token) {
    throw new Error(data.error_description || data.msg || data.error || 'Código inválido o expirado');
  }
  persistSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: decodeExp(data.access_token),
    email: data.user?.email || email,
  });
  return data;
}

// Captura una sesión que llega por el hash de la URL (magic link de email).
// Supabase redirige a #access_token=...&refresh_token=...&type=magiclink
export function captureHashSession() {
  try {
    if (!location.hash || location.hash.indexOf('access_token') === -1) return false;
    const p = new URLSearchParams(location.hash.slice(1));
    const access_token = p.get('access_token');
    const refresh_token = p.get('refresh_token');
    if (!access_token || !refresh_token) return false;
    persistSession({
      access_token,
      refresh_token,
      expires_at: decodeExp(access_token),
      email: null, // se completa vía getTeamMember() con el JWT
    });
    // Limpiar el hash para no dejar tokens en la URL
    history.replaceState(null, '', location.pathname + location.search);
    return true;
  } catch { return false; }
}

async function refreshSession() {
  if (!_session?.refresh_token) return null;
  const r = await fetch(`${AUTH}/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: cfg.SUPABASE_KEY },
    body: JSON.stringify({ refresh_token: _session.refresh_token }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.access_token) { persistSession(null); return null; }
  persistSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: decodeExp(data.access_token),
    email: data.user?.email || _session.email,
  });
  return _session;
}

// Devuelve una sesión válida (refresca si está por expirar), o null.
export async function ensureSession() {
  if (!_session?.access_token) return null;
  const exp = _session.expires_at || decodeExp(_session.access_token);
  if (exp && Date.now() > exp - 60 * 1000) {
    return await refreshSession();
  }
  return _session;
}

// Valida contra la allowlist del equipo. Devuelve { email, role } o null si no autorizado.
export async function getTeamMember() {
  if (!_session?.access_token) return null;
  const email = sessionEmail();
  if (!email) return null;
  if (!_session.email) { _session.email = email; persistSession(_session); }
  try {
    const r = await fetch(
      `${REST}/team_members?select=email,role,active&email=eq.${encodeURIComponent(email)}&active=eq.true`,
      { headers: getHeaders() }
    );
    if (!r.ok) return null;
    const rows = await r.json();
    _member = rows[0] ? { email: rows[0].email, role: rows[0].role || 'member' } : null;
    return _member;
  } catch { return null; }
}

export async function signOut() {
  if (_session?.access_token) {
    await fetch(`${AUTH}/logout`, {
      method: 'POST',
      headers: { ...BASE_HEADERS, Authorization: `Bearer ${_session.access_token}` },
    }).catch(() => {});
  }
  persistSession(null);
  _member = null;
  clearCache();
}

export function getSession() { return _session; }
export function getMember() { return _member; }

// -------------- Caché localStorage --------------
function cacheGet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(key); return null; }
    return data;
  } catch { return null; }
}
function cacheSet(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); } catch {}
}
function cacheInvalidate(pattern) {
  try {
    Object.keys(localStorage).filter(k => k.startsWith(pattern)).forEach(k => localStorage.removeItem(k));
  } catch {}
}

// -------------- Lecturas (usan JWT si hay sesión) --------------
export async function listInstruments() {
  const key = `amr:instruments:${!!_session}`;
  const cached = cacheGet(key);
  if (cached) return cached;
  const r = await fetch(`${REST}/instruments?select=*&order=sort_order.asc`, { headers: getHeaders() });
  if (!r.ok) throw new Error(`listInstruments ${r.status}`);
  const data = await r.json();
  cacheSet(key, data);
  return data;
}

export async function getInstrument(id) {
  const key = `amr:inst:${id}:${!!_session}`;
  const cached = cacheGet(key);
  if (cached) return cached;
  const r = await fetch(`${REST}/instruments?id=eq.${encodeURIComponent(id)}&select=*`, { headers: getHeaders() });
  if (!r.ok) throw new Error(`getInstrument ${r.status}`);
  const rows = await r.json();
  const data = rows[0] || null;
  if (data) cacheSet(key, data);
  return data;
}

export async function getBlocks(instrumentId) {
  const key = `amr:blocks:${instrumentId}:${!!_session}`;
  const cached = cacheGet(key);
  if (cached) return cached;
  const url = `${REST}/instrument_blocks?instrument_id=eq.${encodeURIComponent(instrumentId)}&order=tab_index.asc,block_order.asc&select=*`;
  const r = await fetch(url, { headers: getHeaders() });
  if (!r.ok) throw new Error(`getBlocks ${r.status}`);
  const data = await r.json();
  cacheSet(key, data);
  return data;
}

// -------------- Escrituras (requieren JWT en header) --------------
export async function adminWrite(action, payload) {
  if (!_session?.access_token) throw new Error('No autenticado');
  const r = await fetch(`${FN}/admin-write`, {
    method: 'POST',
    headers: { ...BASE_HEADERS, Authorization: `Bearer ${_session.access_token}` },
    body: JSON.stringify({ action, payload }),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error || `admin-write ${r.status}`);
  if (body.ok) {
    const id = payload?.id || payload?.instrument_id;
    if (id) { cacheInvalidate(`amr:inst:${id}`); cacheInvalidate(`amr:blocks:${id}`); }
    cacheInvalidate('amr:instruments');
  }
  return body;
}

export function clearCache() {
  try { Object.keys(localStorage).filter(k => k.startsWith('amr:')).forEach(k => localStorage.removeItem(k)); } catch {}
}

// -------------- Real-time --------------
const _listeners = new Set();
let _wsRetryTimer = null;

export function onInstrumentsChanged(fn) { _listeners.add(fn); }
export function offInstrumentsChanged(fn) { _listeners.delete(fn); }

function _notifyListeners(event) {
  _listeners.forEach(fn => { try { fn(event); } catch (_) {} });
}

export function subscribeRealtime() {
  // Supabase Realtime via WebSocket (protocolo phoenix)
  const wsUrl = cfg.SUPABASE_URL.replace('https://', 'wss://') + '/realtime/v1/websocket?apikey=' + cfg.SUPABASE_KEY + '&vsn=1.0.0';

  let ws;
  let heartbeat;

  function connect() {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      // Unirse al canal de cambios en instruments
      ws.send(JSON.stringify({
        topic: 'realtime:public:instruments',
        event: 'phx_join',
        payload: { config: { broadcast: { self: false }, presence: { key: '' } } },
        ref: '1',
      }));
      heartbeat = setInterval(() => {
        ws.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: null }));
      }, 25000);
    };

    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        const ev = data?.payload?.data;
        if (ev && ['INSERT', 'UPDATE', 'DELETE'].includes(ev.type)) {
          clearCache();
          _notifyListeners({ type: ev.type, table: ev.table, record: ev.record });
        }
      } catch (_) {}
    };

    ws.onclose = () => {
      clearInterval(heartbeat);
      // Reconectar en 5 segundos
      _wsRetryTimer = setTimeout(connect, 5000);
    };

    ws.onerror = () => ws.close();
  }

  connect();

  return () => {
    clearTimeout(_wsRetryTimer);
    clearInterval(heartbeat);
    ws?.close();
  };
}

export const AmautaDB = {
  listInstruments, getInstrument, getBlocks,
  adminWrite, clearCache,
  sendOtp, verifyOtp, captureHashSession, ensureSession, getTeamMember, signOut, getSession, getMember,
  onInstrumentsChanged, offInstrumentsChanged, subscribeRealtime,
};
