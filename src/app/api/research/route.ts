import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import type { ResearchEdition } from "@/lib/research-briefing";
import { macroAtPublication } from "@/lib/research-macro";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", Vary: "Authorization" };

export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) return NextResponse.json({ error: "Iniciá sesión para consultar research." }, { status: 401, headers });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ error: "La conexión del portal no está configurada." }, { status: 503, headers });
  try {
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: auth, error: authError } = await db.auth.getUser(token);
    if (authError || !auth.user?.email) return NextResponse.json({ error: "La sesión venció. Ingresá nuevamente." }, { status: 401, headers });
    if (auth.user.email.toLowerCase() !== "facundo@amautainversiones.com") return NextResponse.json({ error: "Esta sección es de acceso personal." }, { status: 403, headers });
    const { data: member, error: memberError } = await db.from("team_members").select("email").eq("email", auth.user.email.toLowerCase()).eq("active", true).maybeSingle();
    if (memberError || !member) return NextResponse.json({ error: "Tu usuario no tiene acceso al research del equipo." }, { status: 403, headers });
    const editionId = request.nextUrl.searchParams.get("id");
    if (editionId && !/^[0-9a-f-]{36}$/i.test(editionId)) return NextResponse.json({ error: "Edición no válida." }, { status: 400, headers });
    let query = db.from("research_daily_editions").select("id,market_date,published_at,title,summary,body,coverage,sources" + (editionId ? ",charts,briefing" : "")).eq("status", "published").lte("published_at", new Date().toISOString());
    if (editionId) query = query.eq("id", editionId);
    const { data, error } = await query.order("market_date", { ascending: false }).limit(editionId ? 1 : 120);
    if (error) return NextResponse.json({ error: "El archivo de research aún no está disponible. La integración está pendiente de verificación." }, { status: 503, headers });
    return NextResponse.json({ editions: editionId ? ((data || []) as unknown as ResearchEdition[]).map(edition => ({ ...edition, macro: macroAtPublication(edition.published_at) })) : data }, { headers });
  } catch {
    return NextResponse.json({ error: "No se pudo consultar el archivo. Reintentá en unos minutos." }, { status: 503, headers });
  }
}
