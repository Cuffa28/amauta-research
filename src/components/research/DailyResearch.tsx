"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ensureSession } from "@/lib/portal-supabase";
import styles from "./research.module.css";

type Source = { title: string; provider: string; url: string; observed_on: string; status: "read" | "partial" | "unavailable" };
type Edition = { id: string; market_date: string; published_at: string; title: string; summary: string; body: string; coverage: "complete" | "partial"; sources: Source[] };

function date(value: string) {
  return new Date(value.length === 10 ? value + "T12:00:00-03:00" : value).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", day: "numeric", month: "long", year: "numeric" });
}

export default function DailyResearch() {
  const [editions, setEditions] = useState<Edition[]>([]);
  const [selected, setSelected] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [denied, setDenied] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setLoading(true); setError("");
      try {
        const session = await ensureSession();
        if (!session) throw new Error("Iniciá sesión para consultar los informes del equipo.");
        if (session.email?.toLowerCase() !== "facundo@amautainversiones.com") { setDenied(true); return; }
        const response = await fetch("/api/research", { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudo consultar el archivo.");
        if (!Array.isArray(data.editions)) throw new Error("El archivo devolvió una respuesta no válida.");
        setEditions(data.editions);
        setSelected(current => data.editions.some((e: Edition) => e.id === current) ? current : data.editions[0]?.id || "");
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "No se pudo actualizar el archivo.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [retry]);
  const edition = editions.find(e => e.id === selected);
  const filtered = editions.filter(e => `${e.title} ${e.summary} ${e.market_date}`.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")));
  async function downloadPdf() {
    if (!edition || downloading) return;
    setDownloading(true); setDownloadError("");
    try {
      const session = await ensureSession();
      if (!session) throw new Error("La sesión venció. Ingresá nuevamente.");
      const response = await fetch(`/api/research/pdf?id=${encodeURIComponent(edition.id)}`, { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || "No se pudo generar el PDF."); }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = url; link.download = `Amauta_Research_${edition.market_date}.pdf`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setDownloadError(e instanceof Error ? e.message : "No se pudo descargar el PDF."); }
    finally { setDownloading(false); }
  }
  if (denied) return <div className={styles.shell}><h1>Sección privada</h1><p>Esta sección no está disponible para tu cuenta.</p></div>;
  return <div className={styles.shell}>
    <header className={styles.header}>
      <div><img className={styles.logo} src="/assets/amauta-logo-horizontal.png" alt="Amauta Inversiones Financieras" /><span className={styles.eyebrow}>RESEARCH & STRATEGY</span><h1>La jornada, en perspectiva.</h1><p>Un informe cada mañana. Los hechos, sus fuentes y lo que viene.</p></div>
      <div className={styles.schedule}><strong>08:45</strong><span>Publicación prevista · Argentina</span><small>Sobre la última rueda hábil</small></div>
    </header>
    <div className={styles.layout}>
      <aside className={styles.archive}><h2>Archivo de ediciones</h2><label htmlFor="research-search">Buscar por fecha o tema</label><input id="research-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Dólar, bonos, 2026-11…" />
        {filtered.map(e => <button key={e.id} onClick={() => setSelected(e.id)} aria-pressed={e.id === selected} className={e.id === selected ? styles.active : ""}><small>Rueda del {date(e.market_date)}</small><strong>{e.title}</strong></button>)}
        {!loading && !error && !filtered.length && <p>{editions.length ? "No hay ediciones que coincidan." : "El archivo todavía no tiene ediciones publicadas."}</p>}
        <a href="/macro">Explorar datos macro →</a>
      </aside>
      <main className={styles.paper}>
        {loading && <p role="status">Consultando el archivo…</p>}
        {error && <div role="alert" className={styles.notice}><h2>No pudimos actualizar el archivo</h2><p>{error}</p><button onClick={() => setRetry(v => v + 1)}>Reintentar</button></div>}
        {!loading && !error && !edition && <div className={styles.empty}><span className={styles.eyebrow}>PRIMERA EDICIÓN PENDIENTE</span><h2>Un lugar para empezar cada mañana.</h2><p>Los informes aparecerán aquí cuando estén publicados y verificados. Los datos y gráficos pendientes no se reemplazan con ejemplos.</p><p>La preparación de las 19:30 alimenta el informe de las 8:45 del día siguiente.</p></div>}
        {edition && <article><div className={styles.actions}><button onClick={downloadPdf} disabled={downloading}>{downloading ? "Preparando PDF…" : "Descargar PDF"}</button><span>Para guardar o compartir</span></div>{downloadError && <p role="alert">{downloadError}</p>}<div className={styles.meta}><span>RUEDA DEL {date(edition.market_date)}</span></div><h2 className={styles.title}>{edition.title}</h2><p className={styles.summary}>{edition.summary.replace(" Primera edición con cobertura parcial.", "")}</p><p className={styles.published}>Publicado el {date(edition.published_at)} a las {new Date(edition.published_at).toLocaleTimeString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", hour: "2-digit", minute: "2-digit" })}. Datos históricos de la rueda indicada.</p>
          <div className={styles.body}><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>, img: () => <p>Gráfico disponible en el documento original. La integración privada de imágenes está pendiente.</p> }}>{edition.body.split(/\n\s*\n/).filter(block => !block.startsWith("Edición inicial cargada manualmente")).join("\n\n")}</ReactMarkdown></div>
          <footer className={styles.signature}><img src="/assets/amauta-logo-horizontal.png" alt="Amauta" /><div><strong>Facundo Argañaraz</strong><span>Research &amp; Strategy</span><span>Amauta Inversiones Financieras</span><small>Preservamos su legado familiar</small></div></footer>
        </article>}
      </main>
    </div>
  </div>;
}
