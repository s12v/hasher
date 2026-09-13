'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calc, ctx } = require('./load');

const { hasher, textcase } = ctx;

test('length (issue #6)', () => {
  assert.equal(calc('9length', ''), '');
  assert.equal(calc('9length', 'abc'), '3 chars, 3 bytes (UTF-8)');
  assert.equal(calc('9length', 'привет'), '6 chars, 12 bytes (UTF-8)');
  assert.equal(calc('9length', 'héllo 😀'), '7 chars, 11 bytes (UTF-8), 8 UTF-16 units');
  assert.equal(hasher.elements.s0.hint('one two\nthree\n'), '3 words · 3 lines');
  assert.equal(hasher.elements.s0.hint(''), '');
});

test('utf-8 <-> hex', () => {
  assert.equal(calc('9utf8-hex', 'привет'), 'd0bfd180d0b8d0b2d0b5d182');
  assert.equal(calc('9hex-utf8', 'd0bfd180d0b8d0b2d0b5d182'), 'привет');
  assert.equal(calc('9utf8-hex', '😀'), 'f09f9880');
  assert.equal(calc('9hex-utf8', 'zz'), 'NaN');
  assert.equal(calc('9hex-utf8', 'ff'), 'Parse error', 'invalid UTF-8');
});

test('utf-16 <-> hex, big and little endian', () => {
  assert.equal(calc('9utf16-hex', 'abc'), '006100620063');
  assert.equal(hasher.elements.s5.alt.calculate('abc'), '610062006300');
  assert.equal(calc('9utf16-hex', 'привет'), '043f04400438043204350442');
  assert.equal(hasher.elements.s5.alt.calculate('😀'), '3dd800de', 'surrogate pair, LE');
  assert.equal(calc('9hex-utf16', '006100620063'), 'abc');
  assert.equal(hasher.findById('9i1'), null, 'ASCII rows are gone');
});

test('code points', () => {
  assert.equal(calc('9codepoints', ''), '');
  assert.equal(calc('9codepoints', 'aé😀'), 'U+0061 U+00E9 U+1F600');
});

test('word splitting', () => {
  const w = (s) => Array.from(textcase.words(s));
  assert.deepEqual(w('fooBarBaz'), ['foo', 'bar', 'baz']);
  assert.deepEqual(w('HTTPServerError'), ['http', 'server', 'error']);
  assert.deepEqual(w('user_id-42'), ['user', 'id', '42']);
  assert.deepEqual(w('  hello   world  '), ['hello', 'world']);
  assert.deepEqual(w('Привет, мир!'), ['привет', 'мир']);
  assert.deepEqual(w(''), []);
});

test('case conversions', () => {
  const s = 'hello wonderful world';
  assert.equal(calc('9upper', s), 'HELLO WONDERFUL WORLD');
  assert.equal(hasher.elements.s8.alt.calculate('HeLLo'), 'hello');
  assert.equal(calc('9title', s), 'Hello Wonderful World');
  assert.equal(hasher.elements.s9.alt.calculate(s), 'Hello wonderful world');
  assert.equal(calc('9camel', s), 'helloWonderfulWorld');
  assert.equal(hasher.elements.s10.alt.calculate(s), 'HelloWonderfulWorld');
  assert.equal(calc('9snake', s), 'hello_wonderful_world');
  assert.equal(hasher.elements.s11.alt.calculate(s), 'hello-wonderful-world');
  assert.equal(calc('9constant', s), 'HELLO_WONDERFUL_WORLD');
  assert.equal(hasher.elements.s12.alt.calculate(s), 'hello-wonderful-world');
  assert.equal(calc('9snake', 'fooBarBaz'), 'foo_bar_baz', 'camelCase in');
  assert.equal(calc('9camel', 'FOO_BAR'), 'fooBar', 'CONSTANT in');
});

test('slug strips diacritics and keeps other scripts', () => {
  assert.equal(hasher.elements.s12.alt.calculate('  Ünïcödé Café, Straße!  '), 'unicode-cafe-straße');
  assert.equal(hasher.elements.s12.alt.calculate('Привет, мир!'), 'привет-мир');
  assert.equal(hasher.elements.s12.alt.calculate('fooBarBaz'), 'foo-bar-baz');
  assert.equal(hasher.elements.s12.alt.calculate('---'), '');
});

test('utf8() helper', () => {
  assert.equal(ctx.utf8('abc'), 'abc');
  assert.equal(ctx.utf8('привет').length, 12);
  assert.equal(ctx.utf8('😀'), 'ð');
});
