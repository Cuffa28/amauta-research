import { NextRequest, NextResponse } from "next/server";

// Destino público fijo; no reenvía cabeceras, cookies ni claves del cliente.
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") || "";
  if (!/^[a-z0-9][a-z0-9_]{0,100}$/.test(id)) {
    return NextResponse.json({ error: "Identificador de serie no válido." }, { status: 400 });
  }
  try {
    const response = await fetch(`https://monitorargy.com/api/v1/series/${encodeURIComponent(id)}`, {
      headers: { Accept: "application/json", "User-Agent": "AmautaResearch/1.0" },
      next: { revalidate: 10800 },
      signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) {
      const status = response.status === 404 ? 404 : response.status === 429 ? 429 : 502;
      return NextResponse.json({ error: status === 429 ? "La fuente alcanzó su límite. Reintentá en unos segundos." : "La fuente no devolvió una serie disponible." }, { status, headers: status === 429 ? { "Retry-After": "10" } : {} });
    }
    const data = await response.json();
    if (data.id !== id || !Array.isArray(data.puntos)) {
      return NextResponse.json({ error: "La respuesta no coincide con la serie solicitada." }, { status: 502 });
    }
    return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=10800, stale-while-revalidate=86400" } });
  } catch {
    return NextResponse.json({ error: "No se pudo consultar la historia. Se conservan los datos ya cargados." }, { status: 502 });
  }
}
