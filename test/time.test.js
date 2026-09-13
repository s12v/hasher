'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calc, ctx } = require('./load');

const pad = (n) => String(n).padStart(2, '0');
const local = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

test('unix seconds', () => {
  assert.equal(calc('6date2iso', '1551260215'), '2019-02-27T09:36:55.000Z');
  assert.equal(calc('6date2ts', '1551260215'), '1551260215');
  assert.equal(calc('6date2ms', '1551260215'), '1551260215000');
  assert.equal(calc('6ts2RFC1123', '1551260215'), 'Wed, 27 Feb 2019 09:36:55 GMT');
  assert.equal(calc('6date2sqlutc', '1551260215'), '2019-02-27 09:36:55');
  assert.equal(calc('6date2sql', '1551260215'), local(new Date(1551260215000)));
  assert.equal(ctx.hasher.findById('6ts2date'), null, 'the Local time row is gone');
});

test('row order', () => {
  const titles = Object.values(ctx.hasher.elements).filter((e) => e.tab === ctx.tabs.time).map((e) => e.title);
  assert.deepEqual(Array.from(titles), ['Unixtime', 'Unixtime (ms)', 'ISO 8601', 'RFC-1123', 'DATETIME (UTC)', 'DATETIME (local)', 'Duration']);
});

test('every output format parses back to the same instant', () => {
  const ts = '1551260215';
  for (const id of ['6date2ms', '6date2iso', '6ts2RFC1123', '6date2sql']) {
    const out = calc(id, ts);
    assert.equal(calc('6date2ts', out), ts, `${id}: ${out}`);
  }
  // DATETIME (UTC) has the same shape as local, so it reads back as local time: only equal in UTC
  if (new Date(1551260215000).getTimezoneOffset() === 0) {
    assert.equal(calc('6date2ts', calc('6date2sqlutc', ts)), ts);
  }
});

test('DATETIME (local) input', () => {
  const d = new Date(2019, 1, 27, 9, 36, 55);
  assert.equal(calc('6date2ts', '2019-02-27 09:36:55'), String(Math.floor(d.getTime() / 1000)));
  assert.equal(calc('6date2ts', '2019-02-27T09:36:55'), String(Math.floor(d.getTime() / 1000)), 'T separator without a zone is local too');
  assert.equal(calc('6date2ts', '2019-02-27 09:36'), String(Math.floor(new Date(2019, 1, 27, 9, 36).getTime() / 1000)));
  assert.equal(calc('6date2ms', '2019-02-27 09:36:55.5'), String(new Date(2019, 1, 27, 9, 36, 55, 500).getTime()));
  assert.equal(calc('6date2ts', '2019-02-27'), String(Math.floor(new Date(2019, 1, 27).getTime() / 1000)), 'a bare date is local midnight');
  assert.equal(calc('6date2ts', '2019-02-27T09:36:55+02:00'), '1551253015', 'an explicit offset is honoured');
  assert.equal(calc('6date2ts', '2019-13-45 99:99'), '');
});

test('unix milliseconds (13 digits, issue #7)', () => {
  assert.equal(calc('6date2iso', '1551260215823'), '2019-02-27T09:36:55.823Z');
  assert.equal(calc('6date2ts', '1551260215823'), '1551260215');
  assert.equal(calc('6date2ms', '1551260215823'), '1551260215823');
});

test('date strings', () => {
  assert.equal(calc('6date2ts', '2019-02-27T09:36:55Z'), '1551260215');
  assert.equal(calc('6date2ts', ' 2019-02-27T09:36:55Z\n'), '1551260215', 'surrounding whitespace');
  assert.equal(calc('6date2ts', 'Wed, 27 Feb 2019 09:36:55 GMT'), '1551260215');
  assert.equal(calc('6date2iso', '1970-01-01T00:00:00Z'), '1970-01-01T00:00:00.000Z');
});

test('epoch and small values', () => {
  assert.equal(calc('6date2iso', '0'), '1970-01-01T00:00:00.000Z');
  assert.equal(calc('6date2iso', '1'), '1970-01-01T00:00:01.000Z');
});

test('garbage', () => {
  for (const id of ['6date2ts', '6date2ms', '6date2sql', '6date2sqlutc', '6ts2RFC1123', '6date2iso']) {
    assert.equal(calc(id, 'garbage'), '');
    assert.equal(calc(id, '12:99:99 nope'), '');
  }
});

test('empty input is now', () => {
  const before = Math.floor(Date.now() / 1000);
  const ts = Number(calc('6date2ts', ''));
  assert.ok(ts >= before && ts <= before + 2, `${ts} is not now`);
  assert.match(calc('6date2iso', '   '), /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(ctx.hasher.elements.time1.hint(''), 'just now');
  assert.match(ctx.hasher.elements.time1.hint('0'), /^\d+ years ago$/, 'epoch is in the past');
  assert.equal(ctx.hasher.elements.time1.hint('garbage'), '');
});

test('parseDate', () => {
  assert.equal(ctx.parseDate('garbage'), null);
  assert.equal(ctx.parseDate(''), null);
  assert.equal(ctx.parseDate('1551260215').getTime(), 1551260215000);
  assert.equal(ctx.parseDate('1551260215823').getTime(), 1551260215823);
});
