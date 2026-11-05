import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { ResearchPDF, type ResearchEdition } from "@/components/pdf/ResearchPDF";
import { GET as getResearch } from "../route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const headers = { "Cache-Control": "private, no-store", Vary: "Authorization" };
export async function GET(request: NextRequest) {
  const response = await getResearch(request);
  if (!response.ok) return response;
  const id = request.nextUrl.searchParams.get("id");
  const { editions } = await response.json();
  const edition = editions.find((item: ResearchEdition & { id: string }) => item.id === id);
  if (!edition) return NextResponse.json({ error: "La edición no está disponible." }, { status: 404, headers });
  try {
    const buffer = await renderToBuffer(ResearchPDF({ edition }));
    return new NextResponse(new Uint8Array(buffer), { headers: { ...headers, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="Amauta_Research_${edition.market_date}.pdf"` } });
  } catch {
    return NextResponse.json({ error: "No se pudo generar el PDF. Reintentá en unos minutos." }, { status: 500, headers });
  }
}
