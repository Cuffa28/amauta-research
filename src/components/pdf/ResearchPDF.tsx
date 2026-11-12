import React from "react";
import { Document, Page, Text, View, Image, StyleSheet, Svg, Polyline, Line, Circle, Link } from "@react-pdf/renderer";
import path from "node:path";
import { readFileSync } from "node:fs";
import { getBriefing, numberLabel, plotPoints, shortDate, validCharts, type ResearchEdition, type ResearchChart, type MacroSeries } from "../../lib/research-briefing";
export type { ResearchEdition } from "../../lib/research-briefing";
const s = StyleSheet.create({
 page:{padding:32,paddingBottom:43,fontFamily:"Helvetica",fontSize:9,lineHeight:1.4,color:"#231F20",backgroundColor:"#FFFFFF"},
 band:{borderBottomWidth:3,borderBottomColor:"#F3CF11",paddingBottom:9,marginBottom:14,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
 logo:{width:145,height:35,objectFit:"contain"},label:{fontSize:8,color:"#621044",letterSpacing:1},
 title:{fontSize:25,lineHeight:1.15,fontFamily:"Helvetica-Bold",marginBottom:8},sub:{color:"#70686C",fontSize:8,marginBottom:10},
 lead:{fontSize:11,color:"#621044",marginBottom:14},row:{flexDirection:"row",gap:10,marginBottom:12},
 metric:{flex:1,borderWidth:1,borderColor:"#E9E4E6",borderTopWidth:3,borderTopColor:"#F3CF11",padding:11,borderRadius:7},
 metricLabel:{fontSize:8,color:"#70686C"},value:{fontSize:21,lineHeight:1.3,fontFamily:"Helvetica-Bold",marginTop:5,marginBottom:9},context:{fontSize:7,color:"#70686C"},
 card:{padding:11,backgroundColor:"#FAF8F9",borderRadius:7,marginBottom:8},heading:{fontSize:12,fontFamily:"Helvetica-Bold",marginBottom:5,color:"#621044"},
 text:{fontSize:9,lineHeight:1.45},attribution:{fontSize:7,color:"#70686C",marginTop:7},
 figure:{borderWidth:1,borderColor:"#E9E4E6",padding:9,borderRadius:7,marginTop:8,marginBottom:10},
 chart:{width:460,objectFit:"contain",alignSelf:"center"},caption:{fontSize:7,color:"#70686C",marginTop:5},
 macro:{borderWidth:1,borderColor:"#E9E4E6",borderRadius:7,padding:9,marginBottom:9},macroValue:{fontFamily:"Helvetica-Bold",fontSize:15,lineHeight:1.2,marginBottom:6},
 range:{flexDirection:"row",justifyContent:"space-between",fontSize:7,color:"#70686C"},
 footer:{position:"absolute",bottom:20,left:32,right:32,flexDirection:"row",justifyContent:"space-between",fontSize:7,color:"#70686C"},
 signature:{borderTopWidth:1,borderTopColor:"#F3CF11",marginTop:9,paddingTop:8,fontSize:8},name:{fontSize:11,fontFamily:"Helvetica-Bold"},
});
function Header({edition,label}:{edition:ResearchEdition;label:string}) {return <View style={s.band}><Image src={{data:readFileSync(path.join(process.cwd(),"public/assets/amauta-logo-horizontal.png")),format:"png"}} style={s.logo}/><View><Text style={s.label}>RESEARCH & STRATEGY</Text><Text style={s.sub}>Rueda {shortDate(edition.market_date)} · {label}</Text></View></View>}
function Footer(){return <Text style={{marginTop:8,fontSize:7,color:"#70686C"}}>Amauta Inversiones Financieras · Facundo Argañaraz · Research & Strategy</Text>;}
function Figure({chart}:{chart:ResearchChart}){return <View style={s.figure} wrap={false}><Image src={{data:Buffer.from(chart.image.split(",")[1],"base64"),format:"png"}} style={[s.chart,{height:Math.min(215,460*chart.height/chart.width)}]}/><Text style={s.caption}>{chart.caption}</Text><Link src={chart.source} style={s.caption}>Documento original · {chart.date} · p. {chart.page}</Link></View>}
function MacroFigure({series}:{series:MacroSeries}){
 const last=series.points[series.points.length-1];if(!last)return null;
 const coords=plotPoints(series.points,460,65,10),values=series.points.map(p=>p.value);
 return <View style={s.macro} wrap={false}><Text style={s.heading}>{series.name}</Text><Text style={s.macroValue}>{numberLabel(last.value)} {series.unit}</Text><Text style={s.context}>Dato observado: {shortDate(last.date)} · {series.derived?"Cálculo Amauta con INDEC":series.provider}{series.retained?" · serie retenida":""}</Text>
 {coords.length>1&&<Svg width={460} height={65} viewBox="0 0 460 65"><Line x1="10" y1="55" x2="450" y2="55" stroke="#E9E4E6"/><Polyline points={coords.map(p=>`${p.x},${p.y}`).join(" ")} fill="none" stroke="#621044" strokeWidth={2}/><Circle cx={coords[coords.length-1].x} cy={coords[coords.length-1].y} r={3} fill="#F3CF11" stroke="#621044"/></Svg>}
 <View style={s.range}><Text>{shortDate(series.points[0].date)}</Text><Text>Rango: {numberLabel(Math.min(...values))} a {numberLabel(Math.max(...values))}</Text><Text>{shortDate(last.date)}</Text></View>
 {series.derived&&<Text style={s.caption}>{series.note.replace(/−/g,"-")}</Text>}<Link src={series.sourceUrl} style={s.caption}>{series.provider} · consulta {shortDate(series.retrievedAt)}</Link></View>;
}
export function ResearchPDF({edition}:{edition:ResearchEdition}) {
 const brief=getBriefing(edition),charts=validCharts(edition.charts),split=Math.ceil(charts.length/2);
 const cutoff=brief.cutoff?new Date(brief.cutoff).toLocaleString("es-AR",{timeZone:"America/Argentina/Buenos_Aires",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):null;
 return <Document title={`Amauta Research ${edition.market_date}`} author="Facundo Argañaraz · Research & Strategy">
 <Page size="A4" style={s.page}><Header edition={edition} label="EL CIERRE ANTERIOR"/><Text style={s.title}>Qué pasó ayer</Text><Text style={s.sub}>{edition.title}{cutoff?` · Corte ${cutoff} ART`:""}</Text><Text style={s.lead}>{brief.intro}</Text>
 {brief.metrics.length>0&&<View style={s.row}>{brief.metrics.slice(0,3).map(m=><View key={m.label} style={s.metric} wrap={false}><Text style={s.metricLabel}>{m.label}</Text><Text style={s.value}>{m.value}</Text><Text style={s.context}>{m.context}</Text></View>)}</View>}
 <View style={brief.yesterday.length<=2?s.row:{}}>{brief.yesterday.map((c,i)=><View key={i} style={brief.yesterday.length<=2?[s.card,{width:"49%"}]:s.card} wrap={false}><Text style={s.label}>{c.label||"CIERRE ANTERIOR"}</Text><Text style={s.heading}>{c.title}</Text><Text style={s.text}>{c.text}</Text>{c.attribution&&<Text style={s.attribution}>{c.attribution}</Text>}</View>)}</View>
 {charts.slice(0,split).map(c=><Figure key={c.id} chart={c}/>)}{Footer()}</Page>
 <Page size="A4" style={s.page}><Header edition={edition} label="AGENDA DE LA EDICIÓN"/><Text style={s.title}>Qué se espera para hoy</Text><Text style={s.sub}>Agenda y expectativas al corte del informe. No son resultados observados.</Text>
 {brief.today.map((c,i)=><View key={i} style={s.card} wrap={false}><Text style={s.label}>{c.date?`${shortDate(c.date)} · `:""}{c.label||"AGENDA"}</Text><Text style={s.heading}>{c.title}</Text><Text style={s.text}>{c.text}</Text>{c.attribution&&<Text style={s.attribution}>{c.attribution}</Text>}</View>)}
 {!brief.today.length&&<Text>No se registró una agenda separada en esta edición. Consultá el análisis completo en la web.</Text>}
 {charts.slice(split).map(c=><Figure key={c.id} chart={c}/>)}<Link src="https://amauta-research.vercel.app/research" style={s.caption}>Análisis completo y archivo de ediciones en Research privado </Link>{Footer()}</Page>
 {edition.macro?.series.length ? <Page size="A4" style={s.page}><Header edition={edition} label="MACRO LAB"/><Text style={s.title}>El contexto en gráficos</Text><Text style={s.sub}>Snapshot disponible al publicar: {shortDate(edition.macro.generatedAt)}. Cada serie conserva su fecha observada. No son cotizaciones en vivo.</Text>
 {edition.macro.series.map(series=><MacroFigure key={series.id} series={series}/>)}{edition.macro.failures.length>0&&<Text style={s.caption}>El snapshot registra descargas fallidas; las series retenidas están identificadas.</Text>}
 <View style={s.signature} wrap={false}><Text style={s.name}>Facundo Argañaraz</Text><Text>Research & Strategy · Amauta Inversiones Financieras</Text><Text>Preservamos su legado familiar</Text></View>{Footer()}</Page>:null}
 </Document>;
}
