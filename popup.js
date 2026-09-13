document.addEventListener("DOMContentLoaded", function () {

  var inputValue = document.getElementById("input-value");
  var inputPassword = document.getElementById("input-password");
  var passwordWrapper = document.getElementById("input-password-wrapper");
  var tabItems = document.querySelectorAll("#tabs li");

  /*
   * Events registration
   */
  inputValue.addEventListener("input", function () {
    hasher.update();
  });
  inputPassword.addEventListener("input", function () {
    hasher.update();
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

      hasher.init();
      hasher.update();
      inputValue.focus();
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
