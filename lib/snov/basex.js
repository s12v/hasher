/**
 * Base64 / Base64url (RFC 4648), Base32 (RFC 4648) and Base58 (Bitcoin alphabet),
 * over UTF-8 bytes. Decoders are lenient: any padding, whitespace, either Base64 alphabet.
 *
 * @author Sergey Novikov <mail@snov.me>
 */
var basex = {
  B32 : "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
  B58 : "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",

  bytes : function (str) {
    return new TextEncoder().encode(str);
  },

  /* bytes -> string when they are valid UTF-8, otherwise null */
  text : function (bytes) {
    try {
      return new TextDecoder("utf-8", { fatal : true }).decode(bytes);
    } catch (err) {
      return null;
    }
  },

  hex : function (bytes) {
    var out = "";
    for (var i = 0; i < bytes.length; i++) {
      out += (bytes[i] < 16 ? "0" : "") + bytes[i].toString(16);
    }
    return out;
  },

  /* ---- Base64 ---- */

  base64 : function (bytes) {
    var bin = "";
    for (var i = 0; i < bytes.length; i++) {
      bin += String.fromCharCode(bytes[i]);
    }
    return btoa(bin);
  },

  base64url : function (bytes) {
    return this.base64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  },

  /* standard or url alphabet, padding optional; null when it is not Base64 */
  unbase64 : function (str) {
    var s = str.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
    if (s.length == 0 || !/^[A-Za-z0-9+/]+$/.test(s) || s.length % 4 == 1) {
      return null;
    }
    while (s.length % 4 != 0) {
      s += "=";
    }
    var bin;
    try {
      bin = atob(s);
    } catch (err) {
      return null;
    }
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) {
      out[i] = bin.charCodeAt(i);
    }
    return out;
  },

  /* ---- Base32 ---- */

  base32 : function (bytes) {
    var out = "", bits = 0, value = 0;
    for (var i = 0; i < bytes.length; i++) {
      value = (value << 8) | bytes[i];
      bits += 8;
      while (bits >= 5) {
        out += this.B32.charAt((value >>> (bits - 5)) & 31);
        bits -= 5;
      }
    }
    if (bits > 0) {
      out += this.B32.charAt((value << (5 - bits)) & 31);
    }
    while (out.length % 8 != 0) {
      out += "=";
    }
    return out;
  },

  /* case-insensitive, padding and whitespace ignored; null when it is not Base32 */
  unbase32 : function (str) {
    var s = str.replace(/[\s=]+/g, "").toUpperCase();
    if (s.length == 0 || !/^[A-Z2-7]+$/.test(s) || [1, 3, 6].indexOf(s.length % 8) >= 0) {
      return null;
    }
    var out = [], bits = 0, value = 0;
    for (var i = 0; i < s.length; i++) {
      value = (value << 5) | this.B32.indexOf(s.charAt(i));
      bits += 5;
      if (bits >= 8) {
        out.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }
    return new Uint8Array(out);
  },

  /* ---- Base58 ---- */

  base58 : function (bytes) {
    var zeros = 0;
    while (zeros < bytes.length && bytes[zeros] == 0) zeros++;
    var n = 0n;
    for (var i = 0; i < bytes.length; i++) {
      n = (n << 8n) | BigInt(bytes[i]);
    }
    var out = "";
    while (n > 0n) {
      out = this.B58.charAt(Number(n % 58n)) + out;
      n /= 58n;
    }
    while (zeros-- > 0) {
      out = "1" + out;
    }
    return out;
  },

  /* null when it is not Base58 */
  unbase58 : function (str) {
    var s = str.replace(/\s+/g, "");
    if (s.length == 0) {
      return null;
    }
    var n = 0n;
    for (var i = 0; i < s.length; i++) {
      var d = this.B58.indexOf(s.charAt(i));
      if (d < 0) {
        return null;
      }
      n = n * 58n + BigInt(d);
    }
    var out = [];
    while (n > 0n) {
      out.unshift(Number(n & 255n));
      n >>= 8n;
    }
    var zeros = 0;
    while (zeros < s.length && s.charAt(zeros) == "1") {
      out.unshift(0);
      zeros++;
    }
    return new Uint8Array(out);
  }
};
