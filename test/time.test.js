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
  assert.equal(calc('6ts2date', '1551260215'), new Date(1551260215000).toLocaleString());
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
  for (const id of ['6date2ts', '6date2ms', '6ts2date', '6date2sql', '6date2sqlutc', '6ts2RFC1123', '6date2iso']) {
    assert.equal(calc(id, ''), '');
    assert.equal(calc(id, 'garbage'), '');
    assert.equal(calc(id, '   '), '');
  }
});

test('parseDate', () => {
  assert.equal(ctx.parseDate('garbage'), null);
  assert.equal(ctx.parseDate(''), null);
  assert.equal(ctx.parseDate('1551260215').getTime(), 1551260215000);
  assert.equal(ctx.parseDate('1551260215823').getTime(), 1551260215823);
});
