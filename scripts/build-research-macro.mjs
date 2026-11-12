import fs from 'node:fs';
import path from 'node:path';
const dir='public/macro-lab/live/versions';
const snapshots=[];
for(const file of fs.readdirSync(dir).filter(f=>/^[a-f0-9]+\.json$/.test(f))) {
  const raw=JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'));
  if(!Number.isFinite(Date.parse(raw.generatedAt)) || !Array.isArray(raw.failures) || !Array.isArray(raw.retainedSeries)) continue;
  const series=[];
  for(const id of ['reserves','purchases','ipc']) {
    const s=raw.series.find(s=>s.id===id);
    if(!s || !Number.isFinite(Date.parse(s.retrievedAt)) || Date.parse(s.retrievedAt)>Date.parse(raw.generatedAt)) continue;
    const points=s.points.filter(p=>/^\d{4}-\d{2}-\d{2}$/.test(p.date) && p.date<=raw.generatedAt.slice(0,10) && Number.isFinite(p.value)).sort((a,b)=>a.date.localeCompare(b.date));
    if(!points.length || new Set(points.map(p=>p.date)).size!==points.length) continue;
    const derived=id==='ipc';
    const values=derived ? points.slice(1).flatMap((p,i)=>{
      const prev=points[i], next=new Date(prev.date+'T12:00:00Z');next.setUTCMonth(next.getUTCMonth()+1);
      return prev.value>0 && next.toISOString().slice(0,10)===p.date ? [{date:p.date,value:(p.value/prev.value-1)*100}] : [];
    }) : points;
    const retained=raw.retainedSeries.some(r=>typeof r==='string' ? r===id : r?.id===id);
    series.push({id,name:derived?'IPC nacional · variación mensual':s.name,unit:derived?'% mensual':s.unit,provider:s.provider,sourceUrl:s.sourceUrl,retrievedAt:s.retrievedAt,note:derived?'Cálculo Amauta: (índice del mes / índice del mes anterior − 1) × 100, con niveles INDEC.':s.note||'',derived,retained,points:values.slice(derived?-12:-60)});
  }
  snapshots.push({generatedAt:raw.generatedAt,source:'/macro-lab/live/versions/'+file,failures:raw.failures.map(f=>typeof f==='string'?f:JSON.stringify(f)),series});
}
snapshots.sort((a,b)=>Date.parse(a.generatedAt)-Date.parse(b.generatedAt));
fs.writeFileSync('src/lib/research-macro-snapshots.json',JSON.stringify(snapshots));
console.log(`Research: ${snapshots.length} snapshots históricos macro verificados`);
