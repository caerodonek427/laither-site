(function () {
  document.addEventListener("click", function (e) {
    var trigger = e.target.closest("[data-qr-trigger]");
    if (trigger) {
      e.preventDefault();
      var id = trigger.getAttribute("data-qr-trigger");
      var dlg = document.getElementById(id);
      if (dlg && typeof dlg.showModal === "function") dlg.showModal();
      return;
    }
    var closer = e.target.closest("[data-qr-close]");
    if (closer) {
      var dlg = closer.closest("dialog");
      if (dlg) dlg.close();
    }
  });
})();
