/* Input field height and placeholder per tab */
var TAB_META = {
  hash : { rows : 2 },
  hmac : { rows : 2 },
  crc : { rows : 2 },
  cipher : { rows : 2, placeholder : "text to encrypt, or a Salted__ base64 payload to decrypt" },
  net : { rows : 1, placeholder : "10.0.12.42/22, 2001:db8::1, ::ffff:192.0.2.1, or a decimal" },
  time : { rows : 1, placeholder : "unix seconds or ms, ISO 8601, RFC-1123, 2019-02-27 09:36:55 \u2014 empty is now" },
  number : { rows : 1, placeholder : "42, 0x2a, 0b101010, 0o52, XLII, 3.14 \u2014 any size" },
  string : { rows : 2, placeholder : "text, or hex to decode; fooBarBaz for the case conversions" },
  json : { rows : 4, placeholder : '{"b":2,"a":1}' },
  diff : { rows : 6, placeholder : "original text" },
  encode : { rows : 2 },
  cron : { rows : 1, placeholder : "*/15 9-17 * * mon-fri" },
  jwt : { rows : 3, placeholder : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\u2026" }
};

document.addEventListener("DOMContentLoaded", function () {

  // The standalone web page shows the popup as a card on a desk; the extension
  // popup and the popped-out tab fill their window
  var isExtension = typeof chrome != "undefined" && chrome.tabs && chrome.tabs.create;
  if (!isExtension) {
    document.documentElement.classList.add("page");
  }

  // localStorage may be unavailable (private mode, blocked storage); the popup works without it
  var remember = function (key, value) {
    try {
      if (value === undefined) {
        return localStorage.getItem(key);
      }
      localStorage.setItem(key, value);
    } catch (err) {
      return null;
    }
  };

  var inputValue = document.getElementById("input-value");
  var inputCounter = document.getElementById("input-counter");
  var inputMasked = document.getElementById("input-masked");
  var inputMask = document.getElementById("input-mask");
  var inputNow = document.getElementById("input-now");
  var inputPassword = document.getElementById("input-password");
  var passwordWrapper = document.getElementById("input-password-wrapper");
  var inputWrapper = document.getElementById("input");
  var passwordOptions = document.getElementById("password-options");
  var cronOptions = document.getElementById("cron-options");
  var uuidOptions = document.getElementById("uuid-options");
  var otherWrapper = document.getElementById("input-other-wrapper");
  var inputOther = document.getElementById("input-other");
  var diffOptions = document.getElementById("diff-options");
  var tabItems = document.querySelectorAll("#tabs li");

  /*
   * Events registration
   */
  var counter = function () {
    var length = hasher.inputField().value.length;
    inputCounter.textContent = length > 0 ? length + " chars" : "";
  };
  inputValue.addEventListener("input", function () {
    counter();
    hasher.update();
    if (hasher.tab == tabs.cron) {
      cronFromExpression(inputValue.value);
    }
  });
  inputMasked.addEventListener("input", function () {
    counter();
    hasher.update();
  });
  inputPassword.addEventListener("input", function () {
    hasher.update();
  });

  // "mask": swap the textarea for a password-type field, keeping the text
  var applyMask = function () {
    var from = hasher.inputField();
    var to = inputMask.checked ? inputMasked : inputValue;
    if (from === to) {
      return;
    }
    to.value = from.value;
    from.hidden = true;
    to.hidden = false;
    hasher.update();
    to.focus();
  };
  inputMask.addEventListener("change", applyMask);

  // "Now" (Time tab): current Unix time as input
  inputNow.addEventListener("click", function () {
    var field = hasher.inputField();
    field.value = Math.floor(Date.now() / 1000);
    counter();
    hasher.update();
    field.focus();
  });

  // Password tab: settings -> hasher.options, then regenerate
  var readPasswordOptions = function () {
    hasher.options.passphrase = {
      words : document.getElementById("pp-words").value,
      separator : document.getElementById("pp-separator").value,
      digits : document.getElementById("pp-digits").value,
      capitalize : document.getElementById("pp-capitalize").checked
    };
    hasher.options.password = {
      length : document.getElementById("pw-length").value,
      symbols : document.getElementById("pw-symbols").checked
    };
    hasher.update();
  };
  passwordOptions.querySelectorAll("input").forEach(function (field) {
    field.addEventListener("input", readPasswordOptions);
  });
  document.getElementById("pw-generate").addEventListener("click", function () {
    hasher.update();
  });
  document.getElementById("uuid-generate").addEventListener("click", function () {
    hasher.update();
  });

  /*
   * Cron tab: schedule builder <-> expression in the input
   */
  var cronAutoFilled = null;
  var crMode = document.getElementById("cr-mode");
  var crEvery = document.getElementById("cr-every");
  var crEveryUnit = document.getElementById("cr-every-unit");
  var crMinute = document.getElementById("cr-minute");
  var crHour = document.getElementById("cr-hour");
  var crMin = document.getElementById("cr-min");
  var crDay = document.getElementById("cr-day");
  var crMonth = document.getElementById("cr-month");
  var crDays = cronOptions.querySelectorAll("#cr-days-wrap input");
  var show = function (id, visible) {
    document.getElementById(id).hidden = !visible;
  };
  var cronLayout = function () {
    var mode = crMode.value;
    show("cr-every-wrap", mode == "minutes" || mode == "hourly");
    crEveryUnit.textContent = mode == "hourly" ? "hours" : "minutes";
    crEvery.max = mode == "hourly" ? 23 : 59;
    show("cr-minute-wrap", mode == "hourly");
    show("cr-time-wrap", mode == "daily" || mode == "weekly" || mode == "monthly" || mode == "yearly");
    show("cr-day-wrap", mode == "monthly" || mode == "yearly");
    show("cr-month-wrap", mode == "yearly");
    show("cr-days-wrap", mode == "weekly");
  };
  // builder -> expression
  var cronToExpression = function () {
    cronLayout();
    if (crMode.value == "custom") {
      return;
    }
    var days = [];
    crDays.forEach(function (box) {
      if (box.checked) {
        days.push(parseInt(box.value, 10));
      }
    });
    var expr = cron.build({
      mode : crMode.value,
      every : crEvery.value,
      minute : crMode.value == "hourly" ? crMinute.value : crMin.value,
      hour : crHour.value,
      days : days,
      day : crDay.value,
      month : crMonth.value
    });
    if (hasher.inputField().value != expr) {
      hasher.inputField().value = expr;
      hasher.update();
    }
  };
  // expression -> builder (only when it is one of the simple shapes)
  var cronFromExpression = function (expr) {
    var o = cron.unbuild(expr);
    crMode.value = o ? o.mode : "custom";
    if (o) {
      if (o.every != undefined) crEvery.value = o.every;
      if (o.mode == "hourly") crMinute.value = o.minute;
      if (o.hour != undefined) {
        crHour.value = o.hour;
        crMin.value = o.minute;
      }
      if (o.day != undefined) crDay.value = o.day;
      if (o.month != undefined) crMonth.value = o.month;
      if (o.days) {
        crDays.forEach(function (box) {
          box.checked = o.days.indexOf(parseInt(box.value, 10)) >= 0;
        });
      }
    }
    cronLayout();
  };
  cronOptions.querySelectorAll("input, select").forEach(function (field) {
    field.addEventListener("input", cronToExpression);
    field.addEventListener("change", cronToExpression);
  });

  // Wordlist is gzip-compressed; DecompressionStream is native in every MV3-capable browser
  var loadWordlist = function () {
    fetch("lib/wordlist/eff_large_wordlist.txt.gz")
      .then(function (response) {
        return response.arrayBuffer();
      })
      .then(function (buf) {
        // a static host may already have inflated it (Content-Encoding: gzip): check the magic
        var head = new Uint8Array(buf, 0, 2);
        if (head[0] == 0x1f && head[1] == 0x8b) {
          return new Response(new Response(buf).body.pipeThrough(new DecompressionStream("gzip"))).text();
        }
        return new TextDecoder().decode(buf);
      })
      .then(function (text) {
        passgen.setWords(text);
        if (hasher.tab == tabs.password) {
          hasher.update();
        }
      })
      .catch(function (err) {
        console.error("wordlist", err);
      });
  };
  loadWordlist();

  // Open in a separate tab (pop-out); unavailable in the standalone web version
  var popout = document.getElementById("button-popout");
  if (typeof chrome != "undefined" && chrome.tabs && chrome.tabs.create) {
    popout.addEventListener("click", function () {
      chrome.tabs.create({
        url: "popup.html?tab"
      });
    });
  } else {
    popout.hidden = true;
  }

  // Theme: system -> light -> dark, remembered
  var themeButton = document.getElementById("button-theme");
  var applyTheme = function (theme) {
    if (theme == "light" || theme == "dark") {
      document.documentElement.setAttribute("data-theme", theme);
    } else {
      theme = "system";
      document.documentElement.removeAttribute("data-theme");
    }
    var titles = { system : "Theme: system (follows the OS)", light : "Theme: light", dark : "Theme: dark" };
    themeButton.title = titles[theme];
    ["system", "light", "dark"].forEach(function (name) {
      themeButton.querySelector(".theme-" + name).hidden = name != theme;
    });
    return theme;
  };
  var theme = applyTheme(remember("theme"));
  // what a setting looks like right now: "system" follows the OS
  var effective = function (name) {
    if (name != "system") {
      return name;
    }
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };
  themeButton.addEventListener("click", function () {
    // every click must change the look: skip the setting that looks like the current one
    var order = ["system", "light", "dark"];
    var next = theme;
    do {
      next = order[(order.indexOf(next) + 1) % order.length];
    } while (effective(next) == effective(theme) && next != theme);
    // when the explicit setting would look like the OS, follow the OS instead
    if (effective(next) == effective("system")) {
      next = "system";
    }
    theme = applyTheme(next);
    remember("theme", theme);
  });

  // About: the info icon toggles it
  document.getElementById("button-info").addEventListener("click", function (e) {
    e.preventDefault();
    location.hash = location.hash == "#info" ? "" : "#info";
  });

  // Diff: the second text and the options
  inputOther.addEventListener("input", function () {
    hasher.options.diff.other = inputOther.value;
    document.getElementById("input-other-counter").textContent = inputOther.value.length ? inputOther.value.length + " chars" : "";
    hasher.update();
  });
  ["diff-ignore-ws", "diff-ignore-case"].forEach(function (id) {
    document.getElementById(id).addEventListener("change", function () {
      hasher.options.diff.ignoreWhitespace = document.getElementById("diff-ignore-ws").checked;
      hasher.options.diff.ignoreCase = document.getElementById("diff-ignore-case").checked;
      hasher.update();
    });
  });

  // JSON: sort keys
  var jsonSorted = document.getElementById("json-sorted");
  jsonSorted.addEventListener("change", function () {
    hasher.options.json.sorted = jsonSorted.checked;
    hasher.update();
  });

  // Switch to a tab (Hash/HMAC/...)
  var selectTab = function (li) {
    // highlight active tab, remove highlight on everything else
    tabItems.forEach(function (item) {
      item.classList.remove("on");
    });
    li.classList.add("on");

    // the Cron tab's default schedule should not follow the user to other tabs
    if (hasher.tab == tabs.cron && tabs[li.id] != tabs.cron && hasher.inputField().value == cronAutoFilled) {
      hasher.inputField().value = "";
      counter();
    }
    hasher.tab = tabs[li.id];
    remember("tab", li.id);

    // show/hide optional fields
    passwordWrapper.hidden = !(hasher.tab == tabs.hmac || hasher.tab == tabs.cipher || hasher.tab == tabs.jwt);
    passwordWrapper.querySelector(".label").textContent = hasher.tab == tabs.jwt ? "Secret" : "Password";
    inputNow.hidden = hasher.tab != tabs.time;
    // masking the input only makes sense where a password gets hashed
    var maskable = hasher.tab == tabs.hash || hasher.tab == tabs.hmac;
    inputMask.parentNode.hidden = !maskable;
    if (!maskable && inputMask.checked) {
      inputMask.checked = false;
      applyMask();
    }
    inputWrapper.hidden = hasher.tab == tabs.password || hasher.tab == tabs.uuid;
    passwordOptions.hidden = hasher.tab != tabs.password;
    uuidOptions.hidden = hasher.tab != tabs.uuid;
    cronOptions.hidden = hasher.tab != tabs.cron;
    document.getElementById("json-options").hidden = hasher.tab != tabs.json;
    otherWrapper.hidden = hasher.tab != tabs.diff;
    diffOptions.hidden = hasher.tab != tabs.diff;
    inputWrapper.classList.toggle("columns", hasher.tab == tabs.diff);

    var meta = TAB_META[li.id] || {};
    inputValue.rows = meta.rows || 2;
    inputValue.placeholder = meta.placeholder || "";
    inputMasked.placeholder = meta.placeholder || "";

    hasher.init();
    if (hasher.tab == tabs.cron) {
      if (hasher.inputField().value.trim().length == 0) {
        cronToExpression(); // start from the builder's default schedule
        cronAutoFilled = hasher.inputField().value;
        counter();
      } else {
        cronFromExpression(hasher.inputField().value);
      }
    }
    hasher.update();
    if (!inputWrapper.hidden) {
      hasher.inputField().focus();
    }
  };
  tabItems.forEach(function (li, i) {
    if (i < 10) {
      li.title = "Alt+" + ((i + 1) % 10);
    }
    li.addEventListener("click", function () {
      selectTab(li);
    });
  });

  // Keyboard: Alt+1..9, Alt+0 jump to a tab; Alt+[ and Alt+] go to the previous / next one
  document.addEventListener("keydown", function (e) {
    if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) {
      return;
    }
    var current = -1;
    tabItems.forEach(function (li, i) {
      if (li.classList.contains("on")) {
        current = i;
      }
    });
    var target = -1;
    var digit = /^Digit(\d)$/.exec(e.code);
    if (digit) {
      target = digit[1] == "0" ? 9 : parseInt(digit[1], 10) - 1;
    } else if (e.code == "BracketLeft") {
      target = (current + tabItems.length - 1) % tabItems.length;
    } else if (e.code == "BracketRight") {
      target = (current + 1) % tabItems.length;
    }
    if (target >= 0 && target < tabItems.length) {
      e.preventDefault();
      selectTab(tabItems[target]);
    }
  });

  /*
   * Hash navigation (#info -> About screen)
   */
  var onHashChange = function () {
    var info = window.location.hash == "#info";
    document.getElementById("screen-1").hidden = info;
    document.getElementById("screen-2").hidden = !info;
    window.scrollTo(0, 0);
  };
  window.addEventListener("hashchange", onHashChange);

  /*
   * Init
   */
  onHashChange();
  var lastTab = remember("tab") && document.querySelector("#tabs li#" + remember("tab"));
  selectTab(lastTab || document.querySelector("#tabs li.on"));
});
