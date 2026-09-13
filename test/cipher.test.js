'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ctx, calc } = require('./load');

const { hasher } = ctx;

// printf 'secret text' | openssl enc -aes-256-cbc -pbkdf2 -pass pass:pass -e -a
const PBKDF2 = 'U2FsdGVkX19/wP57wXQH6WeYfPp1B7RGj/7Da1Lf6eg=';
// printf 'привет 😀' | openssl enc -aes-256-cbc -pbkdf2 -pass pass:'пароль' -e -a
const PBKDF2_UTF8 = 'U2FsdGVkX19cuYk6fwmNkHBQXW3GjsMyC+c79yRtgnLidB1wiolqFQOn6SF0JGoG';
// printf 'secret text' | openssl enc -aes-256-cbc -md md5 -pass pass:pass -e -a
const LEGACY = 'U2FsdGVkX19RXEFdiB3NH/mqOBk9VRrXXIaXaQ+jEp8=';

test('rows', () => {
  const titles = Object.values(hasher.elements).filter((e) => e.tab === ctx.tabs.cipher).map((e) => e.title);
  assert.deepEqual(Array.from(titles), ['AES-256-CBC', 'AES-256-CBC, legacy KDF', 'AES-256 decrypt']);
});

test('decrypts what openssl enc -pbkdf2 wrote', () => {
  assert.equal(calc('4aes256-d', PBKDF2, 'pass'), 'secret text');
  assert.equal(calc('4aes256-d', PBKDF2_UTF8, 'пароль'), 'привет 😀');
  assert.equal(hasher.elements.ci3.hint(PBKDF2, 'pass'), 'PBKDF2 payload');
  assert.equal(hasher.elements.ci3.tone(PBKDF2, 'pass'), 'ok');
});

test('decrypts the legacy -md md5 format too', () => {
  assert.equal(calc('4aes256-d', LEGACY, 'pass'), 'secret text');
  assert.equal(hasher.elements.ci3.hint(LEGACY, 'pass'), 'legacy MD5-KDF payload');
});

test('encrypt round trips through both formats and looks like openssl output', () => {
  const modern = calc('4aes256', 'secret text', 'pass');
  assert.match(modern, /^U2FsdGVkX1/, 'Salted__ header');
  assert.equal(calc('4aes256-d', modern, 'pass'), 'secret text');
  assert.equal(hasher.elements.ci3.hint(modern, 'pass'), 'PBKDF2 payload');
  const legacy = calc('4aes256-legacy', 'secret text', 'pass');
  assert.match(legacy, /^U2FsdGVkX1/);
  assert.equal(calc('4aes256-d', legacy, 'pass'), 'secret text');
  assert.notEqual(modern, calc('4aes256', 'secret text', 'pass'), 'fresh salt every time');
});

test('a legacy payload whose PBKDF2 reading happens to unpad cleanly still falls through', () => {
  // the last "plaintext" byte of the wrong-key decrypt is a plausible pad length here and the
  // leftover is valid UTF-8, so a reader trusting PKCS#7 would show noise instead of trying MD5
  const unlucky = 'U2FsdGVkX19KJ3sID6J9qdFFJRQOHjxTE5WyGnR42ic=';
  assert.equal(calc('4aes256-d', unlucky, 'pass'), 'secret text');
  assert.equal(hasher.elements.ci3.hint(unlucky, 'pass'), 'legacy MD5-KDF payload');
});

test('wrong password and garbage give nothing, with a red hint', () => {
  assert.equal(calc('4aes256-d', PBKDF2, 'wrong'), '');
  assert.equal(hasher.elements.ci3.hint(PBKDF2, 'wrong'), 'a Salted__ payload, but not for this password');
  assert.equal(hasher.elements.ci3.hint('plain text to encrypt', 'pass'), '', 'plain text is not called a failed decrypt');
  assert.equal(hasher.elements.ci3.tone('plain text to encrypt', 'pass'), '');
  assert.equal(hasher.elements.ci3.tone(PBKDF2, 'wrong'), 'bad');
  assert.equal(calc('4aes256-d', 'not base64 !!!', 'pass'), '');
  assert.equal(calc('4aes256-d', 'U2FsdGVkX1', 'pass'), '', 'truncated payload');
  assert.equal(calc('4aes256-d', '', 'pass'), '');
});

test('without a password nothing is produced', () => {
  assert.equal(calc('4aes256', 'secret text', ''), '');
  assert.equal(hasher.elements.ci1.hint('secret text', ''), 'enter a password');
  assert.equal(calc('4aes256-legacy', 'secret text', ''), '');
  assert.equal(calc('4aes256-d', PBKDF2, ''), '');
});
