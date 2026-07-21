// Cliente de auth del PORTAL (login de equipo por código de email).
// Portado del sitio estático (supabase-client.js) a TS. Usa fetch directo a la
// API de Supabase Auth con la anon key — corre en el navegador.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const REST = `${SUPABASE_URL}/rest/v1`;
const AUTH = `${SUPABASE_URL}/auth/v1`;
const SESSION_KEY = "amauta:session";

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  email: string | null;
}
export interface Member {
  email: string;
  role: "admin" | "member";
}

let _session: Session | null = null;
let _member: Member | null = null;

function isBrowser() {
  return typeof window !== "undefined";
}

function decodeJwt(token: string): Record<string, unknown> {
  try {
    return JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
  } catch {
    return {};
  }
}
function decodeExp(token: string): number {
  return ((decodeJwt(token).exp as number) || 0) * 1000;
}

function restoreSession(): Session | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s?.access_token || !s?.refresh_token) return null;
    return s;
  } catch {
    return null;
  }
}
function persistSession(s: Session | null) {
  _session = s;
  if (!isBrowser()) return;
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {}
}
function sessionEmail(): string | null {
  if (_session?.email) return _session.email;
  if (_session?.access_token)
    return (decodeJwt(_session.access_token).email as string) || null;
  return null;
}

function ensureRestored() {
  if (_session === null) _session = restoreSession();
}

export async function sendOtp(email: string) {
  const r = await fetch(`${AUTH}/otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
    body: JSON.stringify({ email, create_user: true }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok)
    throw new Error(
      data.error_description || data.msg || data.error || "No se pudo enviar el código"
    );
  return data;
}

export async function verifyOtp(email: string, token: string) {
  const r = await fetch(`${AUTH}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
    body: JSON.stringify({ email, token: token.trim(), type: "email" }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.access_token) {
    throw new Error(
      data.error_description || data.msg || data.error || "Código inválido o expirado"
    );
  }
  persistSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: decodeExp(data.access_token),
    email: data.user?.email || email,
  });
  return data;
}

export function captureHashSession(): boolean {
  if (!isBrowser()) return false;
  try {
    if (!location.hash || location.hash.indexOf("access_token") === -1) return false;
    const p = new URLSearchParams(location.hash.slice(1));
    const access_token = p.get("access_token");
    const refresh_token = p.get("refresh_token");
    if (!access_token || !refresh_token) return false;
    persistSession({
      access_token,
      refresh_token,
      expires_at: decodeExp(access_token),
      email: null,
    });
    history.replaceState(null, "", location.pathname + location.search);
    return true;
  } catch {
    return false;
  }
}

async function refreshSession(): Promise<Session | null> {
  if (!_session?.refresh_token) return null;
  const r = await fetch(`${AUTH}/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
    body: JSON.stringify({ refresh_token: _session.refresh_token }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.access_token) {
    persistSession(null);
    return null;
  }
  persistSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: decodeExp(data.access_token),
    email: data.user?.email || _session.email,
  });
  return _session;
}

export async function ensureSession(): Promise<Session | null> {
  ensureRestored();
  if (!_session?.access_token) return null;
  const exp = _session.expires_at || decodeExp(_session.access_token);
  if (exp && Date.now() > exp - 60 * 1000) {
    return await refreshSession();
  }
  return _session;
}

export async function getTeamMember(): Promise<Member | null> {
  ensureRestored();
  if (!_session?.access_token) return null;
  const email = sessionEmail();
  if (!email) return null;
  if (!_session.email) {
    _session.email = email;
    persistSession(_session);
  }
  try {
    const r = await fetch(
      `${REST}/team_members?select=email,role,active&email=eq.${encodeURIComponent(
        email
      )}&active=eq.true`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${_session.access_token}`,
        },
      }
    );
    if (!r.ok) return null;
    const rows = await r.json();
    _member = rows[0]
      ? { email: rows[0].email, role: rows[0].role || "member" }
      : null;
    return _member;
  } catch {
    return null;
  }
}

export async function signOut() {
  ensureRestored();
  if (_session?.access_token) {
    await fetch(`${AUTH}/logout`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json",
        Authorization: `Bearer ${_session.access_token}`,
      },
    }).catch(() => {});
  }
  persistSession(null);
  _member = null;
}

export function getSession() {
  ensureRestored();
  return _session;
}
export function getMember() {
  return _member;
}

// Config para los módulos legacy (cedears.js / news.js) vía window.AmautaCedearsBridge
export const LEGACY_CONFIG = {
  SUPABASE_URL,
  SUPABASE_KEY,
  CATEGORY_ORDER: ["Equity US", "Renta Fija AR"],
};
