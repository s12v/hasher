'use strict';
// Packs the extension into dist/hasher-<version>.zip: only the files the
// browser needs, nothing from test/, .github/ or the npm metadata.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (manifest.version !== pkg.version) {
  console.error(`version mismatch: manifest.json ${manifest.version}, package.json ${pkg.version}`);
  process.exit(1);
}

const files = ['manifest.json', 'popup.html', 'popup.js', 'hasher.js', 'main.css', 'LICENSE', 'images', 'lib'];
const dist = path.join(root, 'dist');
const out = path.join(dist, `hasher-${manifest.version}.zip`);
fs.mkdirSync(dist, { recursive: true });
fs.rmSync(out, { force: true });
execFileSync('zip', ['-r', '-X', '-q', out, ...files], { cwd: root, stdio: 'inherit' });
console.log(`${path.relative(root, out)}  ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
