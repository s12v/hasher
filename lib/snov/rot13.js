/**
 * ROT13 encoding
 * 
 * @author Sergey Novikov <mail@snov.me>
 */
Rot13 = function () {
  /**
   * @return String
   */
  this.encode = function(text) {
    var normall = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var rotall  = "nopqrstuvwxyzabcdefghijklmNOPQRSTUVWXYZABCDEFGHIJKLM";
    
    var result = "";
    for (var i = 0; i < text.length; i++) {
      c = text.substr(i, 1);
      x = normall.indexOf(c);
      if (x > -1) {
        result += rotall.substr(x, 1);
      } else {
        result += c;
      }
    }
    
    return result;
  }
}

