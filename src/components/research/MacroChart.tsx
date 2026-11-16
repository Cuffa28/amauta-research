"use client";
import {useState} from "react";
import {macroWindow,plotPoints,numberLabel,shortDate,dateTimeART,type MacroSeries} from "@/lib/research-briefing";
import styles from "./research.module.css";
export default function MacroChart({ series }: { series: MacroSeries }) {
  const [range, setRange] = useState<number | null>(null);
  const points = macroWindow(series.points, range), last = points[points.length - 1];
  const coordinates = plotPoints(points), values = points.map(p => p.value);
  if (!last) return null;
  return <section className={styles.macroCard}>
    <span className={styles.eyebrow}>{series.derived ? "CÁLCULO AMAUTA CON INDEC" : series.provider}</span>
    <h3>{series.name}</h3><strong className={styles.macroValue}>{numberLabel(last.value)} <small>{series.unit}</small></strong>
    <p className={styles.caption}>Último dato: {shortDate(last.date)}{series.id === "ipc" ? " · período mensual" : ""}{series.retained ? " · serie retenida de una descarga anterior" : ""}</p>
    <div className={styles.rangeControls} role="group" aria-label={`Período de ${series.name}`}>{[[90, "3 meses"], [365, "1 año"], [null, "Todo"]].map(([days, label]) => <button key={String(label)} aria-pressed={range === days} onClick={() => setRange(days as number | null)}>{label}</button>)}</div>
    {coordinates.length < 2 && <p className={styles.caption}>Una observación en este período; no se traza una tendencia.</p>}
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

