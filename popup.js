$(document).ready(function() {

/*
 * I decided to leave popout button on the popout page
 *
  if (typeof chrome.extension != "undefined") {
    if (chrome.extension.getBackgroundPage().separatePopup == true) {
      $("#popup").hide();
    } else {
      $("#popup").show();
    }
  }
*/  
  
  /*
   * Events registration
  */
  $("#input").keyup(function () {
    hasher.update();
  });
  $("#input").change(function () {
    hasher.update();
  });

  // Open separate window (pop-out)
  $("#button-popout").click(function () {
    if (typeof chrome.extension != "undefined") {
      //chrome.extension.getBackgroundPage().separatePopup = true;
/*      
      chrome.windows.create({
        url: 'popup.html',
        type: 'popup',
        width: 700,
        height: 800
      });
*/      
      chrome.tabs.create({
        url: 'popup.html'
      });
    }
  });

  // Click on tab (Hash/HMAC/...)
  $("#tabs li").click(function () {
    // highlight active tab, remove highlight on everything else
    $("#tabs li").removeClass("on");
    $(this).addClass("on");

    // show/hide optional fields
    if (tabs[this.id] == tabs.hmac || tabs[this.id] == tabs.cipher) {
      $("#input-password-wrapper").show();
    } else {
      $("#input-password-wrapper").hide();
    }

    hasher.tab = tabs[this.id];
    hasher.init();
    hasher.update();
    $("#input-value").focus();
  });
  
  /*
   * Animations
   */
  $(".buttons-2").mouseenter(function(){
    $(this).animate(
      {
        opacity: 0.8
      },
      150
    );
  });
  $(".buttons-2").mouseleave(function(){
    $(this).animate(
      {
        opacity: 0.4
      },
      300
    );
  });
  
  
  /*
   * Hash navigation
   */
  onHashChange = function () {
    var hash = window.location.hash.slice(1)
    $(".screens").hide();
    if (hash == "info") {
      $("#screen-2").show().scrollTop();
    } else {
      $("#screen-1").show().scrollTop();
    }
  }
  $(window).bind('hashchange', onHashChange);  

  /*
   * Init
   */
  onHashChange();
  hasher.init();
  hasher.update();
  
  // Focus hack, see http://stackoverflow.com/a/11400653/1295557
  if (location.search != "?focusHack") location.search = "?focusHack";
  //$("#input-value").focus();
  window.scrollTo(0, 0);
});