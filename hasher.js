var tabs = {
  hash : 1,
  hmac : 2,
  crc : 3,
  cipher : 4,
  net : 5,
  time : 6,
  encode : 7,
  number : 8,
  string : 9,
  password : 10,
  cron : 11,
  json : 12,
  jwt : 13,
  uuid : 14,
  diff : 15,
  url : 16
};

/*
 *  Copy to clipboard
 */
function copyToClipboard(text) {
  var fallback = function () {
    var scratch = document.createElement("textarea");
    scratch.value = text;
    scratch.setAttribute("readonly", "");
    scratch.style.position = "fixed";
    scratch.style.opacity = "0";
    document.body.appendChild(scratch);
    scratch.select();
    document.execCommand("copy");
    document.body.removeChild(scratch);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(fallback);
  } else {
    fallback();
  }
}

/*
 *  JS string -> string of UTF-8 bytes, for the byte-oriented legacy libs (MD4, Whirlpool, CRC)
 */
function utf8(str) {
  return unescape(encodeURIComponent(str));
}

/*
 *  Unix seconds, Unix milliseconds (13+ digits) or anything Date() understands; null if unparseable
 */
function parseDate(input) {
  var str = input.trim();
  if (str.length == 0) {
    return null;
  }
  var date;
  var local = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?$/.exec(str);
  if (/^\d+$/.test(str)) {
    var num = parseInt(str, 10);
    date = new Date(str.length >= 13 ? num : num * 1000);
  } else if (local) {
    // DATETIME (local): "2019-02-27 09:36:55", also a bare date; no zone means local time
    var f = [+local[1], local[2] - 1, +local[3], +(local[4] || 0), +(local[5] || 0), +(local[6] || 0)];
    date = new Date(f[0], f[1], f[2], f[3], f[4], f[5], local[7] ? +(local[7] + "00").slice(0, 3) : 0);
    // Date() rolls "2019-13-45" over into a real date; refuse fields that did not survive as typed
    if (date.getFullYear() != f[0] || date.getMonth() != f[1] || date.getDate() != f[2] ||
        date.getHours() != f[3] || date.getMinutes() != f[4] || date.getSeconds() != f[5]) {
      return null;
    }
  } else {
    // ISO 8601 with a zone ("2019-02-27T09:36:55Z", "+02:00"), RFC-1123, and whatever else Date() reads
    date = new Date(str);
  }
  return isNaN(date.getTime()) ? null : date;
}

function pad2(n) {
  return (n < 10) ? "0" + n : "" + n;
}

/*
 *  Time tab: empty input means "now"
 */
function timeInput(input) {
  return input.trim().length == 0 ? new Date() : parseDate(input);
}

/*
 *  Num tab: numbers.parse() with an error string instead of a throw
 */
function parseNumber(input) {
  try {
    return numbers.parse(input);
  } catch (err) {
    return { error : err.message };
  }
}

/*
 *  URL tab: { url, assumed } for the input, { error } when it is not a URL
 */
function parseUrl(input) {
  try {
    return urls.parse(input);
  } catch (err) {
    return { error : err.message };
  }
}

/*
 *  IP tab: { version, address, prefix } for the input, { error } when it is not an address
 */
function parseIp(input) {
  try {
    return ip.parse(input);
  } catch (err) {
    return { error : err.message };
  }
}

/*
 *  JSON.parse with the error message as the failure value ("Invalid: ...")
 */
function parseJson(input) {
  if (input.trim().length == 0) {
    return { empty : true };
  }
  try {
    return { value : JSON.parse(input) };
  } catch (err) {
    return { error : "Invalid: " + err.message };
  }
}

/*
 *  What `openssl enc -aes-256-cbc -pbkdf2` writes: "Salted__", 8 salt bytes, then
 *  AES-256-CBC / PKCS#7 ciphertext; key and IV come from PBKDF2-HMAC-SHA256 with
 *  openssl's default 10000 iterations. Derivations are cached per password + salt.
 */
var aesPbkdf2 = {
  ITERATIONS : 10000,
  cache : {},
  keyIv : function (password, salt) {
    var id = password + "\u0000" + salt.toString();
    if (!this.cache[id]) {
      var kiv = CryptoJS.PBKDF2(password, salt, { keySize : 48 / 4, iterations : this.ITERATIONS, hasher : CryptoJS.algo.SHA256 });
      this.cache = {}; // keep one: typing changes the password, not the salt
      this.cache[id] = {
        key : CryptoJS.lib.WordArray.create(kiv.words.slice(0, 8), 32),
        iv : CryptoJS.lib.WordArray.create(kiv.words.slice(8, 12), 16)
      };
    }
    return this.cache[id];
  },
  encrypt : function (text, password) {
    var salt = CryptoJS.lib.WordArray.random(8);
    var k = this.keyIv(password, salt);
    var ct = CryptoJS.AES.encrypt(text, k.key, { iv : k.iv, mode : CryptoJS.mode.CBC, padding : CryptoJS.pad.Pkcs7 }).ciphertext;
    return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Latin1.parse("Salted__").concat(salt).concat(ct));
  },
  /* base64 of "Salted__", 8 salt bytes and at least one whole cipher block? (a shorter or
     unaligned payload would make CryptoJS invent a random salt and decrypt into noise) */
  isSalted : function (base64) {
    var raw;
    try {
      raw = CryptoJS.enc.Base64.parse(base64.trim());
    } catch (err) {
      return false;
    }
    return raw.sigBytes >= 32 && (raw.sigBytes - 16) % 16 == 0 &&
      CryptoJS.enc.Latin1.stringify(CryptoJS.lib.WordArray.create(raw.words.slice(0, 2), 8)) == "Salted__";
  },
  /* plaintext, or null when the input is not a Salted__ payload or the password is wrong */
  decrypt : function (base64, password) {
    if (!this.isSalted(base64)) {
      return null;
    }
    var raw = CryptoJS.enc.Base64.parse(base64.trim());
    var salt = CryptoJS.lib.WordArray.create(raw.words.slice(2, 4), 8);
    var body = CryptoJS.lib.WordArray.create(raw.words.slice(4), raw.sigBytes - 16);
    var k = this.keyIv(password, salt);
    try {
      var words = CryptoJS.AES.decrypt({ ciphertext : body }, k.key, { iv : k.iv, mode : CryptoJS.mode.CBC, padding : CryptoJS.pad.Pkcs7 });
      if (words.sigBytes < 0) {
        return null;
      }
      return CryptoJS.enc.Utf8.stringify(words);
    } catch (err) {
      return null;
    }
  }
};

/*
 *  Legacy openssl format (-md md5, EVP_BytesToKey): what CryptoJS does by default
 */
function aesLegacyDecrypt(base64, password) {
  if (!aesPbkdf2.isSalted(base64)) {
    return null;
  }
  try {
    var words = CryptoJS.AES.decrypt(base64.trim(), password);
    if (words.sigBytes <= 0) {
      return null;
    }
    return CryptoJS.enc.Utf8.stringify(words);
  } catch (err) {
    return null;
  }
}

/*
 *  The JSON tab's document: a pasted JSON string literal whose content is JSON
 *  ("{\"a\":1}") is unwrapped on the spot; a literal holding plain text is shown unquoted
 */
function jsonInput(input) {
  var parsed = parseJson(input);
  if (parsed.empty || parsed.error || typeof parsed.value != "string") {
    return parsed;
  }
  try {
    var inner = JSON.parse(parsed.value);
    if (inner !== null && typeof inner == "object") {
      return { value : inner, unwrapped : true };
    }
  } catch (err) {
    // not JSON inside: plain text in a JSON string
  }
  return { value : parsed.value, plain : true };
}

/*
 *  JWT tab: the input as a JSON object to sign, or null when it is a token / anything else
 */
function jwtPayload(input) {
  var str = input.trim();
  if (str.charAt(0) != "{") return null;
  try {
    var value = JSON.parse(str);
    return (value !== null && typeof value == "object" && !Array.isArray(value)) ? value : null;
  } catch (err) {
    return null;
  }
}

/*
 *  Same object with keys sorted recursively (arrays keep their order)
 */
function sortKeys(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value !== null && typeof value == "object") {
    var out = {};
    Object.keys(value).sort().forEach(function (key) {
      out[key] = sortKeys(value[key]);
    });
    return out;
  }
  return value;
}


var hasher = {
  tab : tabs.hash,
  /* Generator settings, kept in sync with the Password tab controls by popup.js */
  options : {
    passphrase : { words : 4, separator : "-", digits : 2, capitalize : false },
    password : { length : 16, symbols : false },
    key : { bytes : 32 },
    json : { sorted : false },
    other : "",
    diff : { ignoreWhitespace : false, ignoreCase : false }
  },
  elements: {
    // Hash, most used first
    h4 : {
      id: tabs.hash+"sha256",
      tab : tabs.hash,
      title: "SHA-256",
      calculate: function (input) {
        return CryptoJS.SHA256(input);
      }
    },
    h4b : {
      id : tabs.hash+"sha256-b64",
      tab : tabs.hash,
      title : "SHA-256, Base64",
      calculate : function (input) {
        return CryptoJS.enc.Base64.stringify(CryptoJS.SHA256(input));
      }
    },
    h6 : {
      id: tabs.hash+"sha512",
      tab : tabs.hash,
      title: "SHA-512",
      calculate: function (input) {
        return CryptoJS.SHA512(input);
      }
    },
    h6b : {
      id : tabs.hash+"sha512-b64",
      tab : tabs.hash,
      title : "SHA-512, Base64",
      calculate : function (input) {
        return CryptoJS.enc.Base64.stringify(CryptoJS.SHA512(input));
      }
    },
    h2 : {
      id: tabs.hash+"sha1",
      tab : tabs.hash,
      title: "SHA-1",
      calculate: function (input) {
        return CryptoJS.SHA1(input);
      }
    },
    h1 : {
      id : tabs.hash+"md5",
      tab : tabs.hash,
      title : "MD5",
      calculate : function (input) {
        return CryptoJS.MD5(input);
      }
    },
    h10 : {
      id: tabs.hash+"sha3-256",
      tab : tabs.hash,
      title: "SHA3-256",
      calculate: function (input) {
        return sha3_256(input);
      }
    },
    h11 : {
      id: tabs.hash+"sha3-512",
      tab : tabs.hash,
      title: "SHA3-512",
      calculate: function (input) {
        return sha3_512(input);
      }
    },
    h12 : {
      id: tabs.hash+"keccak256",
      tab : tabs.hash,
      title: "Keccak-256",
      calculate: function (input) {
        return keccak256(input);
      }
    },
    h5 : {
      id: tabs.hash+"sha384",
      tab : tabs.hash,
      title: "SHA-384",
      calculate: function (input) {
        return CryptoJS.SHA384(input);
      }
    },
    h3 : {
      id: tabs.hash+"sha224",
      tab : tabs.hash,
      title: "SHA-224",
      calculate: function (input) {
        return CryptoJS.SHA224(input);
      }
    },
    h8 : {
      id: tabs.hash+"ripemd160",
      tab : tabs.hash,
      title: "RIPEMD-160",
      calculate: function (input) {
        return CryptoJS.RIPEMD160(input);
      }
    },
    h13 : {
      id: tabs.hash+"blake2b-256",
      tab : tabs.hash,
      title: "BLAKE2b-256",
      calculate: function (input) {
        return blake.blake2bHex(input, undefined, 32);
      }
    },
    h14 : {
      id: tabs.hash+"blake2b-512",
      tab : tabs.hash,
      title: "BLAKE2b-512",
      calculate: function (input) {
        return blake.blake2bHex(input, undefined, 64);
      }
    },
    h15 : {
      id: tabs.hash+"sri",
      tab : tabs.hash,
      title: "SRI",
      calculate: function (input) {
        return "sha384-" + CryptoJS.enc.Base64.stringify(CryptoJS.SHA384(input));
      },
      hint: function () {
        return "integrity attribute for <script> / <link>";
      }
    },

    // HMAC, most used first (the Password field is the key)
    hm4: {
      id : tabs.hmac+"sha256",
      tab : tabs.hmac,
      title : "HMAC-SHA256",
      calculate : function (input, password) {
        return CryptoJS.HmacSHA256(input, password);
      }
    },
    hm4b : {
      id : tabs.hmac+"sha256-b64",
      tab : tabs.hmac,
      title : "HMAC-SHA256, Base64",
      calculate : function (input, password) {
        return CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(input, password));
      }
    },
    hm2 : {
      id : tabs.hmac+"sha1",
      tab : tabs.hmac,
      title : "HMAC-SHA1",
      calculate : function (input, password) {
        return CryptoJS.HmacSHA1(input, password);
      }
    },
    hm6: {
      id : tabs.hmac+"sha512",
      tab : tabs.hmac,
      title : "HMAC-SHA512",
      calculate : function (input, password) {
        return CryptoJS.HmacSHA512(input, password);
      }
    },
    hm6b : {
      id : tabs.hmac+"sha512-b64",
      tab : tabs.hmac,
      title : "HMAC-SHA512, Base64",
      calculate : function (input, password) {
        return CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA512(input, password));
      }
    },
    hm5: {
      id : tabs.hmac+"sha384",
      tab : tabs.hmac,
      title : "HMAC-SHA384",
      calculate : function (input, password) {
        return CryptoJS.HmacSHA384(input, password);
      }
    },
    hm1 : {
      id : tabs.hmac+"md5",
      tab : tabs.hmac,
      title : "HMAC-MD5",
      calculate : function (input, password) {
        return CryptoJS.HmacMD5(input, password);
      }
    },

    // CRC (lib/snov/crc.js, catalogue models)
    c1 : {
      id: tabs.crc+"crc32",
      tab : tabs.crc,
      title: "CRC-32",
      calculate: function (input) {
        return crc.of("CRC-32", input);
      },
      hint: function (input) {
        return input.length ? "zlib, PNG, gzip, zip, Ethernet \u00b7 " + crc.decimal("CRC-32", input) : "";
      }
    },
    c2 : {
      id: tabs.crc+"crc32c",
      tab : tabs.crc,
      title: "CRC-32C",
      calculate: function (input) {
        return crc.of("CRC-32C", input);
      },
      hint: function (input) {
        return input.length ? "Castagnoli: ext4, iSCSI, Kafka, gRPC, S3/GCS checksums \u00b7 " + crc.decimal("CRC-32C", input) : "";
      }
    },
    c3 : {
      id: tabs.crc+"modbus",
      tab : tabs.crc,
      title: "CRC-16/MODBUS",
      calculate: function (input) {
        return crc.of("CRC-16/MODBUS", input);
      },
      hint: function (input) {
        return input.length ? crc.decimal("CRC-16/MODBUS", input) : "";
      }
    },
    c4 : {
      id: tabs.crc+"ccitt",
      tab : tabs.crc,
      title: "CRC-16/CCITT-FALSE",
      calculate: function (input) {
        return crc.of("CRC-16/CCITT-FALSE", input);
      },
      hint: function (input) {
        return input.length ? crc.decimal("CRC-16/CCITT-FALSE", input) : "";
      }
    },
    c5 : {
      id: tabs.crc+"xmodem",
      tab : tabs.crc,
      title: "CRC-16/XMODEM",
      calculate: function (input) {
        return crc.of("CRC-16/XMODEM", input);
      },
      hint: function (input) {
        return input.length ? crc.decimal("CRC-16/XMODEM", input) : "";
      }
    },
    c6 : {
      id: tabs.crc+"crc8",
      tab : tabs.crc,
      title: "CRC-8",
      calculate: function (input) {
        return crc.of("CRC-8", input);
      },
      hint: function (input) {
        return input.length ? "poly 0x07 \u00b7 " + crc.decimal("CRC-8", input) : "";
      }
    },
    c7 : {
      id: tabs.crc+"crc64",
      tab : tabs.crc,
      title: "CRC-64/XZ",
      calculate: function (input) {
        return crc.of("CRC-64/XZ", input);
      },
      hint: function (input) {
        return input.length ? "xz, ECMA-182 \u00b7 " + crc.decimal("CRC-64/XZ", input) : "";
      }
    },
    c8 : {
      id: tabs.crc+"adler32",
      tab : tabs.crc,
      title: "Adler-32",
      calculate: function (input) {
        return crc.hex(crc.adler32(input), 32);
      },
      hint: function (input) {
        return input.length ? "zlib \u00b7 " + crc.adler32(input) : "";
      }
    },

    // Cipher (the Password field is the passphrase)
    ci1: {
      id : tabs.cipher+"aes256",
      tab : tabs.cipher,
      title : "AES-256-CBC",
      calculate : function (input, password) {
        return password.length ? aesPbkdf2.encrypt(input, password) : "";
      },
      hint : function (input, password) {
        return password.length ? "openssl enc -aes-256-cbc -pbkdf2 -a \u00b7 PBKDF2-SHA256, 10000 iterations" : "enter a password";
      }
    },
    ci2: {
      id : tabs.cipher+"aes256-legacy",
      tab : tabs.cipher,
      title : "AES-256-CBC, legacy KDF",
      calculate : function (input, password) {
        return password.length ? CryptoJS.AES.encrypt(input, password).toString() : "";
      },
      hint : function (input, password) {
        return password.length ? "openssl enc -aes-256-cbc -md md5 -a \u00b7 EVP_BytesToKey, for old readers" : "";
      }
    },
    ci3: {
      id : tabs.cipher+"aes256-d",
      tab : tabs.cipher,
      title : "AES-256 decrypt",
      calculate : function (input, password) {
        if (!password.length) return "";
        var text = aesPbkdf2.decrypt(input, password);
        if (text === null) text = aesLegacyDecrypt(input, password);
        return text === null ? "" : text;
      },
      hint : function (input, password) {
        // only speak up for something that looks like a payload (base64 of "Salted__")
        if (!password.length || input.trim().indexOf("U2FsdGVkX1") != 0) return "";
        if (aesPbkdf2.decrypt(input, password) !== null) return "PBKDF2 payload";
        if (aesLegacyDecrypt(input, password) !== null) return "legacy MD5-KDF payload";
        return "a Salted__ payload, but not for this password";
      },
      tone : function (input, password) {
        if (!password.length || input.trim().indexOf("U2FsdGVkX1") != 0) return "";
        return this.calculate(input, password).length ? "ok" : "bad";
      }
    },

    // IP (tab id "net"): IPv4 or IPv6 address, prefix or decimal in the input
    net1 : {
      id: tabs.net+"address",
      tab : tabs.net,
      title: "Address",
      calculate: function (input) {
        if (input.trim().length == 0) return "";
        var p = parseIp(input);
        if (p.error) return "Invalid: " + p.error;
        return p.version == 4 ? ip.v4(p.address) : ip.v6(p.address);
      },
      hint: function (input) {
        var p = parseIp(input);
        if (p.error) return "";
        return (p.version == 4 ? "IPv4 \u00b7 " : "IPv6 \u00b7 ") + ip.type(p.address, p.version);
      }
    },
    net2 : {
      id: tabs.net+"expanded",
      tab : tabs.net,
      title: "Expanded",
      calculate: function (input) {
        var p = parseIp(input);
        return (p.error || p.version != 6) ? "" : ip.v6Expanded(p.address);
      }
    },
    net3 : {
      id: tabs.net+"decimal",
      tab : tabs.net,
      title: "Decimal",
      calculate: function (input) {
        var p = parseIp(input);
        return p.error ? "" : p.address.toString();
      }
    },
    net4 : {
      id: tabs.net+"hex",
      tab : tabs.net,
      title: "Hex",
      calculate: function (input) {
        var p = parseIp(input);
        return p.error ? "" : ip.hex(p.address, p.version);
      }
    },
    net5 : {
      id: tabs.net+"binary",
      tab : tabs.net,
      title: "Binary",
      calculate: function (input) {
        var p = parseIp(input);
        return (p.error || p.version != 4) ? "" : ip.v4Binary(p.address);
      }
    },
    net6 : {
      id: tabs.net+"ptr",
      tab : tabs.net,
      title: "PTR",
      calculate: function (input) {
        var p = parseIp(input);
        return p.error ? "" : ip.ptr(p.address, p.version);
      },
      hint: function () {
        return "reverse DNS name";
      }
    },
    net7 : {
      id: tabs.net+"network",
      tab : tabs.net,
      title: "Network",
      calculate: function (input) {
        var p = parseIp(input);
        if (p.error || p.prefix === null) return "";
        var r = ip.range(p);
        return (p.version == 4 ? ip.v4(r.network) : ip.v6(r.network)) + "/" + p.prefix;
      }
    },
    net8 : {
      id: tabs.net+"netmask",
      tab : tabs.net,
      title: "Netmask",
      calculate: function (input) {
        var p = parseIp(input);
        if (p.error || p.prefix === null || p.version != 4) return "";
        return ip.v4(ip.range(p).mask);
      },
      hint: function (input) {
        var p = parseIp(input);
        if (p.error || p.prefix === null || p.version != 4) return "";
        return "wildcard " + ip.v4(ip.range(p).wildcard);
      }
    },
    net9 : {
      id: tabs.net+"first",
      tab : tabs.net,
      title: "First host",
      calculate: function (input) {
        var p = parseIp(input);
        if (p.error || p.prefix === null) return "";
        var r = ip.range(p);
        return p.version == 4 ? ip.v4(ip.v4HostMin(r, p.prefix)) : ip.v6(r.network);
      }
    },
    net10 : {
      id: tabs.net+"last",
      tab : tabs.net,
      title: "Last host",
      calculate: function (input) {
        var p = parseIp(input);
        if (p.error || p.prefix === null) return "";
        var r = ip.range(p);
        return p.version == 4 ? ip.v4(ip.v4HostMax(r, p.prefix)) : ip.v6(r.last);
      }
    },
    net11 : {
      id: tabs.net+"broadcast",
      tab : tabs.net,
      title: "Broadcast",
      calculate: function (input) {
        var p = parseIp(input);
        if (p.error || p.prefix === null || p.version != 4 || p.prefix >= 31) return "";
        return ip.v4(ip.range(p).last);
      }
    },
    net12 : {
      id: tabs.net+"hosts",
      tab : tabs.net,
      title: "Hosts",
      calculate: function (input) {
        var p = parseIp(input);
        if (p.error || p.prefix === null) return "";
        var r = ip.range(p);
        return (p.version == 4 ? ip.v4Hosts(r, p.prefix) : r.count).toString();
      },
      hint: function (input) {
        var p = parseIp(input);
        if (p.error || p.prefix === null) return "";
        var r = ip.range(p);
        if (p.version == 6) return "2^" + (128 - p.prefix) + " addresses";
        return p.prefix >= 31 ? (p.prefix == 32 ? "host route" : "point-to-point, RFC 3021") : "of " + r.count + " addresses";
      }
    },

    // Time
    time1 : {
      id: tabs.time+"date2ts",
      tab : tabs.time,
      title: "Unixtime",
      calculate: function (input) {
        var date = timeInput(input);
        return date ? Math.floor(date.getTime() / 1000) : "";
      },
      hint: function (input) {
        var date = timeInput(input);
        return date ? jwt.relative(Math.round((date.getTime() - Date.now()) / 1000)) : "";
      }
    },
    time11 : {
      id: tabs.time+"date2ms",
      tab : tabs.time,
      title: "Unixtime (ms)",
      calculate: function (input) {
        var date = timeInput(input);
        return date ? date.getTime() : "";
      }
    },
    time5 : {
      id: tabs.time+"date2iso",
      tab : tabs.time,
      title: "ISO 8601",
      calculate: function (input) {
        var date = timeInput(input);
        return date ? date.toISOString() : "";
      }
    },
    time4 : {
      id: tabs.time+"ts2RFC1123",
      tab : tabs.time,
      title: "RFC-1123",
      calculate: function (input) {
        var date = timeInput(input);
        return date ? date.toUTCString() : "";
      }
    },
    time31 : {
      id: tabs.time+"date2sqlutc",
      tab : tabs.time,
      title: "DATETIME (UTC)",
      calculate: function (input) {
        var d = timeInput(input);
        if (!d) {
          return "";
        }
        return d.getUTCFullYear() + "-" + pad2(d.getUTCMonth() + 1) + "-" + pad2(d.getUTCDate()) + " " +
          pad2(d.getUTCHours()) + ":" + pad2(d.getUTCMinutes()) + ":" + pad2(d.getUTCSeconds());
      }
    },
    time3 : {
      id: tabs.time+"date2sql",
      tab : tabs.time,
      title: "DATETIME (local)",
      calculate: function (input) {
        var d = timeInput(input);
        if (!d) {
          return "";
        }
        return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()) + " " +
          pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + ":" + pad2(d.getSeconds());
      }
    },

    // Numbers (lib/snov/numbers.js): one input in any base, all the others out
    n1 : {
      id: tabs.number+"dec",
      tab : tabs.number,
      title: "Decimal",
      calculate: function (input) {
        if (input.trim().length == 0) return "";
        var p = parseNumber(input);
        if (p.error) return "Invalid: " + p.error;
        return p.float !== undefined ? String(p.float) : p.value.toString();
      },
      hint: function (input) {
        var p = parseNumber(input);
        if (p.error) return "";
        if (p.float !== undefined) return "floating point";
        var size = numbers.size(p.value);
        return "read as " + numbers.BASE_NAMES[p.base] + " \u00b7 " + numbers.bitLength(p.value) + " bits" + (size ? " \u00b7 " + size + " if bytes" : "");
      }
    },
    n2 : {
      id: tabs.number+"hex",
      tab : tabs.number,
      title: "Hex",
      calculate: function (input) {
        var p = parseNumber(input);
        return (p.error || p.float !== undefined) ? "" : numbers.format(p.value, 16);
      },
      hint: function (input) {
        var p = parseNumber(input);
        if (p.error || p.float !== undefined || p.value < 0n) return "";
        var digits = p.value.toString(16).length;
        if (p.base == 16 && (digits == 8 || digits == 16)) {
          return "as float" + (digits == 8 ? "32" : "64") + ": " + numbers.hexAsFloat(p.value, digits);
        }
        return "";
      }
    },
    n2b : {
      id : tabs.number+"oct",
      tab : tabs.number,
      title : "Octal",
      calculate : function (input) {
        var p = parseNumber(input);
        return (p.error || p.float !== undefined) ? "" : numbers.format(p.value, 8);
      }
    },
    n3 : {
      id: tabs.number+"bin",
      tab : tabs.number,
      title: "Binary",
      calculate: function (input) {
        var p = parseNumber(input);
        return (p.error || p.float !== undefined) ? "" : numbers.binaryGrouped(p.value);
      }
    },
    n4 : {
      id: tabs.number+"roman",
      tab : tabs.number,
      title: "Roman",
      calculate: function (input) {
        var p = parseNumber(input);
        return (p.error || p.float !== undefined) ? "" : numbers.toRoman(p.value);
      },
      hint: function () {
        return "1 to 3999";
      }
    },
    n5 : {
      id: tabs.number+"float64",
      tab : tabs.number,
      title: "IEEE-754 double",
      calculate: function (input) {
        var p = parseNumber(input);
        return (p.error || p.float === undefined) ? "" : numbers.float64hex(p.float);
      },
      hint: function () {
        return "big-endian bytes";
      }
    },
    n5b : {
      id : tabs.number+"float32",
      tab : tabs.number,
      title : "IEEE-754 single",
      hint : function () {
        return "big-endian bytes";
      },
      calculate : function (input) {
        var p = parseNumber(input);
        return (p.error || p.float === undefined) ? "" : numbers.float32hex(p.float);
      }
    },

    // Strings
    s0 : {
      id: tabs.string+"length",
      tab : tabs.string,
      title: "Length",
      calculate: function (input) {
        if (input.length == 0) {
          return "";
        }
        var chars = Array.from(input).length;
        var bytes = utf8(input).length;
        var out = chars + " chars, " + bytes + " bytes (UTF-8)";
        if (chars != input.length) {
          out += ", " + input.length + " UTF-16 units";
        }
        return out;
      },
      hint: function (input) {
        var c = textcase.counts(input);
        return input.length ? c.words + " words \u00b7 " + c.lines + " lines" : "";
      }
    },
    s3 : {
      id: tabs.string+"utf8-hex",
      tab : tabs.string,
      title: "UTF-8 to Hex",
      calculate: function (input) {
        try {
          var words = CryptoJS.enc.Utf8.parse(input);
          return CryptoJS.enc.Hex.stringify(words);
        } catch (err) {
          return "Parse error";
        }
      }
    },
    s4 : {
      id: tabs.string+"hex-utf8",
      tab : tabs.string,
      title: "Hex to UTF-8",
      calculate: function (input) {
        if (/[^0-9a-f]/i.test(input) || input.length % 2 != 0) {
          return ""; // not hex: nothing to decode
        }
        try {
          var words = CryptoJS.enc.Hex.parse(input);
          return CryptoJS.enc.Utf8.stringify(words);
        } catch (err) {
          return "Parse error";
        }
      }
    },
    s5 : {
      id: tabs.string+"utf16-hex",
      tab : tabs.string,
      title: "UTF-16 to Hex",
      hint: function () {
        return "big-endian";
      },
      calculate: function (input) {
        return textcase.utf16hex(input, false);
      }
    },
    s5b : {
      id : tabs.string+"utf16le-hex",
      tab : tabs.string,
      title : "UTF-16 LE to Hex",
      calculate : function (input) {
        return textcase.utf16hex(input, true);
      }
    },
    s6 : {
      id: tabs.string+"hex-utf16",
      tab : tabs.string,
      title: "Hex to UTF-16",
      hint: function () {
        return "big-endian";
      },
      calculate: function (input) {
        if (/[^0-9a-f]/i.test(input) || input.length % 2 != 0) {
          return ""; // not hex: nothing to decode
        }
        try {
          var words = CryptoJS.enc.Hex.parse(input);
          return CryptoJS.enc.Utf16.stringify(words);
        } catch (err) {
          return "Parse error";
        }
      }
    },
    s7 : {
      id: tabs.string+"codepoints",
      tab : tabs.string,
      title: "Code points",
      calculate: function (input) {
        return Array.from(input).map(function (c) {
          var hex = c.codePointAt(0).toString(16).toUpperCase();
          return "U+" + (hex.length < 4 ? "0000".slice(hex.length) + hex : hex);
        }).join(" ");
      }
    },
    s8 : {
      id: tabs.string+"upper",
      tab : tabs.string,
      title: "UPPER CASE",
      calculate: function (input) {
        return input.toUpperCase();
      }
    },
    s8b : {
      id : tabs.string+"lower",
      tab : tabs.string,
      title : "lower case",
      calculate : function (input) {
        return input.toLowerCase();
      }
    },
    s9 : {
      id: tabs.string+"title",
      tab : tabs.string,
      title: "Title Case",
      calculate: function (input) {
        return textcase.title(input);
      }
    },
    s9b : {
      id : tabs.string+"sentence",
      tab : tabs.string,
      title : "Sentence case",
      calculate : function (input) {
        return textcase.sentence(input);
      }
    },
    s10 : {
      id: tabs.string+"camel",
      tab : tabs.string,
      title: "camelCase",
      calculate: function (input) {
        return textcase.camel(input);
      }
    },
    s10b : {
      id : tabs.string+"pascal",
      tab : tabs.string,
      title : "PascalCase",
      calculate : function (input) {
        return textcase.pascal(input);
      }
    },
    s11 : {
      id: tabs.string+"snake",
      tab : tabs.string,
      title: "snake_case",
      calculate: function (input) {
        return textcase.snake(input);
      }
    },
    s11b : {
      id : tabs.string+"kebab",
      tab : tabs.string,
      title : "kebab-case",
      calculate : function (input) {
        return textcase.kebab(input);
      }
    },
    s12 : {
      id: tabs.string+"constant",
      tab : tabs.string,
      title: "CONSTANT_CASE",
      calculate: function (input) {
        return textcase.constant(input);
      }
    },
    s12b : {
      id : tabs.string+"slug",
      tab : tabs.string,
      title : "slug",
      calculate : function (input) {
        return textcase.slug(input);
      }
    },

    // Encode
    e1: {
      id : tabs.encode+"base64",
      tab : tabs.encode,
      title : "Base64",
      calculate : function (input) {
        return basex.base64(basex.bytes(input));
      }
    },
    e1b : {
      id : tabs.encode+"base64url",
      tab : tabs.encode,
      title : "Base64url",
      hint : function () {
        return "URL-safe alphabet, no padding \u00b7 JWT";
      },
      calculate : function (input) {
        return basex.base64url(basex.bytes(input));
      }
    },
    e2: {
      id : tabs.encode+"base64-d",
      tab : tabs.encode,
      title : "Base64 decode",
      calculate : function (input) {
        var bytes = basex.unbase64(input);
        if (!bytes) return "";
        var text = basex.text(bytes);
        return text === null ? basex.hex(bytes) : text;
      },
      hint : function (input) {
        var bytes = basex.unbase64(input);
        return (bytes && basex.text(bytes) === null) ? "binary, shown as hex" : "";
      }
    },
    e11: {
      id : tabs.encode+"base32",
      tab : tabs.encode,
      title : "Base32",
      calculate : function (input) {
        return basex.base32(basex.bytes(input));
      },
      hint : function () {
        return "RFC 4648 \u00b7 TOTP secrets";
      }
    },
    e12: {
      id : tabs.encode+"base32-d",
      tab : tabs.encode,
      title : "Base32 decode",
      calculate : function (input) {
        var bytes = basex.unbase32(input);
        if (!bytes) return "";
        var text = basex.text(bytes);
        return text === null ? basex.hex(bytes) : text;
      },
      hint : function (input) {
        var bytes = basex.unbase32(input);
        return (bytes && basex.text(bytes) === null) ? "binary, shown as hex" : "";
      }
    },
    e13: {
      id : tabs.encode+"base58",
      tab : tabs.encode,
      title : "Base58",
      calculate : function (input) {
        return basex.base58(basex.bytes(input));
      },
      hint : function () {
        return "Bitcoin alphabet";
      }
    },
    e14: {
      id : tabs.encode+"base58-d",
      tab : tabs.encode,
      title : "Base58 decode",
      calculate : function (input) {
        var bytes = basex.unbase58(input);
        if (!bytes) return "";
        var text = basex.text(bytes);
        return text === null ? basex.hex(bytes) : text;
      },
      hint : function (input) {
        var bytes = basex.unbase58(input);
        return (bytes && basex.text(bytes) === null) ? "binary, shown as hex" : "";
      }
    },
    e4: {
      id : tabs.encode+"encodeURI",
      tab : tabs.encode,
      title : "JavaScript encodeURI()",
      calculate : function (input) {
        return encodeURI(input);
      }
    },
    e5: {
      id : tabs.encode+"encodeURIComponent",
      tab : tabs.encode,
      title : "JavaScript encodeURIComponent()",
      calculate : function (input) {
        return encodeURIComponent(input);
      }
    },
    e6: {
      id : tabs.encode+"decodeURI",
      tab : tabs.encode,
      title : "JavaScript decodeURI()",
      calculate : function (input) {
        try {
          var decoded = decodeURI(input);
          return decoded == input ? "" : decoded;
        } catch (err) {
          return "";
        }
      }
    },
    e7: {
      id : tabs.encode+"decodeURIComponent",
      tab : tabs.encode,
      title : "JavaScript decodeURIComponent()",
      calculate : function (input) {
        try {
          var decoded = decodeURIComponent(input);
          return decoded == input ? "" : decoded;
        } catch (err) {
          return "";
        }
      }
    },
    e8: {
      id : tabs.encode+"htmlspecialchars",
      tab : tabs.encode,
      title : "HTML special chars",
      calculate : function (input) {
        function escapeHtml(html) {
          return html
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
        }          

        return escapeHtml(input);
      }
    },
    e9: {
      id : tabs.encode+"htmlspecialchars-d",
      tab : tabs.encode,
      title : "HTML special chars decode",
      calculate : function (input) {
        function unescapeHtml(html) {
          return html
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'");
        }          

        return unescapeHtml(input);
      }
    },
    e10: {
      id : tabs.encode+"rot13",
      tab : tabs.encode,
      title : "ROT13 encode/decode",
      calculate : function (input) {
        var renc = new Rot13();
        return renc.encode(input);
      }
    },


    // Password (input is ignored; settings come from hasher.options)
    p1: {
      id : tabs.password+"phrase",
      tab : tabs.password,
      title : "Passphrase",
      calculate : function () {
        return passgen.passphrase(hasher.options.passphrase);
      },
      hint : function () {
        var bits = passgen.passphraseBits(hasher.options.passphrase);
        return bits ? "entropy: ~" + bits.toFixed(1) + " bits" : "loading wordlist\u2026";
      }
    },
    p2: {
      id : tabs.password+"word",
      tab : tabs.password,
      title : "Password",
      calculate : function () {
        return passgen.password(hasher.options.password);
      },
      hint : function () {
        return "entropy: ~" + passgen.passwordBits(hasher.options.password).toFixed(1) + " bits";
      }
    },
    p6: {
      id : tabs.password+"key",
      tab : tabs.password,
      title : "Random key, hex",
      calculate : function () {
        return basex.hex(ids.randomBytes(passgen.clamp(hasher.options.key.bytes, 1, 1024, 32)));
      },
      hint : function () {
        var n = passgen.clamp(hasher.options.key.bytes, 1, 1024, 32);
        return "entropy: " + (n * 8) + " bits \u00b7 openssl rand -hex " + n;
      }
    },
    p6b : {
      id : tabs.password+"key-b64",
      tab : tabs.password,
      title : "Random key, Base64",
      calculate : function () {
        return basex.base64(ids.randomBytes(passgen.clamp(hasher.options.key.bytes, 1, 1024, 32)));
      }
    },
    // UUID: inspect a pasted UUID / ULID, derive v5 from a name, or generate
    u1: {
      id : tabs.uuid+"inspect",
      tab : tabs.uuid,
      title : "Inspect",
      calculate : function (input) {
        var u = ids.parseUuid(input);
        if (u) {
          if (u.nil) return "nil UUID (all zeros)";
          if (u.max) return "max UUID (all ones)";
          if (u.version === null) return u.variant + " variant, not an RFC 4122 UUID";
          var names = { 1 : "time-based, MAC address", 2 : "DCE security", 3 : "name-based, MD5", 4 : "random", 5 : "name-based, SHA-1", 6 : "time-ordered (reordered v1)", 7 : "time-ordered, Unix ms", 8 : "custom" };
          return "UUID v" + u.version + (names[u.version] ? " \u2014 " + names[u.version] : "") + " \u00b7 " + u.variant + " variant";
        }
        if (ids.parseUlid(input)) return "ULID \u2014 48-bit time + 80 random bits";
        return "";
      },
      hint : function (input) {
        var u = ids.parseUuid(input);
        var l = ids.parseUlid(input);
        var time = u && u.time !== null ? u.time : l ? l.time : null;
        if (time === null) return "";
        var d = new Date(time);
        return "created " + d.toISOString() + " \u00b7 " + jwt.relative(Math.round((time - Date.now()) / 1000));
      }
    },
    u2: {
      id : tabs.uuid+"v5dns",
      tab : tabs.uuid,
      title : "UUID v5, DNS namespace",
      calculate : function (input) {
        var name = input.trim();
        if (!name.length || ids.parseUuid(name) || ids.parseUlid(name)) return "";
        return ids.uuid5(ids.NAMESPACES.DNS, name);
      },
      hint : function (input) {
        return this.calculate(input).length ? "deterministic: the same name always gives this UUID" : "";
      }
    },
    u3: {
      id : tabs.uuid+"v5url",
      tab : tabs.uuid,
      title : "UUID v5, URL namespace",
      calculate : function (input) {
        var name = input.trim();
        if (!name.length || ids.parseUuid(name) || ids.parseUlid(name)) return "";
        return ids.uuid5(ids.NAMESPACES.URL, name);
      }
    },
    p3: {
      id : tabs.uuid+"uuid4",
      tab : tabs.uuid,
      title : "UUID v4",
      hint : function () {
        return "entropy: 122 random bits";
      },
      calculate : function () {
        return ids.uuid4();
      }
    },
    p4: {
      id : tabs.uuid+"uuid7",
      tab : tabs.uuid,
      title : "UUID v7",
      hint : function () {
        return "time-ordered \u00b7 48-bit timestamp + 74 random bits";
      },
      calculate : function () {
        return ids.uuid7();
      }
    },
    p5: {
      id : tabs.uuid+"ulid",
      tab : tabs.uuid,
      title : "ULID",
      hint : function () {
        return "time-ordered \u00b7 48-bit timestamp + 80 random bits";
      },
      calculate : function () {
        return ids.ulid();
      }
    },


    // Cron
    cr1: {
      id : tabs.cron+"describe",
      tab : tabs.cron,
      title : "Schedule",
      calculate : function (input) {
        if (input.trim().length == 0) {
          return "";
        }
        try {
          return cron.describe(input);
        } catch (err) {
          return "Invalid: " + err.message;
        }
      }
    },
    cr2: {
      id : tabs.cron+"next",
      tab : tabs.cron,
      title : "Next runs (local time)",
      calculate : function (input) {
        if (input.trim().length == 0) {
          return "";
        }
        var runs;
        try {
          runs = cron.next(input, new Date(), 5);
        } catch (err) {
          return "";
        }
        if (runs.length == 0) {
          return "never (nothing in the next 5 years)";
        }
        var lines = [];
        for (var i = 0; i < runs.length; i++) {
          var d = runs[i];
          lines.push(d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()) + " " +
            pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + "  " + cron.DAYS[d.getDay()].substring(0, 3));
        }
        return lines.join("\n");
      }
    },


    // JSON
    j1: {
      id : tabs.json+"pretty",
      tab : tabs.json,
      title : "Pretty",
      calculate : function (input) {
        var doc = jsonInput(input);
        if (doc.empty) return "";
        if (doc.error) return doc.error;
        if (doc.plain) return doc.value;
        return JSON.stringify(hasher.jsonValue(doc.value), null, 2);
      },
      hint : function (input) {
        var doc = jsonInput(input);
        if (doc.empty || doc.error) return "";
        if (doc.plain) return "a JSON string with plain text inside, shown unquoted";
        var v = doc.value;
        var kind = Array.isArray(v) ? v.length + " items" : (v !== null && typeof v == "object") ? Object.keys(v).length + " keys" : typeof v;
        var lines = JSON.stringify(v, null, 2).split("\n").length;
        return (doc.unwrapped ? "unquoted from a JSON string \u00b7 " : "") + kind + ", " + lines + " lines" + (hasher.options.json.sorted ? ", sorted" : "");
      }
    },
    j3: {
      id : tabs.json+"min",
      tab : tabs.json,
      title : "Minified",
      calculate : function (input) {
        var doc = jsonInput(input);
        if (doc.empty || doc.error || doc.plain) return "";
        return JSON.stringify(hasher.jsonValue(doc.value));
      },
      hint : function (input) {
        var doc = jsonInput(input);
        if (doc.empty || doc.error || doc.plain) return "";
        return JSON.stringify(doc.value).length + " chars";
      }
    },
    j4: {
      id : tabs.json+"string",
      tab : tabs.json,
      title : "As a JSON string",
      calculate : function (input) {
        return input.length == 0 ? "" : JSON.stringify(input);
      },
      hint : function () {
        return "paste it back to get the document out";
      }
    },


    // JWT: a token to decode (secret in the Password field, public key in the second text area),
    // or a JSON payload to sign
    w1: {
      id : tabs.jwt+"header",
      tab : tabs.jwt,
      title : "Header",
      calculate : function (input) {
        if (input.trim().length == 0 || jwtPayload(input)) return "";
        try {
          return JSON.stringify(jwt.parse(input).header, null, 2);
        } catch (err) {
          return "Invalid: " + err.message;
        }
      },
      hint : function (input) {
        try {
          return String(jwt.parse(input).header.alg || "");
        } catch (err) {
          return "";
        }
      }
    },
    w2: {
      id : tabs.jwt+"payload",
      tab : tabs.jwt,
      title : "Payload",
      calculate : function (input) {
        if (input.trim().length == 0) return "";
        try {
          return JSON.stringify(jwt.parse(input).payload, null, 2);
        } catch (err) {
          return "";
        }
      },
      hint : function (input) {
        try {
          var payload = jwt.parse(input).payload;
          return (payload !== null && typeof payload == "object") ? Object.keys(payload).length + " claims" : "";
        } catch (err) {
          return "";
        }
      }
    },
    w3: {
      id : tabs.jwt+"claims",
      tab : tabs.jwt,
      title : "Claims",
      calculate : function (input) {
        if (input.trim().length == 0) return "";
        try {
          return jwt.describeClaims(jwt.parse(input).payload, new Date()).join("\n");
        } catch (err) {
          return "";
        }
      }
    },
    w4: {
      id : tabs.jwt+"signature",
      tab : tabs.jwt,
      title : "Signature",
      calculate : function (input, password) {
        if (input.trim().length == 0) return "";
        var parsed;
        try {
          parsed = jwt.parse(input);
        } catch (err) {
          return "";
        }
        var alg = String(parsed.header.alg || "?");
        if (jwt.HMAC[alg]) {
          if (password.length == 0) {
            return { value : alg + ": enter the secret above to verify", hint : "", tone : "" };
          }
          var ok = jwt.verify(parsed, password);
          return { value : alg + (ok ? ": valid, signed with this secret" : ": INVALID for this secret"), tone : ok ? "ok" : "bad" };
        }
        if (!jwt.ASYMMETRIC[alg]) {
          return alg + ": cannot verify here";
        }
        if (hasher.options.other.trim().length == 0) {
          return alg + ": paste the public key (PEM or JWK) below to verify";
        }
        return jwt.verifyAsymmetric(parsed, hasher.options.other).then(function (ok) {
          return { value : alg + (ok ? ": valid, signed by this key" : ": INVALID for this key"), tone : ok ? "ok" : "bad" };
        }, function (err) {
          return { value : alg + ": " + (err && err.message ? err.message : "the key could not be used"), tone : "bad" };
        });
      }
    },
    w5: {
      id : tabs.jwt+"sign",
      tab : tabs.jwt,
      title : "Signed token, HS256",
      calculate : function (input, password) {
        var payload = jwtPayload(input);
        if (!payload) return "";
        if (password.length == 0) return "";
        return jwt.signHS256(payload, password);
      },
      hint : function (input, password) {
        if (!jwtPayload(input)) return "";
        return password.length ? "header {\"alg\":\"HS256\",\"typ\":\"JWT\"} \u00b7 secret from the field above" : "enter a secret above to sign this payload";
      }
    },

    // URL
    url1: {
      id : tabs.url+"scheme",
      tab : tabs.url,
      title : "Scheme",
      calculate : function (input) {
        if (input.trim().length == 0) return "";
        var p = parseUrl(input);
        return p.error ? "Invalid: " + p.error : p.url.protocol.replace(/:$/, "");
      },
      hint : function (input) {
        var p = parseUrl(input);
        return (!p.error && p.assumed) ? "no scheme given, https assumed" : "";
      }
    },
    url2: {
      id : tabs.url+"host",
      tab : tabs.url,
      title : "Host",
      calculate : function (input) {
        var p = parseUrl(input);
        return p.error ? "" : p.url.hostname;
      },
      hint : function (input) {
        var p = parseUrl(input);
        if (p.error || !p.url.hostname) return "";
        var unicode = urls.toUnicode(p.url.hostname);
        return unicode != p.url.hostname ? "IDN: " + unicode : "";
      }
    },
    url3: {
      id : tabs.url+"port",
      tab : tabs.url,
      title : "Port",
      calculate : function (input) {
        var p = parseUrl(input);
        if (p.error || !p.url.hostname) return "";
        return p.url.port || urls.DEFAULT_PORTS[p.url.protocol] || "";
      },
      hint : function (input) {
        var p = parseUrl(input);
        return (!p.error && !p.url.port && urls.DEFAULT_PORTS[p.url.protocol]) ? "default for " + p.url.protocol.replace(/:$/, "") : "";
      }
    },
    url4: {
      id : tabs.url+"path",
      tab : tabs.url,
      title : "Path",
      calculate : function (input) {
        var p = parseUrl(input);
        return p.error ? "" : p.url.pathname;
      },
      hint : function (input) {
        var p = parseUrl(input);
        if (p.error) return "";
        try {
          var decoded = decodeURIComponent(p.url.pathname);
          return decoded != p.url.pathname ? "decoded: " + decoded : "";
        } catch (err) {
          return "";
        }
      }
    },
    url5: {
      id : tabs.url+"query",
      tab : tabs.url,
      title : "Query",
      calculate : function (input) {
        var p = parseUrl(input);
        return p.error ? "" : urls.query(p.url);
      },
      hint : function (input) {
        var p = parseUrl(input);
        if (p.error) return "";
        var n = Array.from(p.url.searchParams.keys()).length;
        return n ? n + " parameter" + (n == 1 ? "" : "s") + ", decoded" : "";
      }
    },
    url6: {
      id : tabs.url+"fragment",
      tab : tabs.url,
      title : "Fragment",
      calculate : function (input) {
        var p = parseUrl(input);
        return p.error ? "" : p.url.hash.replace(/^#/, "");
      }
    },
    url7: {
      id : tabs.url+"credentials",
      tab : tabs.url,
      title : "Credentials",
      calculate : function (input) {
        var p = parseUrl(input);
        if (p.error || !(p.url.username || p.url.password)) return "";
        return p.url.username + (p.url.password ? ":" + p.url.password : "");
      },
      tone : function () {
        return "bad";
      }
    },
    url8: {
      id : tabs.url+"origin",
      tab : tabs.url,
      title : "Origin",
      calculate : function (input) {
        var p = parseUrl(input);
        return (p.error || p.url.origin == "null") ? "" : p.url.origin;
      }
    },
    url9: {
      id : tabs.url+"normalized",
      tab : tabs.url,
      title : "Normalized",
      calculate : function (input) {
        var p = parseUrl(input);
        return p.error ? "" : p.url.href;
      },
      hint : function () {
        return "as the browser would send it";
      }
    },

    // Diff (input vs hasher.options.other)
    d1: {
      id : tabs.diff+"changes",
      tab : tabs.diff,
      title : "Changes",
      html : true,
      tall : true,
      nocopy : true,
      calculate : function (input) {
        var ops = diff.lines(input, hasher.options.other, hasher.options.diff);
        var s = diff.stats(ops);
        if (s.added == 0 && s.removed == 0) {
          return "";
        }
        return diff.html(ops);
      },
      hint : function (input) {
        var s = diff.stats(diff.lines(input, hasher.options.other, hasher.options.diff));
        if (s.added == 0 && s.removed == 0) {
          return (input.length || hasher.options.other.length) ? "identical" : "";
        }
        return "+" + s.added + " \u2212" + s.removed + " lines";
      },
      tone : function (input) {
        var s = diff.stats(diff.lines(input, hasher.options.other, hasher.options.diff));
        return (s.added == 0 && s.removed == 0 && (input.length || hasher.options.other.length)) ? "ok" : "";
      }
    }
  },
  findById : function (id) {
    for (var i in this.elements) {
      if (this.elements[i].id == id) {
        return this.elements[i];
      }
    }
    return null;
  },
  /* What the empty output area says, per tab */
  EMPTY : {
    hash : "Enter text to hash it.",
    hmac : "Enter a message and a secret key.",
    crc : "Enter text to checksum it.",
    cipher : "Enter text and a password.",
    net : "Enter an IP, a CIDR block or a decimal.",
    number : "Enter a number: decimal, hex, binary or Roman.",
    string : "Enter text, or hex to decode.",
    encode : "Enter text or an encoded value.",
    cron : "Enter a crontab expression.",
    json : "Paste JSON to format it.",
    jwt : "Paste a token to decode it.",
    url : "Enter a URL to take it apart.",
    diff : "Enter two texts to compare."
  },
  /* tabs whose rows do not need input at all */
  GENERATORS : { password : true, uuid : true },
  /*
   * JSON value as displayed: keys sorted when the option is on
   */
  jsonValue : function (value) {
    return this.options.json.sorted ? sortKeys(value) : value;
  },
  /*
   * Render current tab and register the copy handler (once, delegated)
   */
  init : function () {
    this.render();
    if (this.bound) {
      return;
    }
    this.bound = true;

    var self = this;
    document.getElementById("output").addEventListener("click", function (e) {
      var box = e.target.closest(".value");
      if (!box || box.classList.contains("static")) {
        return;
      }
      var text = document.getElementById(box.id.replace("-value", "")).textContent;
      if (text.length == 0) {
        return;
      }
      copyToClipboard(text);
      // the "copy" hint becomes a "copied" chip for a moment
      document.querySelectorAll("#output .copy.on").forEach(function (other) {
        other.classList.remove("on");
        other.textContent = "copy";
      });
      var chip = document.getElementById(box.id.replace("-value", "-copy"));
      chip.textContent = "copied";
      chip.classList.add("on");
      clearTimeout(self.copiedTimer);
      self.copiedTimer = setTimeout(function () {
        chip.classList.remove("on");
        chip.textContent = "copy";
      }, 1400);
    });
  },
  /*
   * Active input field: the textarea, or the password-type field when "mask" is on
   */
  inputField : function () {
    var masked = document.getElementById("input-masked");
    return masked.hidden ? document.getElementById("input-value") : masked;
  },
  /*
   * Recalculate. Rows without a value or a hint are hidden; an empty tab shows a prompt.
   */
  update : function () {
    var self = this;
    var input = this.inputField().value;
    var password = document.getElementById("input-password").value;
    var tabName = null;
    for (var name in tabs) {
      if (tabs[name] == this.tab) {
        tabName = name;
      }
    }
    // tabs that need input show only the prompt until there is some
    var waiting = input.length == 0 && this.EMPTY[tabName] != undefined && !this.GENERATORS[tabName];
    if (tabName == "diff") {
      waiting = input.length == 0 && this.options.other.length == 0;
    }
    // a later update() supersedes any async result still in flight
    var seq = this.updateSeq = (this.updateSeq || 0) + 1;
    for (var i in this.elements) {
      var element = this.elements[i];
      if (element.tab != this.tab) {
        continue;
      }
      if (waiting) {
        this.show(element, "", "", "");
        continue;
      }
      var result = element.calculate(input, password);
      if (result && typeof result.then == "function") {
        // async element: resolves to a string or { value, hint, tone }
        this.show(element, "\u2026", "", "");
        (function (el) {
          result.then(function (r) {
            if (seq != self.updateSeq) return;
            var value = (r !== null && typeof r == "object" && "value" in r) ? r.value : r;
            self.show(el, String(value == null ? "" : value), (r && r.hint) || "", (r && r.tone) || "");
            self.updateEmpty(tabName);
          }, function (err) {
            if (seq != self.updateSeq) return;
            self.show(el, "Invalid: " + (err && err.message ? err.message : err), "", "bad");
            self.updateEmpty(tabName);
          });
        })(element);
        continue;
      }
      if (result !== null && typeof result == "object" && "value" in result) {
        this.show(element, String(result.value == null ? "" : result.value), result.hint || "", result.tone || "");
        continue;
      }
      var hint = element.hint != undefined ? String(element.hint(input, password)) : "";
      var tone = element.tone != undefined ? element.tone(input, password) : "";
      this.show(element, String(result), hint, tone);
    }
    this.updateEmpty(tabName);
  },
  /*
   * Put a value (and hint, tone) into an element's row; empty rows are hidden
   */
  show : function (element, value, hint, tone) {
    if (!tone && /^Invalid/.test(value)) {
      tone = "bad";
    }
    if (element.html) {
      document.getElementById(element.id).innerHTML = value;
    } else {
      document.getElementById(element.id).textContent = value;
    }
    document.getElementById(element.id + "-hint").textContent = hint;
    document.getElementById(element.id + "-hint").setAttribute("data-tone", tone);
    document.getElementById(element.id + "-value").setAttribute("data-tone", tone);
    document.getElementById(element.id + "-element").hidden = value.length == 0 && hint.length == 0;
  },
  updateEmpty : function (tabName) {
    var visible = document.querySelectorAll("#output .element:not([hidden])").length;
    var empty = document.getElementById("empty");
    empty.textContent = this.EMPTY[tabName] || "Nothing to show.";
    empty.hidden = visible > 0;
  },
  /*
   * Build output HTML for current tab
   */
  render : function () {
    var html = "";
    for (var i in this.elements) {
      var element = this.elements[i];
      if (element.tab == this.tab) {
        html +=
          '<div class="element" id="'+element.id+'-element">'+
            '<div class="element-head">'+
              '<span id="'+element.id+'-title" class="title">'+
                element.title+
              '</span>'+
              '<span id="'+element.id+'-hint" class="hint"></span>'+
              (element.nocopy ? '' : '<span id="'+element.id+'-copy" class="copy">copy</span>')+
            '</div>'+
            '<div id="'+element.id+'-value" class="value' + (element.nocopy ? ' static' : '') + '">'+
              '<div id="'+element.id+'" class="text' + (element.tall ? ' tall' : '') + '"></div>'+
            '</div>'+
          '</div>';
      }
    }
    document.getElementById("output").innerHTML = html;
  }
}
