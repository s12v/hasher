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
  assert.match(calc('14uuid4', ''), UUID);
  assert.match(calc('14uuid7', ''), UUID);
  assert.match(calc('14ulid', ''), /^[0-9A-HJKMNP-TV-Z]{26}$/);
  assert.notEqual(calc('14uuid4', ''), calc('14uuid4', ''));
});

test('hints state the fixed entropy of each format', () => {
  const { hasher } = ctx;
  assert.equal(hasher.elements.p3.hint(), 'entropy: 122 random bits');
  assert.equal(hasher.elements.p4.hint(), 'time-ordered · 48-bit timestamp + 74 random bits');
  assert.equal(hasher.elements.p5.hint(), 'time-ordered · 48-bit timestamp + 80 random bits');
});

test('inspect a pasted UUID', () => {
  const { hasher } = ctx;
  assert.equal(calc('14inspect', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'), 'UUID v1 — time-based, MAC address · RFC 4122 variant');
  assert.match(hasher.elements.u1.hint('6ba7b810-9dad-11d1-80b4-00c04fd430c8'), /^created 1998-02-04T22:13:53\.151Z · \d+ years ago$/);
  assert.equal(calc('14inspect', ids.uuid4()), 'UUID v4 — random · RFC 4122 variant');
  assert.equal(hasher.elements.u1.hint(ids.uuid4()), '', 'v4 has no time');
  const v7 = ids.uuid7(new Date(1700000000123));
  assert.equal(calc('14inspect', v7), 'UUID v7 — time-ordered, Unix ms · RFC 4122 variant');
  assert.match(hasher.elements.u1.hint(v7), /^created 2023-11-14T22:13:20\.123Z/);
  // the RFC 9562 v6 example
  assert.equal(calc('14inspect', '1EC9414C-232A-6B00-B3C8-9F6BDECED846'), 'UUID v6 — time-ordered (reordered v1) · RFC 4122 variant');
  assert.match(hasher.elements.u1.hint('1EC9414C-232A-6B00-B3C8-9F6BDECED846'), /^created 2022-02-22T19:22:22\.000Z/);
  assert.equal(calc('14inspect', '00000000-0000-0000-0000-000000000000'), 'nil UUID (all zeros)');
  assert.equal(calc('14inspect', 'ffffffff-ffff-ffff-ffff-ffffffffffff'), 'max UUID (all ones)');
  assert.equal(calc('14inspect', '{6BA7B810-9DAD-11D1-80B4-00C04FD430C8}'), 'UUID v1 — time-based, MAC address · RFC 4122 variant', 'braces and upper case');
  assert.equal(calc('14inspect', 'urn:uuid:6ba7b810-9dad-11d1-80b4-00c04fd430c8').slice(0, 7), 'UUID v1', 'urn prefix');
  assert.equal(calc('14inspect', '6ba7b8109dad11d180b400c04fd430c8').slice(0, 7), 'UUID v1', 'no dashes');
  assert.equal(calc('14inspect', '01ARYZ6S41TSV4RRFFQ69G5FAV'), 'ULID — 48-bit time + 80 random bits');
  assert.match(hasher.elements.u1.hint('01ARYZ6S41TSV4RRFFQ69G5FAV'), /^created 2016-07-30T22:36:16\.385Z/);
  assert.equal(calc('14inspect', 'hello'), '');
  assert.equal(calc('14inspect', ''), '');
});

// python3 -c 'import uuid; print(uuid.uuid5(uuid.NAMESPACE_DNS, "python.org"))'
test('UUID v5 from a name', () => {
  assert.equal(calc('14v5dns', 'python.org'), '886313e1-3b8a-5372-9b90-0c9aee199e5d');
  assert.equal(calc('14v5url', 'http://python.org'), '50960143-e2b7-5b7a-9ca7-05375f51d5c1');
  assert.equal(calc('14v5dns', 'привет'), '43eec7ca-0ff7-5d77-9faa-6955bd8e6dc9', 'UTF-8 name');
  assert.equal(calc('14v5dns', ' python.org '), '886313e1-3b8a-5372-9b90-0c9aee199e5d', 'trimmed');
  assert.equal(calc('14v5dns', ids.uuid4()), '', 'a UUID is inspected, not hashed');
  assert.equal(calc('14v5dns', '01ARYZ6S41TSV4RRFFQ69G5FAV'), '', 'a ULID too');
  assert.equal(calc('14v5dns', ''), '');
});
