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
  assert.equal(calc('12pretty', '"just a string"'), 'just a string', 'a string document is shown unquoted');
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
  assert.equal(hasher.elements.j1.hint('"s"'), 'a JSON string with plain text inside, shown unquoted');
  assert.equal(hasher.elements.j3.hint('{ "a" : 1 }'), '7 chars');
  assert.equal(hasher.elements.j1.hint('{bad'), '');
});

test('quote as a JSON string; a pasted string literal is unwrapped', () => {
  assert.equal(calc('12string', 'héllo "world"\nline 2'), '"héllo \\"world\\"\\nline 2"');
  // the document quoted as a string comes straight back as the document
  const quoted = calc('12string', '{"b":1,"a":[1,2]}');
  assert.equal(calc('12pretty', quoted), '{\n  "b": 1,\n  "a": [\n    1,\n    2\n  ]\n}');
  assert.equal(calc('12min', quoted), '{"b":1,"a":[1,2]}');
  assert.equal(hasher.elements.j1.hint(quoted), 'unquoted from a JSON string · 2 keys, 7 lines');
  // a string literal with plain text inside is shown unquoted
  assert.equal(calc('12pretty', '"héllo \\"world\\"\\nline 2"'), 'héllo "world"\nline 2');
  assert.equal(calc('12pretty', '"\\u00e9"'), 'é');
  assert.equal(hasher.elements.j1.hint('"\\u00e9"'), 'a JSON string with plain text inside, shown unquoted');
  assert.equal(calc('12min', '"\\u00e9"'), '', 'nothing to minify in plain text');
  assert.equal(hasher.findById('12unstring'), null, 'the separate unquote row is gone');
});

test('invalid JSON', () => {
  assert.match(calc('12pretty', '{"a":1,}'), /^Invalid: .*position 7/);
  assert.match(calc('12pretty', 'nope'), /^Invalid: /);
  assert.equal(calc('12min', '{"a":1,}'), '');
  assert.equal(calc('12pretty', '"unterminated'), 'Invalid: Unterminated string in JSON at position 13 (line 1 column 14)');
});

test('empty input', () => {
  for (const id of ['12pretty', '12min', '12string']) {
    assert.equal(calc(id, ''), '', id);
    assert.equal(calc(id, '   '), id === '12string' ? '"   "' : '', id);
  }
});
