/* La caja observada requiere cobertura completa. Las hipótesis viven aparte. */
(function(root){
  'use strict';
  const valid=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
  function calculate(opening,months){
    let balance=valid(opening)?opening:null;
    return months.map(m=>{
      const complete=valid(m.inflows)&&valid(m.payments);
      balance=balance!==null&&complete?balance+m.inflows-m.payments:null;
      return {...m,closing:balance};
    });
  }
  function eligible(r){
    return ['disbursed','unconditional'].includes(r.status)&&r.issuer==='Tesoro'&&r.currency==='USD'&&r.freeAvailability===true&&/^2027-(0[1-9]|1[0-2])$/.test(r.month||'')&&valid(r.netAmount)&&Boolean(r.sourceUrl)&&Boolean(r.evidenceDate);
  }
  function confirmed(records,month){
    return records.filter(r=>eligible(r)&&r.month===month).reduce((sum,r)=>sum+r.netAmount,0);
  }
  const api={calculate,eligible,confirmed};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.CajaModel=api;
})(globalThis);
