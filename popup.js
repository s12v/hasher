document.addEventListener("DOMContentLoaded", function () {

  var inputValue = document.getElementById("input-value");
  var inputMasked = document.getElementById("input-masked");
  var inputMask = document.getElementById("input-mask");
  var inputNow = document.getElementById("input-now");
  var inputPassword = document.getElementById("input-password");
  var passwordWrapper = document.getElementById("input-password-wrapper");
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

      hasher.init();
      hasher.update();
      hasher.inputField().focus();
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
