/* zBuyer address autocomplete — Smarty US Autocomplete Pro (client-side).
 *
 * Attaches to the hero address input (#addr) and renders a suggestion
 * dropdown (#addr-suggestions). Requires window.SMARTY_EMBEDDED_KEY from
 * smarty-config.js. Vanilla JS, no dependencies.
 */
(function () {
  var ENDPOINT = "https://us-autocomplete-pro.api.smarty.com/lookup";
  var input = document.getElementById("addr");
  var list = document.getElementById("addr-suggestions");
  if (!input || !list) return;

  var items = [];      // current suggestion objects from Smarty
  var active = -1;     // index of keyboard-highlighted item
  var debounce;        // debounce timer handle
  var seq = 0;         // request sequence guard against out-of-order responses

  function keyMissing() {
    var k = window.SMARTY_EMBEDDED_KEY;
    return !k || k.indexOf("PASTE_") === 0;
  }

  // Build the `selected` value Smarty expects to expand a multi-unit address.
  function selectedString(s) {
    return s.street_line +
      (s.secondary ? " " + s.secondary : "") +
      " (" + s.entries + ") " + s.city + " " + s.state + " " + s.zipcode;
  }

  // Full one-line address used to fill the input on final selection.
  function fullAddress(s) {
    return s.street_line +
      (s.secondary ? " " + s.secondary : "") +
      ", " + s.city + ", " + s.state + " " + s.zipcode;
  }

  // Push the verified address into the Pulse lead API (no-op on pages that
  // don't load pulse-api.js — the homepage and compare tools stay inert).
  function pulseSaveAddress(s) {
    if (!window.PulseAPI) return;
    var F = window.PulseAPI.F;
    window.PulseAPI.save(F.address, s.street_line + (s.secondary ? " " + s.secondary : ""));
    window.PulseAPI.save(F.city, s.city);
    window.PulseAPI.save(F.state, s.state);
    window.PulseAPI.save(F.zip, s.zipcode);
  }

  function lookup(search, selected) {
    if (keyMissing()) {
      console.warn("[Smarty] No embedded key set in smarty-config.js — autocomplete disabled.");
      return;
    }
    var url = ENDPOINT +
      "?key=" + encodeURIComponent(window.SMARTY_EMBEDDED_KEY) +
      "&search=" + encodeURIComponent(search) +
      "&max_results=7";
    if (selected) url += "&selected=" + encodeURIComponent(selected);

    var mine = ++seq;
    fetch(url)
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (data) {
        if (mine !== seq) return; // a newer request superseded this one
        render(data.suggestions || []);
      })
      .catch(function (err) { console.warn("[Smarty] lookup failed:", err); });
  }

  function render(suggestions) {
    items = suggestions;
    active = -1;
    if (!suggestions.length) { close(); return; }

    list.innerHTML = "";
    suggestions.forEach(function (s, i) {
      var li = document.createElement("li");
      li.setAttribute("role", "option");
      var street = s.street_line + (s.secondary ? " " + s.secondary : "");
      if (s.entries > 1) street += " (" + s.entries + " more)";
      var tail = s.city + ", " + s.state + " " + s.zipcode;
      li.innerHTML = '<span class="ac-street"></span><span class="ac-sec"></span>';
      li.children[0].textContent = street;
      li.children[1].textContent = tail;
      li.addEventListener("mousedown", function (e) {
        e.preventDefault(); // keep focus in the input
        choose(i);
      });
      list.appendChild(li);
    });
    open();
  }

  function choose(i) {
    var s = items[i];
    if (!s) return;
    if (s.entries > 1) {
      // Expand the building into its individual units.
      lookup(input.value, selectedString(s));
    } else {
      input.value = fullAddress(s);
      window.zbSelectedAddress = s; // expose structured pick for the lead modal
      pulseSaveAddress(s);
      close();
      input.blur(); // dismiss the mobile keyboard once an address is chosen
      // Reverse the focus scroll so the CTA lands by the thumb. Runs twice:
      // once right away, once after the keyboard finishes closing (the
      // viewport resize changes innerHeight under us).
      setTimeout(scrollSearchToBottom, 120);
      setTimeout(scrollSearchToBottom, 450);
    }
  }

  function highlight(next) {
    var nodes = list.children;
    if (!nodes.length) return;
    active = (next + nodes.length) % nodes.length;
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].classList.toggle("active", i === active);
    }
  }

  function open() { list.hidden = false; input.setAttribute("aria-expanded", "true"); }
  function close() { list.hidden = true; active = -1; input.setAttribute("aria-expanded", "false"); }

  // On phones the keyboard leaves room for barely one suggestion below the
  // mid-hero search box. On focus, scroll the box to the top of the page so
  // the list gets the space instead. Runs twice: once right after the
  // browser's own scroll-into-view jump, once after the keyboard settles
  // (opening it resizes the viewport and can undo the first scroll).
  var searchBox = input.closest(".search") || input;
  // Instant jump: the page sets html{scroll-behavior:smooth}, which would
  // animate these scrolls and lose the race against the keyboard
  // opening/closing and resizing the viewport.
  function jump(y) {
    var root = document.documentElement;
    var prev = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, Math.max(0, y));
    root.style.scrollBehavior = prev;
  }
  function scrollSearchToTop() {
    if (!window.matchMedia("(max-width: 768px)").matches) return;
    jump(searchBox.getBoundingClientRect().top + window.pageYOffset - 10);
  }
  // Reverse of scrollSearchToTop: once an address is picked and the
  // keyboard dismissed, align the search box's bottom (the CTA button on
  // mobile) near the bottom of the viewport for an easy thumb tap.
  function scrollSearchToBottom() {
    if (!window.matchMedia("(max-width: 768px)").matches) return;
    var r = searchBox.getBoundingClientRect();
    jump(r.bottom + window.pageYOffset - window.innerHeight + 14);
  }
  input.addEventListener("focus", function () {
    setTimeout(scrollSearchToTop, 60);
    setTimeout(scrollSearchToTop, 350);
  });

  input.addEventListener("input", function () {
    window.zbSelectedAddress = null; // typing invalidates the last structured pick
    var q = input.value.trim();
    clearTimeout(debounce);
    if (q.length < 3) { close(); return; }
    debounce = setTimeout(function () { lookup(q); }, 150);
  });

  input.addEventListener("keydown", function (e) {
    if (list.hidden) return;
    if (e.key === "ArrowDown") { e.preventDefault(); highlight(active + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); highlight(active - 1); }
    else if (e.key === "Enter") {
      if (active >= 0) { e.preventDefault(); choose(active); }
    } else if (e.key === "Escape") { close(); }
  });

  document.addEventListener("click", function (e) {
    if (!list.contains(e.target) && e.target !== input) close();
  });

  // ---- z-param address prefill (email/SMS landing links) ----
  // zstreet/zcity/zstate/zzipcode arrive on paid-traffic links. Fill the box
  // with the composed address immediately, then run a silent Smarty lookup
  // (no dropdown) and upgrade to the top suggestion's canonical address so
  // the box holds the same verified value a manual pick would produce.
  var qp = new URLSearchParams(window.location.search);
  var zstreet = (qp.get("zstreet") || "").trim();
  if (zstreet) {
    var zcity = (qp.get("zcity") || "").trim();
    var zstate = (qp.get("zstate") || "").trim();
    var zzip = (qp.get("zzipcode") || "").trim();
    input.value = zstreet + (zcity ? ", " + zcity : "") + (zstate ? ", " + zstate : "") + (zzip ? " " + zzip : "");
    if (!keyMissing()) {
      // Search WITHOUT the zip: Smarty returns zero suggestions when the
      // search string carries a wrong zip (it filters, not corrects), which
      // left bad z-param zips uncorrected in the box. Street+city+state is
      // unambiguous and lets Smarty supply the canonical zip itself.
      var url = ENDPOINT +
        "?key=" + encodeURIComponent(window.SMARTY_EMBEDDED_KEY) +
        "&search=" + encodeURIComponent([zstreet, zcity, zstate].join(" ").replace(/\s+/g, " ").trim()) +
        "&max_results=1";
      fetch(url)
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .then(function (data) {
          var s = (data.suggestions || [])[0];
          if (s && !(s.entries > 1)) { // skip multi-unit umbrellas — keep the composed string
            input.value = fullAddress(s);
            window.zbSelectedAddress = s;
            pulseSaveAddress(s);
          }
        })
        .catch(function (err) { console.warn("[Smarty] prefill lookup failed:", err); });
    }
  }
})();
