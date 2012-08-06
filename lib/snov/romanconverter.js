/**
 * Conversion from decimal to roman
 * 
 * @author Sergey Novikov <mail@snov.me>
 */
function RomanConverter() {
}

/**
 * @return String
 */
RomanConverter.prototype.decToRoman = function(str) {
  var rcode = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"]
  var dvalue = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1]
  var roman = "";

  // validate input
  if (str.length == 0) {
    return "";
  }
  if (/[^\d]/.test(str)) {
    return "NaN";
  }

  num = parseInt(str, 10);
  if (num <= 0 || num >= 4000) {
    return "Out of range";
  }
  for (var i = 0; i < rcode.length; i++) {
    while (num >= dvalue[i]) {
      num -= dvalue[i];
      roman += rcode[i];
    }
  }
  return roman;
}
  
/**
 * @return String
 */
RomanConverter.prototype.romanToDec = function(str) {
  var decimal = 0;
  var lastNumber = 0;

  // validate input
  if (str.length == 0) {
    return "";
  }
  str = str.toUpperCase();
  if (/[^MDCLXVI]/.test(str)) {
    return "NaN"
  }

  var processDecimal = function(decimal, lastNumber, lastDecimal) {
    if (lastNumber > decimal) {
      return lastDecimal - decimal;
    } else {
      return lastDecimal + decimal;
    }
  }

  for (var i = str.length - 1; i >= 0; i--) {
    switch (str.charAt(i)) {
      case 'M':
        decimal = processDecimal(1000, lastNumber, decimal);
        lastNumber = 1000;
        break;
      case 'D':
        decimal = processDecimal(500, lastNumber, decimal);
        lastNumber = 500;
        break;
      case 'C':
        decimal = processDecimal(100, lastNumber, decimal);
        lastNumber = 100;
        break;
      case 'L':
        decimal = processDecimal(50, lastNumber, decimal);
        lastNumber = 50;
        break;
      case 'X':
        decimal = processDecimal(10, lastNumber, decimal);
        lastNumber = 10;
        break;
      case 'V':
        decimal = processDecimal(5, lastNumber, decimal);
        lastNumber = 5;
        break;
      case 'I':
        decimal = processDecimal(1, lastNumber, decimal);
        lastNumber = 1;
        break;
    }
  }
  return decimal;
}
