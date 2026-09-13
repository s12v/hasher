'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ctx, calc } = require('./load');

const { diff, hasher } = ctx;
const ops = (a, b, o) => Array.from(diff.lines(a, b, o), (x) => x.op + ':' + (x.op === 'add' ? x.b : x.a));

test('line alignment', () => {
  assert.deepEqual(ops('a\nb\nc\n', 'a\nb\nc\n'), ['eq:a', 'eq:b', 'eq:c']);
  assert.deepEqual(ops('a\nb\nc\n', 'a\nc\n'), ['eq:a', 'del:b', 'eq:c']);
  assert.deepEqual(ops('a\nc\n', 'a\nb\nc\n'), ['eq:a', 'add:b', 'eq:c']);
  assert.deepEqual(ops('x\ny\nz\n', 'y\nz\nw\n'), ['del:x', 'eq:y', 'eq:z', 'add:w']);
  assert.deepEqual(ops('', 'one\ntwo\n'), ['add:one', 'add:two']);
  assert.deepEqual(ops('one\ntwo', ''), ['del:one', 'del:two']);
  assert.deepEqual(ops('', ''), []);
  assert.deepEqual(ops('a\n\nb\n', 'a\nb\n'), ['eq:a', 'del:', 'eq:b'], 'empty lines count');
});

test('options', () => {
  assert.deepEqual(ops('Hello  World', 'hello world'), ['del:Hello  World', 'add:hello world']);
  assert.deepEqual(ops('Hello  World', 'hello world', { ignoreCase: true }), ['del:Hello  World', 'add:hello world']);
  assert.deepEqual(ops('Hello  World', 'Hello World', { ignoreWhitespace: true }), ['eq:Hello  World']);
  assert.deepEqual(ops('Hello  World', 'hello world', { ignoreWhitespace: true, ignoreCase: true }), ['eq:Hello  World']);
  assert.deepEqual(ops('  a\t', 'a', { ignoreWhitespace: true }), ['eq:  a\t'], 'leading and trailing whitespace ignored');
});

test('stats', () => {
  const s = diff.stats(diff.lines('a\nb\nc\n', 'a\nB\nc\nd\n'));
  assert.equal(s.added, 2);
  assert.equal(s.removed, 1);
});

test('character segments inside a changed pair', () => {
  const c = diff.chars('  host: localhost', '  host: example.com');
  const join = (segs) => Array.from(segs, (s) => s.text).join('');
  assert.equal(join(c.a), '  host: localhost', 'segments rebuild the left line');
  assert.equal(join(c.b), '  host: example.com', 'segments rebuild the right line');
  assert.equal(c.a[0].op, 'eq');
  assert.equal(c.a[0].text, '  host: ', 'the common prefix is one equal segment');
  assert.equal(c.b[0].text, '  host: ');
  assert.ok(Array.from(c.a).every((s) => s.op !== 'add') && Array.from(c.b).every((s) => s.op !== 'del'));
  const eqA = Array.from(c.a).filter((s) => s.op === 'eq').map((s) => s.text).join('');
  const eqB = Array.from(c.b).filter((s) => s.op === 'eq').map((s) => s.text).join('');
  assert.equal(eqA, eqB, 'both sides share the same equal characters');
  assert.equal(diff.chars('completely', 'different!'), null, 'too dissimilar to highlight');
  assert.equal(diff.chars('abc', 'xyz'), null);
});

// printf ... | diff -u --label a --label b
test('unified diff matches GNU diff', () => {
  const u = (a, b) => diff.unified(diff.lines(a, b));
  assert.equal(
    u('server:\n  host: localhost\n  port: 8080\n  debug: true\nlog: info\n', 'server:\n  host: example.com\n  port: 8080\nlog: warn\nmetrics: on\n'),
    ['--- a', '+++ b', '@@ -1,5 +1,5 @@', ' server:', '-  host: localhost', '+  host: example.com', '   port: 8080', '-  debug: true', '-log: info', '+log: warn', '+metrics: on'].join('\n'),
  );
  const seq = (n) => Array.from({ length: n }, (_, i) => String(i + 1));
  const c = seq(20).join('\n') + '\n';
  const d = seq(20).map((x) => (x === '3' ? 'three' : x === '18' ? 'eighteen' : x)).join('\n') + '\n';
  assert.equal(
    u(c, d),
    ['--- a', '+++ b', '@@ -1,6 +1,6 @@', ' 1', ' 2', '-3', '+three', ' 4', ' 5', ' 6', '@@ -15,6 +15,6 @@', ' 15', ' 16', ' 17', '-18', '+eighteen', ' 19', ' 20'].join('\n'),
    'two hunks with 3 lines of context',
  );
  assert.equal(u('x\ny\nz\n', 'y\nz\nw\n'), ['--- a', '+++ b', '@@ -1,3 +1,3 @@', '-x', ' y', ' z', '+w'].join('\n'));
  assert.equal(u('', 'one\ntwo\n'), ['--- a', '+++ b', '@@ -0,0 +1,2 @@', '+one', '+two'].join('\n'), 'insert into empty');
  assert.equal(u('a\n', 'b\n'), ['--- a', '+++ b', '@@ -1 +1 @@', '-a', '+b'].join('\n'), 'single-line ranges omit the count');
  assert.equal(u('same\n', 'same\n'), '');
});

test('html rendering', () => {
  const h = diff.html(diff.lines('a <b>\nkeep\nc\n', 'a <c>\nkeep\nd\ne\n'));
  assert.match(h, /^<div class="d-line d-del"><span class="d-mark">-<\/span>a &lt;<mark>b<\/mark>&gt;<\/div>/);
  assert.match(h, /<div class="d-line d-add"><span class="d-mark">\+<\/span>a &lt;<mark>c<\/mark>&gt;<\/div>/);
  assert.match(h, /<div class="d-line d-eq"><span class="d-mark"> <\/span>keep<\/div>/);
  assert.doesNotMatch(h, /<b>/, 'markup in the text is escaped');
  assert.equal((h.match(/d-add/g) || []).length, 3);
  assert.equal((h.match(/d-del/g) || []).length, 2);
});

test('elements', () => {
  hasher.options.other = '';
  hasher.options.diff = { ignoreWhitespace: false, ignoreCase: false };
  assert.equal(calc('15changes', ''), '');
  assert.equal(hasher.elements.d1.hint(''), '');
  hasher.options.other = 'a\nb\n';
  assert.equal(hasher.elements.d1.hint('a\nb\n'), 'identical');
  assert.equal(hasher.elements.d1.tone('a\nb\n'), 'ok');
  assert.equal(calc('15changes', 'a\nb\n'), '');
  assert.equal(hasher.elements.d1.hint('a\nc\n'), '+1 −1 lines');
  assert.equal(hasher.elements.d1.tone('a\nc\n'), '');
  assert.match(calc('15changes', 'a\nc\n'), /d-del.*d-add/s);
  hasher.options.diff.ignoreCase = true;
  assert.equal(hasher.elements.d1.hint('A\nB\n'), 'identical');
  hasher.options.other = '';
  hasher.options.diff = { ignoreWhitespace: false, ignoreCase: false };
});

test('large inputs do not blow up', () => {
  const big = Array.from({ length: 3000 }, (_, i) => 'line ' + i).join('\n');
  const changed = big.replace('line 1500', 'LINE 1500');
  const s = diff.stats(diff.lines(big, changed));
  assert.deepEqual({ ...s }, { added: 1, removed: 1 });
  const other = Array.from({ length: 3000 }, (_, i) => 'other ' + i).join('\n');
  assert.deepEqual({ ...diff.stats(diff.lines(big, other)) }, { added: 3000, removed: 3000 }, 'over the cell limit: replaced wholesale');
});

test('changed lines pair with their most similar counterpart', () => {
  // "log: info" should pair with "log: warn", not with "metrics: on" by position
  const h = diff.html(diff.lines('debug: true\nlog: info\n', 'log: warn\nmetrics: on\n'));
  assert.match(h, /d-del"><span class="d-mark">-<\/span>log: <mark>info<\/mark>/);
  assert.match(h, /d-add"><span class="d-mark">\+<\/span>log: <mark>warn<\/mark>/);
  assert.match(h, /d-del"><span class="d-mark">-<\/span>debug: true</, 'unpaired lines are plain');
  assert.match(h, /d-add"><span class="d-mark">\+<\/span>metrics: on</);
});
