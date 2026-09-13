'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ctx, calc } = require('./load');

const { ip, hasher } = ctx;
const parse = (s) => ip.parse(s);

test('IPv4 address', () => {
  assert.equal(calc('5address', '192.168.1.10'), '192.168.1.10');
  assert.equal(hasher.elements.net1.hint('192.168.1.10'), 'IPv4 · private (RFC 1918)');
  assert.equal(calc('5decimal', '192.168.1.10'), '3232235786');
  assert.equal(calc('5hex', '192.168.1.10'), 'c0a8010a');
  assert.equal(calc('5binary', '192.168.1.10'), '11000000.10101000.00000001.00001010');
  assert.equal(calc('5ptr', '192.168.1.10'), '10.1.168.192.in-addr.arpa');
  assert.equal(calc('5address', '3232235786'), '192.168.1.10', 'decimal in');
  assert.equal(calc('5address', '4294967295'), '255.255.255.255');
  assert.equal(calc('5binary', '0.0.0.1'), '00000000.00000000.00000000.00000001');
  assert.equal(calc('5network', '192.168.1.10'), '', 'no prefix, no network rows');
  assert.equal(calc('5expanded', '192.168.1.10'), '', 'IPv4 has no expanded form');
});

test('IPv4 prefix', () => {
  assert.equal(calc('5network', '192.168.1.10/24'), '192.168.1.0/24');
  assert.equal(calc('5netmask', '192.168.1.10/24'), '255.255.255.0');
  assert.equal(hasher.elements.net8.hint('192.168.1.10/24'), 'wildcard 0.0.0.255');
  assert.equal(calc('5first', '192.168.1.10/24'), '192.168.1.1');
  assert.equal(calc('5last', '192.168.1.10/24'), '192.168.1.254');
  assert.equal(calc('5broadcast', '192.168.1.10/24'), '192.168.1.255');
  assert.equal(calc('5hosts', '192.168.1.10/24'), '254');
  assert.equal(hasher.elements.net12.hint('192.168.1.10/24'), 'of 256 addresses');
  assert.equal(calc('5network', '10.1.2.3/255.255.0.0'), '10.1.0.0/16', 'dotted netmask');
  assert.equal(calc('5hosts', '10.1.2.3/255.255.0.0'), '65534');
  assert.equal(calc('5network', '200.200.200.200/8'), '200.0.0.0/8', 'high bit set');
  assert.equal(calc('5broadcast', '200.200.200.200/8'), '200.255.255.255');
});

test('IPv4 /31 and /32', () => {
  assert.equal(calc('5hosts', '10.0.0.0/31'), '2');
  assert.equal(calc('5first', '10.0.0.0/31'), '10.0.0.0');
  assert.equal(calc('5last', '10.0.0.0/31'), '10.0.0.1');
  assert.equal(calc('5broadcast', '10.0.0.0/31'), '', 'no broadcast on a point-to-point link');
  assert.equal(hasher.elements.net12.hint('10.0.0.0/31'), 'point-to-point, RFC 3021');
  assert.equal(calc('5hosts', '10.0.0.7/32'), '1');
  assert.equal(calc('5first', '10.0.0.7/32'), '10.0.0.7');
  assert.equal(hasher.elements.net12.hint('10.0.0.7/32'), 'host route');
});

test('IPv4 types', () => {
  const type = (s) => ip.type(parse(s).address, 4);
  assert.equal(type('10.1.2.3'), 'private (RFC 1918)');
  assert.equal(type('172.20.0.1'), 'private (RFC 1918)');
  assert.equal(type('172.32.0.1'), 'public');
  assert.equal(type('127.0.0.1'), 'loopback');
  assert.equal(type('169.254.1.1'), 'link-local');
  assert.equal(type('100.64.0.1'), 'carrier-grade NAT (RFC 6598)');
  assert.equal(type('192.0.2.1'), 'documentation (TEST-NET-1)');
  assert.equal(type('224.0.0.1'), 'multicast');
  assert.equal(type('255.255.255.255'), 'limited broadcast');
  assert.equal(type('8.8.8.8'), 'public');
});

test('IPv6 address', () => {
  assert.equal(calc('5address', '2001:0DB8:0000:0000:0000:0000:0000:0001'), '2001:db8::1');
  assert.equal(hasher.elements.net1.hint('2001:db8::1'), 'IPv6 · documentation');
  assert.equal(calc('5expanded', '2001:db8::1'), '2001:0db8:0000:0000:0000:0000:0000:0001');
  assert.equal(calc('5hex', '2001:db8::1'), '20010db8000000000000000000000001');
  assert.equal(calc('5decimal', '2001:db8::1'), '42540766411282592856903984951653826561');
  assert.equal(calc('5ptr', '2001:db8::1'), '1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa');
  assert.equal(calc('5binary', '2001:db8::1'), '', 'no binary row for IPv6');
  assert.equal(calc('5address', '42540766411282592856903984951653826561'), '2001:db8::1', 'decimal above 2^32 is IPv6');
  assert.equal(calc('5address', '[2001:db8::1]'), '2001:db8::1', 'brackets');
  assert.equal(calc('5address', 'fe80::1%eth0'), 'fe80::1', 'zone id dropped');
});

test('RFC 5952 canonical form', () => {
  const canon = (s) => ip.v6(parse(s).address);
  assert.equal(canon('2001:db8:0:0:1:0:0:1'), '2001:db8::1:0:0:1', 'the leftmost of two equal runs');
  assert.equal(canon('2001:db8:0:0:0:1:0:1'), '2001:db8::1:0:1', 'the longest run');
  assert.equal(canon('2001:db8:0:1:1:1:1:1'), '2001:db8:0:1:1:1:1:1', 'a single zero group is not compressed');
  assert.equal(canon('::'), '::');
  assert.equal(canon('::1'), '::1');
  assert.equal(canon('1::'), '1::');
  assert.equal(canon('0:0:0:0:0:ffff:192.0.2.1'), '::ffff:192.0.2.1', 'IPv4-mapped keeps the mixed notation');
  assert.equal(canon('ABCD:EF01:2345:6789:ABCD:EF01:2345:6789'), 'abcd:ef01:2345:6789:abcd:ef01:2345:6789');
});

test('IPv6 types', () => {
  const type = (s) => ip.type(parse(s).address, 6);
  assert.equal(type('::'), 'unspecified');
  assert.equal(type('::1'), 'loopback');
  assert.equal(type('::ffff:192.0.2.1'), 'IPv4-mapped 192.0.2.1');
  assert.equal(type('64:ff9b::192.0.2.1'), 'NAT64 (RFC 6052)');
  assert.equal(type('2001:db8::1'), 'documentation');
  assert.equal(type('fd12:3456::1'), 'unique local (ULA)');
  assert.equal(type('fe80::1'), 'link-local');
  assert.equal(type('ff02::1'), 'multicast');
  assert.equal(type('2a02:6b8::2:242'), 'global unicast');
  assert.equal(type('4000::1'), 'reserved');
});

test('IPv6 prefix', () => {
  assert.equal(calc('5network', '2001:db8:abcd:12::1/64'), '2001:db8:abcd:12::/64');
  assert.equal(calc('5first', '2001:db8:abcd:12::1/64'), '2001:db8:abcd:12::');
  assert.equal(calc('5last', '2001:db8:abcd:12::1/64'), '2001:db8:abcd:12:ffff:ffff:ffff:ffff');
  assert.equal(calc('5hosts', '2001:db8:abcd:12::1/64'), '18446744073709551616');
  assert.equal(hasher.elements.net12.hint('2001:db8:abcd:12::1/64'), '2^64 addresses');
  assert.equal(calc('5netmask', '2001:db8::/32'), '', 'no dotted netmask for IPv6');
  assert.equal(calc('5broadcast', '2001:db8::/32'), '', 'IPv6 has no broadcast');
  assert.equal(calc('5network', '2001:db8::1/128'), '2001:db8::1/128');
  assert.equal(calc('5hosts', '2001:db8::1/128'), '1');
});

test('invalid input', () => {
  assert.equal(calc('5address', '256.1.1.1'), 'Invalid: octet 256 is above 255');
  assert.equal(calc('5address', '192.168.1.10/255.0.255.0'), 'Invalid: netmask is not contiguous');
  assert.equal(calc('5address', '192.168.1.10/33'), 'Invalid: bad prefix length /33');
  assert.equal(calc('5address', '2001:db8::/129'), 'Invalid: bad prefix length /129');
  assert.equal(calc('5address', '2001:db8::1::2'), 'Invalid: only one :: is allowed');
  assert.equal(calc('5address', '1:2:3:4:5:6:7:8:9'), 'Invalid: expected 8 groups, got 9');
  assert.equal(calc('5address', '2001:db8::zz'), 'Invalid: not an IPv6 address');
  assert.equal(calc('5address', '2001:db8::12345'), "Invalid: bad group '12345'");
  assert.equal(calc('5address', 'hello'), 'Invalid: not an IPv4 address');
  assert.equal(calc('5address', '1.2.3'), 'Invalid: not an IPv4 address');
  assert.equal(calc('5decimal', 'hello'), '');
  assert.equal(calc('5network', 'hello'), '');
});

test('row order', () => {
  const titles = Object.values(hasher.elements).filter((e) => e.tab === ctx.tabs.net).map((e) => e.title);
  assert.deepEqual(Array.from(titles), ['Address', 'Expanded', 'Decimal', 'Hex', 'Binary', 'PTR', 'Network', 'Netmask', 'First host', 'Last host', 'Broadcast', 'Hosts']);
});
