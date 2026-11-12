export type ResearchChart = { id: string; section: string; title: string; caption: string; source: string; date: string; page: number; image: string; width: number; height: number };
export type BriefCard = { title: string; text: string; attribution?: string; date?: string; label?: string };
export type Briefing = { version: 1; cutoff?: string; intro: string; metrics: { label: string; value: string; context: string }[]; yesterday: BriefCard[]; today: BriefCard[] };
export type MacroSeries = { id: string; name: string; unit: string; provider: string; sourceUrl: string; retrievedAt: string; note: string; derived: boolean; retained: boolean; points: { date: string; value: number }[] };
export type MacroContext = { generatedAt: string; source: string; failures: string[]; series: MacroSeries[] };
export type ResearchEdition = { id?: string; market_date: string; published_at?: string; title: string; summary: string; body: string; coverage: string; sources: { title: string; provider: string; url: string; observed_on: string; status: string }[]; charts?: ResearchChart[]; briefing?: Briefing | null; macro?: MacroContext | null };

export function cleanResearch(text: string) {
  return text.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1");
}
export function researchSections(body: string) {
  const sections: { title: string; blocks: string[] }[] = [{ title: "En una mirada", blocks: [] }];
  for (const block of body.split(/\n\s*\n/).filter(Boolean)) {
    if (block.startsWith("Edición inicial cargada manualmente")) continue;
    if (/^#{1,6}\s/.test(block)) sections.push({ title: cleanResearch(block.replace(/^#{1,6}\s/, "")), blocks: [] });
    else sections[sections.length - 1].blocks.push(block);
  }
  return sections.filter(s => !/fuentes|cobertura/i.test(s.title));
}
export function getBriefing(edition: ResearchEdition): Briefing {
  if (edition.briefing?.version === 1 && Array.isArray(edition.briefing.yesterday) && Array.isArray(edition.briefing.today) && Array.isArray(edition.briefing.metrics) && typeof edition.briefing.intro === "string") return edition.briefing;
  const sections = researchSections(edition.body);
  // Older editions retain their actual paragraphs, without synthesizing numbers or forecasts.
  return { version: 1, intro: cleanResearch(edition.summary), metrics: [],
    yesterday: sections.filter(s => !/agenda|qué mirar|que mirar/i.test(s.title)).slice(0, 4).map(s => ({ title: s.title, text: cleanResearch(s.blocks[0] || "") })),
    today: sections.filter(s => /agenda|qué mirar|que mirar/i.test(s.title)).flatMap(s => s.blocks.map(text => ({ title: s.title, text: cleanResearch(text) }))) };
}
export function validCharts(charts: ResearchChart[] = []) {
  return charts.filter(c => /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(c.image) && c.image.length < 2_000_000 && c.width > 0 && c.height > 0).slice(0, 8);
}
export function numberLabel(value: number) { return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 4 }).format(value); }
export function shortDate(value: string) { return value.slice(0, 10).split("-").reverse().join("/"); }
export function plotPoints(points: MacroSeries["points"], width = 500, height = 140, pad = 16) {
  if (points.length < 2) return [];
  const values = points.map(p => p.value), min = Math.min(...values), max = Math.max(...values);
  const first = Date.parse(points[0].date), span = Date.parse(points[points.length - 1].date) - first;
  return points.map((p, i) => ({ x: pad + (span ? (Date.parse(p.date) - first) / span : i / (points.length - 1)) * (width - 2 * pad), y: height - pad - ((p.value - min) / (max - min || 1)) * (height - 2 * pad) }));
}
