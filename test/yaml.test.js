'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ctx, calc } = require('./load');

const { yaml, hasher } = ctx;

test('block style', () => {
  assert.equal(yaml.emit({ name: 'hasher', version: '2.2.0', n: 42, f: 3.5, ok: true, nothing: null }),
    'name: hasher\nversion: 2.2.0\n"n": 42\nf: 3.5\nok: true\nnothing: null\n');
  assert.equal(yaml.emit({ tags: ['a', 'b c'], empty: [], obj: {} }), 'tags:\n  - a\n  - b c\nempty: []\nobj: {}\n');
  assert.equal(yaml.emit({ nested: { deep: { x: 1 } } }), 'nested:\n  deep:\n    x: 1\n');
});

test('nested blocks start on the dash line', () => {
  assert.equal(yaml.emit([{ a: 1, b: [] }, { c: {} }, [1, 2], []]), '- a: 1\n  b: []\n- c: {}\n- - 1\n  - 2\n- []\n');
  assert.equal(yaml.emit({ list: [{ x: { y: [1] } }] }), 'list:\n  - x:\n      "y":\n        - 1\n');
});

test('strings are quoted only where YAML would misread them', () => {
  const q = (s) => yaml.scalar(s, 0);
  for (const plain of ['hello', 'b c', 'привет 😀', 'a-b', 'a/b', 'a.b', 'v2', 'it\'s', 'x:y', 'a#b', 'a,b']) {
    assert.equal(q(plain), plain, plain);
  }
  for (const quoted of ['', ' x', 'x ', 'yes', 'No', 'null', '~', 'true', '42', '3.5', '-1', '1e3', '007', '0x1f', '2024-01-01',
    'a: b', 'a #b', '- x', '[1]', '{a}', '|x', '>x', '*ref', '&a', '!tag', '%x', '@x', '`x', '"q"', '\'s', 'a\tb', 'a\rb']) {
    assert.equal(q(quoted), JSON.stringify(quoted), quoted);
  }
  assert.equal(yaml.key('key: with colon'), '"key: with colon"');
  assert.equal(yaml.key('a b'), 'a b');
});

test('multi-line strings use a literal block', () => {
  assert.equal(yaml.emit({ multi: 'l1\nl2\n' }), 'multi: |\n  l1\n  l2\n');
  assert.equal(yaml.emit({ multi: 'l1\nl2' }), 'multi: |-\n  l1\n  l2\n');
  assert.equal(yaml.emit({ multi: 'x\n\ny\n' }), 'multi: |\n  x\n\n  y\n', 'blank lines inside');
  assert.equal(yaml.emit({ multi: ' lead\nx' }), 'multi: " lead\\nx"\n', 'leading space cannot go into a literal block');
});

test('JSON tab row', () => {
  hasher.options.json.sorted = false;
  assert.equal(calc('12yaml', '{"b":[3,1],"a":true}'), 'b:\n  - 3\n  - 1\na: true');
  hasher.options.json.sorted = true;
  assert.equal(calc('12yaml', '{"b":[3,1],"a":true}'), 'a: true\nb:\n  - 3\n  - 1');
  hasher.options.json.sorted = false;
  assert.equal(calc('12yaml', '"just text"'), '', 'nothing to convert for a plain string');
  assert.equal(calc('12yaml', '{bad'), '');
  assert.equal(calc('12yaml', ''), '');
});
