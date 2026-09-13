'use strict';
// PRIVACY.md -> privacy.html for the GitHub Pages site (https://s12v.github.io/hasher/privacy.html).
// The policy uses a handful of Markdown constructs, converted here without a dependency:
// headings, paragraphs, **bold**, *italic*, `code`, [text](url) and bare https:// links.
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const inline = (text) => escape(text)
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
  .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2">$2</a>')
  .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
  .replace(/\*([^*]+)\*/g, '<i>$1</i>')
  .replace(/`([^`]+)`/g, '<code>$1</code>');

const markdownToHtml = (md) => md.trim().split(/\n{2,}/).map((block) => {
  const heading = /^(#{1,3}) (.+)$/.exec(block);
  if (heading) {
    return `<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`;
  }
  return `<p>${inline(block.replace(/\n/g, ' '))}</p>`;
}).join('\n');

const page = (body) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Hasher — privacy policy</title>
    <link rel="icon" href="images/favicon.ico">
    <link rel="stylesheet" href="main.css">
    <style>
      body { min-width: 0; max-width: 680px; margin: 0 auto; padding: 32px 20px 48px; font-size: 14px; line-height: 1.55; }
      h1 { margin: 0 0 16px; font-size: 22px; }
      p { margin: 0 0 12px; }
      .back { display: inline-block; margin-bottom: 24px; }
    </style>
    <script>
      // the theme chosen in the tool applies here too
      try { var t = localStorage.getItem("theme"); if (t) document.documentElement.setAttribute("data-theme", t); } catch (e) {}
    </script>
  </head>
  <body>
    <a class="back" href="./">&larr; Hasher</a>
${body.replace(/^/gm, '    ')}
  </body>
</html>
`;

const build = () => page(markdownToHtml(fs.readFileSync(path.join(root, 'PRIVACY.md'), 'utf8')));

if (require.main === module) {
  const out = process.argv[2];
  if (out) {
    fs.writeFileSync(out, build());
    console.log(out);
  } else {
    process.stdout.write(build());
  }
}

module.exports = { build, markdownToHtml };
