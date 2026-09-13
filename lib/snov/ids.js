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

  /* Unix milliseconds embedded in a ULID */
  ulidTime : function (ulid) {
    var ms = 0;
    for (var i = 0; i < 10; i++) {
      ms = ms * 32 + this.CROCKFORD.indexOf(ulid.charAt(i));
    }
    return ms;
  }
};
