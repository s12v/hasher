/**
 * Integers of any size (BigInt) in decimal, hex, octal, binary and Roman,
 * plus IEEE-754 views of floating-point input.
 *
 * @author Sergey Novikov <mail@snov.me>
 */
var numbers = {
  ROMAN : [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]],

  /**
   * "42", "-42", "0x2a", "2a" (letters make it hex), "0b101010", "0o52", "XLII", "3.14", "1e3";
   * underscores and spaces between digits are ignored. Returns
   * { value: BigInt, base, roman? } or { float: number }; throws with a reason.
   */
  parse : function (input) {
    var s = input.trim().replace(/[_\s]+/g, "");
    if (s.length == 0) {
      throw new Error("empty");
    }
    var negative = false;
    if (s.charAt(0) == "-" || s.charAt(0) == "+") {
      negative = s.charAt(0) == "-";
      s = s.slice(1);
    }
    var m;
    if ((m = /^0x([0-9a-f]+)$/i.exec(s))) {
      return this.integer(BigInt("0x" + m[1]), 16, negative);
    }
    if ((m = /^0b([01]+)$/i.exec(s))) {
      return this.integer(BigInt("0b" + m[1]), 2, negative);
    }
    if ((m = /^0o([0-7]+)$/i.exec(s))) {
      return this.integer(BigInt("0o" + m[1]), 8, negative);
    }
    if (/^\d+$/.test(s)) {
      return this.integer(BigInt(s), 10, negative);
    }
    // a decimal point, or an exponent with an explicit sign, means floating point;
    // "1e3" on its own is hex, like any digits-and-letters string
    if (/^(\d+\.\d*|\d*\.\d+)(e[+-]?\d+)?$/i.test(s) || /^\d+e[+-]\d+$/i.test(s)) {
      var f = parseFloat(s);
      if (!isFinite(f)) {
        throw new Error("not a finite number");
      }
      return { float : negative ? -f : f };
    }
    if (/^[0-9a-f]+$/i.test(s)) {
      return this.integer(BigInt("0x" + s), 16, negative);
    }
    if (/^[ivxlcdm]+$/i.test(s) && !negative) {
      return this.integer(BigInt(this.fromRoman(s.toUpperCase())), 0, false);
    }
    throw new Error("not a number");
  },

  integer : function (magnitude, base, negative) {
    return { value : negative ? -magnitude : magnitude, base : base };
  },

  BASE_NAMES : { 0 : "Roman", 2 : "binary", 8 : "octal", 10 : "decimal", 16 : "hex" },

  /* sign-aware rendering in a base, with the usual prefix */
  format : function (value, base) {
    var prefix = { 16 : "0x", 8 : "0o", 2 : "0b" }[base] || "";
    var magnitude = value < 0n ? -value : value;
    return (value < 0n ? "-" : "") + prefix + magnitude.toString(base);
  },

  /* binary in groups of 8 bits from the right */
  binaryGrouped : function (value) {
    var magnitude = value < 0n ? -value : value;
    var bits = magnitude.toString(2);
    while (bits.length % 8 != 0) bits = "0" + bits;
    return (value < 0n ? "-" : "") + bits.replace(/(.{8})(?=.)/g, "$1 ");
  },

  bitLength : function (value) {
    var magnitude = value < 0n ? -value : value;
    return magnitude == 0n ? 1 : magnitude.toString(2).length;
  },

  toRoman : function (value) {
    if (value < 1n || value > 3999n) {
      return "";
    }
    var n = Number(value), out = "";
    for (var i = 0; i < this.ROMAN.length; i++) {
      while (n >= this.ROMAN[i][0]) {
        out += this.ROMAN[i][1];
        n -= this.ROMAN[i][0];
      }
    }
    return out;
  },

  fromRoman : function (str) {
    var values = { I : 1, V : 5, X : 10, L : 50, C : 100, D : 500, M : 1000 };
    var total = 0;
    for (var i = 0; i < str.length; i++) {
      var v = values[str.charAt(i)], next = values[str.charAt(i + 1)] || 0;
      total += v < next ? -v : v;
    }
    if (this.toRoman(BigInt(total)) != str) {
      throw new Error("not a well-formed Roman numeral");
    }
    return total;
  },

  /* 1536 -> "1.5 KiB (1.54 kB)" for values that look like a byte count */
  size : function (value) {
    if (value < 1024n) {
      return "";
    }
    var n = Number(value);
    var bin = ["B", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB"], dec = ["B", "kB", "MB", "GB", "TB", "PB", "EB"];
    var i = 0, b = n;
    while (b >= 1024 && i < bin.length - 1) { b /= 1024; i++; }
    var j = 0, d = n;
    while (d >= 1000 && j < dec.length - 1) { d /= 1000; j++; }
    var fmt = function (x) { return (Math.round(x * 100) / 100).toString(); };
    return fmt(b) + " " + bin[i] + " (" + fmt(d) + " " + dec[j] + ")";
  },

  /* IEEE-754 encodings of a float as big-endian hex */
  float64hex : function (f) {
    var view = new DataView(new ArrayBuffer(8));
    view.setFloat64(0, f);
    return "0x" + this.viewHex(view, 8);
  },
  float32hex : function (f) {
    var view = new DataView(new ArrayBuffer(4));
    view.setFloat32(0, f);
    return "0x" + this.viewHex(view, 4);
  },
  viewHex : function (view, bytes) {
    var out = "";
    for (var i = 0; i < bytes; i++) {
      out += view.getUint8(i).toString(16).padStart(2, "0");
    }
    return out;
  },

  /* a 4- or 8-byte hex value read back as a float, for the hint on hex input */
  hexAsFloat : function (value, digits) {
    var view = new DataView(new ArrayBuffer(8));
    if (digits == 8) {
      view.setUint32(0, Number(value));
      return view.getFloat32(0);
    }
    view.setBigUint64(0, value);
    return view.getFloat64(0);
  }
};
