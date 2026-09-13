# Hasher (browser extension)

Developer's toolbox: hashes, HMAC, CRC, ciphers, IP/subnet, time, number and string conversions.
Everything runs locally in the popup — nothing is sent anywhere.

Manifest V3, no dependencies except bundled crypto libraries.

Standalone version for other browsers:  
https://s12v.github.io/hasher/

## Install

Chrome Web Store listing is being republished. Until then, load it unpacked:

1. `git clone https://github.com/s12v/hasher`
2. Open `chrome://extensions`, enable **Developer mode**
3. **Load unpacked** → select the `hasher` directory

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

Usage: enter text and click on the result — it is copied to clipboard.
**mask** hides the input (for hashing passwords); **Now** on the Time tab inserts the current Unix time.

## License

MIT. Bundled libraries: [crypto-js](https://github.com/brix/crypto-js) (MIT),
[js-sha3](https://github.com/emn178/js-sha3) (MIT), MD4 by Paul Johnston (BSD),
Whirlpool by Sean Catchpole (public domain), CRC tables by AnDan Software.
