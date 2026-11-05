import React from "react";
import { Document, Page, Text, View, Image, Link, StyleSheet } from "@react-pdf/renderer";
import path from "node:path";
import { readFileSync } from "node:fs";

export type ResearchEdition = { market_date: string; title: string; summary: string; body: string; coverage: string; sources: { provider: string; title: string; url: string; observed_on: string; status: string }[] };
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
  footer: { position: "absolute", bottom: 24, left: 44, right: 44, fontSize: 7, color: "#68615F", flexDirection: "row", justifyContent: "space-between" },
});
function clean(text: string) {
  return text.replace(/!\[[^\]]*\]\([^)]*\)/g, "[Gráfico en el documento original]").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1");
}
export function ResearchPDF({ edition }: { edition: ResearchEdition }) {
  return <Document title={`Amauta Research ${edition.market_date}`} author="Facundo Argañaraz · Research & Strategy">
    <Page size="A4" style={s.page}>
      <View style={s.band}><Image src={{ data: readFileSync(path.join(process.cwd(), "public/assets/amauta-logo-horizontal.png")), format: "png" }} style={s.logo} /><Text style={s.label}>RESEARCH & STRATEGY · RUEDA DEL {edition.market_date}</Text></View>
      <Text style={s.title}>{edition.title}</Text><Text style={s.summary}>{edition.summary}</Text>
      <Text style={s.note}>{edition.coverage === "partial" ? "Cobertura parcial: consultar el detalle de fuentes y pendientes." : "Cobertura verificada."} Datos históricos de la rueda indicada; no son cotizaciones en vivo.</Text>
      {edition.body.split(/\n\s*\n/).filter(Boolean).map((block, i) => /^#{1,6}\s/.test(block) ? <Text key={i} style={s.heading} minPresenceAhead={45}>{clean(block.replace(/^#{1,6}\s/, ""))}</Text> : <Text key={i} style={s.text}>{clean(block)}</Text>)}
      <Text style={s.heading} minPresenceAhead={45}>Fuentes y cobertura</Text>
      {edition.sources.map((source, i) => <View key={i} style={s.text}><Text>{source.provider} · {source.title}</Text><Text style={s.note}>Datos al {source.observed_on} · {source.status === "read" ? "Documento leído" : "Lectura parcial o pendiente"}</Text>{/^https:\/\//.test(source.url) && <Link style={{ color: "#621044", fontSize: 8 }} src={source.url}>Abrir fuente original</Link>}</View>)}
      <View style={s.signature} wrap={false}><Text style={s.name}>Facundo Argañaraz</Text><Text>Research & Strategy · Amauta Inversiones Financieras</Text><Text style={s.note}>Preservamos su legado familiar</Text><Text style={s.note}>facundo@amautainversiones.com · amautainversiones.com</Text></View>
      <View fixed style={s.footer}><Text>Amauta Inversiones Financieras · CNV Mat. 1029 · Material informativo.</Text><Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} /></View>
    </Page>
  </Document>;
}
