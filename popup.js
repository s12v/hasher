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
  
  /*
   * Animations
   */
  $(".buttons-2").mouseenter(function(){
    $(this).animate({opacity: 0.8}, 150);
  });
  $(".buttons-2").mouseleave(function(){
    $(this).animate({opacity: 0.4}, 300);
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
  
//  $("#input-value").focus();
});