'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ctx, calc } = require('./load');

const { jwt } = ctx;

// The jwt.io example, secret "your-256-bit-secret"
const HS256 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
// Made with node:crypto, secret "s3cret"
const HS512 = 'eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MiIsImlzcyI6Imhhc2hlciIsImF1ZCI6WyJhIiwiYiJdLCJleHAiOjE5MDAwMDAwMDAsIm5iZiI6MTUwMDAwMDAwMCwiaWF0IjoxNTAwMDAwMDAwLCJqdGkiOiJ4MSJ9.N2x-5Ufa6Hhd1ea3e67xAN4NXXYQKn8M3WV-W6Og1wn5Ba4K3O-UWQUzIvMqPrxLeVnsGFXdqq4C4w9tSJww_w';
const HS384 = 'eyJhbGciOiJIUzM4NCIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MiJ9.f7jrIbxQ3WcLbI2Ib3GGP4Jpac4Ef4ReKRN4bYX5LqQ755ARSxINRZGv2jOKT3Rx';
const RS256 = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.c2ln';

test('parse', () => {
  const t = jwt.parse(HS256);
  assert.deepEqual({ ...t.header }, { alg: 'HS256', typ: 'JWT' });
  assert.deepEqual({ ...t.payload }, { sub: '1234567890', name: 'John Doe', iat: 1516239022 });
  assert.equal(t.signature, 'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');
  assert.equal(t.signingInput, HS256.slice(0, HS256.lastIndexOf('.')));
  assert.equal(jwt.parse('  ' + HS256 + '\n').signature, t.signature, 'whitespace trimmed');
});

test('parse errors', () => {
  assert.throws(() => jwt.parse('a.b'), /expected 3 dot-separated segments, got 2/);
  assert.throws(() => jwt.parse('a.b.c.d'), /got 4/);
  assert.throws(() => jwt.parse('a+b.c.d'), /base64url/);
  assert.throws(() => jwt.parse('bm90anNvbg.e30.c2ln'), /header is not base64url JSON/);
  assert.throws(() => jwt.parse('e30.bm90anNvbg.c2ln'), /payload is not base64url JSON/);
  assert.throws(() => jwt.parse('NDI.e30.c2ln'), /header is not a JSON object/);
});

test('verify HS256 / HS384 / HS512', () => {
  assert.equal(jwt.verify(jwt.parse(HS256), 'your-256-bit-secret'), true);
  assert.equal(jwt.verify(jwt.parse(HS256), 'wrong'), false);
  assert.equal(jwt.verify(jwt.parse(HS512), 's3cret'), true);
  assert.equal(jwt.verify(jwt.parse(HS512), 's3cret '), false);
  assert.equal(jwt.verify(jwt.parse(HS384), 's3cret'), true);
  assert.equal(jwt.verify(jwt.parse(RS256), 'anything'), null, 'unsupported algorithm');
  const tampered = HS256.replace('.SflK', '.TflK');
  assert.equal(jwt.verify(jwt.parse(tampered), 'your-256-bit-secret'), false);
});

test('relative time', () => {
  assert.equal(jwt.relative(0), 'just now');
  assert.equal(jwt.relative(1), 'in 1 second');
  assert.equal(jwt.relative(-59), '59 seconds ago');
  assert.equal(jwt.relative(3600 * 2 + 5), 'in 2 hours');
  assert.equal(jwt.relative(-86400 * 3), '3 days ago');
  assert.equal(jwt.relative(86400 * 400), 'in 1 year');
});

test('claims', () => {
  const now = new Date(1700000000 * 1000);
  const lines = Array.from(jwt.describeClaims(jwt.parse(HS512).payload, now));
  assert.equal(lines.length, 7);
  assert.equal(lines[0], 'iss: hasher');
  assert.equal(lines[1], 'sub: 42');
  assert.equal(lines[2], 'aud: ["a","b"]');
  assert.match(lines[3], /^exp: 2030-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \(expires in 6 years\)$/);
  assert.match(lines[4], /^nbf: 2017-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \(not before 6 years ago\)$/);
  assert.match(lines[5], /^iat: 2017-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \(issued 6 years ago\)$/);
  assert.equal(lines[6], 'jti: x1');

  const expired = Array.from(jwt.describeClaims({ exp: 1700000000 - 7200 }, now));
  assert.match(expired[0], /\(EXPIRED 2 hours ago\)$/);
  assert.deepEqual(Array.from(jwt.describeClaims({ custom: 1 }, now)), [], 'only registered claims');
  assert.deepEqual(Array.from(jwt.describeClaims('not an object', now)), []);
});

test('elements', () => {
  assert.equal(calc('13header', HS256), '{\n  "alg": "HS256",\n  "typ": "JWT"\n}');
  assert.equal(calc('13payload', HS256), '{\n  "sub": "1234567890",\n  "name": "John Doe",\n  "iat": 1516239022\n}');
  assert.match(calc('13claims', HS256), /^sub: 1234567890\niat: 2018-\d{2}-\d{2} .* \(issued \d+ years ago\)$/);
  assert.equal(calc('13signature', HS256, ''), 'HS256: enter the secret above to verify');
  assert.equal(calc('13signature', HS256, 'your-256-bit-secret'), 'HS256: valid, signed with this secret');
  assert.equal(calc('13signature', HS256, 'nope'), 'HS256: INVALID for this secret');
  assert.equal(calc('13signature', RS256, 'x'), 'RS256: cannot verify here (only HS256/384/512)');
  assert.equal(calc('13header', 'garbage'), 'Invalid: expected 3 dot-separated segments, got 1');
  for (const id of ['13payload', '13claims', '13signature']) {
    assert.equal(calc(id, 'garbage', 'x'), '', id);
    assert.equal(calc(id, '', 'x'), '', id);
  }
});
