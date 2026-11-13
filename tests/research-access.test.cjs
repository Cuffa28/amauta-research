const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const source = fs.readFileSync('src/lib/research-access.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const loaded = { exports: {} };
new Function('module', 'exports', compiled)(loaded, loaded.exports);
const { canReadResearch } = loaded.exports;

test('Corporate emails are eligible, with active membership enforced separately', () => {
  for (const email of ['facundo@amautainversiones.com', 'stefano@amautainversiones.com', 'STEFANO@AMAUTAINVERSIONES.COM', 'otra@amautainversiones.com']) {
    assert.equal(canReadResearch(email), true, email);
  }
});

test('Missing emails, external accounts, subdomains and lookalike domains remain excluded', () => {
  for (const email of [null, undefined, '', '@amautainversiones.com', 'stefano@gmail.com', 'stefano@amautainversiones.com.ejemplo.com', 'stefano@otro.amautainversiones.com', 'x@x@amautainversiones.com', ' stefano@amautainversiones.com']) {
    assert.equal(canReadResearch(email), false, String(email));
  }
});
