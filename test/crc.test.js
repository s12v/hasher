'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ctx, calc } = require('./load');

const { crc, hasher } = ctx;

test('every model reproduces its catalogue check value for "123456789"', () => {
  for (const [name, m] of Object.entries(crc.MODELS)) {
    assert.equal(crc.of(name, '123456789'), crc.hex(m.check, m.width), name);
  }
  assert.equal(crc.hex(crc.adler32('123456789'), 32), '0x091E01DE');
});

// python3 -c 'import zlib; print(hex(zlib.crc32("привет".encode())), hex(zlib.adler32("привет".encode())))'
test('CRC-32 and Adler-32 hash UTF-8 bytes like zlib', () => {
  assert.equal(calc('3crc32', 'привет'), '0x2E763E4E');
  assert.equal(calc('3crc32', 'abc'), '0x352441C2');
  assert.equal(calc('3adler32', 'привет'), '0x3A1008C3');
  assert.equal(calc('3adler32', 'abc'), '0x024D0127');
});

test('CRC-32C (Castagnoli) of known inputs', () => {
  // known: crc32c("") = 0, crc32c(32 zero bytes) = 0x8A9136AA (RFC 3720 test vector)
  assert.equal(crc.of('CRC-32C', ''), '0x00000000');
  assert.equal(crc.hex(crc.compute(new Uint8Array(32), crc.MODELS['CRC-32C']), 32), '0x8A9136AA');
});

test('empty input and widths', () => {
  assert.equal(calc('3crc32', ''), '0x00000000');
  assert.equal(calc('3modbus', ''), '0xFFFF');
  assert.equal(calc('3ccitt', ''), '0xFFFF');
  assert.equal(calc('3xmodem', ''), '0x0000');
  assert.equal(calc('3crc8', ''), '0x00');
  assert.equal(calc('3crc64', ''), '0x0000000000000000');
  assert.equal(calc('3adler32', ''), '0x00000001');
});

test('rows and decimal hints', () => {
  const titles = Object.values(hasher.elements).filter((e) => e.tab === ctx.tabs.crc).map((e) => e.title);
  assert.deepEqual(Array.from(titles), ['CRC-32', 'CRC-32C', 'CRC-16/MODBUS', 'CRC-16/CCITT-FALSE', 'CRC-16/XMODEM', 'CRC-8', 'CRC-64/XZ', 'Adler-32']);
  assert.equal(hasher.elements.c1.hint('123456789'), 'zlib, PNG, gzip, zip, Ethernet · 3421780262');
  assert.equal(hasher.elements.c3.hint('123456789'), '19255');
  assert.equal(hasher.elements.c7.hint('123456789'), 'xz, ECMA-182 · 11051210869376104954');
  assert.equal(hasher.elements.c8.hint('123456789'), 'zlib · 152961502');
  assert.equal(hasher.elements.c1.hint(''), '');
});
