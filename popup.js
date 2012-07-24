$(document).ready(function() {
  /*
   * Events registration
  */
  $("#input").keyup(function () {
    hasher.update();
  });
  $("#input").change(function () {
    hasher.update();
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
  
  // Hash navigation
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