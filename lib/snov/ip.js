/**
 * IPv4 and IPv6 addresses and prefixes, on BigInt so both share the arithmetic.
 *
 * @author Sergey Novikov <mail@snov.me>
 */
var ip = {
  V4_MAX : (1n << 32n) - 1n,
  V6_MAX : (1n << 128n) - 1n,

  /**
   * "10.0.12.42", "10.0.12.42/22", "10.0.12.42/255.255.252.0", a decimal, "2001:db8::1",
   * "2001:db8::/32", "::ffff:192.0.2.1" -> { version, address (BigInt), prefix (number|null) };
   * throws with a reason on anything else
   */
  parse : function (input) {
    var str = input.trim().replace(/^\[(.*)\]$/, "$1");
    if (str.length == 0) {
      throw new Error("empty");
    }
    var slash = str.indexOf("/");
    var host = slash >= 0 ? str.slice(0, slash) : str;
    var suffix = slash >= 0 ? str.slice(slash + 1) : null;
    var out;
    if (/^\d+$/.test(host)) {
      var n = BigInt(host);
      if (n > this.V6_MAX) {
        throw new Error("decimal value is larger than an IPv6 address");
      }
      out = { version : n > this.V4_MAX ? 6 : 4, address : n, prefix : null };
    } else if (host.indexOf(":") >= 0) {
      out = { version : 6, address : this.parseV6(host.replace(/%.*$/, "")), prefix : null };
    } else {
      out = { version : 4, address : this.parseV4(host), prefix : null };
    }
    if (suffix !== null) {
      if (out.version == 4 && /^\d+\.\d+\.\d+\.\d+$/.test(suffix)) {
        out.prefix = this.maskToPrefix(this.parseV4(suffix));
      } else if (/^\d{1,3}$/.test(suffix) && +suffix <= (out.version == 4 ? 32 : 128)) {
        out.prefix = +suffix;
      } else {
        throw new Error("bad prefix length /" + suffix);
      }
    }
    return out;
  },

  parseV4 : function (str) {
    var m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(str);
    if (!m) {
      throw new Error("not an IPv4 address");
    }
    var n = 0n;
    for (var i = 1; i <= 4; i++) {
      if (+m[i] > 255) {
        throw new Error("octet " + m[i] + " is above 255");
      }
      n = (n << 8n) | BigInt(+m[i]);
    }
    return n;
  },

  parseV6 : function (str) {
    var lower = str.toLowerCase();
    if (!/^[0-9a-f:.]+$/.test(lower) || lower.indexOf(":::") >= 0) {
      throw new Error("not an IPv6 address");
    }
    // an embedded IPv4 in the last 32 bits: replace it with two hex groups
    var v4 = /(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
    if (v4) {
      var n = this.parseV4(v4[1]);
      lower = lower.slice(0, -v4[1].length) + (n >> 16n).toString(16) + ":" + (n & 0xffffn).toString(16);
    }
    var halves = lower.split("::");
    if (halves.length > 2) {
      throw new Error("only one :: is allowed");
    }
    var head = halves[0] ? halves[0].split(":") : [];
    var tail = halves.length == 2 && halves[1] ? halves[1].split(":") : [];
    var groups;
    if (halves.length == 2) {
      if (head.length + tail.length > 7) {
        throw new Error("too many groups");
      }
      groups = head.concat(new Array(8 - head.length - tail.length).fill("0"), tail);
    } else {
      groups = head;
      if (groups.length != 8) {
        throw new Error("expected 8 groups, got " + groups.length);
      }
    }
    var address = 0n;
    for (var i = 0; i < 8; i++) {
      if (!/^[0-9a-f]{1,4}$/.test(groups[i])) {
        throw new Error("bad group '" + groups[i] + "'");
      }
      address = (address << 16n) | BigInt(parseInt(groups[i], 16));
    }
    return address;
  },

  /* 255.255.252.0 -> 22; anything non-contiguous throws */
  maskToPrefix : function (mask) {
    var prefix = 0;
    var seenZero = false;
    for (var i = 31; i >= 0; i--) {
      var bit = (mask >> BigInt(i)) & 1n;
      if (bit == 1n) {
        if (seenZero) {
          throw new Error("netmask is not contiguous");
        }
        prefix++;
      } else {
        seenZero = true;
      }
    }
    return prefix;
  },

  /* ---- formatting ---- */

  v4 : function (n) {
    return [(n >> 24n) & 255n, (n >> 16n) & 255n, (n >> 8n) & 255n, n & 255n].join(".");
  },

  v4Binary : function (n) {
    return [(n >> 24n) & 255n, (n >> 16n) & 255n, (n >> 8n) & 255n, n & 255n]
      .map(function (o) { return ("00000000" + o.toString(2)).slice(-8); }).join(".");
  },

  hex : function (n, version) {
    var h = n.toString(16);
    var width = version == 4 ? 8 : 32;
    while (h.length < width) h = "0" + h;
    return h;
  },

  groups : function (n) {
    var out = [];
    for (var i = 7; i >= 0; i--) {
      out.push(Number((n >> BigInt(i * 16)) & 0xffffn));
    }
    return out;
  },

  /* 2001:0db8:0000:0000:0000:0000:0000:0001 */
  v6Expanded : function (n) {
    return this.groups(n).map(function (g) { return ("0000" + g.toString(16)).slice(-4); }).join(":");
  },

  /* RFC 5952: lowercase, no leading zeros, the longest run of zero groups (leftmost on a tie, 2+ long) as :: */
  v6 : function (n) {
    if ((n >> 32n) == 0xffffn) {
      return "::ffff:" + this.v4(n & this.V4_MAX); // IPv4-mapped, mixed notation
    }
    var g = this.groups(n);
    var bestStart = -1, bestLen = 0;
    for (var i = 0; i < 8; i++) {
      if (g[i] != 0) continue;
      var j = i;
      while (j < 8 && g[j] == 0) j++;
      if (j - i > bestLen) {
        bestStart = i;
        bestLen = j - i;
      }
      i = j;
    }
    var hex = g.map(function (x) { return x.toString(16); });
    if (bestLen < 2) {
      return hex.join(":");
    }
    return hex.slice(0, bestStart).join(":") + "::" + hex.slice(bestStart + bestLen).join(":");
  },

  ptr : function (n, version) {
    if (version == 4) {
      return this.v4(n).split(".").reverse().join(".") + ".in-addr.arpa";
    }
    return this.hex(n, 6).split("").reverse().join(".") + ".ip6.arpa";
  },

  /* ---- classification ---- */

  V4_TYPES : [
    ["0.0.0.0/8", "this network"], ["10.0.0.0/8", "private (RFC 1918)"], ["100.64.0.0/10", "carrier-grade NAT (RFC 6598)"],
    ["127.0.0.0/8", "loopback"], ["169.254.0.0/16", "link-local"], ["172.16.0.0/12", "private (RFC 1918)"],
    ["192.0.0.0/24", "IETF protocol assignments"], ["192.0.2.0/24", "documentation (TEST-NET-1)"], ["192.88.99.0/24", "6to4 relay (deprecated)"],
    ["192.168.0.0/16", "private (RFC 1918)"], ["198.18.0.0/15", "benchmarking"], ["198.51.100.0/24", "documentation (TEST-NET-2)"],
    ["203.0.113.0/24", "documentation (TEST-NET-3)"], ["224.0.0.0/4", "multicast"], ["255.255.255.255/32", "limited broadcast"],
    ["240.0.0.0/4", "reserved"]
  ],
  V6_TYPES : [
    ["::/128", "unspecified"], ["::1/128", "loopback"], ["::ffff:0:0/96", "IPv4-mapped"], ["64:ff9b::/96", "NAT64 (RFC 6052)"],
    ["2001:db8::/32", "documentation"], ["2001::/32", "Teredo"], ["2002::/16", "6to4"], ["fc00::/7", "unique local (ULA)"],
    ["fe80::/10", "link-local"], ["ff00::/8", "multicast"], ["2000::/3", "global unicast"]
  ],

  type : function (address, version) {
    var table = version == 4 ? this.V4_TYPES : this.V6_TYPES;
    var bits = version == 4 ? 32 : 128;
    for (var i = 0; i < table.length; i++) {
      var p = this.parse(table[i][0]);
      var shift = BigInt(bits - p.prefix);
      if ((address >> shift) == (p.address >> shift)) {
        var label = table[i][1];
        if (label == "IPv4-mapped") {
          label += " " + this.v4(address & this.V4_MAX);
        }
        return label;
      }
    }
    return version == 4 ? "public" : "reserved";
  },

  /* ---- prefix arithmetic ---- */

  range : function (parsed) {
    var bits = parsed.version == 4 ? 32 : 128;
    var all = parsed.version == 4 ? this.V4_MAX : this.V6_MAX;
    var hostBits = BigInt(bits - parsed.prefix);
    var mask = (all >> hostBits) << hostBits;
    var network = parsed.address & mask;
    return {
      mask : mask,
      wildcard : all ^ mask,
      network : network,
      last : network | (all ^ mask),
      count : 1n << hostBits
    };
  },

  /* usable IPv4 hosts: /31 is a point-to-point pair, /32 a single host */
  v4Hosts : function (range, prefix) {
    if (prefix >= 31) {
      return range.count;
    }
    return range.count - 2n;
  },

  /* first / last usable IPv4 host */
  v4HostMin : function (range, prefix) {
    return prefix >= 31 ? range.network : range.network + 1n;
  },
  v4HostMax : function (range, prefix) {
    return prefix >= 31 ? range.last : range.last - 1n;
  }
};
