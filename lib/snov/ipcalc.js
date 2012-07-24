/**
 *  IP calculator
 *
 *  @author Sergey Novikov <mail@snov.me>
 */
function ipCalc(str) {

  /* Private variables */

  var ip;
  var netmask;
  var network;
  var broadcast;
  var hostMin;
  var hostMax;

  /* Private methods */

  var reset = function() {
    ip = null;
    netmask = null;
    network = null;
    broadcast = null;
    hostMin = null;
    hostMax = null;
  }

  /**
   * Returns int value
   * (255.255.255.255) = 4294967295
   */
  var octetsToInt = function(o1, o2, o3, o4) {
    return parseInt(o1 * 16777216) + parseInt(o2 * 65536) + parseInt(o3 * 256) + parseInt(o4);
  }

  var bitsToInt = function(bits) {
    if (bits > 0 && bits <= 32) {
      return Math.pow(2, 32) - Math.pow(2, 32 - bits);
    } else if (bits == 0) {
      return 0;
    } else {
      return NaN;
    }
  }

  var getPaddedBinString = function(ival) {
    str = ival.toString(2);
    if (str.length && str.length < 32) {
      for (var i = 32 - str.length; i > 0; i--) {
        str = "0" + str;
      }
    }
    return str;
  }

  /*
   * JavaScript's bitwise functions could cause sign error
   */
  var getAnd = function(i1, i2) {
    bin1 = getPaddedBinString(i1);
    bin2 = getPaddedBinString(i2);
    result = "";
    for (var i = 0; i < 32; i++) {
      if (bin1.substr(i, 1) == bin2.substr(i, 1)) {
        result += bin1.substr(i, 1);
      } else {
        result += "0";
      }
    }
    return parseInt(result, 2);
  }
  
  var getBroadcast = function(ip, netmask) {
    bin1 = getPaddedBinString(ip);
    bin2 = getPaddedBinString(netmask);
    result = "";
    for (var i = 0; i < 32; i++) {
      if (bin1.substr(i, 1) == "1" || bin2.substr(i, 1) == "0") {
        result += "1";
      } else {
        result += "0";
      }
    }
    return parseInt(result, 2);
  }

  /* Public methods */

  this.parse = function(str) {
    reset();

    if ( (matches = /(\d+)\.(\d+)\.(\d+)\.(\d+)\/(\d+)\.(\d+)\.(\d+)\.(\d+)/.exec(str)) != null) {
      // 1.2.3.4/255.255.255.0
      if (matches.length == 9 &&
          matches[1] >= 0 && matches[2] >= 0 && matches[3] >= 0 && matches[4] >= 0 && matches[5] >= 0 && matches[6] >= 0 && matches[7] >= 0 && matches[8] >= 0 &&
          matches[1] <= 255 && matches[2] <= 255 && matches[3] <= 255 && matches[4] <= 255 && matches[5] <= 255 && matches[6] <= 255 && matches[7] <= 255 && matches[8] <= 255)
      {
        ip = octetsToInt(matches[1], matches[2], matches[3], matches[4]);
        netmask = octetsToInt(matches[5], matches[6], matches[7], matches[8]);
      }
    } else if ( (matches = /(\d+)\.(\d+)\.(\d+)\.(\d+)\/(\d+)/.exec(str)) != null) {
      // 1.2.3.4/24
      if (matches.length == 6 &&
          matches[1] >= 0 && matches[2] >= 0 && matches[3] >= 0 && matches[4] >= 0 && matches[5] >= 0 &&
          matches[1] <= 255 && matches[2] <= 255 && matches[3] <= 255 && matches[4] <= 255 && matches[5] <= 32) {
        ip = octetsToInt(matches[1], matches[2], matches[3], matches[4]);
        netmask = bitsToInt(matches[5]);
      }
    } else if ( (matches = /(\d+)\.(\d+)\.(\d+)\.(\d+)/.exec(str)) != null) {
      // 1.2.3.4
      if (matches.length == 5 &&
          matches[1] >= 0 && matches[2] >= 0 && matches[3] >= 0 && matches[4] >= 0 &&
          matches[1] <= 255 && matches[2] <= 255 && matches[3] <= 255 && matches[4] <= 255) {
        ip = octetsToInt(matches[1], matches[2], matches[3], matches[4]);
      }
    }

    // if parsing was successful, calculate network
    if (ip != null && netmask != null) {
      network = getAnd(ip, netmask);
      broadcast = getBroadcast(ip, netmask);
      hostMin = network + 1;
      hostMax = broadcast - 1;
    }
  }

  this.intToOctetString = function(val) {
    var byte1 = (val >>> 24 );
    var byte2 = (val >>> 16 ) & 255;
    var byte3 = (val >>>  8 ) & 255;
    var byte4 = val & 255;
    return byte1 + '.' + byte2 + '.' + byte3 + '.' + byte4;    
  }
  
  /**
   *  Returns string padded with zeroes
   */
  this.getPaddedBinString = function(ival) {
    return getPaddedBinString(ival);
  }
  
  this.getIp = function() {
    return ip;
  }
  
  this.getNetmask = function() {
    return netmask;
  }
  
  this.getNetwork = function() {
    return network;
  }
  
  this.getBroadcast = function() {
    return broadcast;
  }
  
  this.gethHostMin = function() {
    return hostMin;
  }
  
  this.gethHostMax = function() {
    return hostMax;
  }
  
  this.gethHostCount = function() {
    return (broadcast - network - 1);
  }
  
  /* Constructor */
  this.parse(str);
}
