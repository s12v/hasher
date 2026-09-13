'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calc } = require('./load');

const ciphers = ['aes256', 'des', 'tripledes', 'rabbit', 'rc4', 'rc4drop'];

for (const c of ciphers) {
  test(`${c} round trip`, () => {
    const encrypted = calc('4' + c, 'secret text', 'pass');
    assert.match(encrypted, /^U2FsdGVkX1/, 'OpenSSL "Salted__" format');
    assert.equal(calc(`4${c}-d`, encrypted, 'pass'), 'secret text');
    assert.equal(calc(`4${c}-d`, encrypted, 'wrong'), '', 'wrong password gives empty output, not garbage');
  });

  test(`${c} uses a fresh salt every time`, () => {
    assert.notEqual(calc('4' + c, 'secret text', 'pass'), calc('4' + c, 'secret text', 'pass'));
  });
}

// printf 'secret text' | openssl enc -<cipher> -md md5 -pass pass:pass -e -a
test('decrypts openssl enc output', () => {
  assert.equal(calc('4aes256-d', 'U2FsdGVkX19RXEFdiB3NH/mqOBk9VRrXXIaXaQ+jEp8=', 'pass'), 'secret text');
  assert.equal(calc('4des-d', 'U2FsdGVkX18RNX28WoSaR6SoCd8oWsvQb1/jmEn4Utw=', 'pass'), 'secret text');
  assert.equal(calc('4tripledes-d', 'U2FsdGVkX180jZ+5CO7Q2Zz60syQLSIol8SnQAX2zBw=', 'pass'), 'secret text');
});

test('garbage input does not throw', () => {
  for (const c of ciphers) {
    assert.equal(calc(`4${c}-d`, 'not base64 !!!', 'pass'), '');
    assert.equal(calc(`4${c}-d`, '', 'pass'), '');
  }
});

test('non-ASCII plaintext survives the round trip', () => {
  const encrypted = calc('4aes256', 'привет 😀', 'пароль');
  assert.equal(calc('4aes256-d', encrypted, 'пароль'), 'привет 😀');
});
