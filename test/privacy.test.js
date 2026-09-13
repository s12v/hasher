'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { build, markdownToHtml } = require('../scripts/privacy-page');

test('the Markdown subset used by PRIVACY.md', () => {
  assert.equal(markdownToHtml('# Title\n\nA **bold** and *italic* `code` [link](https://x.y/) at https://s12v.github.io/hasher/ here.'),
    '<h1>Title</h1>\n<p>A <b>bold</b> and <i>italic</i> <code>code</code> <a href="https://x.y/">link</a> at <a href="https://s12v.github.io/hasher/">https://s12v.github.io/hasher/</a> here.</p>');
  assert.equal(markdownToHtml('line one\nline two\n\nnext'), '<p>line one line two</p>\n<p>next</p>', 'a wrapped paragraph is one paragraph');
  assert.equal(markdownToHtml('a < b & c'), '<p>a &lt; b &amp; c</p>', 'escaped');
});

test('privacy.html is built from PRIVACY.md', () => {
  const html = build();
  assert.match(html, /<h1>Privacy policy<\/h1>/);
  assert.match(html, /<link rel="stylesheet" href="main.css">/);
  assert.match(html, /<a href="https:\/\/github.com\/s12v\/hasher\/issues">issue tracker<\/a>/);
  assert.doesNotMatch(html, /\*\*|\]\(|`/, 'no Markdown left over');
});
