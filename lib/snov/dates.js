/**
 * Calendar facts about a Date (weekday, ISO week, day of the year) and durations:
 * "1h 30m", "01:30:00", "PT1H30M" -> milliseconds, and milliseconds -> "1h 30m".
 *
 * @author Sergey Novikov <mail@snov.me>
 */
var dates = {
  DAYS : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  UNITS : { ms : 1, s : 1000, m : 60000, h : 3600000, d : 86400000, w : 604800000 },
  ALIASES : {
    ms : "ms", msec : "ms", msecs : "ms", millisecond : "ms", milliseconds : "ms",
    s : "s", sec : "s", secs : "s", second : "s", seconds : "s",
    m : "m", min : "m", mins : "m", minute : "m", minutes : "m",
    h : "h", hr : "h", hrs : "h", hour : "h", hours : "h",
    d : "d", day : "d", days : "d",
    w : "w", wk : "w", wks : "w", week : "w", weeks : "w"
  },

  /* { year, month (1-12), day, weekday (0-6) } in UTC or local time */
  fields : function (date, utc) {
    return utc
      ? { year : date.getUTCFullYear(), month : date.getUTCMonth() + 1, day : date.getUTCDate(), weekday : date.getUTCDay() }
      : { year : date.getFullYear(), month : date.getMonth() + 1, day : date.getDate(), weekday : date.getDay() };
  },

  /* "2019-W09": the ISO 8601 week, whose year may differ from the calendar year around New Year */
  isoWeek : function (date, utc) {
    var f = this.fields(date, utc);
    // the Thursday of the same week decides which year the week belongs to
    var thursday = new Date(Date.UTC(f.year, f.month - 1, f.day + 4 - (f.weekday || 7)));
    var week = Math.ceil(((thursday.getTime() - Date.UTC(thursday.getUTCFullYear(), 0, 1)) / this.UNITS.d + 1) / 7);
    return thursday.getUTCFullYear() + "-W" + (week < 10 ? "0" : "") + week;
  },

  /* { day: 58, of: 365 } */
  dayOfYear : function (date, utc) {
    var f = this.fields(date, utc);
    var start = Date.UTC(f.year, 0, 1);
    return {
      day : Math.round((Date.UTC(f.year, f.month - 1, f.day) - start) / this.UNITS.d) + 1,
      of : Math.round((Date.UTC(f.year + 1, 0, 1) - start) / this.UNITS.d)
    };
  },

  /* "Wednesday · 2019-W09 · day 58 of 365" (plus the zone offset for local time) */
  describe : function (date, utc) {
    var f = this.fields(date, utc);
    var doy = this.dayOfYear(date, utc);
    var out = this.DAYS[f.weekday] + " · " + this.isoWeek(date, utc) + " · day " + doy.day + " of " + doy.of;
    if (!utc) {
      var offset = -date.getTimezoneOffset();
      var abs = Math.abs(offset);
      out += " · UTC" + (offset < 0 ? "-" : "+") + (abs / 60 < 10 ? "0" : "") + Math.floor(abs / 60) + ":" + (abs % 60 < 10 ? "0" : "") + (abs % 60);
    }
    return out;
  },

  /**
   * "1d 2h 30m", "1.5h", "90 seconds", "01:30:00", "1:30" (m:ss), "PT1H30M", "P1W" -> milliseconds;
   * null when it is not a duration (a bare number is not: it reads as a timestamp)
   */
  parse : function (input) {
    var str = input.trim();
    var m;
    if ((m = /^(?:(\d+):)?(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?$/.exec(str))) {
      var hours = m[1] ? +m[1] : 0, minutes = +m[2], seconds = +m[3];
      if (minutes >= 60 || seconds >= 60) return null;
      return hours * this.UNITS.h + minutes * this.UNITS.m + seconds * this.UNITS.s + (m[4] ? +(m[4] + "00").slice(0, 3) : 0);
    }
    if ((m = /^P(?:(\d+(?:\.\d+)?)W)?(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i.exec(str)) && str.length > 1 && !/T$/i.test(str)) {
      return Math.round((m[1] || 0) * this.UNITS.w + (m[2] || 0) * this.UNITS.d + (m[3] || 0) * this.UNITS.h + (m[4] || 0) * this.UNITS.m + (m[5] || 0) * this.UNITS.s);
    }
    var total = 0, seen = false;
    var rest = str.toLowerCase();
    var part = /^(\d+(?:\.\d+)?)\s*([a-z]+)(?:\s*,?\s*(?:and\s+)?)?/;
    while (rest.length > 0) {
      m = part.exec(rest);
      if (!m || !this.ALIASES[m[2]]) return null;
      total += +m[1] * this.UNITS[this.ALIASES[m[2]]];
      seen = true;
      rest = rest.slice(m[0].length);
    }
    return seen ? Math.round(total) : null;
  },

  /* 90061000 -> "1d 1h 1m 1s"; 1500 -> "1.5s"; 0 -> "0s" */
  format : function (ms) {
    var left = Math.abs(ms);
    var out = [];
    var units = ["d", "h", "m"];
    for (var i = 0; i < units.length; i++) {
      var n = Math.floor(left / this.UNITS[units[i]]);
      if (n > 0) out.push(n + units[i]);
      left -= n * this.UNITS[units[i]];
    }
    if (left > 0 || out.length == 0) {
      out.push(Math.round(left) / 1000 + "s");
    }
    return (ms < 0 ? "-" : "") + out.join(" ");
  }
};
