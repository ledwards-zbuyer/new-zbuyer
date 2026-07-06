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

  var REPORT_PAGE = "report-classic-blue.html"; // demo Cash Value Report page

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

  // Direct-response landing pages set <body data-dr>: the backdrop there has
  // no data-close (click-off can't dismiss), and the X / Escape only work on
  // the contact step — the one carrying the consent terms.
  var DR = document.body.hasAttribute("data-dr");
  var xBtn = modal.querySelector(".lm-x");
  var current = "";

  // ---- Pulse lead API (only on wired pages — pulse-api.js precedes us
  // there; the homepage/compare tools don't load it and stay inert) ----
  var P = window.PulseAPI || null;
  var optInData = null; // cached GetContactOptInNames response
  function psave(fld, val) { if (P && val) P.save(fld, val); }
  // API examples show dashed phones (417-555-1212).
  function dashPhone(v) {
    var d = v.replace(/\D/g, "").slice(0, 10);
    return d.length === 10 ? d.slice(0, 3) + "-" + d.slice(3, 6) + "-" + d.slice(6) : "";
  }

  function show(name) {
    current = name;
    screens.forEach(function (s) { s.hidden = s.getAttribute("data-screen") !== name; });
    if (DR && xBtn) xBtn.hidden = name !== "contact";
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

  // ---- terms variant (?terms=maxsold; default exclusive) ----
  // compare-terms.html links here with either variant so the disclosure
  // can be previewed under each sale model. Markup carries the Exclusive
  // default (single pro); maxsold swaps in the 6-buyer worst case +
  // plural consent language. Placeholder copy pending final legal language.
  if (/[?&]terms=maxsold\b/.test(window.location.search)) {
    var matchedEl = modal.querySelector(".lm-matched");
    if (matchedEl) matchedEl.innerHTML = "<b>Matched real estate pros:</b> Betty Alexander (Sotheby's Realty); Mariam Chesterfield (Berkshire Hathaway); Denall Johnson (Fave Realty); Bradley Thompson (eXp Realty); Ester Grant (Luxury King Realty); John Taylor Tent (Next Level Acquisitions LLC)";
    var consentEl = modal.querySelector(".lm-consent");
    if (consentEl) consentEl.innerHTML = consentEl.innerHTML
      .replace("your matched real-estate professional", "its real-estate partners");
  }

  // ---- z-param contact prefill (email/SMS landing links) ----
  // e.g. ?zfname=Alex&zlastname=Smith&zphone=6238805511&zemail=alex@gmail.com
  var qp = new URLSearchParams(window.location.search);
  if (qp.get("zfname") || qp.get("zlastname")) {
    nameEl.value = ((qp.get("zfname") || "") + " " + (qp.get("zlastname") || "")).trim();
  }
  if (qp.get("zphone")) phoneEl.value = formatPhone(qp.get("zphone"));
  if (qp.get("zemail")) emailEl.value = qp.get("zemail");

  // ---- Pulse partial-lead capture (docs: send on blur, not per keystroke) ----
  if (P) {
    nameEl.addEventListener("blur", function () { psave(P.F.fullName, nameEl.value.trim()); });
    phoneEl.addEventListener("blur", function () { psave(P.F.phone, dashPhone(phoneEl.value)); });
    emailEl.addEventListener("blur", function () { psave(P.F.email, emailEl.value.trim()); });
    mobileEl.addEventListener("blur", function () { psave(P.F.mobilePhone, dashPhone(mobileEl.value)); });

    // Live matched pros from GetContactOptInNames (cached once per session —
    // the API returns different sets per call). Falls back silently to the
    // hard-coded disclosure names if the call fails.
    P.getOptInContacts().then(function (d) {
      if (!d || !d.contactOptInNames || !d.contactOptInNames.length) return;
      optInData = d;
      var box = modal.querySelector(".lm-matched");
      if (!box) return;
      var label = d.contactOptInNames.length > 1 ? "Matched real estate pros:" : "Matched real estate pro:";
      box.innerHTML = "";
      var b = document.createElement("b");
      b.textContent = label;
      box.appendChild(b);
      if (d.renderAsCheckboxes) {
        d.contactOptInNames.forEach(function (c) {
          var row = document.createElement("label");
          row.className = "lm-optin";
          var cb = document.createElement("input");
          cb.type = "checkbox";
          cb.value = c.contactID;
          cb.checked = !!c.preSelected;
          row.appendChild(cb);
          row.appendChild(document.createTextNode(
            c.displayName + (c.displayCompany ? " (" + c.displayCompany + ")" : "")));
          box.appendChild(row);
        });
      } else {
        box.appendChild(document.createTextNode(" " + d.contactOptInNames.map(function (c) {
          return c.displayName + (c.displayCompany ? " (" + c.displayCompany + ")" : "");
        }).join("; ")));
      }
    });
  }

  // ---- intent chips ----
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      intentValue = chip.getAttribute("data-val");
      if (P) psave(P.F.openToSelling, intentValue);
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
    // Structured Smarty picks save their components from address-autocomplete;
    // a raw typed address still reaches the partial lead as one line.
    if (P && !window.zbSelectedAddress) psave(P.F.address, addr.value.trim());
    open();
  });

  // ---- close / back ----
  modal.querySelectorAll("[data-close]").forEach(function (el) { el.addEventListener("click", close); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.hidden && (!DR || current === "contact")) close();
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

    // Ensure every contact field reaches the partial lead even if a blur
    // never fired (autofill, z-param prefill), plus the contact opt-ins.
    if (P) {
      psave(P.F.fullName, name);
      psave(P.F.phone, dashPhone(phoneEl.value));
      psave(P.F.email, email);
      psave(P.F.openToSelling, intentValue);
      if (optInData) {
        if (optInData.renderAsCheckboxes) {
          modal.querySelectorAll(".lm-optin input:checked").forEach(function (cb) {
            psave(P.F.optInContact, cb.value);
          });
        } else {
          // Static disclosure list: every named contact is part of the deal.
          optInData.contactOptInNames.forEach(function (c) {
            psave(P.F.optInContact, c.contactID);
          });
        }
      }
    }

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
  // FinalizeLead posts every collected field and returns pixel-tracking HTML
  // that the report page injects (stashed in sessionStorage across the
  // navigation). Never block the user on a slow/failed finalize: navigate
  // after 2.5s regardless.
  function goToReport() {
    if (!P) { window.location.href = REPORT_PAGE; return; }
    var done = false;
    function nav() { if (!done) { done = true; window.location.href = REPORT_PAGE; } }
    P.finalize().then(nav, nav);
    setTimeout(nav, 2500);
  }

  document.getElementById("viewReport").addEventListener("click", function () {
    var d = mobileEl.value.replace(/\D/g, "");
    if (d.length < 10) {
      mobileEl.classList.add("invalid");
      mobileErr.textContent = "Please enter a valid mobile number.";
      mobileErr.hidden = false;
      return;
    }
    mobileErr.hidden = true;
    if (P) { psave(P.F.mobilePhone, dashPhone(mobileEl.value)); psave(P.F.smsOptIn, "yes"); }
    goToReport();
  });
  document.getElementById("noThanks").addEventListener("click", function () {
    if (P) psave(P.F.smsOptIn, "no");
    goToReport();
  });
})();
