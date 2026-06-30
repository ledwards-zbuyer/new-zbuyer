/* zBuyer mobile nav — toggle the hamburger dropdown menu. */
(function () {
  var burger = document.getElementById("hamburger");
  var menu = document.getElementById("mnav");
  if (!burger || !menu) return;

  function close() {
    menu.hidden = true;
    burger.textContent = "☰"; // ☰
    burger.setAttribute("aria-expanded", "false");
  }
  function open() {
    menu.hidden = false;
    burger.textContent = "✕"; // ✕
    burger.setAttribute("aria-expanded", "true");
  }
  function toggle(e) {
    e.stopPropagation();
    if (menu.hidden) open(); else close();
  }

  burger.addEventListener("click", toggle);
  burger.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(e); }
  });
  document.addEventListener("click", function (e) {
    if (!menu.hidden && !menu.contains(e.target) && e.target !== burger) close();
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  menu.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", close); });
})();
