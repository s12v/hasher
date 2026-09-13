'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calc } = require('./load');

test('base64', () => {
  assert.equal(calc('7base64', 'héllo'), 'aMOpbGxv');
  assert.equal(calc('7base64-d', 'aMOpbGxv'), 'héllo');
  assert.equal(calc('7base64-d-h', 'aMOpbGxv'), '68c3a96c6c6f');
  assert.equal(calc('7base64', ''), '');
  assert.equal(calc('7base64-d', 'not base64 !!'), '');
});

test('uri', () => {
  assert.equal(calc('7encodeURI', 'a b/ü?x=1'), 'a%20b/%C3%BC?x=1');
  assert.equal(calc('7encodeURIComponent', 'a b/ü?x=1'), 'a%20b%2F%C3%BC%3Fx%3D1');
  assert.equal(calc('7decodeURI', 'a%20b/%C3%BC?x=1'), 'a b/ü?x=1');
  assert.equal(calc('7decodeURIComponent', 'a%20b%2F%C3%BC%3Fx%3D1'), 'a b/ü?x=1');
});

test('malformed uri does not throw', () => {
  assert.equal(calc('7decodeURI', '%'), '');
  assert.equal(calc('7decodeURIComponent', '%E0%A4%A'), '');
});

test('decode rows are empty when nothing was encoded', () => {
  assert.equal(calc('7decodeURI', 'plain text'), '');
  assert.equal(calc('7decodeURIComponent', 'plain text'), '');
});

test('html special chars', () => {
  assert.equal(calc('7htmlspecialchars', '<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#039;&lt;/a&gt;');
  assert.equal(calc('7htmlspecialchars-d', '&lt;a href=&quot;x&quot;&gt;&amp;&#039;&lt;/a&gt;'), '<a href="x">&\'</a>');
});

test('rot13', () => {
  assert.equal(calc('7rot13', 'Hello, World!'), 'Uryyb, Jbeyq!');
  assert.equal(calc('7rot13', 'Uryyb, Jbeyq!'), 'Hello, World!');
  assert.equal(calc('7rot13', 'привет'), 'привет');
});
