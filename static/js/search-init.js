window.addEventListener("DOMContentLoaded", function(){
  if (typeof PagefindUI === "function") {
    new PagefindUI({
      element: "#search",
      showSubResults: true,
      showImages: false,
    });
  }
});
