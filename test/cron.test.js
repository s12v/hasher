'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ctx, calc } = require('./load');

const { cron } = ctx;

// Wording follows crontab.guru for the same expressions
const descriptions = {
  '5 4 * * *': 'At 04:05.',
  '* * * * *': 'At every minute.',
  '*/5 * * * *': 'At every 5th minute.',
  '0 22 * * 1-5': 'At 22:00 on every day-of-week from Monday through Friday.',
  '23 0-20/2 * * *': 'At minute 23 past every 2nd hour from 0 through 20.',
  '5 0 * 8 *': 'At 00:05 in August.',
  '15 14 1 * *': 'At 14:15 on day-of-month 1.',
  '0 0,12 1 */2 *': 'At minute 0 past hour 0 and 12 on day-of-month 1 in every 2nd month.',
  '0 4 8-14 * *': 'At 04:00 on every day-of-month from 8 through 14.',
  '0 0 1,15 * 3': 'At 00:00 on day-of-month 1 and 15 and on Wednesday.',
  '1,2,3 * * * *': 'At minute 1, 2, and 3.',
  '1,2-5 * * * *': 'At minute 1 and every minute from 2 through 5.',
  '0 9-17 * * mon-fri': 'At minute 0 past every hour from 9 through 17 on every day-of-week from Monday through Friday.',
  '30 3 * jan,jul *': 'At 03:30 in January and July.',
  '30 3 * JAN,JUL *': 'At 03:30 in January and July.',
  '0 0 * * 7': 'At 00:00 on Sunday.',
  '0 0 * * sun': 'At 00:00 on Sunday.',
  '5/10 * * * *': 'At every 10th minute from 5 through 59.',
  '*/15 9-17 * * 1-5': 'At every 15th minute past every hour from 9 through 17 on every day-of-week from Monday through Friday.',
  '@yearly': 'At 00:00 on day-of-month 1 in January.',
  '@annually': 'At 00:00 on day-of-month 1 in January.',
  '@monthly': 'At 00:00 on day-of-month 1.',
  '@weekly': 'At 00:00 on Sunday.',
  '@daily': 'At 00:00.',
  '@midnight': 'At 00:00.',
  '@hourly': 'At minute 0.',
  '  5   4 * *   *  ': 'At 04:05.',
};

for (const [expr, expected] of Object.entries(descriptions)) {
  test(`describe ${JSON.stringify(expr)}`, () => {
    assert.equal(cron.describe(expr), expected);
  });
}

test('invalid expressions throw with a reason', () => {
  const bad = {
    '': /expected 5 fields/,
    '* * * *': /expected 5 fields/,
    '* * * * * *': /expected 5 fields/,
    '60 * * * *': /minute 60 out of range/,
    '* 24 * * *': /hour 24 out of range/,
    '* * 0 * *': /day-of-month 0 out of range/,
    '* * 32 * *': /day-of-month 32 out of range/,
    '* * * 13 *': /month 13 out of range/,
    '* * * * 8': /day-of-week 8 out of range/,
    '*/0 * * * *': /bad step/,
    '5-1 * * * *': /backwards/,
    'a * * * *': /bad value/,
    '1,,2 * * * *': /empty item/,
    '1-2-3 * * * *': /bad range/,
    '@fortnightly': /expected 5 fields/,
  };
  for (const [expr, re] of Object.entries(bad)) {
    assert.throws(() => cron.parse(expr), re, expr);
  }
});

test('parsed values', () => {
  const f = cron.parse('*/15 9-17 1,15 jan-mar mon-fri');
  assert.deepEqual(Object.keys(f[0].values).map(Number), [0, 15, 30, 45]);
  assert.deepEqual(Object.keys(f[1].values).map(Number), [9, 10, 11, 12, 13, 14, 15, 16, 17]);
  assert.deepEqual(Object.keys(f[2].values).map(Number), [1, 15]);
  assert.deepEqual(Object.keys(f[3].values).map(Number), [1, 2, 3]);
  assert.deepEqual(Object.keys(f[4].values).map(Number), [1, 2, 3, 4, 5]);
  assert.equal(f[0].star, true);
  assert.equal(f[2].star, false);
  assert.deepEqual(Object.keys(cron.parse('* * * * 7')[4].values), ['0'], '7 is Sunday');
});

const from = new Date(2026, 8, 13, 10, 30, 45); // Sunday 2026-09-13 10:30:45 local
const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
// Array.from: arrays made inside the vm context have a different Array.prototype, which strict deepEqual rejects
const next = (expr, n) => Array.from(cron.next(expr, from, n), fmt);

test('next runs', () => {
  assert.deepEqual(next('* * * * *', 2), ['2026-09-13 10:31', '2026-09-13 10:32'], 'starts at the next whole minute');
  assert.deepEqual(next('*/15 * * * *', 3), ['2026-09-13 10:45', '2026-09-13 11:00', '2026-09-13 11:15']);
  assert.deepEqual(next('0 22 * * 1-5', 3), ['2026-09-14 22:00', '2026-09-15 22:00', '2026-09-16 22:00']);
  assert.deepEqual(next('30 10 * * *', 1), ['2026-09-14 10:30'], 'the current minute is not "next"');
  assert.deepEqual(next('0 0 1 * *', 2), ['2026-10-01 00:00', '2026-11-01 00:00']);
  assert.deepEqual(next('@yearly', 1), ['2027-01-01 00:00']);
  assert.deepEqual(next('0 0 29 2 *', 2), ['2028-02-29 00:00'], 'leap day; only one within the 5-year horizon');
  assert.deepEqual(next('0 0 30 2 *', 5), [], 'never');
});

test('day-of-month OR day-of-week when both are restricted (Vixie cron)', () => {
  // 1st and 15th, or any Wednesday
  assert.deepEqual(next('0 0 1,15 * 3', 4), ['2026-09-15 00:00', '2026-09-16 00:00', '2026-09-23 00:00', '2026-09-30 00:00']);
  // "*/2" starts with '*', so it does not count as restricted: AND
  assert.deepEqual(next('0 0 */2 * 3', 2), ['2026-09-23 00:00', '2026-10-07 00:00'], 'Wednesdays on odd days only');
});

test('elements', () => {
  assert.equal(calc('11describe', ''), '');
  assert.equal(calc('11next', ''), '');
  assert.equal(calc('11describe', '5 4 * * *'), 'At 04:05.');
  assert.equal(calc('11describe', '99 * * * *'), 'Invalid: minute 99 out of range 0-59');
  assert.equal(calc('11next', '99 * * * *'), '');
  assert.equal(calc('11next', '0 0 30 2 *'), 'never (nothing in the next 5 years)');
  const lines = calc('11next', '* * * * *').split('\n');
  assert.equal(lines.length, 5);
  assert.match(lines[0], /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}  (Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/);
});

test('builder: schedule -> expression', () => {
  assert.equal(cron.build({ mode: 'minute' }), '* * * * *');
  assert.equal(cron.build({ mode: 'minutes', every: 5 }), '*/5 * * * *');
  assert.equal(cron.build({ mode: 'minutes', every: 1 }), '* * * * *');
  assert.equal(cron.build({ mode: 'hourly', minute: 15, every: 1 }), '15 * * * *');
  assert.equal(cron.build({ mode: 'hourly', minute: 0, every: 6 }), '0 */6 * * *');
  assert.equal(cron.build({ mode: 'daily', minute: 0, hour: 22 }), '0 22 * * *');
  assert.equal(cron.build({ mode: 'weekly', minute: 30, hour: 9, days: [1, 2, 3, 4, 5] }), '30 9 * * 1-5');
  assert.equal(cron.build({ mode: 'weekly', minute: 0, hour: 0, days: [6, 0] }), '0 0 * * 0,6');
  assert.equal(cron.build({ mode: 'weekly', minute: 0, hour: 0, days: [1, 3, 5] }), '0 0 * * 1,3,5');
  assert.equal(cron.build({ mode: 'weekly', minute: 0, hour: 0, days: [1, 2, 4, 5, 6] }), '0 0 * * 1,2,4-6');
  assert.equal(cron.build({ mode: 'weekly', minute: 0, hour: 0, days: [] }), '0 0 * * *', 'no days = every day');
  assert.equal(cron.build({ mode: 'weekly', minute: 0, hour: 0, days: [0, 1, 2, 3, 4, 5, 6] }), '0 0 * * *');
  assert.equal(cron.build({ mode: 'monthly', minute: 0, hour: 3, day: 15 }), '0 3 15 * *');
  assert.equal(cron.build({ mode: 'yearly', minute: 0, hour: 0, day: 25, month: 12 }), '0 0 25 12 *');
  assert.equal(cron.build({ mode: 'daily', minute: '99', hour: '-1' }), '59 0 * * *', 'clamped');
  assert.equal(cron.build({ mode: 'hourly', minute: 0, every: 50 }), '0 */23 * * *', 'hours clamped to 23');
  assert.throws(() => cron.build({ mode: 'custom' }), /unknown mode/);
});

test('builder: expression -> schedule', () => {
  const u = (e) => { const o = cron.unbuild(e); return o && JSON.parse(JSON.stringify(o)); };
  assert.deepEqual(u('* * * * *'), { mode: 'minute' });
  assert.deepEqual(u('*/15 * * * *'), { mode: 'minutes', every: 15 });
  assert.deepEqual(u('15 * * * *'), { mode: 'hourly', minute: 15, every: 1 });
  assert.deepEqual(u('0 */6 * * *'), { mode: 'hourly', minute: 0, every: 6 });
  assert.deepEqual(u('0 22 * * *'), { mode: 'daily', minute: 0, hour: 22 });
  assert.deepEqual(u('@daily'), { mode: 'daily', minute: 0, hour: 0 });
  assert.deepEqual(u('30 9 * * 1-5'), { mode: 'weekly', minute: 30, hour: 9, days: [1, 2, 3, 4, 5] });
  assert.deepEqual(u('0 0 * * mon,wed,fri'), { mode: 'weekly', minute: 0, hour: 0, days: [1, 3, 5] });
  assert.deepEqual(u('0 0 * * 7'), { mode: 'weekly', minute: 0, hour: 0, days: [0] });
  assert.deepEqual(u('0 3 15 * *'), { mode: 'monthly', minute: 0, hour: 3, day: 15 });
  assert.deepEqual(u('0 0 25 dec *'), { mode: 'yearly', minute: 0, hour: 0, day: 25, month: 12 });
  // not builder shapes
  for (const e of ['0 0 1,15 * 3', '23 0-20/2 * * *', '0 9-17 * * 1-5', '0,30 * * * *', '5 4 */2 * *', '0 0 1 * 1', 'garbage', '']) {
    assert.equal(cron.unbuild(e), null, e);
  }
});

test('builder round trip', () => {
  const schedules = [
    { mode: 'minute' }, { mode: 'minutes', every: 10 }, { mode: 'hourly', minute: 5, every: 1 }, { mode: 'hourly', minute: 5, every: 3 },
    { mode: 'daily', minute: 45, hour: 6 }, { mode: 'weekly', minute: 0, hour: 12, days: [0, 6] }, { mode: 'monthly', minute: 0, hour: 0, day: 1 },
    { mode: 'yearly', minute: 30, hour: 8, day: 29, month: 2 },
  ];
  for (const s of schedules) {
    const back = JSON.parse(JSON.stringify(cron.unbuild(cron.build(s))));
    assert.deepEqual(back, s, JSON.stringify(s));
  }
});
