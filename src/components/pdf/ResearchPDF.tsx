import React from "react";
import { Document, Page, Text, View, Image, StyleSheet, Svg, Polyline, Circle, Link } from "@react-pdf/renderer";
import path from "node:path";
import { readFileSync } from "node:fs";
import { dateTimeART, editionDate, getBriefing, numberLabel, plotPoints, shortDate, validCharts, type ResearchEdition, type ResearchChart, type MacroSeries } from "../../lib/research-briefing";
import { pdfText, pdfParagraph, pdfSections } from "../../lib/research-pdf-layout";
export type { ResearchEdition } from "../../lib/research-briefing";
const s=StyleSheet.create({
 page:{paddingTop:88,paddingHorizontal:32,paddingBottom:47,fontFamily:"Helvetica",fontSize:9,lineHeight:1.4,color:"#231F20",backgroundColor:"#FFFFFF"},
 header:{position:"absolute",top:24,left:32,right:32,borderBottomWidth:3,borderBottomColor:"#F3CF11",paddingBottom:8,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
 logo:{width:145,height:33},label:{fontSize:7,color:"#621044",letterSpacing:0.7},
 title:{fontSize:23,lineHeight:1.12,fontFamily:"Helvetica-Bold",marginBottom:7},sub:{color:"#70686C",fontSize:7.5,marginBottom:8},
 lead:{fontSize:10.5,color:"#621044",marginBottom:11},row:{flexDirection:"row",gap:7,marginBottom:10},
 metric:{flex:1,borderWidth:1,borderColor:"#E9E4E6",borderTopWidth:3,borderTopColor:"#F3CF11",padding:8,borderRadius:6},
 value:{fontSize:16,lineHeight:1.2,fontFamily:"Helvetica-Bold",marginTop:5,marginBottom:6},context:{fontSize:7,color:"#70686C"},
 cards:{flexDirection:"row",flexWrap:"wrap",columnGap:8},card:{width:"49%",padding:9,backgroundColor:"#FAF8F9",borderRadius:6,marginBottom:8},
 heading:{fontSize:12,fontFamily:"Helvetica-Bold",marginTop:9,marginBottom:5,color:"#621044"},cardTitle:{fontSize:10,fontFamily:"Helvetica-Bold",marginBottom:4,color:"#621044"},
 paragraph:{fontSize:8.7,lineHeight:1.35,marginBottom:6},cardText:{fontSize:8.5,lineHeight:1.35},attribution:{fontSize:7,color:"#70686C",marginTop:5},
 figure:{borderWidth:1,borderColor:"#E9E4E6",padding:9,marginTop:5,marginBottom:9},chart:{width:495,alignSelf:"center"},caption:{fontSize:7,color:"#70686C",marginTop:4},
 macro:{borderWidth:1,borderColor:"#E9E4E6",borderRadius:6,padding:9,marginBottom:8},macroValue:{fontFamily:"Helvetica-Bold",fontSize:14,lineHeight:1.2,marginBottom:4},range:{flexDirection:"row",justifyContent:"space-between",fontSize:7,color:"#70686C"},
 footer:{position:"absolute",bottom:22,left:32,right:32,height:12,fontSize:7,color:"#70686C",flexDirection:"row",justifyContent:"space-between"},signature:{borderTopWidth:1,borderTopColor:"#F3CF11",marginTop:8,paddingTop:7,fontSize:8},name:{fontSize:11,fontFamily:"Helvetica-Bold"}
});
function Figure({chart}:{chart:ResearchChart}) {
 const height=Math.min(chart.height>chart.width?410:320,495*chart.height/chart.width);
 return <View style={s.figure} wrap={false}><Text style={s.label}>{pdfText(chart.title)}</Text><Image src={{data:Buffer.from(chart.image.split(",")[1],"base64"),format:"png"}} style={[s.chart,{height,width:height*chart.width/chart.height}]}/><Text style={s.caption}>{pdfText(chart.caption)}</Text><Link src={chart.source} style={s.caption}>Original · {chart.date}{chart.page?` · p. ${chart.page}`:""}</Link></View>;
}
function MacroFigure({series}:{series:MacroSeries}) {
 const last=series.points[series.points.length-1];if(!last)return null;
 const coords=plotPoints(series.points,235,55,8),values=series.points.map(p=>p.value),end=coords[coords.length-1];
 return <View style={[s.macro,{width:"49%"}]} wrap={false}><Text style={s.cardTitle}>{pdfText(series.name)}</Text><Text style={s.macroValue}>{pdfText(numberLabel(last.value)+" "+series.unit)}</Text><Text style={s.context}>Dato: {shortDate(last.date)} · {pdfText(series.derived?"Cálculo Amauta con INDEC":series.provider)}{series.retained?" · serie retenida":""}</Text>
 {coords.length>1&&<Svg width={235} height={55} viewBox="0 0 235 55"><Polyline points={coords.map(p=>`${p.x},${p.y}`).join(" ")} fill="none" stroke="#621044" strokeWidth={2}/><Circle cx={end.x} cy={end.y} r={3} fill="#F3CF11" stroke="#621044"/></Svg>}
 <View style={s.range}><Text>{shortDate(series.points[0].date)}</Text><Text>{shortDate(last.date)}</Text></View><Text style={s.context}>Mínimo: {pdfText(numberLabel(Math.min(...values)))} · Máximo: {pdfText(numberLabel(Math.max(...values)))}</Text>
 {series.derived&&<Text style={s.caption}>{pdfText(series.note)}</Text>}<Link src={series.sourceUrl} style={s.caption}>{pdfText(series.provider)} · consulta {dateTimeART(series.retrievedAt)} ART</Link></View>;
}
export function ResearchPDF({edition}:{edition:ResearchEdition}) {
 const brief=getBriefing(edition),charts=validCharts(edition.charts),sections=pdfSections(edition.body),matched=new Set(sections.map(s=>s.title));
 return <Document title={`Amauta Research ${editionDate(edition)}`} author="Facundo Argañaraz · Research & Strategy"><Page size="A4" style={s.page} wrap>
 <View fixed style={s.header}><Image src={{data:readFileSync(path.join(process.cwd(),"public/assets/amauta-logo-horizontal.png")),format:"png"}} style={s.logo}/><View><Text style={s.label}>FACUNDO ARGAÑARAZ · RESEARCH & STRATEGY</Text><Text style={s.sub}>Edición {shortDate(editionDate(edition))} · Rueda {shortDate(edition.market_date)}</Text></View></View>
 <Text fixed style={{position:"absolute",bottom:20,left:32,right:32,fontSize:7,color:"#70686C"}} render={({pageNumber,totalPages})=>`Facundo Argañaraz · Research & Strategy · Amauta Inversiones Financieras                         ${pageNumber} / ${totalPages}`}/>
 <Text style={s.title}>Qué pasó y qué mirar</Text><Text style={s.sub}>{pdfText(edition.title)}{brief.cutoff?` · Corte ${dateTimeART(brief.cutoff)} ART`:""}</Text><Text style={s.lead}>{pdfText(brief.intro)}</Text>
 {brief.metrics.length>0&&<View style={s.row}>{brief.metrics.slice(0,4).map(m=><View key={m.label} style={s.metric} wrap={false}><Text style={s.context}>{pdfText(m.label)}</Text><Text style={s.value}>{pdfText(m.value)}</Text><Text style={s.context}>{pdfText(m.context)}</Text></View>)}</View>}
 <Text style={s.heading} minPresenceAhead={70}>Agenda · {shortDate(editionDate(edition))}</Text>
 <View style={s.cards}>{brief.today.map((c,i)=><View key={i} style={s.card} wrap={false}><Text style={s.label}>{c.date?shortDate(c.date)+" · ":""}{pdfText(c.label||"QUÉ MIRAR")}</Text><Text style={s.cardTitle}>{pdfText(c.title)}</Text><Text style={s.cardText}>{pdfText(c.text)}</Text>{c.attribution&&<Text style={s.attribution}>{pdfText(c.attribution)}</Text>}</View>)}</View>
 {sections.map((section,i)=><React.Fragment key={i}>{charts.filter(c=>c.section===section.title&&c.height>c.width).map(c=><Figure key={c.id} chart={c}/>)}{section.title&&<Text style={s.heading} minPresenceAhead={40}>{pdfText(section.title)}</Text>}{section.paragraphs.map((paragraph,j)=><Text key={j} style={s.paragraph} orphans={3} widows={3}>{pdfParagraph(paragraph)}</Text>)}{charts.filter(c=>c.section===section.title&&c.height<=c.width).map(c=><Figure key={c.id} chart={c}/>)}</React.Fragment>)}
 {charts.filter(c=>!matched.has(c.section)).map(c=><Figure key={c.id} chart={c}/>)}
 {edition.macro?.series.length ? <><Text style={s.heading} minPresenceAhead={140}>Macro Lab · contexto con fecha</Text><Text style={s.sub}>Snapshot disponible al publicar: {dateTimeART(edition.macro.generatedAt)} ART. Cada serie conserva su fecha observada; no son cotizaciones en vivo.</Text><View style={s.cards}>{edition.macro.series.map(series=><MacroFigure key={series.id} series={series}/>)}</View>{edition.macro.failures.length>0&&<Text style={s.caption}>Las series retenidas conservan su fecha y están identificadas.</Text>}</>:null}
 </Page></Document>;
}



