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
  diff : 15
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
 *  Number of leading 1 bits in a netmask (int)
 */
function maskBits(mask) {
  var bits = 0;
  while (bits < 32 && (mask & (0x80000000 >>> bits)) != 0) {
    bits++;
  }
  return bits;
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
  ipcalc : new ipCalc(),
  tab : tabs.hash,
  /* Generator settings, kept in sync with the Password tab controls by popup.js */
  options : {
    passphrase : { words : 4, separator : "-", digits : 2, capitalize : false },
    password : { length : 16, symbols : false },
    json : { sorted : false },
    diff : { other : "", ignoreWhitespace : false, ignoreCase : false }
  },
  elements: {
    // Hash, most used first
    h4 : {
      id: tabs.hash+"sha256",
      tab : tabs.hash,
      title: "SHA-256",
      calculate: function (input) {
        return CryptoJS.SHA256(input);
      },
      hint: function (input) {
        return "base64: " + CryptoJS.enc.Base64.stringify(CryptoJS.SHA256(input));
      }
    },
    h6 : {
      id: tabs.hash+"sha512",
      tab : tabs.hash,
      title: "SHA-512",
      calculate: function (input) {
        return CryptoJS.SHA512(input);
      },
      hint: function (input) {
        return "base64: " + CryptoJS.enc.Base64.stringify(CryptoJS.SHA512(input));
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
      },
      hint : function (input, password) {
        return "base64: " + CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(input, password));
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
      },
      hint : function (input, password) {
        return "base64: " + CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA512(input, password));
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

    // Cipher
    ci1: {
      id : tabs.cipher+"aes256",
      tab : tabs.cipher,
      title : "AES-256",
      calculate : function (input, password) {
        return CryptoJS.AES.encrypt(input, password);
      },
      hint : function () {
        return "CBC / PKCS#7 \u00b7 openssl enc -aes-256-cbc -md md5 -a";
      }
    },
    ci2: {
      id : tabs.cipher+"des",
      tab : tabs.cipher,
      title : "DES",
      calculate : function (input, password) {
        return CryptoJS.DES.encrypt(input, password);
      }
    },
    ci3: {
      id : tabs.cipher+"tripledes",
      tab : tabs.cipher,
      title : "TripleDES",
      calculate : function (input, password) {
        return CryptoJS.TripleDES.encrypt(input, password);
      }
    },
    ci4: {
      id : tabs.cipher+"rabbit",
      tab : tabs.cipher,
      title : "Rabbit",
      calculate : function (input, password) {
        return CryptoJS.Rabbit.encrypt(input, password);
      }
    },
    ci5: {
      id : tabs.cipher+"rc4",
      tab : tabs.cipher,
      title : "RC4",
      calculate : function (input, password) {
        return CryptoJS.RC4.encrypt(input, password);
      }
    },
    ci6: {
      id : tabs.cipher+"rc4drop",
      tab : tabs.cipher,
      title : "RC4Drop",
      calculate : function (input, password) {
        return CryptoJS.RC4Drop.encrypt(input, password);
      }
    },
    ci7: {
      id : tabs.cipher+"aes256-d",
      tab : tabs.cipher,
      title : "AES-256 decrypt",
      calculate : function (input, password) {
        try {
          var words = CryptoJS.AES.decrypt(input, password);
          return CryptoJS.enc.Utf8.stringify(words);
        } catch (err) {
          return "";
        }
      }
    },
    ci8: {
      id : tabs.cipher+"des-d",
      tab : tabs.cipher,
      title : "DES decrypt",
      calculate : function (input, password) {
        try {
          var words = CryptoJS.DES.decrypt(input, password);
          return CryptoJS.enc.Utf8.stringify(words);
        } catch (err) {
          return "";
        }
      }
    },
    ci9: {
      id : tabs.cipher+"tripledes-d",
      tab : tabs.cipher,
      title : "TripleDES decrypt",
      calculate : function (input, password) {
        try {
          var words = CryptoJS.TripleDES.decrypt(input, password);
          return CryptoJS.enc.Utf8.stringify(words);
        } catch (err) {
          return "";
        }
      }
    },
    ci10: {
      id : tabs.cipher+"rabbit-d",
      tab : tabs.cipher,
      title : "Rabbit decrypt",
      calculate : function (input, password) {
        try {
          var words = CryptoJS.Rabbit.decrypt(input, password);
          return CryptoJS.enc.Utf8.stringify(words);
        } catch (err) {
          return "";
        }
      }
    },
    ci11: {
      id : tabs.cipher+"rc4-d",
      tab : tabs.cipher,
      title : "RC4 decrypt",
      calculate : function (input, password) {
        try {
          var words = CryptoJS.RC4.decrypt(input, password);
          return CryptoJS.enc.Utf8.stringify(words);
        } catch (err) {
          return "";
        }
      }
    },
    ci12: {
      id : tabs.cipher+"rc4drop-d",
      tab : tabs.cipher,
      title : "RC4Drop decrypt",
      calculate : function (input, password) {
        try {
          var words = CryptoJS.RC4Drop.decrypt(input, password);
          return CryptoJS.enc.Utf8.stringify(words);
        } catch (err) {
          return "";
        }
      }
    },

    // Net
    net1 : {
      id: tabs.net+"ip2dec",
      tab : tabs.net,
      title: "IP to Dec",
      calculate: function (input) {
        var ipcalc = hasher.ipcalc;
        ipcalc.parse(input);
        if (ipcalc.getIp() != null) {
          return ipcalc.getIp();
        } else {
          return "";
        }
      }
    },
    // Net
    net2 : {
      id: tabs.net+"dec2ip",
      tab : tabs.net,
      title: "Dec to IP",
      calculate: function (input) {
        var ipcalc = hasher.ipcalc;
        ipcalc.parse(input);
        if (ipcalc.getIp() != null) {
          return ipcalc.intToOctetString(ipcalc.getIp());
        } else if (!ipcalc.isIpValid()) {
          return "Invalid IP";
        } else {
          return "";
        }
      }
    },
    net3 : {
      id: tabs.net+"ip2bin",
      tab : tabs.net,
      title: "IP to Bin",
      calculate: function (input) {
        var ipcalc = hasher.ipcalc;
        ipcalc.parse(input);
        if (ipcalc.getIp() != null) {
          return ipcalc.getPaddedBinString(ipcalc.getIp());
        } else {
          return "";
        }
      }
    },
    net4 : {
      id: tabs.net+"ip2hex",
      tab : tabs.net,
      title: "IP to Hex",
      calculate: function (input) {
        var ipcalc = hasher.ipcalc;
        ipcalc.parse(input);
        if (ipcalc.getIp() != null) {
          return ipcalc.getIp().toString(16);
        } else {
          return "";
        }
      }
    },
    net5 : {
      id: tabs.net+"network",
      tab : tabs.net,
      title: "Network / netmask",
      calculate: function (input) {
        var ipcalc = hasher.ipcalc;
        ipcalc.parse(input);
        if (ipcalc.getNetmask() != null) {
          return ipcalc.intToOctetString(ipcalc.getNetwork()) + "/" + ipcalc.intToOctetString(ipcalc.getNetmask());
        } else if (!ipcalc.isNetmaskValid()) {
          return "Invalid netmask";
        } else {
          return "";
        }
      },
      hint: function (input) {
        var ipcalc = hasher.ipcalc;
        ipcalc.parse(input);
        return ipcalc.getNetmask() != null ? "/" + maskBits(ipcalc.getNetmask()) : "";
      }
    },
    net6 : {
      id: tabs.net+"hostmin",
      tab : tabs.net,
      title: "Min host",
      calculate: function (input) {
        var ipcalc = hasher.ipcalc;
        ipcalc.parse(input);
        if (ipcalc.getNetmask() != null) {
          return ipcalc.intToOctetString(ipcalc.gethHostMin());
        } else {
          return "";
        }
      }
    },
    net7 : {
      id: tabs.net+"hostmax",
      tab : tabs.net,
      title: "Max host",
      calculate: function (input) {
        var ipcalc = hasher.ipcalc;
        ipcalc.parse(input);
        if (ipcalc.getNetmask() != null) {
          return ipcalc.intToOctetString(ipcalc.gethHostMax());
        } else {
          return "";
        }
      }
    },
    net8 : {
      id: tabs.net+"broadcast",
      tab : tabs.net,
      title: "Broadcast",
      calculate: function (input) {
        var ipcalc = hasher.ipcalc;
        ipcalc.parse(input);
        if (ipcalc.getNetmask() != null) {
          return ipcalc.intToOctetString(ipcalc.getBroadcast());
        } else {
          return "";
        }
      }
    },
    net9 : {
      id: tabs.net+"hostnum",
      tab : tabs.net,
      title: "Hosts",
      calculate: function (input) {
        var ipcalc = hasher.ipcalc;
        ipcalc.parse(input);
        if (ipcalc.getNetmask() != null) {
          return ipcalc.gethHostCount();
        } else {
          return "";
        }
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

    // Numbers
    n5 : {
      id: tabs.number+"i5",
      tab : tabs.number,
      title: "Dec to Hex",
      calculate: function (input) {
        return numbers.decToHex(input);
      }
    },
    n6 : {
      id: tabs.number+"i6",
      tab : tabs.number,
      title: "Hex to Dec",
      calculate: function (input) {
        return numbers.hexToDec(input);
      }
    },
    n7 : {
      id: tabs.number+"i7",
      tab : tabs.number,
      title: "Dec to Bin",
      calculate: function (input) {
        return numbers.decToBin(input);
      },
      hint: function (input) {
        var bin = numbers.decToBin(input);
        return /^[01]+$/.test(bin) ? bin.length + " bits" : "";
      }
    },
    n8 : {
      id: tabs.number+"i8",
      tab : tabs.number,
      title: "Bin to Dec",
      calculate: function (input) {
        return numbers.binToDec(input);
      }
    },
    n9 : {
      id: tabs.number+"i3",
      tab : tabs.number,
      title: "Dec to Roman",
      calculate: function (input) {
        var rc = new RomanConverter();
        return rc.decToRoman(input);
      }
    },
    n10 : {
      id: tabs.number+"i4",
      tab : tabs.number,
      title: "Roman to Dec",
      calculate: function (input) {
        var rc = new RomanConverter();
        return rc.romanToDec(input);
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
      }
    },
    s1 : {
      id: tabs.string+"i1",
      tab : tabs.string,
      title: "ASCII to Hex",
      calculate: function (input) {
        try {
          var words = CryptoJS.enc.Latin1.parse(input);
          return CryptoJS.enc.Hex.stringify(words);
        } catch (err) {
          return "Parse error";
        }
      }
    },
    s2 : {
      id: tabs.string+"i2",
      tab : tabs.string,
      title: "Hex to ASCII",
      calculate: function (input) {
        if (/[^0-9a-f]/i.test(input)) {
          return "NaN";
        }
        try {
          var words = CryptoJS.enc.Hex.parse(input);
          return CryptoJS.enc.Latin1.stringify(words);
        } catch (err) {
          return "Parse error";
        }
        return "";
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
        if (/[^0-9a-f]/i.test(input)) {
          return "NaN";
        }
        try {
          var words = CryptoJS.enc.Hex.parse(input);
          return CryptoJS.enc.Utf8.stringify(words);
        } catch (err) {
          return "Parse error";
        }
        return "";
      }
    },
    s5 : {
      id: tabs.string+"utf16-hex",
      tab : tabs.string,
      title: "UTF-16 to Hex",
      calculate: function (input) {
        try {
          var words = CryptoJS.enc.Utf16.parse(input);
          return CryptoJS.enc.Hex.stringify(words);
        } catch (err) {
          return "Parse error";
        }
      }
    },
    s6 : {
      id: tabs.string+"hex-utf16",
      tab : tabs.string,
      title: "Hex to UTF-16",
      calculate: function (input) {
        if (/[^0-9a-f]/i.test(input)) {
          return "NaN";
        }
        try {
          var words = CryptoJS.enc.Hex.parse(input);
          return CryptoJS.enc.Utf16.stringify(words);
        } catch (err) {
          return "Parse error";
        }
        return "";
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


    // Encode
    e1: {
      id : tabs.encode+"base64",
      tab : tabs.encode,
      title : "Base64",
      calculate : function (input) {
        try {
          var words = CryptoJS.enc.Utf8.parse(input);
          return CryptoJS.enc.Base64.stringify(words);
        } catch (err) {
          return "Parse error";
        }
      }
    },
    e2: {
      id : tabs.encode+"base64-d",
      tab : tabs.encode,
      title : "Base64 decode",
      calculate : function (input) {
        try {
          var words = CryptoJS.enc.Base64.parse(input);
          return CryptoJS.enc.Utf8.stringify(words);
        } catch (err) {
          return "";
        }
      }
    },
    e3: {
      id : tabs.encode+"base64-d-h",
      tab : tabs.encode,
      title : "Base64 decode to Hex",
      calculate : function (input) {
        try {
          var words = CryptoJS.enc.Base64.parse(input);
          return CryptoJS.enc.Hex.stringify(words);
        } catch (err) {
          return "Parse error";
        }
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
        var parsed = parseJson(input);
        if (parsed.empty) return "";
        if (parsed.error) return parsed.error;
        return JSON.stringify(hasher.jsonValue(parsed.value), null, 2);
      },
      hint : function (input) {
        var parsed = parseJson(input);
        if (parsed.empty || parsed.error) return "";
        var v = parsed.value;
        var kind = Array.isArray(v) ? v.length + " items" : (v !== null && typeof v == "object") ? Object.keys(v).length + " keys" : typeof v;
        var lines = JSON.stringify(v, null, 2).split("\n").length;
        return kind + ", " + lines + " lines" + (hasher.options.json.sorted ? ", sorted" : "");
      }
    },
    j3: {
      id : tabs.json+"min",
      tab : tabs.json,
      title : "Minified",
      calculate : function (input) {
        var parsed = parseJson(input);
        if (parsed.empty || parsed.error) return "";
        return JSON.stringify(hasher.jsonValue(parsed.value));
      },
      hint : function (input) {
        var parsed = parseJson(input);
        if (parsed.empty || parsed.error) return "";
        return JSON.stringify(parsed.value).length + " chars";
      }
    },
    j4: {
      id : tabs.json+"string",
      tab : tabs.json,
      title : "As a JSON string",
      calculate : function (input) {
        return input.length == 0 ? "" : JSON.stringify(input);
      }
    },
    j5: {
      id : tabs.json+"unstring",
      tab : tabs.json,
      title : "From a JSON string",
      calculate : function (input) {
        var parsed = parseJson(input);
        if (parsed.empty || parsed.error || typeof parsed.value != "string") return "";
        return parsed.value;
      }
    },


    // JWT (the Password field is the HMAC secret)
    w1: {
      id : tabs.jwt+"header",
      tab : tabs.jwt,
      title : "Header",
      calculate : function (input) {
        if (input.trim().length == 0) return "";
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
        var alg = parsed.header.alg || "?";
        if (password.length == 0) {
          return alg + (jwt.HMAC[alg] ? ": enter the secret above to verify" : ": cannot verify here (only HS256/384/512)");
        }
        var ok = jwt.verify(parsed, password);
        if (ok === null) {
          return alg + ": cannot verify here (only HS256/384/512)";
        }
        return alg + (ok ? ": valid, signed with this secret" : ": INVALID for this secret");
      },
      tone : function (input, password) {
        var value = this.calculate(input, password);
        return /: valid/.test(value) ? "ok" : /INVALID/.test(value) ? "bad" : "";
      }
    },


    // Diff (input vs hasher.options.diff.other)
    d1: {
      id : tabs.diff+"changes",
      tab : tabs.diff,
      title : "Changes",
      html : true,
      tall : true,
      nocopy : true,
      calculate : function (input) {
        var ops = diff.lines(input, hasher.options.diff.other, hasher.options.diff);
        var s = diff.stats(ops);
        if (s.added == 0 && s.removed == 0) {
          return "";
        }
        return diff.html(ops);
      },
      hint : function (input) {
        var s = diff.stats(diff.lines(input, hasher.options.diff.other, hasher.options.diff));
        if (s.added == 0 && s.removed == 0) {
          return (input.length || hasher.options.diff.other.length) ? "identical" : "";
        }
        return "+" + s.added + " \u2212" + s.removed + " lines";
      },
      tone : function (input) {
        var s = diff.stats(diff.lines(input, hasher.options.diff.other, hasher.options.diff));
        return (s.added == 0 && s.removed == 0 && (input.length || hasher.options.diff.other.length)) ? "ok" : "";
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
    diff : "Enter two texts to compare."
  },
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
    var input = this.inputField().value;
    var password = document.getElementById("input-password").value;
    var tabName = null;
    for (var name in tabs) {
      if (tabs[name] == this.tab) {
        tabName = name;
      }
    }
    // tabs that need input show only the prompt until there is some
    var waiting = input.length == 0 && this.EMPTY[tabName] != undefined;
    if (tabName == "diff") {
      waiting = input.length == 0 && this.options.diff.other.length == 0;
    }
    var visible = 0;
    for (var i in this.elements) {
      var element = this.elements[i];
      if (element.tab != this.tab) {
        continue;
      }
      var value = waiting ? "" : String(element.calculate(input, password));
      var hint = (element.hint != undefined && !waiting) ? String(element.hint(input, password)) : "";
      var tone = (element.tone != undefined && !waiting) ? element.tone(input, password) : "";
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
      var row = document.getElementById(element.id + "-element");
      row.hidden = value.length == 0 && hint.length == 0;
      if (!row.hidden) {
        visible++;
      }
    }
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
