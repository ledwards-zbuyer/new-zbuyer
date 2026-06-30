/* zBuyer lead-capture modal — opens after the hero address step.
 *
 * Single step: name / phone / email + a required "Selling Timeframe"
 * dropdown, plus TCPA consent. On submit, forwards the captured lead to
 * the Sell funnel. Vanilla JS, no dependencies.
 */
(function () {
  var modal = document.getElementById("leadModal");
  var heroForm = document.querySelector(".hero .search");
  var addr = document.getElementById("addr");
  if (!modal || !heroForm || !addr) return;

  // Sell funnel destination. NOTE: the lead fields below are appended with
  // z-prefixed parameter names (zfirstname/zlastname/zemail/zphone/zzipcode/
  // ...) — confirm these match what the pulse funnel expects before launch.
  var SELL_FUNNEL = "https://pulse.zbuyer.com/index.html?landing=selling&autostart=1";

  var form = document.getElementById("leadForm");
  var errEl = document.getElementById("leadErr");
  var nameEl = form.querySelector('[name="name"]');
  var phoneEl = form.querySelector('[name="phone"]');
  var emailEl = form.querySelector('[name="email"]');
  var tfEl = form.querySelector('[name="timeframe"]');
  var lastFocus = null;

  function open() {
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    if (nameEl) nameEl.focus();
  }

  function close() {
    modal.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  // Open on hero submit — require an address first.
  heroForm.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!addr.value.trim()) { addr.focus(); return; }
    open();
  });

  // Close handlers.
  modal.querySelectorAll("[data-close]").forEach(function (el) {
    el.addEventListener("click", close);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.hidden) close();
  });

  // Clear a field's invalid highlight as soon as the user fixes it.
  [nameEl, phoneEl, emailEl].forEach(function (el) {
    el.addEventListener("input", function () { el.classList.remove("invalid"); });
  });
  tfEl.addEventListener("change", function () { tfEl.classList.remove("invalid"); });

  // Validate + forward to the funnel.
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = nameEl.value.trim();
    var phone = phoneEl.value.trim();
    var email = emailEl.value.trim();
    var digits = phone.replace(/\D/g, "");

    [nameEl, phoneEl, emailEl, tfEl].forEach(function (el) { el.classList.remove("invalid"); });

    var err = "";
    var bad = null;
    if (!name) { err = "Please enter your name."; bad = nameEl; }
    else if (digits.length < 10) { err = "Please enter a valid phone number."; bad = phoneEl; }
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err = "Please enter a valid email address."; bad = emailEl; }
    else if (!tfEl.value) { err = "Please choose your selling timeframe."; bad = tfEl; }

    if (err) {
      bad.classList.add("invalid");
      errEl.textContent = err;
      errEl.hidden = false;
      bad.focus();
      return;
    }
    errEl.hidden = true;

    var sel = window.zbSelectedAddress || null;
    var parts = name.split(/\s+/);
    var params = new URLSearchParams();
    params.set("zfirstname", parts.shift() || "");
    params.set("zlastname", parts.join(" "));
    params.set("zemail", email);
    params.set("zphone", digits);
    params.set("zaddress", sel ? sel.street_line : addr.value.trim());
    if (sel) {
      params.set("zcity", sel.city);
      params.set("zstate", sel.state);
      params.set("zzipcode", sel.zipcode);
    }
    params.set("ztimeframe", tfEl.value);

    window.location.href = SELL_FUNNEL + "&" + params.toString();
  });
})();
