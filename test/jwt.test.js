'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ctx, calc, run } = require('./load');

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

test('elements', async () => {
  const { hasher } = ctx;
  assert.equal(calc('13header', HS256), '{\n  "alg": "HS256",\n  "typ": "JWT"\n}');
  assert.equal(calc('13payload', HS256), '{\n  "sub": "1234567890",\n  "name": "John Doe",\n  "iat": 1516239022\n}');
  assert.match(calc('13claims', HS256), /^sub: 1234567890\niat: 2018-\d{2}-\d{2} .* \(issued \d+ years ago\)$/);
  assert.deepEqual(await run('13signature', HS256, ''), { value: 'HS256: enter the secret above to verify', hint: '', tone: '' });
  assert.deepEqual(await run('13signature', HS256, 'your-256-bit-secret'), { value: 'HS256: valid, signed with this secret', hint: '', tone: 'ok' });
  assert.deepEqual(await run('13signature', HS256, 'nope'), { value: 'HS256: INVALID for this secret', hint: '', tone: 'bad' });
  hasher.options.other = '';
  assert.equal(calc('13signature', RS256, 'x'), 'RS256: paste the public key (PEM or JWK) below to verify');
  assert.equal(calc('13header', 'garbage'), 'Invalid: expected 3 dot-separated segments, got 1');
  assert.equal(hasher.elements.w1.hint(HS256), 'HS256');
  assert.equal(hasher.elements.w2.hint(HS256), '3 claims');
  assert.equal(hasher.elements.w1.hint('garbage'), '');
  for (const id of ['13payload', '13claims', '13signature']) {
    assert.equal(calc(id, 'garbage', 'x'), '', id);
    assert.equal(calc(id, '', 'x'), '', id);
  }
});

test('sign a JSON payload with HS256', () => {
  const payload = '{"sub": "1234567890", "name": "John Doe", "iat": 1516239022}';
  const token = calc('13sign', payload, 'your-256-bit-secret');
  assert.equal(token, HS256, 'byte-for-byte the jwt.io example');
  assert.equal(calc('13sign', payload, ''), '');
  assert.equal(ctx.hasher.elements.w5.hint(payload, ''), 'enter a secret above to sign this payload');
  assert.equal(calc('13sign', HS256, 'secret'), '', 'a token is not a payload');
  assert.equal(calc('13sign', '[1,2]', 'secret'), '', 'an array is not a payload');
  assert.equal(calc('13header', payload), '', 'a payload does not show up as an invalid token');
});

const nodeCrypto = require('node:crypto');
const b64u = (buf) => Buffer.from(buf).toString('base64url');
const makeToken = (alg, sign) => {
  const h = b64u(JSON.stringify({ alg, typ: 'JWT' }));
  const p = b64u(JSON.stringify({ sub: '42' }));
  return `${h}.${p}.${b64u(sign(`${h}.${p}`))}`;
};

test('verify RS256 / PS256 / ES256 / EdDSA with a PEM or JWK public key', async () => {
  const { hasher } = ctx;
  const rsa = nodeCrypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const rsaPem = rsa.publicKey.export({ type: 'spki', format: 'pem' });
  const rs256 = makeToken('RS256', (data) => nodeCrypto.sign('sha256', Buffer.from(data), rsa.privateKey));
  hasher.options.other = rsaPem;
  assert.deepEqual(await run('13signature', rs256, ''), { value: 'RS256: valid, signed by this key', hint: '', tone: 'ok' });
  hasher.options.other = JSON.stringify(rsa.publicKey.export({ format: 'jwk' }));
  assert.equal((await run('13signature', rs256, '')).value, 'RS256: valid, signed by this key', 'JWK too');
  hasher.options.other = JSON.stringify({ keys: [rsa.publicKey.export({ format: 'jwk' })] });
  assert.equal((await run('13signature', rs256, '')).value, 'RS256: valid, signed by this key', 'a JWKS too');

  const ps256 = makeToken('PS256', (data) => nodeCrypto.sign('sha256', Buffer.from(data), { key: rsa.privateKey, padding: nodeCrypto.constants.RSA_PKCS1_PSS_PADDING, saltLength: 32 }));
  hasher.options.other = rsaPem;
  assert.equal((await run('13signature', ps256, '')).value, 'PS256: valid, signed by this key');

  const ec = nodeCrypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const es256 = makeToken('ES256', (data) => nodeCrypto.sign('sha256', Buffer.from(data), { key: ec.privateKey, dsaEncoding: 'ieee-p1363' }));
  hasher.options.other = ec.publicKey.export({ type: 'spki', format: 'pem' });
  assert.equal((await run('13signature', es256, '')).value, 'ES256: valid, signed by this key');

  const ed = nodeCrypto.generateKeyPairSync('ed25519');
  const eddsa = makeToken('EdDSA', (data) => nodeCrypto.sign(null, Buffer.from(data), ed.privateKey));
  hasher.options.other = ed.publicKey.export({ type: 'spki', format: 'pem' });
  assert.equal((await run('13signature', eddsa, '')).value, 'EdDSA: valid, signed by this key');

  // the wrong key, a tampered token, a key that is not a key
  const other = nodeCrypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  hasher.options.other = other.publicKey.export({ type: 'spki', format: 'pem' });
  assert.deepEqual(await run('13signature', rs256, ''), { value: 'RS256: INVALID for this key', hint: '', tone: 'bad' });
  hasher.options.other = rsaPem;
  assert.equal((await run('13signature', rs256.slice(0, -4) + 'AAAA', '')).value, 'RS256: INVALID for this key');
  hasher.options.other = 'not a key';
  assert.deepEqual(await run('13signature', rs256, ''), { value: 'RS256: expected a PEM public key or a JWK', hint: '', tone: 'bad' });
  hasher.options.other = '{"kty":"oct"}';
  assert.equal((await run('13signature', rs256, '')).tone, 'bad');
  hasher.options.other = '';
});
