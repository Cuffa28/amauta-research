import { NextRequest, NextResponse } from "next/server";
import { researchClient, privateResearchHeaders as headers } from "@/lib/research-server";

import type { ResearchEdition } from "@/lib/research-briefing";
import { macroAtPublication } from "@/lib/research-macro";


export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const access = await researchClient(request);
    if (!access.ok) return access.response;
    const db = access.db;
    const editionId = request.nextUrl.searchParams.get("id");
    if (editionId && !/^[0-9a-f-]{36}$/i.test(editionId)) return NextResponse.json({ error: "Edición no válida." }, { status: 400, headers });
    let query = db.from("research_daily_editions").select("id,market_date,published_at,title,summary,body,coverage,sources" + (editionId ? ",charts,briefing" : "")).eq("status", "published").lte("published_at", new Date().toISOString());

    const { data, error } = await query.order("market_date", { ascending: false }).limit(1);
    if (error) return NextResponse.json({ error: "El archivo de research aún no está disponible. La integración está pendiente de verificación." }, { status: 503, headers });
    if (editionId && (!data?.[0] || (data[0] as unknown as ResearchEdition).id !== editionId)) return NextResponse.json({ error: "La edición ya fue reemplazada por una más reciente." }, { status: 404, headers });
    return NextResponse.json({ editions: editionId ? ((data || []) as unknown as ResearchEdition[]).map(edition => ({ ...edition, macro: macroAtPublication(edition.published_at) })) : data }, { headers });
  } catch {
    return NextResponse.json({ error: "No se pudo consultar el archivo. Reintentá en unos minutos." }, { status: 503, headers });
  }
}
