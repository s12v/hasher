/**
 * Word splitting and case conversions: camelCase, PascalCase, snake_case,
 * kebab-case, CONSTANT_CASE, Title Case, Sentence case, slug.
 *
 * @author Sergey Novikov <mail@snov.me>
 */
var textcase = {
  /* "fooBarBaz", "foo-bar_baz", "FOO Bar" -> ["foo", "bar", "baz"] (lowercase) */
  words : function (str) {
    var s = str
      .replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, "$1 $2")      // fooBar -> foo Bar
      .replace(/(\p{Lu}+)(\p{Lu}\p{Ll})/gu, "$1 $2");     // HTTPServer -> HTTP Server
    return s.split(/[^\p{L}\p{N}]+/u).filter(function (w) { return w.length > 0; })
      .map(function (w) { return w.toLowerCase(); });
  },

  capitalize : function (w) {
    return w.charAt(0).toUpperCase() + w.slice(1);
  },

  camel : function (str) {
    var w = this.words(str);
    return w.map(function (x, i) { return i == 0 ? x : textcase.capitalize(x); }).join("");
  },
  pascal : function (str) {
    return this.words(str).map(this.capitalize).join("");
  },
  snake : function (str) {
    return this.words(str).join("_");
  },
  kebab : function (str) {
    return this.words(str).join("-");
  },
  constant : function (str) {
    return this.words(str).join("_").toUpperCase();
  },
  title : function (str) {
    return this.words(str).map(this.capitalize).join(" ");
  },
  sentence : function (str) {
    var w = this.words(str);
    return w.length ? this.capitalize(w.join(" ")) : "";
  },

  /* words with diacritics stripped, joined by dashes */
  slug : function (str) {
    return this.words(str.normalize("NFKD").replace(/\p{M}+/gu, "")).join("-");
  },

  /* UTF-16 code units as hex, big or little endian */
  utf16hex : function (str, littleEndian) {
    var out = "";
    for (var i = 0; i < str.length; i++) {
      var u = str.charCodeAt(i);
      var hi = (u >> 8).toString(16).padStart(2, "0"), lo = (u & 255).toString(16).padStart(2, "0");
      out += littleEndian ? lo + hi : hi + lo;
    }
    return out;
  },

  counts : function (str) {
    var words = str.trim().length ? str.trim().split(/\s+/).length : 0;
    var lines = str.length ? str.split(/\r\n|\r|\n/).length : 0;
    return { words : words, lines : lines };
  }
};
