/**
 * Cron expression parser: human-readable description (crontab.guru style)
 * and next run times. Standard five fields (minute hour day-of-month month
 * day-of-week) or six with a leading seconds field (Quartz, Spring, some
 * schedulers); lists, ranges, steps, month/day names, @shortcuts.
 *
 * @author Sergey Novikov <mail@snov.me>
 */
var cron = {
  MONTHS : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  DAYS : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  SHORTCUTS : {
    "@yearly" : "0 0 1 1 *",
    "@annually" : "0 0 1 1 *",
    "@monthly" : "0 0 1 * *",
    "@weekly" : "0 0 * * 0",
    "@daily" : "0 0 * * *",
    "@midnight" : "0 0 * * *",
    "@hourly" : "0 * * * *"
  },
  FIELDS : [
    { name : "second", min : 0, max : 59 },
    { name : "minute", min : 0, max : 59 },
    { name : "hour", min : 0, max : 23 },
    { name : "day-of-month", min : 1, max : 31 },
    { name : "month", min : 1, max : 12, names : ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"] },
    { name : "day-of-week", min : 0, max : 6, names : ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] }
  ],

  /**
   * Returns six fields, [second, minute, hour, day-of-month, month, day-of-week], each
   * { items: [{lo, hi, step, star, single}], values: {n: true}, star: bool }; a five-field
   * expression gets an implicit second 0 (marked implicit: true). Throws on error.
   */
  parse : function (expr) {
    var str = expr.trim().toLowerCase();
    if (this.SHORTCUTS[str]) {
      str = this.SHORTCUTS[str];
    }
    var parts = str.split(/\s+/);
    if (parts.length != 5 && parts.length != 6) {
      throw new Error("expected 5 fields (or 6 with seconds), got " + parts.length);
    }
    var implicit = parts.length == 5;
    if (implicit) {
      parts.unshift("0");
    }
    var fields = [];
    for (var i = 0; i < 6; i++) {
      fields.push(this.parseField(parts[i], this.FIELDS[i]));
    }
    fields[0].implicit = implicit;
    return fields;
  },

  /* true when the expression spells out the seconds field */
  hasSeconds : function (expr) {
    return !this.parse(expr)[0].implicit;
  },

  parseValue : function (str, field) {
    if (field.names) {
      var idx = field.names.indexOf(str.toUpperCase());
      if (idx >= 0) {
        return field.min + idx;
      }
    }
    if (!/^\d+$/.test(str)) {
      throw new Error("bad value '" + str + "' in " + field.name);
    }
    var n = parseInt(str, 10);
    if (field.name == "day-of-week" && n == 7) {
      n = 0; // 7 is Sunday too
    }
    if (n < field.min || n > field.max) {
      throw new Error(field.name + " " + n + " out of range " + field.min + "-" + field.max);
    }
    return n;
  },

  parseField : function (str, field) {
    var items = [];
    var values = {};
    var list = str.split(",");
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      if (item.length == 0) {
        throw new Error("empty item in " + field.name);
      }
      var step = 1;
      var range = item;
      var slash = item.indexOf("/");
      if (slash >= 0) {
        range = item.substring(0, slash);
        var stepStr = item.substring(slash + 1);
        if (!/^\d+$/.test(stepStr) || parseInt(stepStr, 10) == 0) {
          throw new Error("bad step '" + stepStr + "' in " + field.name);
        }
        step = parseInt(stepStr, 10);
      }
      var lo, hi, star = false, single = false;
      if (range == "*") {
        star = true;
        lo = field.min;
        hi = field.max;
      } else if (range.indexOf("-") >= 0) {
        var bounds = range.split("-");
        if (bounds.length != 2) {
          throw new Error("bad range '" + range + "' in " + field.name);
        }
        lo = this.parseValue(bounds[0], field);
        hi = this.parseValue(bounds[1], field);
        if (lo > hi) {
          throw new Error("range " + range + " in " + field.name + " is backwards");
        }
      } else {
        lo = this.parseValue(range, field);
        hi = (slash >= 0) ? field.max : lo; // "5/10" means 5-max/10
        single = (slash < 0);
      }
      items.push({ lo : lo, hi : hi, step : step, star : star, single : single });
      for (var v = lo; v <= hi; v += step) {
        values[v] = true;
      }
    }
    // Vixie cron: day fields are "restricted" unless they start with '*'
    return { items : items, values : values, star : str.charAt(0) == "*" };
  },

  ordinal : function (n) {
    var s = ["th", "st", "nd", "rd"];
    var v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  },

  /* "1, 2, and 3" / "1 and 2" / "1" */
  list : function (arr) {
    if (arr.length <= 1) {
      return arr.join("");
    }
    if (arr.length == 2) {
      return arr[0] + " and " + arr[1];
    }
    return arr.slice(0, -1).join(", ") + ", and " + arr[arr.length - 1];
  },

  /**
   * Phrase for one field, e.g. "minute 5", "every 2nd hour from 0 through 20",
   * "every day-of-week from Monday through Friday", "January and March"
   */
  describeField : function (parsed, field) {
    var self = this;
    var label = function (v) {
      if (field.name == "month") {
        return self.MONTHS[v - 1];
      }
      if (field.name == "day-of-week") {
        return self.DAYS[v];
      }
      return String(v);
    };
    var named = field.names != undefined; // months and weekdays read without the noun
    var singles = [];
    var others = [];
    for (var i = 0; i < parsed.items.length; i++) {
      var it = parsed.items[i];
      if (it.single) {
        singles.push(label(it.lo));
        continue;
      }
      var phrase;
      if (it.step > 1) {
        phrase = "every " + this.ordinal(it.step) + " " + field.name;
      } else {
        phrase = "every " + field.name;
      }
      if (!it.star) {
        phrase += " from " + label(it.lo) + " through " + label(it.hi);
      }
      others.push(phrase);
    }
    var parts = [];
    if (singles.length > 0) {
      parts.push((named ? "" : field.name + " ") + this.list(singles));
    }
    return parts.concat(others).join(" and ");
  },

  describe : function (expr) {
    var fields = this.parse(expr);
    var second = fields[0], minute = fields[1], hour = fields[2], dom = fields[3], month = fields[4], dow = fields[5];
    var isEvery = function (f) {
      return f.items.length == 1 && f.items[0].star && f.items[0].step == 1;
    };
    var isSingle = function (f) {
      return f.items.length == 1 && f.items[0].single;
    };
    var two = function (n) {
      return (n < 10 ? "0" : "") + n;
    };
    var out;

    // "At 04:05" when both are fixed single values ("At 04:05:30" with fixed seconds)
    if (isSingle(minute) && isSingle(hour)) {
      var h = hour.items[0].lo, m = minute.items[0].lo;
      out = two(h) + ":" + two(m);
      if (isSingle(second)) {
        out = "At " + out + (second.items[0].lo > 0 ? ":" + two(second.items[0].lo) : "");
      } else {
        out = "At " + this.describeField(second, this.FIELDS[0]) + " past " + out;
      }
    } else {
      var clock = [];
      if (!isSingle(second) || second.items[0].lo > 0) {
        clock.push(this.describeField(second, this.FIELDS[0]));
      }
      if (clock.length == 0 || !isEvery(minute)) {
        clock.push(this.describeField(minute, this.FIELDS[1]));
      }
      if (!isEvery(hour)) {
        clock.push(this.describeField(hour, this.FIELDS[2]));
      }
      out = "At " + clock.join(" past ");
    }
    var days = [];
    if (!isEvery(dom)) {
      days.push("on " + this.describeField(dom, this.FIELDS[3]));
    }
    if (!isEvery(dow)) {
      days.push("on " + this.describeField(dow, this.FIELDS[5]));
    }
    if (days.length > 0) {
      out += " " + days.join(" and ");
    }
    if (!isEvery(month)) {
      out += " in " + this.describeField(month, this.FIELDS[4]);
    }
    return out + ".";
  },

  /* ---- builder: a simple schedule <-> expression ---- */

  MODES : ["minute", "minutes", "hourly", "daily", "weekly", "monthly", "yearly"],

  clamp : function (value, min, max, fallback) {
    var n = parseInt(value, 10);
    return isNaN(n) ? fallback : Math.min(max, Math.max(min, n));
  },

  /* [1,2,3,4,5,0] -> "0,1-5" */
  compress : function (values) {
    var sorted = values.slice().sort(function (a, b) { return a - b; });
    var out = [];
    for (var i = 0; i < sorted.length; i++) {
      var start = sorted[i];
      while (i + 1 < sorted.length && sorted[i + 1] == sorted[i] + 1) {
        i++;
      }
      var end = sorted[i];
      if (end - start >= 2) {
        out.push(start + "-" + end);
      } else if (end != start) {
        out.push(start + "," + end);
      } else {
        out.push(String(start));
      }
    }
    return out.join(",");
  },

  /**
   * opts: { mode, every, minute, hour, days: [0-6], day: 1-31, month: 1-12 } -> expression
   */
  build : function (o) {
    var minute = this.clamp(o.minute, 0, 59, 0);
    var hour = this.clamp(o.hour, 0, 23, 0);
    var every = this.clamp(o.every, 1, 59, 1);
    var day = this.clamp(o.day, 1, 31, 1);
    var month = this.clamp(o.month, 1, 12, 1);
    switch (o.mode) {
      case "minute":
        return "* * * * *";
      case "minutes":
        return (every > 1 ? "*/" + every : "*") + " * * * *";
      case "hourly":
        every = Math.min(every, 23);
        return minute + " " + (every > 1 ? "*/" + every : "*") + " * * *";
      case "daily":
        return minute + " " + hour + " * * *";
      case "weekly":
        var days = (o.days || []).filter(function (d) { return d >= 0 && d <= 6; });
        return minute + " " + hour + " * * " + (days.length > 0 && days.length < 7 ? this.compress(days) : "*");
      case "monthly":
        return minute + " " + hour + " " + day + " * *";
      case "yearly":
        return minute + " " + hour + " " + day + " " + month + " *";
    }
    throw new Error("unknown mode " + o.mode);
  },

  /**
   * expression -> opts when it is one of the builder's shapes, otherwise null
   * (an expression with a seconds field is never one: the builder writes five fields)
   */
  unbuild : function (expr) {
    var f;
    try {
      f = this.parse(expr);
    } catch (err) {
      return null;
    }
    if (!f[0].implicit) {
      return null;
    }
    var star = function (x) { return x.items.length == 1 && x.items[0].star && x.items[0].step == 1; };
    var step = function (x) { return (x.items.length == 1 && x.items[0].star && x.items[0].step > 1) ? x.items[0].step : null; };
    var single = function (x) { return (x.items.length == 1 && x.items[0].single) ? x.items[0].lo : null; };
    var minute = f[1], hour = f[2], dom = f[3], month = f[4], dow = f[5];

    if (star(minute) && star(hour) && star(dom) && star(month) && star(dow)) {
      return { mode : "minute" };
    }
    if (step(minute) && star(hour) && star(dom) && star(month) && star(dow)) {
      return { mode : "minutes", every : step(minute) };
    }
    if (single(minute) === null || !star(dom) && single(dom) === null || !star(month) && single(month) === null) {
      return null;
    }
    var m = single(minute);
    if ((star(hour) || step(hour)) && star(dom) && star(month) && star(dow)) {
      return { mode : "hourly", minute : m, every : step(hour) || 1 };
    }
    if (single(hour) === null) {
      return null;
    }
    var h = single(hour);
    if (star(dom) && star(month)) {
      if (star(dow)) {
        return { mode : "daily", minute : m, hour : h };
      }
      var days = Object.keys(dow.values).map(Number);
      return { mode : "weekly", minute : m, hour : h, days : days };
    }
    if (single(dom) !== null && star(dow)) {
      if (star(month)) {
        return { mode : "monthly", minute : m, hour : h, day : single(dom) };
      }
      if (single(month) !== null) {
        return { mode : "yearly", minute : m, hour : h, day : single(dom), month : single(month) };
      }
    }
    return null;
  },

  /**
   * Next `count` run times after `from` (a Date), local time. Day-of-month and
   * day-of-week are ORed when both are restricted, as in Vixie cron.
   */
  next : function (expr, from, count) {
    var f = this.parse(expr);
    var second = f[0].values, minute = f[1].values, hour = f[2].values, dom = f[3].values, month = f[4].values, dow = f[5].values;
    var both = !f[3].star && !f[5].star;
    var result = [];
    var d = new Date(from.getTime());
    d.setMilliseconds(0);
    d.setSeconds(d.getSeconds() + 1);
    // 5 years is the search horizon; "0 0 30 2 *" must terminate
    var limit = d.getTime() + 5 * 366 * 24 * 60 * 60 * 1000;
    while (result.length < count && d.getTime() < limit) {
      if (!month[d.getMonth() + 1]) {
        d.setMonth(d.getMonth() + 1, 1);
        d.setHours(0, 0, 0, 0);
        continue;
      }
      var domOk = dom[d.getDate()], dowOk = dow[d.getDay()];
      var dayOk = both ? (domOk || dowOk) : (domOk && dowOk);
      if (!dayOk) {
        d.setDate(d.getDate() + 1);
        d.setHours(0, 0, 0, 0);
        continue;
      }
      if (!hour[d.getHours()]) {
        d.setHours(d.getHours() + 1, 0, 0, 0);
        continue;
      }
      if (!minute[d.getMinutes()]) {
        d.setMinutes(d.getMinutes() + 1, 0, 0);
        continue;
      }
      if (!second[d.getSeconds()]) {
        d.setSeconds(d.getSeconds() + 1);
        continue;
      }
      result.push(new Date(d.getTime()));
      d.setSeconds(d.getSeconds() + 1);
    }
    return result;
  }
};
