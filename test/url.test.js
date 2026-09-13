'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ctx, calc } = require('./load');

const { hasher, urls } = ctx;
const full = 'https://user:pw@sub.example.com:8443/a/b%20c?x=1&y=%D0%BF%D1%80%D0%B8%D0%B2%D0%B5%D1%82&x=2#frag';

test('a full URL taken apart', () => {
  assert.equal(calc('16scheme', full), 'https');
  assert.equal(hasher.elements.url1.hint(full), '');
  assert.equal(calc('16host', full), 'sub.example.com');
  assert.equal(calc('16port', full), '8443');
  assert.equal(calc('16path', full), '/a/b%20c');
  assert.equal(hasher.elements.url4.hint(full), 'decoded: /a/b c');
  assert.equal(calc('16query', full), 'x = 1\ny = привет\nx = 2');
  assert.equal(hasher.elements.url5.hint(full), '3 parameters, decoded');
  assert.equal(calc('16fragment', full), 'frag');
  assert.equal(calc('16credentials', full), 'user:pw');
  assert.equal(hasher.elements.url7.tone(full), 'bad', 'credentials in a URL are flagged');
  assert.equal(calc('16origin', full), 'https://sub.example.com:8443');
  assert.equal(calc('16normalized', full), full);
});

test('defaults and empties', () => {
  const u = 'http://example.com';
  assert.equal(calc('16port', u), '80');
  assert.equal(hasher.elements.url3.hint(u), 'default for http');
  assert.equal(calc('16path', u), '/');
  assert.equal(calc('16query', u), '');
  assert.equal(hasher.elements.url5.hint(u), '');
  assert.equal(calc('16fragment', u), '');
  assert.equal(calc('16credentials', u), '');
  assert.equal(calc('16normalized', u), 'http://example.com/');
});

test('a bare host is read as https', () => {
  assert.equal(calc('16scheme', 'example.com/path?x=1'), 'https');
  assert.equal(hasher.elements.url1.hint('example.com/path?x=1'), 'no scheme given, https assumed');
  assert.equal(calc('16host', 'example.com/path?x=1'), 'example.com');
  assert.equal(calc('16host', 'localhost:3000/api'), 'localhost', 'host:port is not a scheme');
  assert.equal(calc('16port', 'localhost:3000/api'), '3000');
  assert.equal(calc('16host', '192.168.1.1:8080'), '192.168.1.1');
  assert.equal(calc('16host', 'https://[2001:db8::1]:8080/'), '[2001:db8::1]');
});

test('IDN hosts', () => {
  assert.equal(calc('16host', 'http://пример.рф/путь'), 'xn--e1afmkfd.xn--p1ai');
  assert.equal(hasher.elements.url2.hint('http://пример.рф/путь'), 'IDN: пример.рф');
  assert.equal(hasher.elements.url4.hint('http://пример.рф/путь'), 'decoded: /путь');
  assert.equal(hasher.elements.url2.hint('https://example.com'), '');
  assert.equal(urls.toUnicode('xn--mnchen-3ya.de'), 'münchen.de');
  assert.equal(urls.toUnicode('xn--fsqu00a.xn--0zwm56d'), '例子.测试');
});

test('other schemes', () => {
  assert.equal(calc('16scheme', 'mailto:a@b.c'), 'mailto');
  assert.equal(calc('16host', 'mailto:a@b.c'), '');
  assert.equal(calc('16port', 'mailto:a@b.c'), '');
  assert.equal(calc('16origin', 'mailto:a@b.c'), '', 'opaque origin is not shown');
  assert.equal(calc('16port', 'ftp://x.org'), '21');
});

test('invalid', () => {
  assert.equal(calc('16scheme', 'hello world'), 'Invalid: not a URL');
  assert.equal(calc('16host', 'hello world'), '');
  assert.equal(calc('16scheme', ''), '');
});

test('row order', () => {
  const titles = Object.values(hasher.elements).filter((e) => e.tab === ctx.tabs.url).map((e) => e.title);
  assert.deepEqual(Array.from(titles), ['Scheme', 'Host', 'Port', 'Path', 'Query', 'Fragment', 'Credentials', 'Origin', 'Normalized']);
});
