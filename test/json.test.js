'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calc } = require('./load');

const doc = '{"b":[3,1,{"z":null,"a":"x"}],"a":true,"n":1.5e3,"s":"h\\u00e9\\n"}';

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
  assert.equal(calc('12sorted', doc), [
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
});

test('minified', () => {
  assert.equal(calc('12min', '{\n  "a": 1,\n  "b": [ 1, 2 ]\n}'), '{"a":1,"b":[1,2]}');
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
  assert.equal(calc('12sorted', '{"a":1,}'), '');
  assert.equal(calc('12min', '{"a":1,}'), '');
  assert.equal(calc('12unstring', '"unterminated'), '');
});

test('empty input', () => {
  for (const id of ['12pretty', '12sorted', '12min', '12string', '12unstring']) {
    assert.equal(calc(id, ''), '', id);
    assert.equal(calc(id, '   '), id === '12string' ? '"   "' : '', id);
  }
});
