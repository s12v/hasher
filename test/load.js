'use strict';
// Loads the extension's scripts into a vm context the same way popup.html does
// (same files, same order), minus popup.js, which only wires DOM events.
// Everything under test is a plain global: hasher, tabs, parseDate, utf8, ...
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');

function popupScripts() {
  const html = fs.readFileSync(path.join(root, 'popup.html'), 'utf8');
  return [...html.matchAll(/<script src="([^"]+)"><\/script>/g)]
    .map((m) => m[1])
    .filter((src) => src !== 'popup.js');
}

function load() {
  const ctx = vm.createContext({ console, crypto: require('node:crypto').webcrypto, TextEncoder, TextDecoder, btoa, atob, URL, URLSearchParams });
  ctx.window = ctx;
  for (const src of popupScripts()) {
    vm.runInContext(fs.readFileSync(path.join(root, src), 'utf8'), ctx, { filename: src });
  }
  return ctx;
}

const ctx = load();

function element(id) {
  const el = ctx.hasher.findById(id);
  if (!el) {
    throw new Error(`no element with id ${id}`);
  }
  return el;
}

// calculate() may return a string, { value, hint, tone }, or a promise of either
function unwrap(r) {
  if (r !== null && typeof r === 'object' && 'value' in r) {
    return { value: String(r.value == null ? '' : r.value), hint: r.hint || '', tone: r.tone || '' };
  }
  return { value: String(r), hint: '', tone: '' };
}

// Runs one output element the way hasher.update() does and returns the displayed string
function calc(id, input, password = '') {
  const r = element(id).calculate(input, password);
  if (r && typeof r.then === 'function') {
    throw new Error(`${id} is async: use run()`);
  }
  return unwrap(r).value;
}

// Same, for any element: resolves to { value, hint, tone }
async function run(id, input, password = '') {
  return unwrap(await element(id).calculate(input, password));
}

module.exports = { ctx, calc, run, root, popupScripts };
