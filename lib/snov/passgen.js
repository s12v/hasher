/**
 * Passphrase and password generator, a port of ppgen
 * (https://github.com/s12v/ppgen): EFF large wordlist, CSPRNG, no modulo bias.
 *
 * @author Sergey Novikov <mail@snov.me>
 */
var passgen = {
  /* EFF large wordlist, one word per entry; set with setWords() */
  words : [],

  ALNUM : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  SYMBOLS : "!@#$%^&*()-_=+[]{};:,.<>?/",

  MAX_WORDS : 64,
  MAX_DIGITS : 8,
  MAX_LENGTH : 256,

  setWords : function (text) {
    this.words = text.split(/\r?\n/).filter(function (w) { return w.length > 0; });
  },

  /**
   * Uniform integer in [0, n) from the OS CSPRNG. Values that would skew
   * r % n are discarded (rejection sampling), so every result is equally likely.
   */
  uniform : function (n) {
    var buf = new Uint32Array(1);
    var limit = 0x100000000 - (0x100000000 % n);
    do {
      crypto.getRandomValues(buf);
    } while (buf[0] >= limit);
    return buf[0] % n;
  },

  clamp : function (value, min, max, fallback) {
    var n = parseInt(value, 10);
    if (isNaN(n)) {
      return fallback;
    }
    return Math.min(max, Math.max(min, n));
  },

  /**
   * opts: { words: 5, separator: "-", digits: 0, capitalize: false }
   */
  passphrase : function (opts) {
    if (this.words.length == 0) {
      return "";
    }
    var count = this.clamp(opts.words, 1, this.MAX_WORDS, 5);
    var digits = this.clamp(opts.digits, 0, this.MAX_DIGITS, 0);
    var parts = [];
    for (var i = 0; i < count; i++) {
      var word = this.words[this.uniform(this.words.length)];
      if (opts.capitalize) {
        word = word.charAt(0).toUpperCase() + word.slice(1);
      }
      parts.push(word);
    }
    var result = parts.join(opts.separator == null ? "-" : opts.separator);
    if (digits > 0) {
      var num = String(this.uniform(Math.pow(10, digits)));
      while (num.length < digits) {
        num = "0" + num;
      }
      result += num;
    }
    return result;
  },

  passphraseBits : function (opts) {
    if (this.words.length == 0) {
      return 0;
    }
    var count = this.clamp(opts.words, 1, this.MAX_WORDS, 5);
    var digits = this.clamp(opts.digits, 0, this.MAX_DIGITS, 0);
    return count * Math.log2(this.words.length) + digits * Math.log2(10);
  },

  /**
   * opts: { length: 16, symbols: false }
   */
  password : function (opts) {
    var length = this.clamp(opts.length, 1, this.MAX_LENGTH, 16);
    var alphabet = this.ALNUM + (opts.symbols ? this.SYMBOLS : "");
    var result = "";
    for (var i = 0; i < length; i++) {
      result += alphabet.charAt(this.uniform(alphabet.length));
    }
    return result;
  },

  passwordBits : function (opts) {
    var length = this.clamp(opts.length, 1, this.MAX_LENGTH, 16);
    var alphabet = this.ALNUM + (opts.symbols ? this.SYMBOLS : "");
    return length * Math.log2(alphabet.length);
  }
};
