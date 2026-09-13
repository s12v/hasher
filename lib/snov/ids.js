/**
 * Random identifiers: UUID v4, UUID v7 (RFC 9562), ULID. All bits from crypto.getRandomValues.
 *
 * @author Sergey Novikov <mail@snov.me>
 */
var ids = {
  CROCKFORD : "0123456789ABCDEFGHJKMNPQRSTVWXYZ",

  randomBytes : function (n) {
    var bytes = new Uint8Array(n);
    crypto.getRandomValues(bytes);
    return bytes;
  },

  formatUuid : function (bytes) {
    var hex = "";
    for (var i = 0; i < 16; i++) {
      hex += (bytes[i] < 16 ? "0" : "") + bytes[i].toString(16);
    }
    return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
  },

  uuid4 : function () {
    var b = this.randomBytes(16);
    b[6] = (b[6] & 0x0f) | 0x40; // version 4
    b[8] = (b[8] & 0x3f) | 0x80; // variant 10xx
    return this.formatUuid(b);
  },

  /* 48-bit Unix milliseconds, then 74 random bits; sorts by creation time */
  uuid7 : function (now) {
    var ms = (now || new Date()).getTime();
    var b = this.randomBytes(16);
    for (var i = 5; i >= 0; i--) {
      b[i] = ms % 256;
      ms = Math.floor(ms / 256);
    }
    b[6] = (b[6] & 0x0f) | 0x70; // version 7
    b[8] = (b[8] & 0x3f) | 0x80; // variant 10xx
    return this.formatUuid(b);
  },

  /* Unix milliseconds embedded in a v7 UUID */
  uuid7Time : function (uuid) {
    return parseInt(uuid.replace(/-/g, "").slice(0, 12), 16);
  },

  /* 10 chars of 48-bit time + 16 chars of 80 random bits, Crockford base32 */
  ulid : function (now) {
    var ms = (now || new Date()).getTime();
    var time = "";
    for (var i = 0; i < 10; i++) {
      time = this.CROCKFORD.charAt(ms % 32) + time;
      ms = Math.floor(ms / 32);
    }
    var b = this.randomBytes(10);
    var n = 0n;
    for (var j = 0; j < 10; j++) {
      n = (n << 8n) | BigInt(b[j]);
    }
    var rand = "";
    for (var k = 0; k < 16; k++) {
      rand = this.CROCKFORD.charAt(Number(n & 31n)) + rand;
      n >>= 5n;
    }
    return time + rand;
  },

  /* ---- inspecting ---- */

  UUID_RE : /^\{?([0-9a-f]{8})-?([0-9a-f]{4})-?([0-9a-f]{4})-?([0-9a-f]{4})-?([0-9a-f]{12})\}?$/i,
  GREGORIAN_OFFSET : 122192928000000000n, // 100-ns intervals from 1582-10-15 to 1970-01-01

  /**
   * { version, variant, time (ms) | null, nil, max } for a UUID in any usual spelling; null otherwise
   */
  parseUuid : function (str) {
    var m = this.UUID_RE.exec(str.trim().replace(/^urn:uuid:/i, ""));
    if (!m) {
      return null;
    }
    var hex = (m[1] + m[2] + m[3] + m[4] + m[5]).toLowerCase();
    var out = { hex : hex, version : parseInt(hex.charAt(12), 16), time : null, nil : /^0+$/.test(hex), max : /^f+$/.test(hex) };
    var v = parseInt(hex.charAt(16), 16);
    out.variant = (v & 8) == 0 ? "NCS (reserved)" : (v & 12) == 8 ? "RFC 4122" : (v & 14) == 12 ? "Microsoft" : "reserved";
    if (out.nil || out.max || out.variant != "RFC 4122") {
      out.version = null;
      return out;
    }
    if (out.version == 1) {
      var ts = BigInt("0x" + hex.slice(13, 16) + hex.slice(8, 12) + hex.slice(0, 8));
      out.time = Number((ts - this.GREGORIAN_OFFSET) / 10000n);
    } else if (out.version == 6) {
      var ts6 = BigInt("0x" + hex.slice(0, 12) + hex.slice(13, 16));
      out.time = Number((ts6 - this.GREGORIAN_OFFSET) / 10000n);
    } else if (out.version == 7) {
      out.time = parseInt(hex.slice(0, 12), 16);
    }
    return out;
  },

  /* { time } for a ULID; null otherwise */
  parseUlid : function (str) {
    var s = str.trim().toUpperCase();
    if (!/^[0-9A-HJKMNP-TV-Z]{26}$/.test(s) || s.charAt(0) > "7") {
      return null;
    }
    return { time : this.ulidTime(s) };
  },

  /* ---- name-based ---- */

  NAMESPACES : {
    DNS : "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    URL : "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
    OID : "6ba7b812-9dad-11d1-80b4-00c04fd430c8",
    X500 : "6ba7b814-9dad-11d1-80b4-00c04fd430c8"
  },

  /* UUID v5: SHA-1 of namespace bytes + name, version and variant bits set */
  uuid5 : function (namespace, name) {
    var ns = CryptoJS.enc.Hex.parse(namespace.replace(/-/g, ""));
    var digest = CryptoJS.SHA1(ns.concat(CryptoJS.enc.Utf8.parse(name)));
    var hex = CryptoJS.enc.Hex.stringify(digest).slice(0, 32);
    var b = new Uint8Array(16);
    for (var i = 0; i < 16; i++) b[i] = parseInt(hex.substr(i * 2, 2), 16);
    b[6] = (b[6] & 0x0f) | 0x50;
    b[8] = (b[8] & 0x3f) | 0x80;
    return this.formatUuid(b);
  },

  /* Unix milliseconds embedded in a ULID */
  ulidTime : function (ulid) {
    var ms = 0;
    for (var i = 0; i < 10; i++) {
      ms = ms * 32 + this.CROCKFORD.indexOf(ulid.charAt(i));
    }
    return ms;
  }
};
