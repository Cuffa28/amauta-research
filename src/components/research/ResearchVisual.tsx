"use client";
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { dateTimeART, editionDate, getBriefing, researchSections, shortDate, validCharts, type ResearchChart, type ResearchEdition } from "@/lib/research-briefing";
import MacroChart from "./MacroChart";
import styles from "./research.module.css";

export default function ResearchVisual({ edition }: { edition: ResearchEdition }) {
  const [tab, setTab] = useState(0);
  const [expanded, setExpanded] = useState<ResearchChart | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const briefing = getBriefing(edition), charts = validCharts(edition.charts), publication = editionDate(edition);
  const tabs = ["En una mirada", "Agenda de la edición", "Informe completo"];
  function openChart(chart: ResearchChart) { setExpanded(chart); dialog.current?.showModal(); }
  return <>
    <div className={styles.tabs} role="tablist" aria-label="Vistas del informe">{tabs.map((label, i) => <button key={label} id={`research-tab-${i}`} role="tab" aria-selected={tab === i} aria-controls={`research-panel-${i}`} tabIndex={tab === i ? 0 : -1} onClick={() => setTab(i)} onKeyDown={e => {
      const next = e.key === "ArrowRight" ? (i + 1) % 3 : e.key === "ArrowLeft" ? (i + 2) % 3 : e.key === "Home" ? 0 : e.key === "End" ? 2 : null;
      if (next !== null) { e.preventDefault(); setTab(next); document.getElementById(`research-tab-${next}`)?.focus(); }
    }}>{label}</button>)}</div>
    <section id="research-panel-0" role="tabpanel" aria-labelledby="research-tab-0" hidden={tab !== 0}>
      <p className={styles.signal}>{briefing.intro}</p>
      {briefing.metrics.length > 0 && <div className={styles.metrics}>{briefing.metrics.map(m => <div className={styles.metric} key={m.label}><span>{m.label}</span><strong>{m.value}</strong><small>{m.context}</small></div>)}</div>}
      <div className={styles.openingGrid}>
        <section><h2 className={styles.sectionTitle}>Qué pasó · {shortDate(edition.market_date)}</h2><div className={styles.openingCards}>{briefing.yesterday.map((card, i) => <section className={styles.topic} key={i}><span className={styles.eyebrow}>{card.label || "CIERRE ANTERIOR"}</span><h3>{card.title}</h3><p>{card.text}</p>{card.attribution && <small>{card.attribution}</small>}</section>)}</div></section>
        <section><h2 className={styles.sectionTitle}>Qué mirar · {shortDate(publication)}</h2><p className={styles.caption}>Agenda y expectativas al corte de esta edición.</p><div className={styles.openingCards}>{briefing.today.slice(0, 2).map((card, i) => <section className={styles.event} key={i}><span className={styles.eyebrow}>{card.date ? `${shortDate(card.date)} · ` : ""}{card.label || "AGENDA"}</span><h3>{card.title}</h3><p>{card.text}</p>{card.attribution && <small>{card.attribution}</small>}</section>)}</div>{briefing.today.length > 2 && <button className={styles.agendaLink} onClick={() => { setTab(1); document.getElementById("research-tab-1")?.focus(); }}>Ver agenda completa ({briefing.today.length}) →</button>}{!briefing.today.length && <p className={styles.caption}>Sin agenda separada en esta edición.</p>}</section>
      </div>
      {charts.length > 0 && <><h2 className={styles.sectionTitle}>Gráficos para entender el contexto</h2><div className={styles.chartGrid}>{charts.map(c => <figure className={styles.chartCard} key={c.id}><button aria-label={`Ampliar: ${c.title}`} onClick={() => openChart(c)}><img src={c.image} alt={c.title} width={c.width} height={c.height} /><span>Ampliar gráfico ↗</span></button><figcaption>{c.caption} <a href={c.source} target="_blank" rel="noopener noreferrer">Original · {c.date} · p. {c.page} ↗</a></figcaption></figure>)}</div></>}
    </section>
    <section id="research-panel-1" role="tabpanel" aria-labelledby="research-tab-1" hidden={tab !== 1}>
      <h2 className={styles.sectionTitle}>Qué mirar · {shortDate(publication)}</h2><p className={styles.caption}>Expectativas y agenda al corte del informe; no son resultados observados. Al consultar el archivo, estas fechas corresponden a la edición elegida.</p>
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
