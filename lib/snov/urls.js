/**
 * URL parsing helpers on top of the URL API, plus punycode decoding for IDN hosts.
 *
 * @author Sergey Novikov <mail@snov.me>
 */
var urls = {
  DEFAULT_PORTS : { "http:" : "80", "https:" : "443", "ftp:" : "21", "ws:" : "80", "wss:" : "443" },

  /**
   * { url: URL, assumed: bool } — "example.com/x" is read as https://example.com/x (assumed);
   * throws when it is not a URL at all
   */
  parse : function (input) {
    var str = input.trim();
    if (str.length == 0) {
      throw new Error("empty");
    }
    var assumed = false;
    // no scheme, or a "host:port" that would otherwise read as a scheme ("localhost:3000")
    if (!/^[a-z][a-z0-9+.-]*:/i.test(str) || /^[a-z][a-z0-9+.-]*:\d/i.test(str)) {
      str = "https://" + str;
      assumed = true;
    }
    var url;
    try {
      url = new URL(str);
    } catch (err) {
      throw new Error("not a URL");
    }
    if (assumed && !/^[^\/]+\.[^\/]+|^localhost|^\d+\.\d+\.\d+\.\d+|^\[/.test(url.host)) {
      throw new Error("not a URL");
    }
    return { url : url, assumed : assumed };
  },

  /* one decoded "key = value" per line */
  query : function (url) {
    var out = [];
    url.searchParams.forEach(function (value, key) {
      out.push(key + " = " + value);
    });
    return out.join("\n");
  },

  /* xn--e1afmkfd.xn--p1ai -> пример.рф; other labels pass through */
  toUnicode : function (host) {
    var self = this;
    return host.split(".").map(function (label) {
      return /^xn--/i.test(label) ? self.punycodeDecode(label.slice(4)) : label;
    }).join(".");
  },

  /* RFC 3492 decoder for one label (without the xn-- prefix) */
  punycodeDecode : function (input) {
    var base = 36, tMin = 1, tMax = 26, skew = 38, damp = 700, initialBias = 72, initialN = 128;
    var output = [];
    var basic = input.lastIndexOf("-");
    for (var j = 0; j < Math.max(basic, 0); j++) {
      output.push(input.charCodeAt(j));
    }
    var n = initialN, bias = initialBias, i = 0;
    var digit = function (c) {
      if (c >= 48 && c <= 57) return c - 22;
      if (c >= 65 && c <= 90) return c - 65;
      if (c >= 97 && c <= 122) return c - 97;
      return base;
    };
    var adapt = function (delta, numPoints, firstTime) {
      delta = firstTime ? Math.floor(delta / damp) : delta >> 1;
      delta += Math.floor(delta / numPoints);
      var k = 0;
      while (delta > ((base - tMin) * tMax) >> 1) {
        delta = Math.floor(delta / (base - tMin));
        k += base;
      }
      return k + Math.floor((base - tMin + 1) * delta / (delta + skew));
    };
    for (var index = basic > 0 ? basic + 1 : 0; index < input.length;) {
      var oldi = i, w = 1;
      for (var k = base; ; k += base) {
        if (index >= input.length) throw new Error("bad punycode");
        var d = digit(input.charCodeAt(index++));
        if (d >= base) throw new Error("bad punycode");
        i += d * w;
        var t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
        if (d < t) break;
        w *= base - t;
      }
      var out = output.length + 1;
      bias = adapt(i - oldi, out, oldi == 0);
      n += Math.floor(i / out);
      i %= out;
      output.splice(i++, 0, n);
    }
    return String.fromCodePoint.apply(null, output);
  }
};
