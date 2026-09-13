/**
 * JSON Web Token decoding and HMAC verification (HS256 / HS384 / HS512)
 *
 * @author Sergey Novikov <mail@snov.me>
 */
var jwt = {
  /* base64url -> UTF-8 string; throws on bad input */
  decodeSegment : function (segment) {
    var b64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4 != 0) {
      b64 += "=";
    }
    return CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(b64));
  },

  /* WordArray -> base64url without padding */
  encodeSegment : function (words) {
    return CryptoJS.enc.Base64.stringify(words).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  },

  /**
   * { header, payload, signature, signingInput }; throws with a reason
   */
  parse : function (token) {
    var parts = token.trim().split(".");
    if (parts.length != 3) {
      throw new Error("expected 3 dot-separated segments, got " + parts.length);
    }
    if (!/^[A-Za-z0-9_-]*$/.test(parts[0] + parts[1] + parts[2])) {
      throw new Error("segments must be base64url");
    }
    var header, payload;
    try {
      header = JSON.parse(this.decodeSegment(parts[0]));
    } catch (err) {
      throw new Error("header is not base64url JSON");
    }
    try {
      payload = JSON.parse(this.decodeSegment(parts[1]));
    } catch (err) {
      throw new Error("payload is not base64url JSON");
    }
    if (header === null || typeof header != "object") {
      throw new Error("header is not a JSON object");
    }
    return {
      header : header,
      payload : payload,
      signature : parts[2],
      signingInput : parts[0] + "." + parts[1]
    };
  },

  HMAC : { HS256 : "HmacSHA256", HS384 : "HmacSHA384", HS512 : "HmacSHA512" },

  /**
   * true / false for HS* algorithms, null when the algorithm cannot be checked here
   */
  verify : function (parsed, secret) {
    var fn = this.HMAC[parsed.header.alg];
    if (!fn) {
      return null;
    }
    var expected = this.encodeSegment(CryptoJS[fn](parsed.signingInput, secret));
    var actual = parsed.signature.replace(/=+$/, "");
    // constant-time compare, for form's sake
    if (expected.length != actual.length) {
      return false;
    }
    var diff = 0;
    for (var i = 0; i < expected.length; i++) {
      diff |= expected.charCodeAt(i) ^ actual.charCodeAt(i);
    }
    return diff == 0;
  },

  /* "in 2 hours" / "3 days ago" / "just now" */
  relative : function (seconds) {
    var abs = Math.abs(seconds);
    var units = [[365 * 86400, "year"], [30 * 86400, "month"], [7 * 86400, "week"], [86400, "day"], [3600, "hour"], [60, "minute"], [1, "second"]];
    if (abs < 1) {
      return "just now";
    }
    for (var i = 0; i < units.length; i++) {
      if (abs >= units[i][0]) {
        var n = Math.floor(abs / units[i][0]);
        var text = n + " " + units[i][1] + (n == 1 ? "" : "s");
        return seconds > 0 ? "in " + text : text + " ago";
      }
    }
    return "just now";
  },

  TIME_CLAIMS : { exp : "expires", nbf : "not before", iat : "issued" },

  pad : function (n) {
    return (n < 10 ? "0" : "") + n;
  },

  /**
   * One line per registered claim, time claims as local time with the distance from `now` (a Date)
   */
  describeClaims : function (payload, now) {
    var lines = [];
    if (payload === null || typeof payload != "object") {
      return lines;
    }
    var nowSec = Math.floor(now.getTime() / 1000);
    var order = ["iss", "sub", "aud", "exp", "nbf", "iat", "jti"];
    for (var i = 0; i < order.length; i++) {
      var claim = order[i];
      if (!(claim in payload)) {
        continue;
      }
      var value = payload[claim];
      if (this.TIME_CLAIMS[claim] && typeof value == "number") {
        var d = new Date(value * 1000);
        var p = this.pad;
        var when = d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " +
          p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
        var label = (claim == "exp" && value <= nowSec) ? "EXPIRED" : this.TIME_CLAIMS[claim];
        lines.push(claim + ": " + when + " (" + label + " " + this.relative(value - nowSec) + ")");
      } else {
        lines.push(claim + ": " + (typeof value == "string" ? value : JSON.stringify(value)));
      }
    }
    return lines;
  }
};
