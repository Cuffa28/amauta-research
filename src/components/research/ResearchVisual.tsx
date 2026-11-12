"use client";
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { dateTimeART, getBriefing, numberLabel, plotPoints, researchSections, shortDate, validCharts, type MacroSeries, type ResearchChart, type ResearchEdition } from "@/lib/research-briefing";
import styles from "./research.module.css";

function MacroChart({ series }: { series: MacroSeries }) {
  const points = series.points, last = points[points.length - 1];
  const coordinates = plotPoints(points), values = points.map(p => p.value);
  if (!last) return null;
  return <section className={styles.macroCard}>
    <span className={styles.eyebrow}>{series.derived ? "CÁLCULO AMAUTA CON INDEC" : series.provider}</span>
    <h3>{series.name}</h3><strong className={styles.macroValue}>{numberLabel(last.value)} <small>{series.unit}</small></strong>
    <p className={styles.caption}>Último dato: {shortDate(last.date)}{series.id === "ipc" ? " · período mensual" : ""}{series.retained ? " · serie retenida de una descarga anterior" : ""}</p>
    {coordinates.length > 1 && <svg viewBox="0 0 500 170" role="img" aria-label={`${series.name}. ${series.unit}. Desde ${shortDate(points[0].date)} hasta ${shortDate(last.date)}. Mínimo ${numberLabel(Math.min(...values))}, máximo ${numberLabel(Math.max(...values))}.`}>
      <text x="16" y="12" fill="#70686c" fontSize="11">{numberLabel(Math.max(...values))}</text>
      <line x1="16" y1="124" x2="484" y2="124" stroke="#e9e4e6" />
      <polyline points={coordinates.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#621044" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx={coordinates[coordinates.length - 1].x} cy={coordinates[coordinates.length - 1].y} r="4" fill="#f3cf11" stroke="#621044" />
      <text x="16" y="150" fill="#70686c" fontSize="11">{numberLabel(Math.min(...values))}</text>
      <text x="16" y="168" fill="#70686c" fontSize="11">{shortDate(points[0].date)}</text><text x="484" y="168" textAnchor="end" fill="#70686c" fontSize="11">{shortDate(last.date)}</text>
    </svg>}
    <details><summary>Ver datos y metodología</summary><p>{series.note}</p><p>Consulta de la serie: {dateTimeART(series.retrievedAt)} ART.</p><a href={series.sourceUrl} target="_blank" rel="noopener noreferrer">Fuente original ↗</a><div className={styles.dataScroll}><table><caption>{series.name} · {series.unit}</caption><thead><tr><th>Fecha observada</th><th>Valor</th></tr></thead><tbody>{points.map(p => <tr key={p.date}><td>{shortDate(p.date)}</td><td>{numberLabel(p.value)}</td></tr>)}</tbody></table></div></details>
  </section>;
}

export default function ResearchVisual({ edition }: { edition: ResearchEdition }) {
  const [tab, setTab] = useState(0);
  const [expanded, setExpanded] = useState<ResearchChart | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const briefing = getBriefing(edition), charts = validCharts(edition.charts);
  const tabs = ["Qué pasó ayer", "Qué mirar hoy", "Informe completo"];
  function openChart(chart: ResearchChart) { setExpanded(chart); dialog.current?.showModal(); }
  return <>
    <div className={styles.tabs} role="tablist" aria-label="Vistas del informe">{tabs.map((label, i) => <button key={label} id={`research-tab-${i}`} role="tab" aria-selected={tab === i} aria-controls={`research-panel-${i}`} tabIndex={tab === i ? 0 : -1} onClick={() => setTab(i)} onKeyDown={e => {
      const next = e.key === "ArrowRight" ? (i + 1) % 3 : e.key === "ArrowLeft" ? (i + 2) % 3 : e.key === "Home" ? 0 : e.key === "End" ? 2 : null;
      if (next !== null) { e.preventDefault(); setTab(next); document.getElementById(`research-tab-${next}`)?.focus(); }
    }}>{label}</button>)}</div>
    <section id="research-panel-0" role="tabpanel" aria-labelledby="research-tab-0" hidden={tab !== 0}>
      <p className={styles.signal}>{briefing.intro}</p>
      {briefing.metrics.length > 0 && <div className={styles.metrics}>{briefing.metrics.map(m => <div className={styles.metric} key={m.label}><span>{m.label}</span><strong>{m.value}</strong><small>{m.context}</small></div>)}</div>}
      <div className={styles.topicGrid}>{briefing.yesterday.map((card, i) => <section className={styles.topic} key={i}><span className={styles.eyebrow}>{card.label || "CIERRE ANTERIOR"}</span><h3>{card.title}</h3><p>{card.text}</p>{card.attribution && <small>{card.attribution}</small>}</section>)}</div>
      {charts.length > 0 && <><h2 className={styles.sectionTitle}>Gráficos para entender el contexto</h2><div className={styles.chartGrid}>{charts.map(c => <figure className={styles.chartCard} key={c.id}><button aria-label={`Ampliar: ${c.title}`} onClick={() => openChart(c)}><img src={c.image} alt={c.title} width={c.width} height={c.height} /><span>Ampliar gráfico ↗</span></button><figcaption>{c.caption} <a href={c.source} target="_blank" rel="noopener noreferrer">Original · {c.date} · p. {c.page} ↗</a></figcaption></figure>)}</div></>}
    </section>
    <section id="research-panel-1" role="tabpanel" aria-labelledby="research-tab-1" hidden={tab !== 1}>
      <h2 className={styles.sectionTitle}>Qué se espera para esta edición</h2><p className={styles.caption}>Expectativas y agenda al corte del informe; no son resultados observados.</p>
      <div className={styles.topicGrid}>{briefing.today.map((card, i) => <section className={styles.event} key={i}>{card.date && <time dateTime={card.date}>{shortDate(card.date)}</time>}<span className={styles.eyebrow}>{card.label || "AGENDA"}</span><h3>{card.title}</h3><p>{card.text}</p>{card.attribution && <small>{card.attribution}</small>}</section>)}</div>
      {!briefing.today.length && <p>No se registró una agenda separada en esta edición. Consultá el informe completo.</p>}
    </section>
    <section id="research-panel-2" role="tabpanel" aria-labelledby="research-tab-2" hidden={tab !== 2} className={styles.body}>
      {researchSections(edition.body).map((s, i) => <details key={i} open={i === 0}><summary>{s.title}</summary><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>, img: () => null }}>{s.blocks.join("\n\n")}</ReactMarkdown></details>)}
    </section>
    <section className={styles.macroSection}><div className={styles.sectionHeader}><h2>Macro Lab · contexto del informe</h2><a href="/macro">Explorar Macro Lab ↗</a></div>
      {edition.macro?.series.length ? <><p className={styles.caption}>Snapshot disponible al publicar: {dateTimeART(edition.macro.generatedAt)} ART. Cada serie conserva su fecha observada; no son precios en vivo.</p><div className={styles.macroGrid}>{edition.macro.series.map(s => <MacroChart key={s.id} series={s} />)}</div>{edition.macro.failures.length > 0 && <p className={styles.caption}>El snapshot registra descargas fallidas. Las series retenidas se identifican junto a cada dato.</p>}</> : <p className={styles.caption}>No hay un snapshot macro verificado anterior a la publicación de esta edición.</p>}
    </section>
    <dialog ref={dialog} className={styles.dialog} onClose={() => setExpanded(null)} aria-label={expanded?.title || "Gráfico ampliado"}><button className={styles.closeDialog} onClick={() => dialog.current?.close()} autoFocus>Cerrar gráfico ×</button>{expanded && <><h2>{expanded.title}</h2><img src={expanded.image} alt={expanded.title} /><p>{expanded.caption}</p><a href={expanded.source} target="_blank" rel="noopener noreferrer">Documento original ↗</a></>}</dialog>
  </>;
}
