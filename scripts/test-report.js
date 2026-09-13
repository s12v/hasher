'use strict';
// Runs the tests and, on GitHub Actions, writes a summary table to the job
// summary and one ::error annotation per failed test. Exit code follows the tests.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');

const run = spawnSync(process.execPath, ['--test', '--test-reporter=spec', 'test/*.test.js'], {
  encoding: 'utf8',
  shell: false,
});
process.stdout.write(run.stdout);
process.stderr.write(run.stderr);

const out = run.stdout + run.stderr;
const count = (name) => Number((out.match(new RegExp(`^ℹ ${name} (\\d+)`, 'm')) || [])[1] || 0);
const tests = count('tests');
const pass = count('pass');
const fail = count('fail');
const failed = [...out.matchAll(/^✖ (.+?) \(\d+(?:\.\d+)?ms\)$/gm)].map((m) => m[1]);
const unique = [...new Set(failed)];

if (process.env.GITHUB_ACTIONS) {
  for (const name of unique) {
    console.log(`::error title=Test failed::${name}`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    const lines = [
      `## Tests ${fail === 0 ? '✅' : '❌'}`,
      '',
      '| tests | pass | fail |',
      '|--:|--:|--:|',
      `| ${tests} | ${pass} | ${fail} |`,
    ];
    if (unique.length) {
      lines.push('', '### Failed', '', ...unique.map((n) => `- ${n}`));
    }
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
  }
}

process.exit(run.status === null ? 1 : run.status);
