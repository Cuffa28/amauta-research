import React from "react";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import path from "node:path";
import { readFileSync } from "node:fs";

type Chart = { id: string; section: string; title: string; caption: string; source: string; date: string; page: number; image: string; width: number; height: number };
export type ResearchEdition = { market_date: string; title: string; summary: string; body: string; coverage: string; charts?: Chart[]; sources: { provider: string; title: string; url: string; observed_on: string; status: string }[] };
const s = StyleSheet.create({
  page: { padding: 40, paddingBottom: 52, fontFamily: "Helvetica", fontSize: 9.5, lineHeight: 1.4, color: "#231F20", backgroundColor: "#FFFFFF" },
  logo: { width: 175, height: 48, objectFit: "contain", marginBottom: 15 },
  band: { borderBottomWidth: 3, borderBottomColor: "#F3CF11", paddingBottom: 12, marginBottom: 20 },
  label: { color: "#621044", fontSize: 9, letterSpacing: 1.5 },
  title: { fontSize: 25, lineHeight: 1.15, fontFamily: "Helvetica-Bold", marginBottom: 14 },
  summary: { fontSize: 12, color: "#621044", borderLeftWidth: 3, borderLeftColor: "#F3CF11", paddingLeft: 12, marginBottom: 15 },
  heading: { fontSize: 15, color: "#621044", fontFamily: "Helvetica-Bold", marginTop: 14, marginBottom: 6 },
  text: { marginBottom: 6 },
  note: { color: "#68615F", fontSize: 8, marginBottom: 5 },
  signature: { borderTopWidth: 1, borderTopColor: "#F3CF11", marginTop: 16, paddingTop: 12 },
  name: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  figure: { marginTop: 8, marginBottom: 13, padding: 10, borderWidth: 1, borderColor: "#E8E3D8" },
  chart: { width: 410, objectFit: "contain", alignSelf: "center" },
  caption: { fontSize: 8, color: "#68615F", marginTop: 5 },
  footer: { position: "absolute", bottom: 24, left: 44, right: 44, fontSize: 7, color: "#68615F", flexDirection: "row", justifyContent: "space-between" },
});
function clean(text: string) {
  return text.replace(/!\[[^\]]*\]\([^)]*\)/g, "[Gráfico en el documento original]").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1");
}
export function ResearchPDF({ edition }: { edition: ResearchEdition }) {
  const sections: { title: string; blocks: string[] }[] = [{ title: "", blocks: [] }];
  for (const block of edition.body.split(/\n\s*\n/).filter(Boolean)) {
    if (block.startsWith("Edición inicial cargada manualmente")) continue;
    if (/^#{1,6}\s/.test(block)) sections.push({ title: clean(block.replace(/^#{1,6}\s/, "")), blocks: [] });
    else sections[sections.length - 1].blocks.push(block);
  }
  const charts = (edition.charts || []).filter(c => /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(c.image) && c.image.length < 2_000_000 && c.width > 0 && c.height > 0).slice(0, 8);
  return <Document title={`Amauta Research ${edition.market_date}`} author="Facundo Argañaraz · Research & Strategy">
    <Page size="A4" style={s.page}>
      <View style={s.band}><Image src={{ data: readFileSync(path.join(process.cwd(), "public/assets/amauta-logo-horizontal.png")), format: "png" }} style={s.logo} /><Text style={s.label}>RESEARCH & STRATEGY · RUEDA DEL {edition.market_date}</Text></View>
      <Text style={s.title}>{edition.title}</Text><Text style={s.summary}>{edition.summary.replace(" Primera edición con cobertura parcial.", "")}</Text>
      <Text style={s.note}>Datos históricos de la rueda indicada; no son cotizaciones en vivo.</Text>
      {sections.filter(section => !/fuentes|cobertura/i.test(section.title)).map((section, i) => <React.Fragment key={i}>
        {section.title && <Text style={s.heading} minPresenceAhead={45}>{section.title}</Text>}
        {section.blocks.map((block, j) => <Text key={j} style={s.text}>{clean(block)}</Text>)}
        {charts.filter(c => c.section === section.title).map(chart => <View key={chart.id} wrap={false} style={s.figure}>
          <Image src={{ data: Buffer.from(chart.image.split(",")[1], "base64"), format: "png" }} style={[s.chart, { height: Math.min(190, 410 * chart.height / chart.width) }]} />
          <Text style={s.caption}>{chart.caption}</Text><Text style={s.caption}>{chart.source} · {chart.date} · p. {chart.page}</Text>
        </View>)}
      </React.Fragment>)}
      <View style={s.signature} wrap={false}><Text style={s.name}>Facundo Argañaraz</Text><Text>Research & Strategy · Amauta Inversiones Financieras</Text><Text style={s.note}>Preservamos su legado familiar</Text><Text style={s.note}>facundo@amautainversiones.com · amautainversiones.com</Text></View>
      <View fixed style={s.footer}><Text>Amauta Inversiones Financieras · CNV Mat. 1029 · Material informativo.</Text><Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} /></View>
    </Page>
  </Document>;
}
