export const historyCatalog = [
 {key:"bcra.reserves.official",label:"Reservas brutas · BCRA",unit:"millones USD"},
 {key:"bcra.purchases_factor.official",label:"Compras de divisas · factor de reservas BCRA",unit:"millones USD"},
 {key:"indec.inflation_mom.official",label:"Inflación mensual · INDEC vía BCRA",unit:"% mensual"},
 {key:"bcra.intervention.stonex",label:"Intervención en el mercado · StoneX",unit:"millones USD"},
 {key:"bcra.reserves.stonex",label:"Reservas brutas · StoneX",unit:"millones USD"},
 {key:"treasury.awarded.ars",label:"Tesoro · adjudicación efectiva",unit:"billones ARS"},
 {key:"treasury.offered.ars",label:"Tesoro · ofertas recibidas",unit:"billones ARS"},
 {key:"indec.inflation_core.official",label:"Inflación núcleo · INDEC",unit:"% mensual"},
 {key:"indec.capacity.official",label:"Capacidad instalada · INDEC",unit:"%"},
] as const;
export type HistoryRow = {id:number;observed_on:string;value:number|string;retrieved_at:string;data_status:string};
// Query order is newest observation, then newest vintage. Disputed figures never enter a line.
export function historyPoints(rows: HistoryRow[]) {
 const days=new Set<string>();
 return rows.filter(r=>r.data_status==="observed" && /^\d{4}-\d{2}-\d{2}$/.test(r.observed_on) && String(r.value).trim()!=="" && Number.isFinite(Number(r.value)))
 .sort((a,b)=>b.observed_on.localeCompare(a.observed_on)||Date.parse(b.retrieved_at)-Date.parse(a.retrieved_at)||b.id-a.id)
 .flatMap(r=>{if(days.has(r.observed_on))return [];days.add(r.observed_on);return [{date:r.observed_on,value:Number(r.value)}];})
 .reverse();
}
