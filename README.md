# Hasher (browser extension)

[![CI](https://github.com/s12v/hasher/actions/workflows/ci.yml/badge.svg)](https://github.com/s12v/hasher/actions/workflows/ci.yml)
[![Pages](https://github.com/s12v/hasher/actions/workflows/pages.yml/badge.svg)](https://s12v.github.io/hasher/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Developer's toolbox: hashes, HMAC, CRC, ciphers, IP/subnet, time, number and string conversions.
Everything runs locally in the popup — nothing is sent anywhere.

Standalone version for other browsers (the same popup, deployed from `master` by GitHub Actions):  
https://s12v.github.io/hasher/

## Privacy

Everything is computed in the popup: the extension makes no network requests and collects nothing — no analytics,
no telemetry, no accounts. What you type stays in the window and is gone when you close it; only the chosen tab
and theme are kept in `localStorage`. The only permission requested is `clipboardWrite`, used when you click a result.
The standalone page is static and calls nothing either.

## Install

Chrome Web Store listing is being republished. Until then, load it unpacked:

1. `git clone https://github.com/s12v/hasher`
2. Open `chrome://extensions`, enable **Developer mode**
3. **Load unpacked** → select the `hasher` directory

## Features

* <b>Hash</b>: SHA-256, SHA-512, SHA-1, MD5, SHA-3 (256, 512), Keccak-256, SHA-384, SHA-224, RIPEMD-160, BLAKE2b (256, 512); SRI string for `<script integrity>`; base64 hints for SHA-256/512
* <b>HMAC:</b> SHA-256, SHA-1, SHA-512, SHA-384, MD5 (base64 hints for SHA-256/512)
* <b>CRC:</b> CRC-32, CRC-32C, CRC-16/MODBUS, CRC-16/CCITT-FALSE, CRC-16/XMODEM, CRC-8, CRC-64/XZ, Adler-32 — one parametrised implementation checked against the CRC catalogue
* <b>Password:</b> passphrases from the EFF large wordlist (words, separator, digits, capitalize) and passwords (length, symbols) with the entropy estimate — a port of [ppgen](https://github.com/s12v/ppgen); random keys of N bytes as hex and Base64 (`openssl rand`)
* <b>UUID:</b> UUID v4, UUID v7, ULID
* <b>Cipher:</b> AES-256-CBC with a passphrase, byte-compatible with `openssl enc -aes-256-cbc -pbkdf2 -a` (PBKDF2-SHA256, 10000 iterations) and with the legacy `-md md5` format; decrypt detects which
* <b>IP:</b> IPv4 and IPv6 — canonical form (RFC 5952), decimal, hex, binary, PTR, address type (private, link-local, ULA, documentation…); for a prefix: network, netmask / wildcard, first / last host, broadcast, hosts
* <b>Time:</b> Unix time (s or ms), ISO 8601, RFC-1123 or `2019-02-27 09:36:55` in → Unix s / ms, ISO 8601, RFC-1123, DATETIME UTC / local out
* <b>Num:</b> any base in (decimal, `0x`, `0b`, `0o`, Roman, floating point), the others out — decimal, hex, octal, binary, Roman, bits, size in KiB / kB, IEEE-754 double / single; arbitrary size (BigInt)
* <b>Strings:</b> length (chars / UTF-8 bytes / words / lines), UTF-8 ↔ Hex, UTF-16 BE / LE ↔ Hex, code points, case conversions (UPPER, lower, Title, Sentence, camelCase, PascalCase, snake_case, kebab-case, CONSTANT_CASE, slug)
* <b>JSON:</b> pretty-print and minify (optionally with sorted keys), quote as a JSON string (a pasted string literal is unquoted on the spot), syntax errors with position
* <b>Diff:</b> compare two texts side by side, line by line, with changed characters highlighted; ignore whitespace / case
* <b>Encode:</b> Base64 / Base64url, Base32, Base58 — encode and decode (binary output shown as hex), encodeURI(), encodeURIComponent(), HTML special chars, ROT13
* <b>JWT:</b> decode, claims with expiry as local time, verify HS256/384/512 with a secret
* <b>Cron:</b> schedule builder (every N minutes, hourly, daily, weekly with weekdays, monthly, yearly) ↔ crontab expression, plain English and the next 5 run times

Usage: enter text and click on the result — it is copied to clipboard.
**mask** on the Hash and HMAC tabs hides the input (for hashing passwords); **Now** on the Time tab inserts the current Unix time.
The last tab and the theme (the icon toggles between following the OS and the opposite look) are remembered. Keyboard: Alt+1…9 / Alt+0 jump to a tab, Alt+[ / Alt+] go to the previous / next one.

## Development

No build step. Tests run on Node 20+ without dependencies:

```
npm test
```

Every `calculate()` in `hasher.js` is checked against vectors produced with `openssl dgst` / `openssl enc`.
On GitHub Actions `npm run test:ci` runs the same tests and adds a pass/fail summary and per-test annotations to the pull request.

To try it as an extension, load the directory unpacked (see Install). To try the standalone page, serve the
directory over HTTP (`python3 -m http.server`) — `file://` blocks the wordlist fetch on the Password tab.

## Release

1. Set the same new version in `manifest.json` and `package.json`, commit.
2. Tag and push: `git tag v1.6.0 && git push origin master v1.6.0`.
3. The Release workflow runs the tests, builds `hasher-1.6.0.zip` (`npm run build` does the same locally into `dist/`)
   and attaches it to a GitHub Release.
4. Upload the zip in the [Chrome Web Store developer dashboard](https://chrome.google.com/webstore/devconsole).

## License

MIT. Bundled libraries: [crypto-js](https://github.com/brix/crypto-js) (MIT),
[js-sha3](https://github.com/emn178/js-sha3) (MIT), [blakejs](https://github.com/dcposch/blakejs) (MIT),
[EFF large wordlist](https://www.eff.org/deeplinks/2016/07/new-wordlists-random-passphrases) (CC BY 4.0).
