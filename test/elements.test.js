'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ctx } = require('./load');

const { hasher, tabs } = ctx;
const elements = Object.values(hasher.elements);

test('every element belongs to a known tab and has a unique id', () => {
  const ids = new Set();
  const tabIds = new Set(Object.values(tabs));
  for (const element of elements) {
    assert.ok(tabIds.has(element.tab), `${element.id}: unknown tab ${element.tab}`);
    assert.ok(!ids.has(element.id), `duplicate id ${element.id}`);
    ids.add(element.id);
    assert.equal(typeof element.title, 'string');
    assert.equal(typeof element.calculate, 'function');
  }
});

test('every tab has at least one element', () => {
  for (const [name, tab] of Object.entries(tabs)) {
    assert.ok(elements.some((e) => e.tab === tab), `tab ${name} is empty`);
  }
});

// hasher.update() runs every element of a tab in one loop; a throw in one blanks the rest
const nasty = ['', ' ', '%', '%%E0', 'U2FsdGVkX1', '=', '🙂🙂🙂', 'ff', '9'.repeat(50), '\n\n', '256.256.256.256/33', '<script>'];
for (const input of nasty) {
  test(`no element throws on ${JSON.stringify(input)}`, () => {
    for (const element of elements) {
      let value;
      assert.doesNotThrow(() => { value = element.calculate(input, 'pw'); }, element.id);
      assert.doesNotThrow(() => String(value), `${element.id}: value is not stringifiable`);
    }
  });
}
