'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calc, ctx } = require('./load');

const { hasher, numbers } = ctx;

test('decimal in, everything out', () => {
  assert.equal(calc('8dec', '2024'), '2024');
  assert.equal(hasher.elements.n1.hint('2024'), 'read as decimal · 11 bits · 1.98 KiB (2.02 kB) if bytes');
  assert.equal(calc('8hex', '2024'), '0x7e8');
  assert.equal(hasher.elements.n2.alt.calculate('2024'), '0o3750');
  assert.equal(calc('8bin', '2024'), '00000111 11101000');
  assert.equal(calc('8roman', '2024'), 'MMXXIV');
  assert.equal(calc('8float64', '2024'), '', 'integers have no IEEE-754 rows');
});

test('any base in', () => {
  for (const s of ['0x2a', '2a', '0B101010', '0o52', 'XLII', 'xlii', '42', '4_2', ' 42 ']) {
    assert.equal(calc('8dec', s), '42', s);
  }
  assert.equal(hasher.elements.n1.hint('0x2a'), 'read as hex · 6 bits');
  assert.equal(hasher.elements.n1.hint('XLII'), 'read as Roman · 6 bits');
  assert.equal(hasher.elements.n1.hint('0b101010'), 'read as binary · 6 bits');
  assert.equal(calc('8dec', 'ff'), '255', 'letters make it hex');
  assert.equal(calc('8dec', '1e3'), '483', '1e3 is hex, not scientific');
  assert.equal(calc('8dec', '1e+3'), '1000', 'a signed exponent is scientific');
  assert.equal(calc('8dec', '1.0e3'), '1000');
});

test('negative numbers', () => {
  assert.equal(calc('8dec', '-42'), '-42');
  assert.equal(calc('8hex', '-42'), '-0x2a');
  assert.equal(calc('8bin', '-42'), '-00101010');
  assert.equal(calc('8roman', '-42'), '');
  assert.equal(calc('8dec', '-0x2a'), '-42');
});

test('arbitrary size', () => {
  const big = '123456789012345678901234567890';
  assert.equal(calc('8dec', big), big);
  assert.equal(calc('8hex', big), '0x18ee90ff6c373e0ee4e3f0ad2');
  assert.equal(calc('8dec', '0x18ee90ff6c373e0ee4e3f0ad2'), big);
  assert.equal(hasher.elements.n1.hint(big), 'read as decimal · 97 bits · 107081695084.22 EiB (123456789012.35 EB) if bytes');
  assert.equal(calc('8dec', '18446744073709551615'), '18446744073709551615', '2^64-1 survives');
  assert.equal(calc('8hex', '18446744073709551615'), '0xffffffffffffffff');
});

test('roman', () => {
  assert.equal(calc('8roman', '3999'), 'MMMCMXCIX');
  assert.equal(calc('8roman', '4'), 'IV');
  assert.equal(calc('8roman', '4000'), '', 'out of range');
  assert.equal(calc('8roman', '0'), '');
  assert.equal(calc('8dec', 'MCMXCIX'), '1999');
  assert.equal(calc('8dec', 'IIII'), 'Invalid: not a well-formed Roman numeral');
  assert.equal(calc('8dec', 'MMMM'), 'Invalid: not a well-formed Roman numeral');
});

test('floating point and IEEE-754', () => {
  assert.equal(calc('8dec', '3.14'), '3.14');
  assert.equal(hasher.elements.n1.hint('3.14'), 'floating point');
  assert.equal(calc('8float64', '3.14'), '0x40091eb851eb851f');
  assert.equal(hasher.elements.n5.alt.calculate('3.14'), '0x4048f5c3');
  assert.equal(calc('8float64', '-2.5'), '0xc004000000000000');
  assert.equal(calc('8float64', '.5'), '0x3fe0000000000000');
  assert.equal(calc('8hex', '3.14'), '', 'no integer rows for a float');
  assert.equal(calc('8roman', '3.14'), '');
  // hex input of 4 or 8 bytes is also shown as a float
  assert.equal(hasher.elements.n2.hint('0x40490fdb'), 'as float32: 3.1415927410125732');
  assert.equal(hasher.elements.n2.hint('0x400921fb54442d18'), 'as float64: 3.141592653589793');
  assert.equal(hasher.elements.n2.hint('0x2a'), '');
  assert.equal(hasher.elements.n2.hint('1078530011'), '', 'only for hex input');
});

test('size hint', () => {
  assert.equal(numbers.size(1536n), '1.5 KiB (1.54 kB)');
  assert.equal(numbers.size(1073741824n), '1 GiB (1.07 GB)');
  assert.equal(numbers.size(1000n), '', 'below a KiB nothing is said');
});

test('invalid', () => {
  assert.equal(calc('8dec', 'hello'), 'Invalid: not a number');
  assert.equal(calc('8dec', '12.34.56'), 'Invalid: not a number');
  assert.equal(calc('8hex', 'hello'), '');
  assert.equal(calc('8dec', ''), '');
});

test('row order', () => {
  const titles = Object.values(hasher.elements).filter((e) => e.tab === ctx.tabs.number).map((e) => e.title);
  assert.deepEqual(Array.from(titles), ['Decimal', 'Hex', 'Binary', 'Roman', 'IEEE-754 double']);
});
