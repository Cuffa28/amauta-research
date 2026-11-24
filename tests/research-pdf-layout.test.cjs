const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const output=ts.transpileModule(fs.readFileSync('src/lib/research-pdf-layout.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const mod={exports:{}};
new Function('exports','module',output)(mod.exports,mod);
const {pdfText,pdfParagraph,pdfSections}=mod.exports;
test('PDF preserves negative returns and approximate values with built-in fonts',()=>{
 assert.equal(pdfText('−17,5% · ≈82% · USD 49.362 M'),'-17,5% · aprox. 82% · USD 49.362 M');
 assert.equal(pdfText('+4,1%'),'+4,1%');
});
test('PDF keeps the full analysis beyond the opening cards, without visible internal controls',()=>{
 const sections=pdfSections('Resumen.\n\n## Tesoro\n\nDato de vencimientos.\n\n## Empresas\n\nResultado trimestral.\n\n## Fuentes y cobertura\n\nControl privado.');
 assert.deepEqual(sections.map(s=>s.title),['','Tesoro','Empresas']);
 assert.equal(sections[2].paragraphs[0],'Resultado trimestral.');
 assert.ok(!JSON.stringify(sections).includes('Control privado'));
});
test('Source link text survives PDF paragraph formatting',()=>{
 assert.equal(pdfParagraph('El **ICG** [informe](https://example.com) cayó −17,5%.'),'El ICG informe cayó -17,5%.');
});
