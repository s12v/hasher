'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calc } = require('./load');

// Check values for "123456789". CRC-16 is CRC-16/XMODEM (ZMODEM), FCS-16 is
// CRC-16/X-25 (PPP, RFC 1662), CRC-32 is CRC-32/ISO-HDLC (zlib); CRC-8 is the
// 1989 AnDan table, kept as a regression value.
test('check values for "123456789"', () => {
  assert.equal(calc('3crc8', '123456789'), '0xFC');
  assert.equal(calc('3crc16', '123456789'), '0x31C3');
  assert.equal(calc('3fsc16', '123456789'), '0x906E');
  assert.equal(calc('3crc32b', '123456789'), '0xCBF43926');
});

test('empty input', () => {
  assert.equal(calc('3crc8', ''), '0x00');
  assert.equal(calc('3crc16', ''), '0x0000');
  assert.equal(calc('3fsc16', ''), '0x0000');
  assert.equal(calc('3crc32b', ''), '0x00000000');
});

// python3 -c 'import zlib; print(hex(zlib.crc32("привет".encode())))'
test('crc32 hashes UTF-8 bytes', () => {
  assert.equal(calc('3crc32b', 'привет'), '0x2E763E4E');
  assert.equal(calc('3crc32b', 'abc'), '0x352441C2');
});
