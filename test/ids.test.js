'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ctx, calc } = require('./load');

const { ids } = ctx;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-([0-9a-f])[0-9a-f]{3}-([0-9a-f])[0-9a-f]{3}-[0-9a-f]{12}$/;

test('uuid v4', () => {
  const seen = new Set();
  for (let i = 0; i < 100; i++) {
    const u = ids.uuid4();
    const m = u.match(UUID);
    assert.ok(m, u);
    assert.equal(m[1], '4', 'version nibble');
    assert.match(m[2], /[89ab]/, 'variant');
    seen.add(u);
  }
  assert.equal(seen.size, 100);
});

test('uuid v7', () => {
  const before = Date.now();
  const u = ids.uuid7();
  const after = Date.now();
  const m = u.match(UUID);
  assert.ok(m, u);
  assert.equal(m[1], '7');
  assert.match(m[2], /[89ab]/);
  const t = ids.uuid7Time(u);
  assert.ok(t >= before && t <= after, `${t} not in [${before}, ${after}]`);

  const fixed = ids.uuid7(new Date(1700000000123));
  assert.equal(fixed.slice(0, 13), '018bcfe5-687b'); // 1700000000123 = 0x18bcfe5687b
  assert.equal(ids.uuid7Time(fixed), 1700000000123);
  assert.ok(ids.uuid7(new Date(1000)) < ids.uuid7(new Date(2000)), 'sorts by time');
});

test('ulid', () => {
  const before = Date.now();
  const u = ids.ulid();
  const after = Date.now();
  assert.match(u, /^[0-9A-HJKMNP-TV-Z]{26}$/, 'Crockford base32, 26 chars');
  const t = ids.ulidTime(u);
  assert.ok(t >= before && t <= after, `${t} not in [${before}, ${after}]`);

  // reference: the ULID spec's time encoding
  const fixed = ids.ulid(new Date(1469918176385));
  assert.equal(fixed.slice(0, 10), '01ARYZ6S41');
  assert.equal(ids.ulidTime(fixed), 1469918176385);
  assert.ok(ids.ulid(new Date(1000)) < ids.ulid(new Date(2000)), 'sorts by time');
  assert.equal(new Set(Array.from({ length: 100 }, () => ids.ulid())).size, 100);
});

test('elements', () => {
  assert.match(calc('10uuid4', ''), UUID);
  assert.match(calc('10uuid7', ''), UUID);
  assert.match(calc('10ulid', ''), /^[0-9A-HJKMNP-TV-Z]{26}$/);
  assert.notEqual(calc('10uuid4', ''), calc('10uuid4', ''));
});
