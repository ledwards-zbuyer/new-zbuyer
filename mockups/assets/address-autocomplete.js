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
      close();
      input.blur(); // dismiss the mobile keyboard once an address is chosen
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
})();
