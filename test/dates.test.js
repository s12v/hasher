'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calc, ctx } = require('./load');

const { dates, hasher } = ctx;

// expected values from Python: date.strftime('%A'), date.isocalendar(), timetuple().tm_yday
test('weekday, ISO week and day of the year (UTC)', () => {
  const cases = {
    '2019-02-27T09:36:55Z': 'Wednesday · 2019-W09 · day 58 of 365',
    '2021-01-01T00:00:00Z': 'Friday · 2020-W53 · day 1 of 365',
    '2020-12-31T00:00:00Z': 'Thursday · 2020-W53 · day 366 of 366',
    '2024-12-30T00:00:00Z': 'Monday · 2025-W01 · day 365 of 366',
    '2024-02-29T00:00:00Z': 'Thursday · 2024-W09 · day 60 of 366',
    '2018-12-31T23:59:59Z': 'Monday · 2019-W01 · day 365 of 365',
    '2019-12-29T00:00:00Z': 'Sunday · 2019-W52 · day 363 of 365',
  };
  for (const [iso, expected] of Object.entries(cases)) {
    assert.equal(dates.describe(new Date(iso), true), expected, iso);
  }
});

test('DATETIME rows carry the calendar hint', () => {
  assert.equal(hasher.elements.time31.hint('1551260215'), 'Wednesday · 2019-W09 · day 58 of 365');
  const local = hasher.elements.time3.hint('1551260215');
  assert.match(local, /^(Tuesday|Wednesday) · 2019-W09 · day 5[78] of 365 · UTC[-+]\d{2}:\d{2}$/, local);
  const offset = -new Date(1551260215000).getTimezoneOffset();
  const pad = (n) => String(n).padStart(2, '0');
  assert.ok(local.endsWith(`UTC${offset < 0 ? '-' : '+'}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`), local);
  assert.equal(hasher.elements.time31.hint('garbage'), '');
  assert.equal(hasher.elements.time3.hint('garbage'), '');
  assert.match(hasher.elements.time31.hint(''), /^\w+day · \d{4}-W\d{2} · day \d+ of 36[56]$/, 'empty is now');
});

test('durations are written out', () => {
  assert.equal(dates.format(0), '0s');
  assert.equal(dates.format(500), '0.5s');
  assert.equal(dates.format(1500), '1.5s');
  assert.equal(dates.format(60000), '1m');
  assert.equal(dates.format(61500), '1m 1.5s');
  assert.equal(dates.format(3600000), '1h');
  assert.equal(dates.format(86400000), '1d');
  assert.equal(dates.format(90061000), '1d 1h 1m 1s');
  assert.equal(dates.format(-5000), '-5s');
});

test('durations are read', () => {
  const cases = {
    '1h 30m': 5400000, '1.5h': 5400000, '1h30m': 5400000, '90 seconds': 90000, '90s': 90000, '250ms': 250,
    '2 days, 3 hours and 5 minutes': 183900000, '1d2h': 93600000, '1 week': 604800000,
    '01:30:00': 5400000, '1:30': 90000, '1:30:00.5': 5400500, '100:00:00': 360000000,
    'PT1H30M': 5400000, 'P1W': 604800000, 'P1DT12H': 129600000, 'PT0.5S': 500, 'pt90s': 90000,
  };
  for (const [input, ms] of Object.entries(cases)) {
    assert.equal(dates.parse(input), ms, input);
  }
  for (const input of ['', 'garbage', '1x', '1h garbage', '1551260215', '99:99', '1:60', 'P', 'PT', 'P1Y', '2019-02-27']) {
    assert.equal(dates.parse(input), null, input);
  }
});

test('Duration row', () => {
  assert.equal(calc('6duration', '90061'), '1d 1h 1m 1s');
  assert.equal(hasher.elements.time7.hint('90061'), 'the number as seconds · as milliseconds: 1m 30.061s');
  assert.equal(calc('6duration', '1551260215'), '17954d 9h 36m 55s');
  assert.equal(hasher.elements.time7.hint('1551260215'), 'the number as seconds · as milliseconds: 17d 22h 54m 20.215s · ≈ 49.2 years');
  assert.equal(calc('6duration', '1551260215823'), '17954d 9h 36m 55.823s', '13 digits are milliseconds, as everywhere on the tab');
  assert.equal(hasher.elements.time7.hint('1551260215823'), 'the number as milliseconds · ≈ 49.2 years');
  assert.equal(calc('6duration', '1h 30m'), '5400');
  assert.equal(hasher.elements.time7.hint('1h 30m'), 'seconds · 5400000 ms · 1h 30m');
  assert.equal(calc('6duration', '01:30:00'), '5400');
  assert.equal(calc('6duration', 'PT1H30M'), '5400');
  assert.equal(calc('6duration', '1:30:00.5'), '5400.5');
  assert.equal(calc('6date2iso', '1h 30m'), '', 'a duration is not a date');
  assert.equal(calc('6duration', '2019-02-27 09:36:55'), '', 'a date is not a duration');
  assert.equal(calc('6duration', ''), '', 'now is not a duration');
  assert.equal(calc('6duration', 'garbage'), '');
});
