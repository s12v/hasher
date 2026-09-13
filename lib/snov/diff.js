/**
 * Text diff: line-level LCS with character highlights inside changed pairs,
 * rendered as HTML or as a unified diff.
 *
 * @author Sergey Novikov <mail@snov.me>
 */
var diff = {
  /* Inputs bigger than this (lines x lines) are not aligned, just shown as replaced */
  MAX_CELLS : 4000000,
  CONTEXT : 3,

  splitLines : function (text) {
    if (text.length == 0) {
      return [];
    }
    var lines = text.split("\n");
    if (lines[lines.length - 1] == "") {
      lines.pop(); // a trailing newline does not make an extra empty line
    }
    return lines;
  },

  /* Comparison key for a line under the options */
  key : function (line, opts) {
    var k = line;
    if (opts && opts.ignoreWhitespace) {
      k = k.replace(/\s+/g, " ").trim();
    }
    if (opts && opts.ignoreCase) {
      k = k.toLowerCase();
    }
    return k;
  },

  /**
   * LCS-based edit script for two arrays of keys; returns [{op: "eq"|"del"|"add", i, j}]
   * where i indexes a and j indexes b. Common prefix and suffix are peeled off first.
   */
  align : function (a, b) {
    var ops = [];
    var start = 0;
    while (start < a.length && start < b.length && a[start] == b[start]) {
      ops.push({ op : "eq", i : start, j : start });
      start++;
    }
    var endA = a.length, endB = b.length;
    while (endA > start && endB > start && a[endA - 1] == b[endB - 1]) {
      endA--;
      endB--;
    }
    var n = endA - start, m = endB - start;
    var middle = [];
    if (n > 0 && m > 0 && n * m > this.MAX_CELLS) {
      // too big to align: everything in the middle is replaced
      for (var d = 0; d < n; d++) middle.push({ op : "del", i : start + d });
      for (var e = 0; e < m; e++) middle.push({ op : "add", j : start + e });
    } else if (n > 0 && m > 0) {
      // table[(i)*(m+1)+j] = LCS length of a[start+i..] and b[start+j..]
      var w = m + 1;
      var table = new Int32Array((n + 1) * w);
      for (var i = n - 1; i >= 0; i--) {
        for (var j = m - 1; j >= 0; j--) {
          table[i * w + j] = (a[start + i] == b[start + j])
            ? table[(i + 1) * w + j + 1] + 1
            : Math.max(table[(i + 1) * w + j], table[i * w + j + 1]);
        }
      }
      var x = 0, y = 0;
      while (x < n && y < m) {
        if (a[start + x] == b[start + y]) {
          middle.push({ op : "eq", i : start + x, j : start + y });
          x++; y++;
        } else if (table[(x + 1) * w + y] >= table[x * w + y + 1]) {
          middle.push({ op : "del", i : start + x });
          x++;
        } else {
          middle.push({ op : "add", j : start + y });
          y++;
        }
      }
      while (x < n) { middle.push({ op : "del", i : start + x++ }); }
      while (y < m) { middle.push({ op : "add", j : start + y++ }); }
    } else {
      for (var p = 0; p < n; p++) middle.push({ op : "del", i : start + p });
      for (var q = 0; q < m; q++) middle.push({ op : "add", j : start + q });
    }
    ops = ops.concat(middle);
    for (var k = 0; k < a.length - endA; k++) {
      ops.push({ op : "eq", i : endA + k, j : endB + k });
    }
    return ops;
  },

  /**
   * Line diff of two texts: [{op, a, b}] with the original line texts
   */
  lines : function (textA, textB, opts) {
    var self = this;
    var a = this.splitLines(textA), b = this.splitLines(textB);
    var ka = a.map(function (l) { return self.key(l, opts); });
    var kb = b.map(function (l) { return self.key(l, opts); });
    return this.align(ka, kb).map(function (o) {
      return { op : o.op, a : o.i != undefined ? a[o.i] : undefined, b : o.j != undefined ? b[o.j] : undefined };
    });
  },

  stats : function (ops) {
    var added = 0, removed = 0;
    for (var i = 0; i < ops.length; i++) {
      if (ops[i].op == "add") added++;
      if (ops[i].op == "del") removed++;
    }
    return { added : added, removed : removed };
  },

  /**
   * Character-level segments for a changed line pair: [{op, text}] for each side.
   * Falls back to whole-line replacement when less than a third of the characters match.
   */
  chars : function (lineA, lineB) {
    var a = Array.from(lineA), b = Array.from(lineB);
    if (a.length * b.length > this.MAX_CELLS) {
      return null;
    }
    var ops = this.align(a, b);
    var same = 0;
    for (var i = 0; i < ops.length; i++) {
      if (ops[i].op == "eq") same++;
    }
    if (same * 3 < Math.max(a.length, b.length)) {
      return null;
    }
    ops = this.absorbIslands(ops);
    var segA = [], segB = [];
    var push = function (list, op, ch) {
      var last = list[list.length - 1];
      if (last && last.op == op) {
        last.text += ch;
      } else {
        list.push({ op : op, text : ch });
      }
    };
    for (var k = 0; k < ops.length; k++) {
      var o = ops[k];
      if (o.op == "eq") {
        push(segA, "eq", a[o.i]);
        push(segB, "eq", b[o.j]);
      } else if (o.op == "del") {
        push(segA, "del", a[o.i]);
      } else {
        push(segB, "add", b[o.j]);
      }
    }
    return { a : segA, b : segB };
  },

  /**
   * "info" vs "warn" share an "n": equal runs shorter than 3 characters that sit
   * between changes are folded into the change so the highlight reads as one word
   */
  absorbIslands : function (ops) {
    var out = [];
    var i = 0;
    while (i < ops.length) {
      if (ops[i].op != "eq") {
        out.push(ops[i++]);
        continue;
      }
      var j = i;
      while (j < ops.length && ops[j].op == "eq") j++;
      var island = (j - i) < 3 && i > 0 && j < ops.length;
      for (var k = i; k < j; k++) {
        if (island) {
          out.push({ op : "del", i : ops[k].i });
          out.push({ op : "add", j : ops[k].j });
        } else {
          out.push(ops[k]);
        }
      }
      i = j;
    }
    return out;
  },

  /**
   * Greedy best-similarity pairing of deleted and added lines in one block:
   * [{del, add, chars}] for the pairs similar enough to highlight
   */
  pair : function (dels, adds) {
    if (dels.length * adds.length > 400) {
      return [];
    }
    var candidates = [];
    for (var d = 0; d < dels.length; d++) {
      for (var a = 0; a < adds.length; a++) {
        var c = this.chars(dels[d], adds[a]);
        if (c) {
          var same = 0;
          for (var k = 0; k < c.a.length; k++) {
            if (c.a[k].op == "eq") same += c.a[k].text.length;
          }
          candidates.push({ del : d, add : a, chars : c, score : same / Math.max(dels[d].length, adds[a].length, 1) });
        }
      }
    }
    candidates.sort(function (x, y) { return y.score - x.score || x.del - y.del || x.add - y.add; });
    var usedDel = {}, usedAdd = {}, pairs = [];
    candidates.forEach(function (cand) {
      if (!usedDel[cand.del] && !usedAdd[cand.add]) {
        usedDel[cand.del] = true;
        usedAdd[cand.add] = true;
        pairs.push(cand);
      }
    });
    return pairs;
  },

  escape : function (text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  },

  /**
   * HTML: one div per line, deletions before the additions they pair with,
   * changed characters inside paired lines wrapped in <mark>
   */
  html : function (ops) {
    var self = this;
    var out = [];
    var segments = function (segs, side) {
      return segs.map(function (s) {
        var t = self.escape(s.text);
        return s.op == "eq" ? t : "<mark>" + t + "</mark>";
      }).join("");
    };
    var line = function (cls, marker, content) {
      out.push('<div class="d-line ' + cls + '"><span class="d-mark">' + marker + '</span>' + content + "</div>");
    };
    var i = 0;
    while (i < ops.length) {
      if (ops[i].op == "eq") {
        line("d-eq", " ", self.escape(ops[i].a));
        i++;
        continue;
      }
      // a block of deletions followed by additions: pair each deleted line
      // with the most similar added line and highlight what changed between them
      var dels = [], adds = [];
      while (i < ops.length && ops[i].op == "del") { dels.push(ops[i++].a); }
      while (i < ops.length && ops[i].op == "add") { adds.push(ops[i++].b); }
      var pairs = self.pair(dels, adds);
      var renderedDels = dels.map(function (text) { return self.escape(text); });
      var renderedAdds = adds.map(function (text) { return self.escape(text); });
      pairs.forEach(function (pr) {
        renderedDels[pr.del] = segments(pr.chars.a);
        renderedAdds[pr.add] = segments(pr.chars.b);
      });
      renderedDels.forEach(function (h) { line("d-del", "-", h); });
      renderedAdds.forEach(function (h) { line("d-add", "+", h); });
    }
    return out.join("");
  },

  /**
   * Unified diff with 3 lines of context, GNU-style hunk headers
   */
  unified : function (ops, nameA, nameB) {
    var context = this.CONTEXT;
    var changed = [];
    for (var i = 0; i < ops.length; i++) {
      if (ops[i].op != "eq") changed.push(i);
    }
    if (changed.length == 0) {
      return "";
    }
    // group changes into hunks: merge when the gap between changes is <= 2 * context
    var hunks = [];
    var hStart = Math.max(0, changed[0] - context), hEnd = Math.min(ops.length - 1, changed[0] + context);
    for (var c = 1; c < changed.length; c++) {
      if (changed[c] - context <= hEnd + 1) {
        hEnd = Math.min(ops.length - 1, changed[c] + context);
      } else {
        hunks.push([hStart, hEnd]);
        hStart = Math.max(0, changed[c] - context);
        hEnd = Math.min(ops.length - 1, changed[c] + context);
      }
    }
    hunks.push([hStart, hEnd]);

    var out = ["--- " + (nameA || "a"), "+++ " + (nameB || "b")];
    var lineA = 1, lineB = 1, at = 0;
    var range = function (start, count) {
      return count == 1 ? String(start) : start + "," + count;
    };
    for (var h = 0; h < hunks.length; h++) {
      var from = hunks[h][0], to = hunks[h][1];
      // advance the line counters over the ops before this hunk
      for (; at < from; at++) {
        if (ops[at].op != "add") lineA++;
        if (ops[at].op != "del") lineB++;
      }
      var startA = lineA, startB = lineB, countA = 0, countB = 0, body = [];
      for (var k = from; k <= to; k++) {
        var o = ops[k];
        if (o.op == "eq") { body.push(" " + o.a); countA++; countB++; }
        else if (o.op == "del") { body.push("-" + o.a); countA++; }
        else { body.push("+" + o.b); countB++; }
      }
      at = to + 1;
      lineA = startA + countA;
      lineB = startB + countB;
      var sA = countA == 0 ? startA - 1 : startA, sB = countB == 0 ? startB - 1 : startB;
      out.push("@@ -" + range(sA, countA) + " +" + range(sB, countB) + " @@");
      out = out.concat(body);
    }
    return out.join("\n");
  }
};
