'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calc, ctx } = require('./load');

const doc = '{"b":[3,1,{"z":null,"a":"x"}],"a":true,"n":1.5e3,"s":"h\\u00e9\\n"}';
const { hasher } = ctx;
const sorted = (on, fn) => { hasher.options.json.sorted = on; try { return fn(); } finally { hasher.options.json.sorted = false; } };

test('pretty', () => {
  assert.equal(calc('12pretty', doc), [
    '{',
    '  "b": [',
    '    3,',
    '    1,',
    '    {',
    '      "z": null,',
    '      "a": "x"',
    '    }',
    '  ],',
    '  "a": true,',
    '  "n": 1500,',
    '  "s": "hé\\n"',
    '}',
  ].join('\n'));
  assert.equal(calc('12pretty', '  [1, 2]  '), '[\n  1,\n  2\n]');
  assert.equal(calc('12pretty', '"just a string"'), '"just a string"');
  assert.equal(calc('12pretty', '42'), '42');
});

test('pretty with sorted keys (recursive, arrays keep order)', () => {
  assert.equal(sorted(true, () => calc('12pretty', doc)), [
    '{',
    '  "a": true,',
    '  "b": [',
    '    3,',
    '    1,',
    '    {',
    '      "a": "x",',
    '      "z": null',
    '    }',
    '  ],',
    '  "n": 1500,',
    '  "s": "hé\\n"',
    '}',
  ].join('\n'));
  assert.equal(sorted(true, () => calc('12min', '{"b":1,"a":[{"d":1,"c":2}]}')), '{"a":[{"c":2,"d":1}],"b":1}');
});

test('minified', () => {
  assert.equal(calc('12min', '{\n  "a": 1,\n  "b": [ 1, 2 ]\n}'), '{"a":1,"b":[1,2]}');
});

test('hints', () => {
  assert.equal(hasher.elements.j1.hint(doc), '4 keys, 13 lines');
  assert.equal(sorted(true, () => hasher.elements.j1.hint(doc)), '4 keys, 13 lines, sorted');
  assert.equal(hasher.elements.j1.hint('[1,2,3]'), '3 items, 5 lines');
  assert.equal(hasher.elements.j1.hint('"s"'), 'string, 1 lines');
  assert.equal(hasher.elements.j3.hint('{ "a" : 1 }'), '7 chars');
  assert.equal(hasher.elements.j1.hint('{bad'), '');
});

test('quote and unquote as a JSON string', () => {
  assert.equal(calc('12string', 'héllo "world"\nline 2'), '"héllo \\"world\\"\\nline 2"');
  assert.equal(calc('12unstring', '"héllo \\"world\\"\\nline 2"'), 'héllo "world"\nline 2');
  assert.equal(calc('12unstring', '"\\u00e9"'), 'é');
  assert.equal(calc('12unstring', '{"a":1}'), '', 'not a string');
  assert.equal(calc('12unstring', '42'), '', 'not a string');
});

test('invalid JSON', () => {
  assert.match(calc('12pretty', '{"a":1,}'), /^Invalid: .*position 7/);
  assert.match(calc('12pretty', 'nope'), /^Invalid: /);
  assert.equal(calc('12min', '{"a":1,}'), '');
  assert.equal(calc('12unstring', '"unterminated'), '');
});

test('empty input', () => {
  for (const id of ['12pretty', '12min', '12string', '12unstring']) {
    assert.equal(calc(id, ''), '', id);
    assert.equal(calc(id, '   '), id === '12string' ? '"   "' : '', id);
  }
});
