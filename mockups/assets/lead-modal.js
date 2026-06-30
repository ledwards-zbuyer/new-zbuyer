/* zBuyer lead-capture modal — opens after the hero address step.
 *
 * Step 2 (contact): name / phone / email + required "Selling Timeframe"
 *   custom dropdown + TCPA consent.
 * Step 3 (report): value explanation + graphic, then a mobile number to
 *   text the report link.
 * The final button navigates to the demo report page. Vanilla JS, no deps.
 */
(function () {
  var modal = document.getElementById("leadModal");
  var heroForm = document.querySelector(".hero .search");
  var addr = document.getElementById("addr");
  if (!modal || !heroForm || !addr) return;

  var REPORT_PAGE = "report-classic-blue.html"; // demo report (dashboard screenshot)

  var card = modal.querySelector(".lm-card");
  var screens = modal.querySelectorAll(".lm-screen");
  var form = document.getElementById("leadForm");
  var errEl = document.getElementById("leadErr");
  var nameEl = form.querySelector('[name="name"]');
  var phoneEl = document.getElementById("leadPhone");
  var emailEl = form.querySelector('[name="email"]');
  var mobileEl = document.getElementById("leadMobile");
  var mobileErr = document.getElementById("mobileErr");

  // Custom dropdown (native <select> can't pad its open option list).
  var tfWrap = document.getElementById("tfWrap");
  var tfButton = document.getElementById("tfButton");
  var tfMenu = document.getElementById("tfMenu");
  var tfValueEl = document.getElementById("tfValue");
  var tfValue = "";

  var lastFocus = null;

  function show(name) {
    screens.forEach(function (s) { s.hidden = s.getAttribute("data-screen") !== name; });
  }
  function open() {
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    show("contact");
    // Focus the dialog (not an input) so the mobile keyboard doesn't pop up.
    if (card) card.focus();
  }
  function close() {
    modal.hidden = true;
    document.body.style.overflow = "";
    closeMenu();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  // ---- progressive phone formatting: (123) 456-7890 ----
  function formatPhone(v) {
    var d = v.replace(/\D/g, "").slice(0, 10);
    var a = d.slice(0, 3), b = d.slice(3, 6), c = d.slice(6, 10);
    if (d.length > 6) return "(" + a + ") " + b + "-" + c;
    if (d.length > 3) return "(" + a + ") " + b;
    if (d.length > 0) return "(" + a;
    return "";
  }
  [phoneEl, mobileEl].forEach(function (el) {
    el.addEventListener("input", function () {
      el.value = formatPhone(el.value);
      el.classList.remove("invalid");
      errEl.hidden = true;
      if (mobileErr) mobileErr.hidden = true;
    });
  });
  [nameEl, emailEl].forEach(function (el) {
    el.addEventListener("input", function () { el.classList.remove("invalid"); errEl.hidden = true; });
  });

  // ---- custom dropdown ----
  function openMenu() { tfMenu.hidden = false; tfWrap.classList.add("open"); tfButton.setAttribute("aria-expanded", "true"); }
  function closeMenu() { tfMenu.hidden = true; tfWrap.classList.remove("open"); tfButton.setAttribute("aria-expanded", "false"); }
  tfButton.addEventListener("click", function (e) {
    e.stopPropagation();
    if (tfMenu.hidden) openMenu(); else closeMenu();
  });
  tfMenu.querySelectorAll("li").forEach(function (li) {
    li.addEventListener("click", function () {
      tfValue = li.getAttribute("data-val");
      tfValueEl.textContent = li.textContent;
      tfValueEl.removeAttribute("data-placeholder");
      tfWrap.classList.remove("invalid");
      errEl.hidden = true;
      closeMenu();
    });
  });
  document.addEventListener("click", function (e) {
    if (!tfWrap.contains(e.target)) closeMenu();
  });

  // ---- open on hero submit (require an address first) ----
  heroForm.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!addr.value.trim()) { addr.focus(); return; }
    open();
  });

  // ---- close / back ----
  modal.querySelectorAll("[data-close]").forEach(function (el) { el.addEventListener("click", close); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.hidden) { if (!tfMenu.hidden) closeMenu(); else close(); }
  });
  var backBtn = modal.querySelector("[data-back]");
  if (backBtn) backBtn.addEventListener("click", function () { show("contact"); });

  // ---- contact step -> advance to report step ----
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = nameEl.value.trim();
    var digits = phoneEl.value.replace(/\D/g, "");
    var email = emailEl.value.trim();

    [nameEl, phoneEl, emailEl, tfWrap].forEach(function (el) { el.classList.remove("invalid"); });

    var err = "", bad = null;
    if (!name) { err = "Please enter your name."; bad = nameEl; }
    else if (digits.length < 10) { err = "Please enter a valid phone number."; bad = phoneEl; }
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err = "Please enter a valid email address."; bad = emailEl; }
    else if (!tfValue) { err = "Please choose your selling timeframe."; bad = tfWrap; }

    if (err) {
      bad.classList.add("invalid");
      errEl.textContent = err; errEl.hidden = false;
      // Only move focus to the dropdown button (no keyboard); leave text
      // inputs unfocused so the mobile keyboard doesn't cover the screen.
      if (bad === tfWrap) tfButton.focus();
      return;
    }
    errEl.hidden = true;

    mobileEl.value = formatPhone(phoneEl.value); // carry phone into the SMS step
    show("report");
    if (card) card.focus();
  });

  // ---- report step ----
  function goToReport() { window.location.href = REPORT_PAGE; }

  document.getElementById("viewReport").addEventListener("click", function () {
    var d = mobileEl.value.replace(/\D/g, "");
    if (d.length < 10) {
      mobileEl.classList.add("invalid");
      mobileErr.textContent = "Please enter a valid mobile number.";
      mobileErr.hidden = false;
      return;
    }
    mobileErr.hidden = true;
    goToReport();
  });
  document.getElementById("noThanks").addEventListener("click", goToReport);
})();
