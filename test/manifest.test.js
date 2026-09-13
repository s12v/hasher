'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { root, popupScripts } = require('./load');

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const popup = fs.readFileSync(path.join(root, 'popup.html'), 'utf8');

test('manifest v3', () => {
  assert.equal(manifest.manifest_version, 3);
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  assert.equal(manifest.action.default_popup, 'popup.html');
  assert.equal(manifest.browser_action, undefined);
  assert.equal(manifest.background, undefined);
  assert.deepEqual(manifest.permissions, ['clipboardWrite']);
});

test('package.json version matches the manifest', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.version, manifest.version);
});

test('referenced files exist', () => {
  const files = [
    manifest.action.default_popup,
    manifest.action.default_icon,
    ...Object.values(manifest.icons),
    ...popupScripts(),
    'popup.js',
    'main.css',
  ];
  for (const file of files) {
    assert.ok(fs.existsSync(path.join(root, file)), `${file} is missing`);
  }
});

test('popup.html satisfies the MV3 content security policy', () => {
  assert.doesNotMatch(popup, /<script(?![^>]*\ssrc=)[^>]*>/, 'inline <script>');
  assert.doesNotMatch(popup, /\son[a-z]+\s*=/i, 'inline event handler');
  assert.doesNotMatch(popup, /<script[^>]*src="https?:/, 'remote script');
  assert.doesNotMatch(popup, /href="javascript:/, 'javascript: URL');
});

test('no jQuery', () => {
  for (const src of [...popupScripts(), 'popup.js']) {
    if (src.startsWith('lib/')) continue;
    assert.doesNotMatch(fs.readFileSync(path.join(root, src), 'utf8'), /\$\(|jQuery/, src);
  }
});

test('build script packs exactly the extension files', () => {
  const src = fs.readFileSync(path.join(root, 'scripts/build.js'), 'utf8');
  const listed = /const files = \[([^\]]*)\]/.exec(src)[1].match(/'([^']+)'/g).map((s) => s.slice(1, -1));
  for (const file of ['manifest.json', 'popup.html', 'popup.js', 'hasher.js', 'main.css', 'LICENSE', 'images', 'lib']) {
    assert.ok(listed.includes(file), `${file} is not packed`);
  }
  for (const file of listed) {
    assert.ok(fs.existsSync(path.join(root, file)), `${file} is packed but missing`);
  }
  // every script popup.html loads must live inside a packed path
  for (const src of [...popupScripts(), 'popup.js', 'main.css']) {
    assert.ok(listed.some((f) => src === f || src.startsWith(f + '/')), `${src} would be left out of the zip`);
  }
});
