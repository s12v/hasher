'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { ctx, calc, root } = require('./load');

const { passgen, hasher } = ctx;
const wordlist = zlib.gunzipSync(fs.readFileSync(path.join(root, 'lib/wordlist/eff_large_wordlist.txt.gz'))).toString('utf8');
passgen.setWords(wordlist);

// A few EFF entries are hyphenated (drop-down), so word tests use a space separator
const WORD = '[a-z]+(?:-[a-z]+)?';
const CAP_WORD = '[A-Z][a-z]+(?:-[a-z]+)?';

test('before the wordlist is loaded', () => {
  const words = passgen.words;
  passgen.words = [];
  try {
    assert.equal(calc('10phrase', ''), '');
    assert.equal(passgen.passphraseBits({ words: 5 }), 0);
    assert.notEqual(calc('10word', ''), '', 'passwords do not need the wordlist');
  } finally {
    passgen.words = words;
  }
});

test('wordlist integrity', () => {
  assert.equal(passgen.words.length, 7776);
  assert.equal(passgen.words[0], 'abacus');
  assert.equal(passgen.words[7775], 'zoom');
  assert.equal(new Set(passgen.words).size, 7776, 'no duplicates');
  for (const w of passgen.words) {
    assert.match(w, new RegExp(`^${WORD}$`), w);
  }
});

test('uniform stays in range', () => {
  for (const n of [1, 2, 7776, 10, 62, 88, 100000000]) {
    for (let i = 0; i < 200; i++) {
      const r = passgen.uniform(n);
      assert.ok(Number.isInteger(r) && r >= 0 && r < n, `${r} not in [0, ${n})`);
    }
  }
});

test('uniform is roughly even', () => {
  const n = 10;
  const draws = 20000;
  const counts = new Array(n).fill(0);
  for (let i = 0; i < draws; i++) counts[passgen.uniform(n)]++;
  for (const c of counts) {
    assert.ok(Math.abs(c - draws / n) < draws / n * 0.15, `bucket ${c} far from ${draws / n}`);
  }
});

test('passphrase shape', () => {
  const p = passgen.passphrase({ words: 5, separator: ' ', digits: 0, capitalize: false });
  const words = p.split(' ');
  assert.equal(words.length, 5);
  for (const w of words) assert.ok(passgen.words.includes(w), w);
});

test('passphrase options', () => {
  assert.match(passgen.passphrase({ words: 3, separator: '.', digits: 2, capitalize: true }), new RegExp(`^(${CAP_WORD}\\.){2}${CAP_WORD}\\d{2}$`));
  assert.match(passgen.passphrase({ words: 1, separator: '', digits: 8 }), new RegExp(`^${WORD}\\d{8}$`), 'digits are zero-padded');
  assert.match(passgen.passphrase({ words: 2, separator: ' ' }), new RegExp(`^${WORD} ${WORD}$`));
  assert.match(passgen.passphrase({ words: 2 }), new RegExp(`^${WORD}-${WORD}$`), 'default separator');
});

test('passphrase clamps bad option values', () => {
  assert.equal(passgen.passphrase({ words: 0, separator: ' ' }).split(' ').length, 1);
  assert.equal(passgen.passphrase({ words: 999, separator: ' ' }).split(' ').length, 64);
  assert.equal(passgen.passphrase({ words: 'abc', separator: ' ' }).split(' ').length, 5);
  assert.match(passgen.passphrase({ words: 1, digits: 99 }), new RegExp(`^${WORD}\\d{8}$`));
  assert.match(passgen.passphrase({ words: 1, digits: -3 }), new RegExp(`^${WORD}$`));
});

test('passphrases differ', () => {
  assert.notEqual(passgen.passphrase({ words: 5 }), passgen.passphrase({ words: 5 }));
});

test('password alphabet', () => {
  const plain = passgen.password({ length: 256, symbols: false });
  assert.equal(plain.length, 256);
  assert.match(plain, /^[A-Za-z0-9]+$/);
  const withSymbols = passgen.password({ length: 256, symbols: true });
  assert.match(withSymbols, /^[A-Za-z0-9!@#$%^&*()\-_=+\[\]{};:,.<>?/]+$/);
  assert.match(withSymbols, /[!@#$%^&*()\-_=+\[\]{};:,.<>?/]/, 'a 256-char password with symbols enabled contains at least one');
  assert.doesNotMatch(withSymbols, /["'\\| ]/, 'quotes, backslash, pipe and space are excluded');
});

test('password length is clamped', () => {
  assert.equal(passgen.password({ length: 0 }).length, 1);
  assert.equal(passgen.password({ length: 1000 }).length, 256);
  assert.equal(passgen.password({ length: 'x' }).length, 16);
});

test('entropy estimate (matches ppgen README)', () => {
  const b = (o) => Math.round(passgen.passphraseBits(o));
  assert.equal(b({ words: 3 }), 39);
  assert.equal(b({ words: 4 }), 52);
  assert.equal(b({ words: 5 }), 65);
  assert.equal(b({ words: 4, digits: 2 }), 58);
  assert.equal(b({ words: 8 }), 103);
  assert.equal(b({ words: 5, capitalize: true }), 65, 'capitalize adds nothing');
  const p = (o) => Math.round(passgen.passwordBits(o));
  assert.equal(p({ length: 16 }), 95);
  assert.equal(p({ length: 7 }), 42);
  assert.equal(p({ length: 16, symbols: true }), 103);
});

test('elements read hasher.options', () => {
  hasher.options.passphrase = { words: 2, separator: '_', digits: 1, capitalize: false };
  hasher.options.password = { length: 8, symbols: false };
  assert.match(calc('10phrase', 'ignored input'), new RegExp(`^${WORD}_${WORD}\\d$`));
  assert.match(calc('10word', 'ignored input'), /^[A-Za-z0-9]{8}$/);
  assert.equal(hasher.elements.p1.hint(), 'entropy: ~29.2 bits');
  assert.equal(hasher.elements.p2.hint(), 'entropy: ~47.6 bits');
});

test('random key', () => {
  hasher.options.key = { bytes: 32 };
  const hex = calc('10key', '');
  assert.match(hex, /^[0-9a-f]{64}$/);
  assert.notEqual(hex, calc('10key', ''));
  assert.match(calc('10key-b64', ''), /^[A-Za-z0-9+/]{43}=$/, '32 bytes of base64');
  assert.equal(hasher.elements.p6.hint(), 'entropy: 256 bits · openssl rand -hex 32');
  assert.equal(hasher.elements.p6b.hint(), 'entropy: 256 bits · openssl rand -base64 32');
  hasher.options.key = { bytes: 16 };
  assert.match(calc('10key', ''), /^[0-9a-f]{32}$/);
  hasher.options.key = { bytes: 99999 };
  assert.equal(calc('10key', '').length, 2048, 'clamped to 1024 bytes');
  hasher.options.key = { bytes: 32 };
});
