# Hasher (browser extension)

Developer's toolbox: hashes, HMAC, CRC, ciphers, IP/subnet, time, number and string conversions.
Everything runs locally in the popup — nothing is sent anywhere.

Manifest V3, no dependencies except bundled crypto libraries.

Standalone version for other browsers (the same popup, deployed from `master` by GitHub Actions):  
https://s12v.github.io/hasher/

## Install

Chrome Web Store listing is being republished. Until then, load it unpacked:

1. `git clone https://github.com/s12v/hasher`
2. Open `chrome://extensions`, enable **Developer mode**
3. **Load unpacked** → select the `hasher` directory

## Development

No build step. Tests run on Node 20+ without dependencies:

```
npm test
```

Every `calculate()` in `hasher.js` is checked against vectors produced with `openssl dgst` / `openssl enc`.

To try it as an extension, load the directory unpacked (see Install). To try the standalone page, serve the
directory over HTTP (`python3 -m http.server`) — `file://` blocks the wordlist fetch on the Password tab.

## Release

1. Set the same new version in `manifest.json` and `package.json`, commit.
2. Tag and push: `git tag v1.6.0 && git push origin master v1.6.0`.
3. The Release workflow runs the tests, builds `hasher-1.6.0.zip` (`npm run build` does the same locally into `dist/`)
   and attaches it to a GitHub Release.
4. Upload the zip in the [Chrome Web Store developer dashboard](https://chrome.google.com/webstore/devconsole).

## Features

* <b>Hash</b>: MD5, SHA-1, SHA-2 (224, 256, 384, 512), SHA-3 (256, 512), Keccak-256, RIPEMD-160, MD4, Whirlpool
* <b>HMAC:</b> MD5, SHA-1, SHA-2 (224, 256, 384, 512), RIPEMD-160, MD4
* <b>CRC:</b> CRC-8, CRC-16, FCS-16, FCS/CRC-32
* <b>Cipher</b> <i>(interoperable with OpenSSL)</i>: AES-256, DES, Triple DES, Rabbit, RC4, RC4Drop. CBC/Pkcs7 is used.
* <b>Net:</b> Subnet calculator, Ip ↔ Dec, Ip → Bin, Ip → Hex
* <b>Time:</b> Unix (s or ms) ↔ Datetime, Unix ↔ RFC-1123, Unix ↔ ISO 8601
* <b>Numbers:</b> Dec ↔ Hex, Dec ↔ Bin, Dec ↔ Roman
* <b>Strings:</b> length (chars / UTF-8 bytes), ASCII ↔ Hex, UTF-8 ↔ Hex, UTF-16 ↔ Hex
* <b>Encode:</b> Base64, ROT-13, JavaScript encodeURI(), encodeURIComponent(), HTML special chars encode/decode
* <b>JWT:</b> decode, claims with expiry as local time, verify HS256/384/512 with a secret
* <b>JSON:</b> pretty-print (optionally with sorted keys), minify, quote/unquote as a JSON string, syntax errors with position
* <b>Cron:</b> crontab expression → plain English (crontab.guru style) and the next 5 run times
* <b>Random:</b> passphrases from the EFF large wordlist (words, separator, digits, capitalize) and passwords (length, symbols) with the entropy estimate — a port of [ppgen](https://github.com/s12v/ppgen); UUID v4, UUID v7, ULID

Usage: enter text and click on the result — it is copied to clipboard.
**mask** hides the input (for hashing passwords); **Now** on the Time tab inserts the current Unix time.
The last tab is remembered. Keyboard: Alt+1…9 / Alt+0 jump to a tab, Alt+[ / Alt+] go to the previous / next one.

## License

MIT. Bundled libraries: [crypto-js](https://github.com/brix/crypto-js) (MIT),
[js-sha3](https://github.com/emn178/js-sha3) (MIT), [EFF large wordlist](https://www.eff.org/deeplinks/2016/07/new-wordlists-random-passphrases) (CC BY 4.0), MD4 by Paul Johnston (BSD),
Whirlpool by Sean Catchpole (public domain), CRC tables by AnDan Software.
