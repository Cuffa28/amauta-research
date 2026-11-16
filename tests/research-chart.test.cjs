const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(file, imports = {}) {
 const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;
 const module = {exports:{}};
 new Function('require','module','exports',output)(name=>imports[name]||require(name),module,module.exports);
 return module.exports;
}
const briefing=load('src/lib/research-briefing.ts');
const chart=load('src/lib/research-chart.ts');
test('Highlighted extrema and last observation retain dates, negative values and zero',()=>{
 const points=[{date:'2026-11-02',value:-7},{date:'2026-11-06',value:10},{date:'2026-11-11',value:0}];
 assert.deepEqual(chart.chartHighlights(points).map(p=>[p.label,p.date,p.value]),[['Mínimo','2026-11-02',-7],['Máximo','2026-11-06',10],['Último','2026-11-11',0]]);
 assert.deepEqual(chart.chartHighlights([]),[]);
 assert.equal(chart.chartHighlights(points.slice(0,1)).length,3);
});
test('Pointer snaps to observed dates with calendar gaps; window extrema recompute',()=>{
 const points=[{date:'2025-01-01',value:99},{date:'2026-11-01',value:1},{date:'2026-11-11',value:3}];
 const window=briefing.macroWindow(points,90);
 assert.equal(chart.chartHighlights(window)[1].value,3);
 const coords=briefing.plotPoints(window);
 assert.equal(chart.nearestChartPoint(coords,-10),0);
 assert.equal(chart.nearestChartPoint(coords,501),1);
 assert.equal(chart.nearestChartPoint([{x:16},{x:25},{x:484}],40),1);
 assert.equal(chart.nearestChartPoint([],10),-1);
});
test('Static chart includes visible values and dates and keyboard-accessible observation inspection',()=>{
 const MacroChart=load('src/components/research/MacroChart.tsx',{'@/lib/research-briefing':briefing,'@/lib/research-chart':chart,'./research.module.css':{default:{}}}).default;
 const series={id:'test',name:'Serie de prueba',provider:'Fuente de prueba',unit:'millones USD',sourceUrl:'https://example.test',retrievedAt:'2026-11-16T10:00Z',points:[{date:'2026-11-02',value:1000},{date:'2026-11-06',value:1200},{date:'2026-11-11',value:1100}]};
 const html=renderToStaticMarkup(React.createElement(MacroChart,{series}));
 for(const value of ['Mínimo del período','Máximo del período','Último del período','1.000','1.200','1.100','02/11/2026','06/11/2026','11/11/2026','role="slider"','aria-valuemax="2"'])assert.ok(html.includes(value),value);
});
