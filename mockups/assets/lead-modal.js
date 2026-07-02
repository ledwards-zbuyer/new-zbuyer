/* zBuyer lead-capture modal — opens after the hero address step.
 *
 * Step 2 (contact): name / phone / email + required "Open to selling?"
 *   intent chips (Now / Soon / Eventually) + TCPA consent.
 * Step 3 (allset): confirmation — a local expert will be in touch. No ask.
 * Step 4 (sms): optional — text the report link to their mobile.
 * The final buttons navigate to the demo report page. Vanilla JS, no deps.
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

  // "Open to selling?" intent chips — one-word continuum, one tap to answer.
  var chipsWrap = document.getElementById("intentChips");
  var chips = chipsWrap.querySelectorAll(".lm-chip");
  var intentValue = "";

  var lastFocus = null;

  function show(name) {
    screens.forEach(function (s) { s.hidden = s.getAttribute("data-screen") !== name; });
    // Bottom-sheet the short final steps on mobile (CSS applies ≤560px).
    modal.classList.toggle("lm-sheet", name !== "contact");
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

  // ---- matched pros: collapse the buyer list to one line ----
  // A lead can be sold to up to 6 pros; listing all of them (name +
  // brokerage) costs ~6 lines and pushes the form below the fold.
  // Collapsed: first name + "+N more" toggle. Expanded: the full list.
  var prosEl = document.getElementById("lmPros");
  if (prosEl) {
    var pros = (prosEl.getAttribute("data-pros") || "").split(";")
      .map(function (s) { return s.trim(); }).filter(Boolean);
    var prosLabel = "Matched real estate pro" + (pros.length > 1 ? "s" : "") + ":";
    function renderPros(expanded) {
      prosEl.innerHTML = "";
      var b = document.createElement("b");
      b.textContent = prosLabel;
      prosEl.appendChild(b);
      var text = expanded || pros.length === 1
        ? " " + pros.join("; ") + " "
        : " " + pros[0].replace(/\s*\([^)]*\)$/, "") + " "; // name only
      prosEl.appendChild(document.createTextNode(text));
      if (pros.length > 1) {
        var t = document.createElement("button");
        t.type = "button";
        t.className = "lm-morelink";
        t.textContent = expanded ? "show less" : "+" + (pros.length - 1) + " more";
        t.addEventListener("click", function () { renderPros(!expanded); });
        prosEl.appendChild(t);
      }
    }
    if (pros.length) renderPros(false);
  }

  // ---- intent chips ----
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      intentValue = chip.getAttribute("data-val");
      chips.forEach(function (c) {
        c.classList.toggle("sel", c === chip);
        c.setAttribute("aria-checked", c === chip ? "true" : "false");
      });
      chipsWrap.classList.remove("invalid");
      errEl.hidden = true;
    });
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
    if (e.key === "Escape" && !modal.hidden) close();
  });
  var backBtn = modal.querySelector("[data-back]");
  if (backBtn) backBtn.addEventListener("click", function () { show("contact"); });

  // ---- contact step -> advance to report step ----
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = nameEl.value.trim();
    var digits = phoneEl.value.replace(/\D/g, "");
    var email = emailEl.value.trim();

    [nameEl, phoneEl, emailEl, chipsWrap].forEach(function (el) { el.classList.remove("invalid"); });

    var err = "", bad = null;
    if (!name) { err = "Please enter your name."; bad = nameEl; }
    else if (digits.length < 10) { err = "Please enter a valid phone number."; bad = phoneEl; }
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err = "Please enter a valid email address."; bad = emailEl; }
    else if (!intentValue) { err = "Please tell us if you’re open to selling."; bad = chipsWrap; }

    if (err) {
      bad.classList.add("invalid");
      errEl.textContent = err; errEl.hidden = false;
      return;
    }
    errEl.hidden = true;

    mobileEl.value = formatPhone(phoneEl.value); // carry phone into the SMS step
    show("allset");
    if (card) card.focus();
  });

  // ---- all-set step -> SMS step ----
  function toSmsStep() { show("sms"); if (card) card.focus(); }
  document.getElementById("toSms").addEventListener("click", toSmsStep);
  // "Do not contact me": for now it continues to the SMS step like the CTA.
  document.getElementById("noContact").addEventListener("click", toSmsStep);

  // ---- SMS step ----
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
