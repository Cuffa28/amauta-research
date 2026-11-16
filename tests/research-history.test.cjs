const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
function load(path,imports={}){
 const compiled=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const m={exports:{}};
 new Function('require','module','exports',compiled)(name=>imports[name]||require(name),m,m.exports);
 return m.exports;
}
const history=load('src/lib/research-history.ts');
test('History preserves zero and sales, excludes forecasts and keeps the newest revision without averaging',()=>{
 const row=(id,date,value,status='observed',retrieved='2026-11-16T10:00Z')=>({id,observed_on:date,value,data_status:status,retrieved_at:retrieved});
 assert.deepEqual(history.historyPoints([
  row(1,'2026-11-11',100),row(2,'2026-11-11',103,'observed','2026-11-16T11:00Z'),
  row(3,'2026-11-12',0),row(4,'2026-11-13',-40),row(5,'2026-11-14',50,'forecast'),
  row(6,'2026-11-15',80,'disputed'),row(7,'invalid',8),row(8,'2026-11-16',''),
 ]),[{date:'2026-11-11',value:103},{date:'2026-11-12',value:0},{date:'2026-11-13',value:-40}]);
});
const next={NextResponse:{json:(data,options={})=>({data,status:options.status||200,headers:options.headers})}};
const latest='11111111-1111-4111-8111-111111111111',old='22222222-2222-4222-8222-222222222222';
function route(access){return load('src/app/api/research/route.ts',{'next/server':next,'@/lib/research-server':{researchClient:async()=>access,privateResearchHeaders:{'Cache-Control':'private, no-store'}},'@/lib/research-macro':{macroAtPublication:()=>null}}).GET;}
test('Research lists only the current edition and rejects superseded IDs, including PDF callers',async()=>{
 let limit;
 const q={select(){return this},eq(){return this},lte(){return this},order(){return this},limit(n){limit=n;return {data:[{id:latest}],error:null}}};
 const get=route({ok:true,db:{from:()=>q}});
 assert.equal((await get({nextUrl:new URL('https://example.test/api/research')})).data.editions.length,1);
 assert.equal(limit,1);
 assert.equal((await get({nextUrl:new URL('https://example.test/api/research?id='+old)})).status,404);
 assert.equal((await get({nextUrl:new URL('https://example.test/api/research?id='+latest)})).status,200);
});
test('History and current-edition routes stop before querying when authorization fails',async()=>{
 const response={status:401};const access={ok:false,response};
 assert.equal(await route(access)({}),response);
 const get=load('src/app/api/research/history/route.ts',{'next/server':next,'@/lib/research-server':{researchClient:async()=>access},'@/lib/research-history':history}).GET;
 assert.equal(await get({}),response);
});
