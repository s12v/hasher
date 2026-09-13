'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calc, ctx } = require('./load');

test('length (issue #6)', () => {
  assert.equal(calc('9length', ''), '');
  assert.equal(calc('9length', 'abc'), '3 chars, 3 bytes (UTF-8)');
  assert.equal(calc('9length', 'привет'), '6 chars, 12 bytes (UTF-8)');
  assert.equal(calc('9length', 'héllo 😀'), '7 chars, 11 bytes (UTF-8), 8 UTF-16 units');
});

test('ascii <-> hex', () => {
  assert.equal(calc('9i1', 'abc'), '616263');
  assert.equal(calc('9i2', '616263'), 'abc');
  assert.equal(calc('9i2', 'zz'), 'NaN');
});

test('utf-8 <-> hex', () => {
  assert.equal(calc('9utf8-hex', 'привет'), 'd0bfd180d0b8d0b2d0b5d182');
  assert.equal(calc('9hex-utf8', 'd0bfd180d0b8d0b2d0b5d182'), 'привет');
  assert.equal(calc('9utf8-hex', '😀'), 'f09f9880');
  assert.equal(calc('9hex-utf8', 'zz'), 'NaN');
  assert.equal(calc('9hex-utf8', 'ff'), 'Parse error', 'invalid UTF-8');
});

test('utf-16 <-> hex (big endian)', () => {
  assert.equal(calc('9utf16-hex', 'abc'), '006100620063');
  assert.equal(calc('9hex-utf16', '006100620063'), 'abc');
  assert.equal(calc('9utf16-hex', 'привет'), '043f04400438043204350442');
});

test('code points', () => {
  assert.equal(calc('9codepoints', ''), '');
  assert.equal(calc('9codepoints', 'aé😀'), 'U+0061 U+00E9 U+1F600');
});

test('utf8() helper', () => {
  assert.equal(ctx.utf8('abc'), 'abc');
  assert.equal(ctx.utf8('привет').length, 12);
  assert.equal(ctx.utf8('😀'), '\u00f0\u009f\u0098\u0080');
});
