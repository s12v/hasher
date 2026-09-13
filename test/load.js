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
  const ctx = vm.createContext({ console, crypto: require('node:crypto').webcrypto, TextEncoder });
  ctx.window = ctx;
  for (const src of popupScripts()) {
    vm.runInContext(fs.readFileSync(path.join(root, src), 'utf8'), ctx, { filename: src });
  }
  return ctx;
}

const ctx = load();

// Runs one output element the way hasher.update() does and returns the displayed string
function calc(id, input, password = '') {
  const element = ctx.hasher.findById(id);
  if (!element) {
    throw new Error(`no element with id ${id}`);
  }
  return String(element.calculate(input, password));
}

module.exports = { ctx, calc, root, popupScripts };
