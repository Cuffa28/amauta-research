/**
 * Supabase server-side client del MONITOR FCIs.
 *
 * OJO: FCIs usa un proyecto Supabase DISTINTO al del portal, así que las env
 * vars están namespaceadas con _FCI_ para no chocar con las del portal
 * (NEXT_PUBLIC_SUPABASE_URL del portal apunta a otro proyecto).
 *
 *   - publicClient(): publishable key (lectura, RLS). Server components fci_*.
 *   - adminClient():  service role (bypass RLS). Solo en crons/route handlers.
 *
 * Validación lazy (dentro de cada función) para no romper el build cuando
 * faltan env vars al "collect page data".
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const FCI_URL = process.env.NEXT_PUBLIC_FCI_SUPABASE_URL;

export function publicClient() {
  const url = FCI_URL;
  const key = process.env.NEXT_PUBLIC_FCI_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_FCI_SUPABASE_URL / NEXT_PUBLIC_FCI_SUPABASE_PUBLISHABLE_KEY env vars",
    );
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false },
  });
}

export function adminClient() {
  const url = FCI_URL;
  const key = process.env.FCI_SUPABASE_SERVICE_ROLE_KEY;
  if (!url) {
    throw new Error(
      "Missing NEXT_PUBLIC_FCI_SUPABASE_URL — cannot create admin client",
    );
  }
  if (!key) {
    throw new Error(
      "Missing FCI_SUPABASE_SERVICE_ROLE_KEY — admin operations cannot run",
    );
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
