/* zbEstimateTray — "which estimates have arrived" bottom tray. One file, no
 * dependencies, styles self-inject. Share this file as-is.
 *
 * WHAT IT IS
 *   A slim footer that slides up over the report when it loads, showing one
 *   animated checkbox per estimate source (default: AI estimate, AVM
 *   estimate, Cash offer estimate) laid out horizontally. While a source is
 *   still processing, its UNCHECKED box carries the waiting animation — a
 *   subtle bright segment chasing around the box's border. When the value
 *   arrives the chase stops, the box fills blue, and the checkmark draws
 *   itself in. After all boxes are checked the tray holds briefly, then
 *   MINIMIZES to a small corner pill ("Estimates 3/3") — the chevron at the
 *   tray's right edge minimizes it manually at any time, and clicking the
 *   pill opens it back up.
 *
 * USAGE
 *   <script src="estimate-tray.js"></script>
 *   <script>
 *     var tray = zbEstimateTray({
 *       items: [                          // optional; these are the defaults
 *         { id: "ai",   label: "AI estimate" },
 *         { id: "avm",  label: "AVM estimate" },
 *         { id: "cash", label: "Cash offer estimate" }
 *       ],
 *       demo: { seconds: 8 },             // OPTIONAL stand-in for the real
 *                                         // calls: staggers the arrivals
 *                                         // evenly across N seconds
 *       dismissSeconds: 1.6,              // hold after ALL arrive, then
 *                                         // auto-minimize to the pill
 *                                         // (0 = stay up until minimized)
 *       onArrive:   function (id) {},     // fires per estimate
 *       onComplete: function () {}        // fires when all have arrived
 *     });
 *     // real wiring (omit `demo`): call this from each API response —
 *     tray.arrive("avm");
 *     // also: tray.minimize()  tray.open()  tray.destroy()  tray.element
 *   </script>
 *
 * THEMING (CSS custom properties on <body> or any ancestor)
 *   --zet-check (box + check, default #1D4FD7)   --zet-line (borders #E4EAF3)
 *   --zet-ink (done label #14233D)               --zet-muted (waiting label #5C6B82)
 *
 * Reduced motion: no chase, no slide, checks appear instantly.
 */
(function (global) {
  "use strict";

  var uid = 0;

  var CSS =
    ".zet-tray{position:fixed;left:0;right:0;bottom:0;z-index:400;background:#fff;border-top:1px solid var(--zet-line,#E4EAF3);box-shadow:0 -16px 44px -20px rgba(14,27,51,.4);transform:translateY(110%);transition:transform .45s cubic-bezier(.2,.7,.3,1)}" +
    ".zet-tray.zet-in{transform:none}" +
    ".zet-row{max-width:760px;margin:0 auto;display:flex;justify-content:center;gap:10px;padding:15px 16px;flex-wrap:wrap}" +
    ".zet-item{display:flex;align-items:center;gap:9px;flex:1 1 0;min-width:150px;justify-content:center}" +
    ".zet-box{position:relative;width:22px;height:22px;flex:none}" +
    ".zet-box svg{display:block;overflow:visible}" +
    /* waiting: faint full border + one bright segment chasing the perimeter */
    ".zet-run{animation:zetChase 1.4s linear infinite}" +
    "@keyframes zetChase{to{stroke-dashoffset:-72}}" +
    ".zet-lbl{font-size:13px;font-weight:600;color:var(--zet-muted,#5C6B82);letter-spacing:-.01em;white-space:nowrap;transition:color .25s}" +
    ".zet-item.zet-done .zet-lbl{color:var(--zet-ink,#14233D);font-weight:700}" +
    /* arrival: box pops, fill fades in, check draws itself */
    ".zet-item.zet-done .zet-box{animation:zetPop .32s ease}" +
    "@keyframes zetPop{45%{transform:scale(1.18)}}" +
    ".zet-fill{opacity:0;transition:opacity .22s}" +
    ".zet-item.zet-done .zet-fill{opacity:1}" +
    ".zet-tick{stroke-dasharray:16;stroke-dashoffset:16}" +
    ".zet-item.zet-done .zet-tick{transition:stroke-dashoffset .3s ease .12s;stroke-dashoffset:0}" +
    /* minimize chevron + the restored-from pill */
    ".zet-min{position:absolute;top:50%;right:12px;transform:translateY(-50%);width:30px;height:30px;border:none;background:none;border-radius:50%;cursor:pointer;color:#98A6BC;display:flex;align-items:center;justify-content:center;padding:0}" +
    ".zet-min:hover{background:var(--zet-line,#E4EAF3);color:var(--zet-ink,#14233D)}" +
    ".zet-pill{position:fixed;right:14px;bottom:12px;z-index:400;display:flex;align-items:center;gap:7px;background:#fff;border:1px solid var(--zet-line,#E4EAF3);border-radius:999px;padding:8px 14px;font-family:inherit;font-size:12.5px;font-weight:600;line-height:1;color:var(--zet-ink,#14233D);box-shadow:0 10px 26px -12px rgba(14,27,51,.4);cursor:pointer;transform:translateY(200%);transition:transform .3s ease}" +
    ".zet-pill.zet-in{transform:none}" +
    ".zet-pill b{color:var(--zet-check,#1D4FD7)}" +
    "@media (prefers-reduced-motion:reduce){" +
    ".zet-tray{transition:none}.zet-run{animation:none}" +
    ".zet-item.zet-done .zet-box{animation:none}" +
    ".zet-fill{transition:none}.zet-item.zet-done .zet-tick{transition:none}" +
    ".zet-pill{transition:none}}";

  function injectCSS() {
    if (document.getElementById("zet-style")) return;
    var s = document.createElement("style");
    s.id = "zet-style";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  var NS = "http://www.w3.org/2000/svg";
  function svgEl(n, attrs, parent) {
    var e = document.createElementNS(NS, n);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e);
    return e;
  }

  function zbEstimateTray(opts) {
    opts = opts || {};
    var items = (opts.items && opts.items.length ? opts.items : [
      { id: "ai", label: "AI estimate" },
      { id: "avm", label: "AVM estimate" },
      { id: "cash", label: "Cash offer estimate" }
    ]).map(function (it) { return { id: String(it.id), label: it.label || String(it.id) }; });
    var dismissSeconds = opts.dismissSeconds === undefined ? 1.6 : +opts.dismissSeconds;
    var id = ++uid;

    injectCSS();
    var cs = getComputedStyle(document.body);
    var CHECK = (cs.getPropertyValue("--zet-check") || "").trim() || "#1D4FD7";
    var LINE = (cs.getPropertyValue("--zet-line") || "").trim() || "#E4EAF3";

    var tray = document.createElement("div");
    tray.className = "zet-tray";
    tray.setAttribute("role", "status");
    tray.setAttribute("aria-live", "polite");
    var row = document.createElement("div");
    row.className = "zet-row";
    tray.appendChild(row);

    var state = {};
    items.forEach(function (it, i) {
      var el = document.createElement("div");
      el.className = "zet-item";
      var box = document.createElement("span");
      box.className = "zet-box";
      // the unchecked box IS the spinner: faint rounded-rect border with a
      // bright segment chasing its ~72px perimeter (r=5 rounded 18x18 @2,2)
      var svg = svgEl("svg", { viewBox: "0 0 22 22", width: 22, height: 22 }, box);
      svgEl("rect", { x: 2, y: 2, width: 18, height: 18, rx: 5, fill: "none", stroke: LINE, "stroke-width": 2.4 }, svg);
      var run = svgEl("rect", { x: 2, y: 2, width: 18, height: 18, rx: 5, fill: "none", stroke: CHECK, "stroke-width": 2.4, "stroke-dasharray": "16 56", "stroke-linecap": "round", "class": "zet-run" }, svg);
      var fill = svgEl("rect", { x: 2, y: 2, width: 18, height: 18, rx: 5, fill: CHECK, stroke: CHECK, "stroke-width": 2.4, "class": "zet-fill" }, svg);
      var tick = svgEl("path", { d: "M6.5 11.6l3.1 3.1 5.9-6.4", fill: "none", stroke: "#fff", "stroke-width": 2.6, "stroke-linecap": "round", "stroke-linejoin": "round", "class": "zet-tick" }, svg);
      var lbl = document.createElement("span");
      lbl.className = "zet-lbl";
      lbl.textContent = it.label;
      el.appendChild(box);
      el.appendChild(lbl);
      row.appendChild(el);
      state[it.id] = { el: el, run: run, done: false };
    });

    // minimize chevron (right edge) + the corner pill it collapses into
    var minBtn = document.createElement("button");
    minBtn.type = "button";
    minBtn.className = "zet-min";
    minBtn.setAttribute("aria-label", "Minimize");
    minBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 9.5l7 6 7-6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    tray.appendChild(minBtn);
    var pill = document.createElement("button");
    pill.type = "button";
    pill.className = "zet-pill";
    pill.setAttribute("aria-label", "Show estimate status");
    var pillCount = null;
    function paintPill() {
      var done = items.filter(function (it) { return state[it.id].done; }).length;
      pill.innerHTML = "Estimates <b>" + done + "/" + items.length + "</b> " +
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 14.5l7-6 7 6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
    paintPill();

    document.body.appendChild(tray);
    document.body.appendChild(pill);
    // slide up on the next frame so the transition runs
    requestAnimationFrame(function () { requestAnimationFrame(function () { tray.classList.add("zet-in"); }); });

    function minimize() {
      tray.classList.remove("zet-in");
      paintPill();
      pill.classList.add("zet-in");
    }
    function open() {
      pill.classList.remove("zet-in");
      tray.classList.add("zet-in");
    }
    minBtn.addEventListener("click", minimize);
    pill.addEventListener("click", open);

    var timers = [];
    function arrive(itemId) {
      var s = state[itemId];
      if (!s || s.done) return;
      s.done = true;
      s.run.remove(); // chase stops; fill + tick take over via .zet-done
      s.el.classList.add("zet-done");
      if (pill.classList.contains("zet-in")) paintPill(); // live count while minimized
      if (typeof opts.onArrive === "function") opts.onArrive(itemId);
      var allDone = items.every(function (it) { return state[it.id].done; });
      if (allDone) {
        if (typeof opts.onComplete === "function") opts.onComplete();
        if (dismissSeconds > 0) timers.push(setTimeout(function () {
          if (tray.classList.contains("zet-in")) minimize(); // auto-minimize, stays recoverable
        }, dismissSeconds * 1000));
      }
    }
    function destroy() {
      timers.forEach(clearTimeout);
      if (tray.parentNode) tray.parentNode.removeChild(tray);
      if (pill.parentNode) pill.parentNode.removeChild(pill);
    }

    // demo mode: stand-in for the real API responses — arrivals staggered
    // evenly across `seconds` (default 8), in the order given
    if (opts.demo) {
      var total = (+opts.demo.seconds || 8) * 1000;
      items.forEach(function (it, i) {
        timers.push(setTimeout(function () { arrive(it.id); }, Math.round(total * (i + 1) / items.length)));
      });
    }

    return { element: tray, arrive: arrive, minimize: minimize, open: open, destroy: destroy };
  }

  global.zbEstimateTray = zbEstimateTray;
})(window);
