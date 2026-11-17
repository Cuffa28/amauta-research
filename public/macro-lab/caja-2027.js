'use strict';
(async()=>{
 const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fmt=n=>n===null?'Pendiente':Number(n).toLocaleString('es-AR',{minimumFractionDigits:1,maximumFractionDigits:1});
 const link=(url,label)=>`<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)} ↗</a>`;
 try{
  const response=await fetch('live/caja-2027.json',{cache:'no-store'});if(!response.ok)throw Error('No se pudo leer la base de caja.');const d=await response.json();
  const months=d.mensual_2027, sum=key=>months.reduce((n,m)=>n+m[key],0);
  $('total').textContent=fmt(sum('servicio_usd_equivalente_millones'));
  $('documented').textContent='Sin calendario completo';
  $('months').innerHTML=months.map(m=>`<tr><td>${esc(m.mes)}</td><td class="num">${fmt(m.capital_usd_equivalente_millones)}</td><td class="num">${fmt(m.intereses_usd_equivalente_millones)}</td><td class="num">${fmt(m.servicio_usd_equivalente_millones)}</td><td class="num">Pendiente</td><td class="num">Sin asignar</td><td class="num">Pendiente</td></tr>`).join('');
  $('totals').innerHTML=`<tr><th>Total base histórica</th><th class="num">${fmt(sum('capital_usd_equivalente_millones'))}</th><th class="num">${fmt(sum('intereses_usd_equivalente_millones'))}</th><th class="num">${fmt(sum('servicio_usd_equivalente_millones'))}</th><th colspan="3">Sin brecha vigente calculable</th></tr>`;
  $('source').innerHTML=link(d.fuente_vencimientos.url,'Excel oficial')+' · Hojas A.3.4 (capital, fila 103) y A.3.5 (intereses, fila 104), columnas C:N. '+link(d.fuentes['Deuda trimestral y archivos originales'],'Publicaciones del Ministerio');
  $('evidence').innerHTML=d.fundingLedger.map(r=>`<tr><td>${esc(r.name)}<br><small>${esc(r.issuer)} · evidencia ${esc(r.evidenceDate)}</small></td><td>${esc(r.description)}</td><td>${esc(r.treatment)}</td><td>${link(r.sourceUrl,'Documento oficial')}</td></tr>`).join('');
  $('projections').innerHTML=d.fuentes_programa_julio_2026_miles_millones_usd.map(r=>`<tr><td>${esc(r.concepto)}</td><td class="num">${fmt(r.monto*1000)}</td><td>${esc(r.tratamiento)}</td></tr>`).join('');
  $('rounding').textContent='Total publicado: 24.900 millones de USD. Suma de componentes redondeados: 24.800. Diferencia de redondeo: 100; no se crea un ingreso para cerrarla. Este programa y el perfil de deuda tienen coberturas y cortes distintos; no se resta uno del otro como brecha.';
  $('program-source').innerHTML=link(d.fuentes['Programa financiero de julio de 2026'],'Presentación del Ministerio de Economía');
  $('missing').innerHTML=d.missing.map(m=>`<li><b>${esc(m.item)}.</b> ${esc(m.reason)} ${link(m.url,'Dónde verificar')}</li>`).join('');
  $('review').textContent='Revisión documental: '+d.fecha_revision+'. Próxima revisión: al publicarse el perfil trimestral de septiembre, un desembolso o las condiciones definitivas de una operación. Se conserva el corte original de cada dato.';
  const key='amauta-caja-2027-scenario-v1';let saved={};try{saved=JSON.parse(localStorage.getItem(key)||'{}')}catch{}
  const parse=v=>v.trim()===''?null:(Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null);
  $('opening').value=typeof saved.opening==='number'?saved.opening:'';
  $('scenario').innerHTML=months.map((m,i)=>`<tr><td>${esc(m.mes)}</td><td><input type="number" min="0" step="any" data-inflow="${i}" aria-label="Ingresos supuestos ${esc(m.mes)}" placeholder="Pendiente"></td><td><input type="number" min="0" step="any" data-payment="${i}" aria-label="Pagos supuestos ${esc(m.mes)}" placeholder="Pendiente"></td><td class="num" id="closing-${i}">Pendiente</td></tr>`).join('');
  for(let i=0;i<months.length;i++){const row=saved.months?.[i];if(row?.month===months[i].mes){document.querySelector(`[data-inflow="${i}"]`).value=row.inflows??'';document.querySelector(`[data-payment="${i}"]`).value=row.payments??'';}}
  const state=()=>({opening:parse($('opening').value),months:months.map((m,i)=>({month:m.mes,inflows:parse(document.querySelector(`[data-inflow="${i}"]`).value),payments:parse(document.querySelector(`[data-payment="${i}"]`).value)}))});
  function recalc(){const s=state();CajaModel.calculate(s.opening,s.months).forEach((m,i)=>{$('closing-'+i).textContent=fmt(m.closing);$('closing-'+i).classList.toggle('negative',m.closing!==null&&m.closing<0)})}
  document.querySelectorAll('input').forEach(i=>i.addEventListener('input',recalc));recalc();
  $('save').onclick=()=>{try{localStorage.setItem(key,JSON.stringify({...state(),savedAt:new Date().toISOString(),sourceCutoff:d.fuente_vencimientos.corte}));$('message').textContent='Escenario propio guardado en este navegador. No modifica los datos oficiales.'}catch{$('message').textContent='El navegador no permite guardar. Podés exportar el CSV.'}};
  $('reset').onclick=()=>{document.querySelectorAll('input').forEach(i=>i.value='');try{localStorage.removeItem(key)}catch{}recalc();$('message').textContent='Escenario vaciado; las fuentes oficiales siguen visibles.'};
  $('export').onclick=()=>{const s=state(),rows=[['tipo','mes','unidad','caja_inicial_supuesta','ingresos_supuestos','pagos_supuestos','caja_final_supuesta','corte_base_oficial'],...CajaModel.calculate(s.opening,s.months).map((m,i)=>['ESCENARIO_PROPIO',m.month,'millones USD',i===0?s.opening:'',m.inflows,m.payments,m.closing,d.fuente_vencimientos.corte])];const csv=rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(';')).join('\r\n');const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='amauta-caja-2027-escenario.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
  $('loading').hidden=true;$('content').hidden=false;
 }catch(e){$('loading').textContent=e.message+' No se reemplazó por valores estimados.'}
})();
