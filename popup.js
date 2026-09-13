document.addEventListener("DOMContentLoaded", function () {

  var inputValue = document.getElementById("input-value");
  var inputMasked = document.getElementById("input-masked");
  var inputMask = document.getElementById("input-mask");
  var inputNow = document.getElementById("input-now");
  var inputPassword = document.getElementById("input-password");
  var passwordWrapper = document.getElementById("input-password-wrapper");
  var inputWrapper = document.getElementById("input");
  var passwordOptions = document.getElementById("password-options");
  var tabItems = document.querySelectorAll("#tabs li");

  /*
   * Events registration
   */
  inputValue.addEventListener("input", function () {
    hasher.update();
  });
  inputMasked.addEventListener("input", function () {
    hasher.update();
  });
  inputPassword.addEventListener("input", function () {
    hasher.update();
  });

  // "mask": swap the textarea for a password-type field, keeping the text
  inputMask.addEventListener("change", function () {
    var from = hasher.inputField();
    var to = inputMask.checked ? inputMasked : inputValue;
    to.value = from.value;
    from.hidden = true;
    to.hidden = false;
    hasher.update();
    to.focus();
  });

  // "Now" (Time tab): current Unix time as input
  inputNow.addEventListener("click", function () {
    var field = hasher.inputField();
    field.value = Math.floor(Date.now() / 1000);
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
  var popout = document.getElementById("popout");
  if (typeof chrome != "undefined" && chrome.tabs && chrome.tabs.create) {
    document.getElementById("button-popout").addEventListener("click", function () {
      chrome.tabs.create({
        url: "popup.html"
      });
    });
  } else {
    popout.hidden = true;
  }

  // Click on tab (Hash/HMAC/...)
  tabItems.forEach(function (li) {
    li.addEventListener("click", function () {
      // highlight active tab, remove highlight on everything else
      tabItems.forEach(function (item) {
        item.classList.remove("on");
      });
      li.classList.add("on");

      hasher.tab = tabs[li.id];

      // show/hide optional fields
      passwordWrapper.hidden = !(hasher.tab == tabs.hmac || hasher.tab == tabs.cipher);
      inputNow.hidden = hasher.tab != tabs.time;
      inputWrapper.hidden = hasher.tab == tabs.password;
      passwordOptions.hidden = hasher.tab != tabs.password;

      hasher.init();
      hasher.update();
      if (!inputWrapper.hidden) {
        hasher.inputField().focus();
      }
    });
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
  hasher.init();
  hasher.update();
  inputValue.focus();
});
