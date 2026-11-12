const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file) {
  const source = fs.readFileSync(file, 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', output)(name => name.endsWith('.json') ? JSON.parse(fs.readFileSync('src/lib/' + name.replace('./', ''), 'utf8')) : require(name), module, module.exports);
  return module.exports;
}
const { dateTimeART, getBriefing, plotPoints, validCharts } = load('src/lib/research-briefing.ts');
const { macroAtPublication } = load('src/lib/research-macro.ts');
const snapshots = JSON.parse(fs.readFileSync('src/lib/research-macro-snapshots.json', 'utf8'));
test('Historical editions never receive a future snapshot, including revised observations', () => {
  assert.equal(macroAtPublication('2000-01-01T00:00:00Z'), null);
  assert.equal(macroAtPublication('invalid'), null);
  for (const s of snapshots) {
    const selected = macroAtPublication(s.generatedAt);
    assert.equal(selected.generatedAt, s.generatedAt);
    assert.equal(macroAtPublication(new Date(Date.parse(s.generatedAt) - 1).toISOString())?.generatedAt === s.generatedAt, false);
    for (const series of selected.series) {
      assert.ok(Date.parse(series.retrievedAt) <= Date.parse(selected.generatedAt));
      assert.ok(series.points.every(p => Number.isFinite(p.value) && p.date <= selected.generatedAt.slice(0, 10)));
      assert.ok(series.sourceUrl.startsWith('https://'));
      if (series.id === 'ipc') { assert.equal(series.derived, true); assert.equal(series.unit, '% mensual'); }
    }
  }
});
test('Plot spacing reflects elapsed calendar time and constant series stay finite', () => {
  const points = plotPoints([{date:'2026-01-01',value:3},{date:'2026-01-02',value:3},{date:'2026-01-11',value:3}]);
  assert.ok(points.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)));
  assert.ok(Math.abs((points[1].x-points[0].x)/(points[2].x-points[0].x)-0.1)<1e-8);
});
test('Legacy rendering preserves source paragraphs and conditional agenda without invented metrics', () => {
  const e={summary:'Resumen',body:'## Dólar\n\nCierre fechado y condicionado.\n\n## Agenda\n\nPronóstico condicionado, no observado.\n\n## Fuentes y cobertura\n\nControl interno.'};
  const b=getBriefing(e);
  assert.deepEqual(b.metrics,[]);
  assert.equal(b.today[0].text,'Pronóstico condicionado, no observado.');
  assert.ok(!JSON.stringify(b).includes('Control interno.'));
});
test('Charts reject external URLs and oversized embedded images', () => {
  assert.deepEqual(validCharts([{image:'https://example.com/private.png',width:1,height:1}]),[]);
  assert.deepEqual(validCharts([{image:'data:image/png;base64,'+'A'.repeat(2000000),width:1,height:1}]),[]);
});

test('Snapshot labels use Argentina date and 24 hour time across UTC midnight', () => {
  const label=dateTimeART('2026-11-12T02:56:54Z');
  assert.ok(label.includes('11/11/2026'));
  assert.ok(label.includes('23:56'));
});
