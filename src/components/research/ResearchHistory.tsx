"use client";
import {useEffect,useState} from "react";
import {ensureSession} from "@/lib/portal-supabase";
import {historyCatalog} from "@/lib/research-history";
import type {MacroSeries} from "@/lib/research-briefing";
import MacroChart from "./MacroChart";
import styles from "./research.module.css";
export default function ResearchHistory(){
 const [key,setKey]=useState<string>(historyCatalog[0].key),[series,setSeries]=useState<MacroSeries|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();setSeries(null);setError("");setLoading(true);
  (async()=>{try{
   const session=await ensureSession();if(!session)throw Error("Iniciá sesión para consultar el histórico.");
   const response=await fetch(`/api/research/history?series=${encodeURIComponent(key)}`,{headers:{Authorization:`Bearer ${session.access_token}`},cache:"no-store",signal:controller.signal});
   const data=await response.json();if(!response.ok)throw Error(data.error||"No se pudo consultar el histórico.");
   if(!controller.signal.aborted)setSeries(data.series);
  }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:"No se pudo consultar el histórico.");}
  finally{if(!controller.signal.aborted)setLoading(false);}})();
  return()=>controller.abort();
 },[key,retry]);
 return <section className={styles.macroSection} aria-label="Base histórica Amauta"><h2 className={styles.sectionTitle}>Base histórica Amauta</h2><p className={styles.caption}>Datos acumulados, independientes del informe vigente. Se conservan fuente, método y fecha; las cifras oficiales y las de cada research forman series separadas.</p>
 <label className={styles.caption} htmlFor="research-history-series">Elegir indicador</label><select className={styles.historySelect} id="research-history-series" value={key} onChange={e=>setKey(e.target.value)}>{historyCatalog.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}</select>
 {loading&&<p role="status">Consultando datos históricos…</p>}{error&&<p role="alert">{error} <button onClick={()=>setRetry(v=>v+1)}>Reintentar</button></p>}
 {!loading&&!error&&(series?<><p className={styles.caption}>{series.points.length} observaciones disponibles. Sin interpolar faltantes ni incorporar pronósticos.</p><MacroChart key={key} series={series}/></>:<p className={styles.caption}>Esta serie todavía no tiene observaciones verificadas cargadas.</p>)}
 </section>;
}
