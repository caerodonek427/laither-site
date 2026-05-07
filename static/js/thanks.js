(function(){
  var type = new URLSearchParams(location.search).get("type") || "inquiry";
  document.querySelectorAll("[data-thanks]").forEach(function(el){
    el.hidden = (el.getAttribute("data-thanks") !== type);
  });
})();
