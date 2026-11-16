"use client";
import {useState} from "react";
import {macroWindow,plotPoints,numberLabel,shortDate,dateTimeART,type MacroSeries} from "@/lib/research-briefing";
import {chartHighlights,nearestChartPoint} from "@/lib/research-chart";
import styles from "./research.module.css";
export default function MacroChart({ series }: { series: MacroSeries }) {
  const [range, setRange] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const points = macroWindow(series.points, range), last = points[points.length - 1];
  const coordinates = plotPoints(points);
  const highlights = chartHighlights(points);
  const index = selected === null ? points.length - 1 : Math.min(selected, points.length - 1);
  const inspected = points[index];
  const markers = highlights.filter((p,i,all)=>all.findIndex(other=>other.index===p.index)===i);
  if (!last) return null;
  return <section className={styles.macroCard}>
    <span className={styles.eyebrow}>{series.derived ? "CÁLCULO AMAUTA CON INDEC" : series.provider}</span>
    <h3>{series.name}</h3><strong className={styles.macroValue}>{numberLabel(last.value)} <small>{series.unit}</small></strong>
    <p className={styles.caption}>Último dato: {shortDate(last.date)}{series.id === "ipc" ? " · período mensual" : ""}{series.retained ? " · serie retenida de una descarga anterior" : ""}</p>
    <div className={styles.rangeControls} role="group" aria-label={`Período de ${series.name}`}>{[[90, "3 meses"], [365, "1 año"], [null, "Todo"]].map(([days, label]) => <button key={String(label)} aria-pressed={range === days} onClick={() => {setRange(days as number | null);setSelected(null);}}>{label}</button>)}</div>
    {coordinates.length < 2 && <p className={styles.caption}>Una observación en este período; no se traza una tendencia.</p>}
    {coordinates.length > 1 && <>
      <p className={styles.chartReadout}><time dateTime={inspected.date}>{shortDate(inspected.date)}</time><strong>{numberLabel(inspected.value)} <small>{series.unit}</small></strong></p>
      <svg className={styles.interactiveChart} viewBox="0 0 500 220" role="slider" tabIndex={0} aria-label={`Explorar ${series.name}. Flechas para cambiar fecha; Inicio y Fin para ir a los extremos.`} aria-valuemin={0} aria-valuemax={points.length-1} aria-valuenow={index} aria-valuetext={`${shortDate(inspected.date)}: ${numberLabel(inspected.value)} ${series.unit}`}
        onPointerMove={e=>{const bounds=e.currentTarget.getBoundingClientRect();setSelected(nearestChartPoint(coordinates,(e.clientX-bounds.left)*500/bounds.width));}}
        onPointerDown={e=>{const bounds=e.currentTarget.getBoundingClientRect();setSelected(nearestChartPoint(coordinates,(e.clientX-bounds.left)*500/bounds.width));}}
        onPointerLeave={e=>{if(e.pointerType==="mouse")setSelected(null);}}
        onKeyDown={e=>{let next=index;if(e.key==="ArrowLeft"||e.key==="ArrowDown")next=Math.max(0,index-1);else if(e.key==="ArrowRight"||e.key==="ArrowUp")next=Math.min(points.length-1,index+1);else if(e.key==="Home")next=0;else if(e.key==="End")next=points.length-1;else if(e.key==="Escape"){setSelected(null);return;}else return;e.preventDefault();setSelected(next);}}>
        <line x1="16" y1="164" x2="484" y2="164" stroke="#e9e4e6" />
        <polyline points={coordinates.map(p => `${p.x},${p.y+40}`).join(" ")} fill="none" stroke="#621044" strokeWidth="2.5" strokeLinejoin="round" />
        {markers.map(p=>{const c=coordinates[p.index];const isLast=p.index===points.length-1;const collides=isLast&&markers.some(m=>m.index!==p.index&&Math.abs(coordinates[m.index].x-c.x)<85&&Math.abs(coordinates[m.index].y-c.y)<30);return <g key={p.index}>
          <circle cx={c.x} cy={c.y+40} r={isLast?4.5:3.5} fill={isLast?"#f3cf11":"white"} stroke="#621044" strokeWidth="1.5" />
          {!collides&&<text x={Math.max(45,Math.min(455,c.x))} y={c.y+40+(p.label==="Mínimo"?22:-13)} textAnchor="middle" fill="#621044" fontSize="13" fontWeight="600" stroke="white" strokeWidth="4" paintOrder="stroke">{numberLabel(p.value)}</text>}
        </g>;})}
        {selected!==null&&<g pointerEvents="none"><line x1={coordinates[index].x} y1="44" x2={coordinates[index].x} y2="174" stroke="#a18c98" strokeDasharray="3 3"/><circle cx={coordinates[index].x} cy={coordinates[index].y+40} r="5" fill="#f3cf11" stroke="#621044" strokeWidth="2"/></g>}
        <text x="16" y="212" fill="#70686c" fontSize="11">{shortDate(points[0].date)}</text><text x="484" y="212" textAnchor="end" fill="#70686c" fontSize="11">{shortDate(last.date)}</text>
      </svg>
      <p className={styles.caption}>Pasá el mouse o tocá la curva para consultar una fecha. Con teclado: flechas, Inicio y Fin.</p>
    </>}
    <dl className={styles.chartHighlights}>{highlights.map(p=><div key={p.label}><dt>{p.label} del período</dt><dd><strong>{numberLabel(p.value)}</strong><small>{series.unit}</small><time dateTime={p.date}>{shortDate(p.date)}</time></dd></div>)}</dl>
    <details><summary>Ver datos y metodología</summary><p>{series.note}</p><p>Consulta de la serie: {dateTimeART(series.retrievedAt)} ART.</p><a href={series.sourceUrl} target="_blank" rel="noopener noreferrer">Fuente original ↗</a><div className={styles.dataScroll}><table><caption>{series.name} · {series.unit}</caption><thead><tr><th>Fecha observada</th><th>Valor</th></tr></thead><tbody>{points.map(p => <tr key={p.date}><td>{shortDate(p.date)}</td><td>{numberLabel(p.value)}</td></tr>)}</tbody></table></div></details>
  </section>;
}

