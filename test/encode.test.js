'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ctx, calc } = require('./load');

const { hasher, basex } = ctx;

test('base64 and base64url', () => {
  assert.equal(calc('7base64', 'héllo'), 'aMOpbGxv');
  assert.equal(calc('7base64', '?>'), 'Pz4=');
  assert.equal(hasher.elements.e1.alt.calculate('?>'), 'Pz4', 'url alphabet, no padding');
  assert.equal(hasher.elements.e1.alt.calculate('ÿþý'), 'w7_DvsO9', 'url alphabet: _ instead of /');
  assert.equal(calc('7base64', 'ÿþý'), 'w7/DvsO9');
  assert.equal(calc('7base64-d', 'aMOpbGxv'), 'héllo');
  assert.equal(calc('7base64-d', 'Pz4'), '?>', 'missing padding is fine');
  assert.equal(calc('7base64-d', 'Pz4='), '?>');
  assert.equal(calc('7base64-d', 'aMOp bGxv\n'), 'héllo', 'whitespace ignored');
  assert.equal(hasher.elements.e2.alt.calculate('aMOpbGxv'), '68c3a96c6c6f', 'hex column');
  assert.equal(calc('7base64-d', 'not base64 !!'), '');
  assert.equal(hasher.elements.e2.alt.calculate('not base64 !!'), '');
  assert.equal(calc('7base64', ''), '');
});

test('binary decodes show up as hex with a hint', () => {
  assert.equal(calc('7base64-d', '//79'), '', 'not UTF-8');
  assert.equal(hasher.elements.e2.alt.calculate('//79'), 'fffefd');
  assert.equal(hasher.elements.e2.hint('//79'), 'binary, not text — see the hex');
  assert.equal(hasher.elements.e2.hint('aMOpbGxv'), '');
});

// RFC 4648 test vectors
test('base32', () => {
  assert.equal(calc('7base32', 'foobar'), 'MZXW6YTBOI======');
  assert.equal(calc('7base32', 'fooba'), 'MZXW6YTB');
  assert.equal(calc('7base32', 'f'), 'MY======');
  assert.equal(calc('7base32-d', 'MZXW6YTBOI======'), 'foobar');
  assert.equal(calc('7base32-d', 'mzxw6ytboi'), 'foobar', 'lowercase, no padding');
  assert.equal(calc('7base32-d', 'JBSW Y3DP'), 'Hello', 'spaces ignored');
  assert.equal(calc('7base32-d', 'MZXW6YTBOI1'), '', 'not base32');
  assert.equal(hasher.elements.e12.alt.calculate('MZXW6YTB'), '666f6f6261');
});

test('base58', () => {
  assert.equal(calc('7base58', 'hello world'), 'StV1DL6CwTryKyV');
  assert.equal(calc('7base58-d', 'StV1DL6CwTryKyV'), 'hello world');
  assert.equal(basex.base58(new Uint8Array([0, 0, 97, 98, 99])), '11ZiCa', 'leading zero bytes become 1s');
  assert.deepEqual(Array.from(basex.unbase58('11ZiCa')), [0, 0, 97, 98, 99]);
  assert.equal(calc('7base58-d', '0OIl'), '', 'characters outside the alphabet');
  assert.equal(calc('7base58', ''), '');
});

test('uri', () => {
  assert.equal(calc('7encodeURI', 'a b/ü?x=1'), 'a%20b/%C3%BC?x=1');
  assert.equal(calc('7encodeURIComponent', 'a b/ü?x=1'), 'a%20b%2F%C3%BC%3Fx%3D1');
  assert.equal(calc('7decodeURI', 'a%20b/%C3%BC?x=1'), 'a b/ü?x=1');
  assert.equal(calc('7decodeURIComponent', 'a%20b%2F%C3%BC%3Fx%3D1'), 'a b/ü?x=1');
});

test('malformed uri does not throw', () => {
  assert.equal(calc('7decodeURI', '%'), '');
  assert.equal(calc('7decodeURIComponent', '%E0%A4%A'), '');
});

test('decode rows are empty when nothing was encoded', () => {
  assert.equal(calc('7decodeURI', 'plain text'), '');
  assert.equal(calc('7decodeURIComponent', 'plain text'), '');
});

test('html special chars', () => {
  assert.equal(calc('7htmlspecialchars', '<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#039;&lt;/a&gt;');
  assert.equal(calc('7htmlspecialchars-d', '&lt;a href=&quot;x&quot;&gt;&amp;&#039;&lt;/a&gt;'), '<a href="x">&\'</a>');
});

test('rot13', () => {
  assert.equal(calc('7rot13', 'Hello, World!'), 'Uryyb, Jbeyq!');
  assert.equal(calc('7rot13', 'Uryyb, Jbeyq!'), 'Hello, World!');
  assert.equal(calc('7rot13', 'привет'), 'привет');
});

test('row order', () => {
  const titles = Object.values(hasher.elements).filter((e) => e.tab === ctx.tabs.encode).map((e) => e.title);
  assert.deepEqual(Array.from(titles), ['Base64', 'Base64 decode', 'Base32', 'Base32 decode', 'Base58', 'Base58 decode',
    'JavaScript encodeURI()', 'JavaScript encodeURIComponent()', 'JavaScript decodeURI()', 'JavaScript decodeURIComponent()',
    'HTML special chars', 'HTML special chars decode', 'ROT13 encode/decode']);
});
