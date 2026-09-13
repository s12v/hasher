'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calc } = require('./load');

test('ip <-> dec/bin/hex', () => {
  assert.equal(calc('5ip2dec', '192.168.1.10'), '3232235786');
  assert.equal(calc('5dec2ip', '3232235786'), '192.168.1.10');
  assert.equal(calc('5ip2bin', '192.168.1.10'), '11000000101010000000000100001010');
  assert.equal(calc('5ip2hex', '192.168.1.10'), 'c0a8010a');
  assert.equal(calc('5ip2bin', '0.0.0.1'), '00000000000000000000000000000001');
  assert.equal(calc('5ip2dec', '255.255.255.255'), '4294967295');
});

test('subnet with prefix length', () => {
  assert.equal(calc('5network', '192.168.1.10/24'), '192.168.1.0/255.255.255.0');
  assert.equal(calc('5hostmin', '192.168.1.10/24'), '192.168.1.1');
  assert.equal(calc('5hostmax', '192.168.1.10/24'), '192.168.1.254');
  assert.equal(calc('5broadcast', '192.168.1.10/24'), '192.168.1.255');
  assert.equal(calc('5hostnum', '192.168.1.10/24'), '254');
});

test('prefix length hint', () => {
  const { hasher } = require('./load').ctx;
  assert.equal(hasher.elements.net5.hint('192.168.1.10/24'), '/24');
  assert.equal(hasher.elements.net5.hint('10.1.2.3/255.255.0.0'), '/16');
  assert.equal(hasher.elements.net5.hint('200.200.200.200/8'), '/8');
  assert.equal(hasher.elements.net5.hint('1.2.3.4/32'), '', '/32 is not a valid netmask here');
  assert.equal(hasher.elements.net5.hint('1.2.3.4'), '');
});

test('subnet with dotted netmask', () => {
  assert.equal(calc('5network', '10.1.2.3/255.255.0.0'), '10.1.0.0/255.255.0.0');
  assert.equal(calc('5hostnum', '10.1.2.3/255.255.0.0'), '65534');
});

test('high bit set (no signed-int trouble)', () => {
  assert.equal(calc('5network', '200.200.200.200/8'), '200.0.0.0/255.0.0.0');
  assert.equal(calc('5broadcast', '200.200.200.200/8'), '200.255.255.255');
});

test('invalid input', () => {
  assert.equal(calc('5dec2ip', '256.1.1.1'), '');
  assert.equal(calc('5network', '192.168.1.10/255.0.255.0'), 'Invalid netmask');
  assert.equal(calc('5network', '192.168.1.10'), '');
  assert.equal(calc('5ip2dec', ''), '');
  assert.equal(calc('5ip2dec', 'hello'), '');
});
