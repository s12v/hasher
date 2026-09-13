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
