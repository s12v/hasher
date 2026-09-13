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
  jwt : 13
};

/*
 *  Copy to clipboard
 */
function copyToClipboard(textarea) {
  var fallback = function () {
    textarea.select();
    document.execCommand('copy');
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(textarea.value).catch(fallback);
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
  if (/^\d+$/.test(str)) {
    var num = parseInt(str, 10);
    date = new Date(str.length >= 13 ? num : num * 1000);
  } else {
    date = new Date(str);
  }
  return isNaN(date.getTime()) ? null : date;
}

function pad2(n) {
  return (n < 10) ? "0" + n : "" + n;
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
    passphrase : { words : 5, separator : "-", digits : 0, capitalize : false },
    password : { length : 16, symbols : false }
  },
  elements: {
    h1 : {
      id : tabs.hash+"md5",
      tab : tabs.hash,
      title : "MD5",
      calculate : function (input) {
        return CryptoJS.MD5(input);
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
    h3 : {
      id: tabs.hash+"sha224",
      tab : tabs.hash,
      title: "SHA-224",
      calculate: function (input) {
        return CryptoJS.SHA224(input);
      }
    },
    h4 : {
      id: tabs.hash+"sha256",
      tab : tabs.hash,
      title: "SHA-256",
      calculate: function (input) {
        return CryptoJS.SHA256(input);
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
    h6 : {
      id: tabs.hash+"sha512",
      tab : tabs.hash,
      title: "SHA-512",
      calculate: function (input) {
        return CryptoJS.SHA512(input);
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
    h8 : {
      id: tabs.hash+"ripemd160",
      tab : tabs.hash,
      title: "RIPEMD-160",
      calculate: function (input) {
        return CryptoJS.RIPEMD160(input);
      }
    },
    h7 : {
      id: tabs.hash+"md4",
      tab : tabs.hash,
      title: "MD4",
      calculate: function (input) {
        return hex_md4(utf8(input));
      }
    },
    h9 : {
      id: tabs.hash+"whirpool",
      tab : tabs.hash,
      title: "Whirlpool",
      calculate: function (input) {
        return Whirlpool(utf8(input));
      }
    },

    // HMAC
    hm1 : {
      id : tabs.hmac+"md5",
      tab : tabs.hmac,
      title : "HMAC-MD5",
      calculate : function (input, password) {
        return CryptoJS.HmacMD5(input, password);
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
    hm3: {
      id : tabs.hmac+"sha224",
      tab : tabs.hmac,
      title : "HMAC-SHA224",
      calculate : function (input, password) {
        return CryptoJS.HmacSHA224(input, password);
      }
    },
    hm4: {
      id : tabs.hmac+"sha256",
      tab : tabs.hmac,
      title : "HMAC-SHA256",
      calculate : function (input, password) {
        return CryptoJS.HmacSHA256(input, password);
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
    hm6: {
      id : tabs.hmac+"sha512",
      tab : tabs.hmac,
      title : "HMAC-SHA512",
      calculate : function (input, password) {
        return CryptoJS.HmacSHA512(input, password);
      }
    },
    hm7: {
      id : tabs.hmac+"ripemd160",
      tab : tabs.hmac,
      title : "HMAC-RIPEMD160",
      calculate : function (input, password) {
        return CryptoJS.HmacRIPEMD160(input, password);
      }
    },
    hm8: {
      id : tabs.hmac+"md4",
      tab : tabs.hmac,
      title : "HMAC-MD4",
      calculate : function (input, password) {
        return hex_hmac_md4(utf8(password), utf8(input));
      }
    },

    // CRC
    c1 : {
      id: tabs.crc+"crc8",
      tab : tabs.crc,
      title: "CRC-8",
      calculate: function (input) {
        return Hex8(Crc8Str(utf8(input)));
      }
    },
    c2 : {
      id: tabs.crc+"crc16",
      tab : tabs.crc,
      title: "CRC-16",
      calculate: function (input) {
        return Hex16(Crc16Str(utf8(input)));
      }
    },
    c3 : {
      id: tabs.crc+"fsc16",
      tab : tabs.crc,
      title: "FCS-16",
      calculate: function (input) {
        return Hex16(Fcs16Str(utf8(input)));
      }
    },
    c4 : {
      id: tabs.crc+"crc32b",
      tab : tabs.crc,
      title: "FCS/CRC-32",
      calculate: function (input) {
        return Hex32(Crc32Str(utf8(input)));
      }
    },


    // Cipher
    ci1: {
      id : tabs.cipher+"aes256",
      tab : tabs.cipher,
      title : "AES-256",
      calculate : function (input, password) {
        return CryptoJS.AES.encrypt(input, password);
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
      ruler: 1,
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
        var date = parseDate(input);
        return date ? Math.floor(date.getTime() / 1000) : "";
      }
    },
    time11 : {
      id: tabs.time+"date2ms",
      tab : tabs.time,
      title: "Unixtime (ms)",
      calculate: function (input) {
        var date = parseDate(input);
        return date ? date.getTime() : "";
      }
    },
    time2 : {
      id: tabs.time+"ts2date",
      tab : tabs.time,
      title: "Local time",
      calculate: function (input) {
        var date = parseDate(input);
        return date ? date.toLocaleString() : "";
      }
    },
    time3 : {
      id: tabs.time+"date2sql",
      tab : tabs.time,
      title: "DATETIME (local)",
      calculate: function (input) {
        var d = parseDate(input);
        if (!d) {
          return "";
        }
        return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()) + " " +
          pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + ":" + pad2(d.getSeconds());
      }
    },
    time31 : {
      id: tabs.time+"date2sqlutc",
      tab : tabs.time,
      title: "DATETIME (UTC)",
      calculate: function (input) {
        var d = parseDate(input);
        if (!d) {
          return "";
        }
        return d.getUTCFullYear() + "-" + pad2(d.getUTCMonth() + 1) + "-" + pad2(d.getUTCDate()) + " " +
          pad2(d.getUTCHours()) + ":" + pad2(d.getUTCMinutes()) + ":" + pad2(d.getUTCSeconds());
      }
    },
    time4 : {
      id: tabs.time+"ts2RFC1123",
      tab : tabs.time,
      title: "RFC-1123",
      calculate: function (input) {
        var date = parseDate(input);
        return date ? date.toUTCString() : "";
      }
    },
    time5 : {
      id: tabs.time+"date2iso",
      tab : tabs.time,
      title: "ISO 8601",
      calculate: function (input) {
        var date = parseDate(input);
        return date ? date.toISOString() : "";
      }
    },

    // Numbers
    n5 : {
      id: tabs.number+"i5",
      tab : tabs.number,
      title: "Dec to Hex",
      ruler: 1,
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
      ruler: 1,
      calculate: function (input) {
        return numbers.decToBin(input);
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
      ruler: 2,
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
      ruler: 2,
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
      ruler: 2,
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
      ruler: 2,
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
          return decodeURI(input);
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
          return decodeURIComponent(input);
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
        return bits ? "~" + bits.toFixed(1) + " bits" : "loading wordlist\u2026";
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
        return "~" + passgen.passwordBits(hasher.options.password).toFixed(1) + " bits";
      }
    },
    p3: {
      id : tabs.password+"uuid4",
      tab : tabs.password,
      title : "UUID v4",
      calculate : function () {
        return ids.uuid4();
      }
    },
    p4: {
      id : tabs.password+"uuid7",
      tab : tabs.password,
      title : "UUID v7",
      hint : function () {
        return "time-ordered";
      },
      calculate : function () {
        return ids.uuid7();
      }
    },
    p5: {
      id : tabs.password+"ulid",
      tab : tabs.password,
      title : "ULID",
      hint : function () {
        return "time-ordered";
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
      expanded : true,
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
      expanded : true,
      calculate : function (input) {
        var parsed = parseJson(input);
        if (parsed.empty) return "";
        if (parsed.error) return parsed.error;
        return JSON.stringify(parsed.value, null, 2);
      }
    },
    j2: {
      id : tabs.json+"sorted",
      tab : tabs.json,
      title : "Pretty, keys sorted",
      calculate : function (input) {
        var parsed = parseJson(input);
        if (parsed.empty || parsed.error) return "";
        return JSON.stringify(sortKeys(parsed.value), null, 2);
      }
    },
    j3: {
      id : tabs.json+"min",
      tab : tabs.json,
      title : "Minified",
      calculate : function (input) {
        var parsed = parseJson(input);
        if (parsed.empty || parsed.error) return "";
        return JSON.stringify(parsed.value);
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
      }
    },
    w2: {
      id : tabs.jwt+"payload",
      tab : tabs.jwt,
      title : "Payload",
      expanded : true,
      calculate : function (input) {
        if (input.trim().length == 0) return "";
        try {
          return JSON.stringify(jwt.parse(input).payload, null, 2);
        } catch (err) {
          return "";
        }
      }
    },
    w3: {
      id : tabs.jwt+"claims",
      tab : tabs.jwt,
      title : "Claims",
      expanded : true,
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
  /*
   * Render current tab and register click handlers (once, delegated)
   */
  init : function () {
    this.render();
    if (this.bound) {
      return;
    }
    this.bound = true;

    var self = this;
    document.getElementById("output").addEventListener("click", function (e) {
      var expand = e.target.closest(".expand");
      if (expand) {
        // expand/collapse multiline textarea
        var id = expand.id.replace("-expand", "");
        var element = self.findById(id);
        var on = expand.classList.toggle("on");
        document.getElementById(id).rows = (on && element) ? element.rows : 1;
        return;
      }

      var value = e.target.closest(".value");
      if (value) {
        // copy to clipboard on click
        self.hideNotes();
        var textarea = document.getElementById(value.id.replace("-value", ""));
        if (textarea.value.length > 0) {
          var note = document.getElementById(textarea.id + "-note");
          note.textContent = "copied";
          note.hidden = false;
          copyToClipboard(textarea);
        }
      }
    });
  },
  hideNotes : function () {
    document.querySelectorAll("#output .note").forEach(function (note) {
      note.hidden = true;
    });
  },
  /*
   * Recalculate
   */
  /*
   * Active input field: the textarea, or the password-type field when "mask" is on
   */
  inputField : function () {
    var masked = document.getElementById("input-masked");
    return masked.hidden ? document.getElementById("input-value") : masked;
  },
  update : function () {
    this.hideNotes();
    var input = this.inputField().value;
    var password = document.getElementById("input-password").value;
    for (var i in this.elements) {
      var element = this.elements[i];
      element.rows = 0;
      if (element.tab == this.tab) {
        // main calculation
        var value = String(element.calculate(input, password));
        document.getElementById(element.id).value = value;

        // expand
        var res = value.match(/(\n\r|\r\n|\n|\r)/g);
        var rows = (res != null) ? res.length + 1 : 1;
        element.rows = rows;

        var expand = document.getElementById(element.id + "-expand");
        if (element.expanded) {
          // show every line (up to a screenful; the textarea scrolls past that), no toggle
          document.getElementById(element.id).rows = Math.min(rows, 25);
          expand.hidden = true;
        } else if (rows > 1) {
          expand.textContent = rows + " lines";
          expand.hidden = false;
        } else {
          expand.textContent = "";
          expand.hidden = true;
        }

        // show ruler
        if (element.ruler != undefined) {
          document.getElementById(element.id + "-ruler").innerHTML = this.ruler(value, element.ruler);
        }

        // hint next to the title (e.g. entropy)
        if (element.hint != undefined) {
          document.getElementById(element.id + "-hint").textContent = element.hint(input, password);
        }
      }
    }
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
          '<div class="element">'+
            '<div class="element-head">'+
              '<span id="'+element.id+'-title" class="title">'+
                element.title+
              '</span>'+
              '<span id="'+element.id+'-hint" class="hint"></span>'+
              '<span id="'+element.id+'-expand" class="expand" hidden></span>'+
              '<span id="'+element.id+'-note" class="note" hidden></span>'+
            '</div>'+
            '<div id="'+element.id+'-value" class="value">'+
              '<textarea id="'+element.id+'" rows="1" readonly spellcheck="false"></textarea>';
        // ruler
        if (element.ruler != undefined) {
          html += '<div id="'+element.id+'-ruler" class="ruler"></div>';
        }
        html +=
            '</div>'+
          '</div>';
      }
    }
    document.getElementById("output").innerHTML = html;
  },
  /*
   * Symbol's numbers
   */
  ruler : function (value, type) {
    var html = "";
    var length = value.length;
    if (type == -1) {
      for (var i = 0; i < value.length; i++) {
        html += '<span title="'+(length - i - 1)+'">&nbsp;</span>';
      }
    } else if (type == 2) {
      for (i = 0; i < value.length; i+= 2) {
        html += '<span title="'+(i/2 + 1)+'">&nbsp;&nbsp;</span>';
      }
    } else {
      for (i = 0; i < value.length; i++) {
        html += '<span title="'+(i+1)+'">&nbsp;</span>';
      }
    }
    return html;
  }
}
