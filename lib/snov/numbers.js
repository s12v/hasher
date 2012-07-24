/* 
 * @author Sergey Novikov <mail@snov.me>
 */
numbers = {
  /*
  asciiToHex : function(str) { 
    var result = "";
    for (var i = 0; i < str.length; i++) {
      code = str.charCodeAt(i);
      if (!isNaN(code)) {
        result += code.toString(16);
      } else {
        return "NaN";
      }
    }
    return result;
  },
  hexToAscii : function(str) { 
    if (/[^0-9a-f]/.test(str)) {
      return "NaN";
    }
    var result = "";
    while (str.length >= 2) { 
      var code = parseInt(str.substring(0, 2), 16);
      if (!isNaN(code)) {
        result = result + String.fromCharCode(code);
      } else {
        return "NaN";
      }
      str = str.substring(2, str.length);
    }
    return result;
  },
*/  
  decToHex : function(str) { 
    if (/[^\d]/.test(str)) {
      return "NaN";
    }
    return this.convert(str, 10, 16);
  },
  hexToDec : function(str) { 
    if (/[^0-9a-f]/.test(str)) {
      return "NaN";
    }
    return this.convert(str, 16, 10);
  },
  decToBin : function(str) { 
    if (/[^\d]/.test(str)) {
      return "NaN";
    }
    return this.convert(str, 10, 2);
  },
  binToDec : function(str) { 
    if (/[^01]/.test(str)) {
      return "NaN";
    }
    return this.convert(str, 2, 10);
  },
  convert : function(str, from, to) { 
    if (from < 2 || from > 36 || to < 2 || to > 36) {
      return "NaN"
    }
    if (str.length == 0) {
      return "";
    }
    var code = parseInt(str, from);
    if (code == code + 1) {
      return "Out of range";
    } else if (isNaN(code)) {
      return "NaN";
    } else {
      return code.toString(to);
    }
  }
};
