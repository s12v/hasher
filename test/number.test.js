'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calc } = require('./load');

test('dec <-> hex/bin', () => {
  assert.equal(calc('8i5', '2024'), '7e8');
  assert.equal(calc('8i6', '7e8'), '2024');
  assert.equal(calc('8i7', '2024'), '11111101000');
  assert.equal(calc('8i8', '11111101000'), '2024');
  assert.equal(calc('8i5', '0'), '0');
});

test('roman', () => {
  assert.equal(calc('8i3', '2024'), 'MMXXIV');
  assert.equal(calc('8i3', '3999'), 'MMMCMXCIX');
  assert.equal(calc('8i3', '4'), 'IV');
  assert.equal(calc('8i4', 'MMXXIV'), '2024');
  assert.equal(calc('8i4', 'mmxxiv'), '2024');
  assert.equal(calc('8i4', 'IV'), '4');
  assert.equal(calc('8i4', 'MCMXCIX'), '1999');
});

test('invalid and out of range', () => {
  assert.equal(calc('8i5', ''), '');
  assert.equal(calc('8i5', '12a'), 'NaN');
  assert.equal(calc('8i6', 'xyz'), 'NaN');
  assert.equal(calc('8i8', '102'), 'NaN');
  assert.equal(calc('8i3', '0'), 'Out of range');
  assert.equal(calc('8i3', '4000'), 'Out of range');
  assert.equal(calc('8i4', 'ABC'), 'NaN');
  assert.equal(calc('8i5', '9'.repeat(400)), 'Out of range');
});
