/* zBuyer lead-capture modal — opens after the hero address step.
 *
 * Two screens: (1) soft selling-timeframe question (one-tap cards), then
 * (2) name / phone / email + TCPA consent. On submit, forwards the captured
 * lead to the Sell funnel. Vanilla JS, no dependencies.
 */
(function () {
  var modal = document.getElementById("leadModal");
  var heroForm = document.querySelector(".hero .search");
  var addr = document.getElementById("addr");
  if (!modal || !heroForm || !addr) return;

  // Sell funnel destination. NOTE: the lead fields below are appended with
  // best-guess parameter names — confirm the exact names the pulse funnel
  // expects (firstname/lastname/email/phone/zzipcode/...) before launch.
  var SELL_FUNNEL = "https://pulse.zbuyer.com/index.html?landing=selling&autostart=1";

  var screens = modal.querySelectorAll(".lm-screen");
  var form = document.getElementById("leadForm");
  var errEl = document.getElementById("leadErr");
  var nameEl = form.querySelector('[name="name"]');
  var phoneEl = form.querySelector('[name="phone"]');
  var emailEl = form.querySelector('[name="email"]');
  var timeframe = "";
  var lastFocus = null;

  function show(n) {
    screens.forEach(function (s) {
      s.hidden = s.getAttribute("data-screen") !== String(n);
    });
  }

  function open() {
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    show(1);
    var first = modal.querySelector(".lm-opt");
    if (first) first.focus();
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

  // Screen 1: pick a timeframe, then advance.
  modal.querySelectorAll(".lm-opt").forEach(function (opt) {
    opt.addEventListener("click", function () {
      timeframe = opt.getAttribute("data-tf");
      modal.querySelectorAll(".lm-opt").forEach(function (o) { o.classList.remove("sel"); });
      opt.classList.add("sel");
      show(2);
      if (nameEl) nameEl.focus();
    });
  });

  var back = modal.querySelector("[data-back]");
  if (back) back.addEventListener("click", function () { show(1); });

  modal.querySelectorAll("[data-close]").forEach(function (el) {
    el.addEventListener("click", close);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.hidden) close();
  });

  // Screen 2: validate + forward to the funnel.
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = nameEl.value.trim();
    var phone = phoneEl.value.trim();
    var email = emailEl.value.trim();
    var digits = phone.replace(/\D/g, "");

    var err = "";
    if (!name) err = "Please enter your name.";
    else if (digits.length < 10) err = "Please enter a valid phone number.";
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) err = "Please enter a valid email address.";
    if (err) { errEl.textContent = err; errEl.hidden = false; return; }
    errEl.hidden = true;

    var sel = window.zbSelectedAddress || null;
    var parts = name.split(/\s+/);
    var params = new URLSearchParams();
    params.set("firstname", parts.shift() || "");
    params.set("lastname", parts.join(" "));
    params.set("email", email);
    params.set("phone", digits);
    params.set("address", sel ? sel.street_line : addr.value.trim());
    if (sel) {
      params.set("city", sel.city);
      params.set("state", sel.state);
      params.set("zzipcode", sel.zipcode);
    }
    params.set("timeframe", timeframe);

    window.location.href = SELL_FUNNEL + "&" + params.toString();
  });
})();
