/**
 * Parametrised CRC (Rocksoft model: width, poly, init, refin, refout, xorout)
 * plus Adler-32. Bitwise, no tables: fast enough for anything typed into a popup.
 * Parameters and check values from the CRC catalogue (reveng).
 *
 * @author Sergey Novikov <mail@snov.me>
 */
var crc = {
  MODELS : {
    "CRC-32" :          { width : 32, poly : 0x04C11DB7, init : 0xFFFFFFFF, refin : true,  refout : true,  xorout : 0xFFFFFFFF, check : 0xCBF43926 },
    "CRC-32C" :         { width : 32, poly : 0x1EDC6F41, init : 0xFFFFFFFF, refin : true,  refout : true,  xorout : 0xFFFFFFFF, check : 0xE3069283 },
    "CRC-16/MODBUS" :   { width : 16, poly : 0x8005,     init : 0xFFFF,     refin : true,  refout : true,  xorout : 0x0000,     check : 0x4B37 },
    "CRC-16/CCITT-FALSE" : { width : 16, poly : 0x1021,  init : 0xFFFF,     refin : false, refout : false, xorout : 0x0000,     check : 0x29B1 },
    "CRC-16/XMODEM" :   { width : 16, poly : 0x1021,     init : 0x0000,     refin : false, refout : false, xorout : 0x0000,     check : 0x31C3 },
    "CRC-8" :           { width : 8,  poly : 0x07,       init : 0x00,       refin : false, refout : false, xorout : 0x00,       check : 0xF4 },
    "CRC-64/XZ" :       { width : 64, poly : 0x42F0E1EBA9EA3693n, init : 0xFFFFFFFFFFFFFFFFn, refin : true, refout : true, xorout : 0xFFFFFFFFFFFFFFFFn, check : 0x995DC9BBDF1939FAn }
  },

  /* JS string -> UTF-8 bytes */
  bytes : function (str) {
    return new TextEncoder().encode(str);
  },

  /* reverse the low `width` bits of a number (width <= 32) */
  reflect : function (value, width) {
    var out = 0;
    for (var i = 0; i < width; i++) {
      out = (out << 1) | (value & 1);
      value >>>= 1;
    }
    return out >>> 0;
  },

  reflectBig : function (value, width) {
    var out = 0n;
    for (var i = 0; i < width; i++) {
      out = (out << 1n) | (value & 1n);
      value >>= 1n;
    }
    return out;
  },

  /**
   * CRC of a byte array under a model; a number for width <= 32, a BigInt for wider
   */
  compute : function (bytes, m) {
    if (m.width > 32) {
      return this.computeBig(bytes, m);
    }
    var mask = m.width == 32 ? 0xFFFFFFFF : (1 << m.width) - 1;
    var reg;
    if (m.refin) {
      // reflected algorithm: work LSB-first with the reflected polynomial
      var rpoly = this.reflect(m.poly, m.width);
      reg = this.reflect(m.init, m.width);
      for (var i = 0; i < bytes.length; i++) {
        reg ^= bytes[i];
        for (var b = 0; b < 8; b++) {
          reg = (reg & 1) ? ((reg >>> 1) ^ rpoly) : (reg >>> 1);
        }
      }
      if (!m.refout) {
        reg = this.reflect(reg, m.width);
      }
    } else {
      var top = 1 << (m.width - 1);
      reg = m.init;
      for (var j = 0; j < bytes.length; j++) {
        reg ^= bytes[j] << (m.width - 8);
        for (var c = 0; c < 8; c++) {
          reg = (reg & top) ? (((reg << 1) ^ m.poly) & mask) : ((reg << 1) & mask);
        }
      }
      if (m.refout) {
        reg = this.reflect(reg, m.width);
      }
    }
    return ((reg ^ m.xorout) & mask) >>> 0;
  },

  computeBig : function (bytes, m) {
    var width = BigInt(m.width);
    var mask = (1n << width) - 1n;
    var reg;
    if (m.refin) {
      var rpoly = this.reflectBig(m.poly, m.width);
      reg = this.reflectBig(m.init, m.width);
      for (var i = 0; i < bytes.length; i++) {
        reg ^= BigInt(bytes[i]);
        for (var b = 0; b < 8; b++) {
          reg = (reg & 1n) ? ((reg >> 1n) ^ rpoly) : (reg >> 1n);
        }
      }
      if (!m.refout) {
        reg = this.reflectBig(reg, m.width);
      }
    } else {
      var top = 1n << (width - 1n);
      reg = m.init;
      for (var j = 0; j < bytes.length; j++) {
        reg ^= BigInt(bytes[j]) << (width - 8n);
        for (var c = 0; c < 8; c++) {
          reg = (reg & top) ? (((reg << 1n) ^ m.poly) & mask) : ((reg << 1n) & mask);
        }
      }
      if (m.refout) {
        reg = this.reflectBig(reg, m.width);
      }
    }
    return (reg ^ m.xorout) & mask;
  },

  /* "0x" + zero-padded uppercase hex, width/4 digits */
  hex : function (value, width) {
    var h = value.toString(16).toUpperCase();
    while (h.length < width / 4) {
      h = "0" + h;
    }
    return "0x" + h;
  },

  /* CRC of a string's UTF-8 bytes under a named model, as "0x..." */
  of : function (name, str) {
    var m = this.MODELS[name];
    return this.hex(this.compute(this.bytes(str), m), m.width);
  },

  /* decimal value, for the hint */
  decimal : function (name, str) {
    return String(this.compute(this.bytes(str), this.MODELS[name]));
  },

  /* Adler-32 (zlib), check value 0x091E01DE */
  adler32 : function (str) {
    var bytes = this.bytes(str);
    var a = 1, b = 0;
    for (var i = 0; i < bytes.length; i++) {
      a = (a + bytes[i]) % 65521;
      b = (b + a) % 65521;
    }
    return ((b << 16) | a) >>> 0;
  }
};
