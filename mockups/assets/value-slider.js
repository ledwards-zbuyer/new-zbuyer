/* zbValueSlider — portable value-curve slider. No dependencies, no CSS file
 * (styles inject themselves once). Extracted from the zBuyer Cash Value
 * Report; safe to copy into any project as this single file.
 *
 * USAGE
 *   <div id="mySlider"></div>
 *   <script src="value-slider.js"></script>
 *   <script>
 *     var slider = zbValueSlider(document.getElementById("mySlider"), {
 *       anchors: [                        // 1-6 entries; sorted by value
 *         { value: 312000, label: "Quick cash close" },
 *         { value: 345000, label: "Cash+" },
 *         { value: 371000, label: "Top market value" }
 *       ],
 *       format:   function (v) { ... },   // optional; default $1,234,567
 *       headline: true,                   // big number/range above the track
 *       endLabels: true,                  // min/max labels under the track
 *       onSelect: function (anchor, index) { ... }, // fires on every snap
 *       colors: {                         // optional; all keys optional
 *         handle: "#FF6B4A",              //   the pill
 *         fillLo: "#7FC4FF",              //   gradient start of the filled chart
 *         fillHi: "#1D4FD7",              //   gradient end (rides the handle)
 *         track:  "#E4EAF3",              //   the unfilled chart
 *         dot:    "#8296B9"               //   anchor dots
 *       }                                 // (defaults shown — the classic-blue
 *                                         //  palette of the Cash Value Report)
 *       pending: {                        // OPTIONAL wait-for-offer state; needs
 *                                         // exactly ONE anchor. All keys optional:
 *         ticker: "Awaiting your cash offer — usually arrives in under a minute",
 *         label:  "your offer lands here",// tag on the landing dot
 *         demo:   { value: 412500, label: "Quick cash close", delay: 5000 },
 *                                         // stand-in for the API: auto-delivers
 *                                         // after delay ms (default 5000)
 *         onDeliver: function (slider) {} // fires after the arrival re-render
 *       }
 *     });
 *     slider.snapTo(1);                   // programmatic snap (0-based)
 *     slider.deliver({ value: 412500, label: "Quick cash close" });
 *                                         // the real arrival (call from the API
 *                                         // response) — animates, then re-renders
 *   </script>
 *
 * BEHAVIOR
 *   The track is an area chart of the anchor values: anchor x-positions and
 *   curve height are both proportional to value, normalized to the
 *   min-to-max span (auto-zoom) over an 8px value floor so the lowest
 *   anchor still reads as value. Rounded flat-tangent beziers between
 *   anchors. Blue gradient fills to the handle (deepest blue rides it),
 *   gray beyond. The handle drags freely, snaps to the nearest anchor on
 *   release, and only then does the headline swap from the full range to
 *   the snapped anchor's value, with the anchor's label in smaller, quieter
 *   type beneath it. The headline auto-shrinks so the number (or the full
 *   range) never wraps to a second line. Keyboard arrows step anchors.
 *   Every anchor gets a dot with a label tooltip.
 *
 *   ONE anchor = static display: full-height fully-filled chart, handle
 *   locked centered, no dots, no end labels, headline shows the value.
 *
 *   ONE anchor + pending = the wait-for-offer state: the fill dims under a
 *   scrim, a marching dashed preview of the future two-anchor curve is
 *   drawn with a pulsing dot where the offer will land, a quiet ticker
 *   crawls along the bottom-right (behind the inert handle), and the Z
 *   mark bobs over the landing spot. deliver(anchor) — or the pending.demo
 *   timer — runs the animated arrival: overlay lifts, the flat chart
 *   morphs into the exact two-anchor curve, headline crossfades to the
 *   range, and the widget re-renders as a live range slider with dots and
 *   end labels easing in. No flash: the morph target is pixel-identical
 *   to the re-render. Reduced-motion swaps instantly.
 *
 * THEMING (either works; script colors win over CSS vars, vars over defaults)
 *   script: the colors option above
 *   CSS custom properties on the container or any ancestor:
 *   --zvs-cta (handle)  --zvs-lo / --zvs-hi (fill gradient)
 *   --zvs-track (unfilled)  --zvs-dot  --zvs-ink  --zvs-muted
 */
(function (global) {
  "use strict";

  var CURVE_H = 57, H_MIN = 8, SLIDE_H = 96, BOTTOM = 8, PAD = 5; // px / % geometry
  var NS = "http://www.w3.org/2000/svg";
  var uid = 0;
  // the zBuyer Z mark, two triangles in a 200x200 box (monochrome use)
  var Z_W = "40,42 128,42 64,158 39,158 95,68 40,68";
  var Z_B = "160,158 72,158 136,42 161,42 105,132 160,132";
  var REDUCED = typeof global.matchMedia === "function" &&
    global.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function easeInOut(p) { return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }

  var CSS =
    ".zvs-headline{font-size:38px;font-weight:800;letter-spacing:-.03em;text-align:center;color:var(--zvs-ink,#14233D);margin:0 0 2px;white-space:nowrap}" +
    ".zvs-sub{min-height:19px;font-size:13.5px;font-weight:600;text-align:center;color:var(--zvs-muted,#5C6B82);margin:0 0 2px}" +
    ".zvs-slide{position:relative;height:" + SLIDE_H + "px;margin:14px 2px 2px;cursor:pointer;touch-action:none}" +
    ".zvs-slide.zvs-static{cursor:default}" +
    ".zvs-curve{position:absolute;left:0;right:0;bottom:" + BOTTOM + "px;width:100%;height:" + CURVE_H + "px;display:block}" +
    ".zvs-dot{position:absolute;width:10px;height:10px;border-radius:50%;background:var(--zvs-dot,#8296B9);border:2px solid #fff;box-shadow:0 1px 3px rgba(14,27,51,.3);transform:translate(-50%,-50%);pointer-events:none}" +
    ".zvs-handle{position:absolute;top:59%;width:26px;height:74px;border-radius:13px;background:var(--zvs-cta,#FF6B4A);border:3px solid #fff;box-shadow:0 4px 14px rgba(14,27,51,.45);transform:translate(-50%,-50%);cursor:grab;z-index:2}" +
    ".zvs-handle::before{content:\"\";position:absolute;left:50%;top:50%;width:8px;height:22px;transform:translate(-50%,-50%);border-left:2px solid rgba(255,255,255,.8);border-right:2px solid rgba(255,255,255,.8)}" +
    ".zvs-handle.zvs-snap{transition:left .18s ease}" +
    ".zvs-handle:focus-visible{outline:none;box-shadow:0 0 0 5px rgba(29,79,215,.28),0 3px 10px rgba(14,27,51,.4)}" +
    ".zvs-slide.zvs-static .zvs-handle{cursor:default}" +
    ".zvs-ends{display:flex;justify-content:space-between;gap:14px;margin-top:10px}" +
    ".zvs-end b{display:block;font-size:15px;font-weight:800;color:var(--zvs-ink,#14233D)}" +
    ".zvs-end span{display:block;font-size:12px;color:var(--zvs-muted,#5C6B82);margin-top:2px}" +
    ".zvs-end.zvs-right{text-align:right}" +
    /* pending-offer wait state + animated arrival */
    ".zvs-wait{position:absolute;left:0;right:0;bottom:" + BOTTOM + "px;width:100%;overflow:visible;pointer-events:none;z-index:1}" +
    ".zvs-march{animation:zvsMarch 1.1s linear infinite}" +
    ".zvs-gpulse{animation:zvsPulse 1.6s ease-in-out infinite}" +
    ".zvs-arrive .zvs-dot{animation:zvsIn .5s ease both}" +
    ".zvs-arrive .zvs-ends{overflow:hidden;animation:zvsEndsIn .45s ease both}" +
    "@keyframes zvsMarch{to{stroke-dashoffset:-11}}" +
    "@keyframes zvsPulse{0%,100%{opacity:.4}50%{opacity:.95}}" +
    "@keyframes zvsIn{from{opacity:0}}" +
    "@keyframes zvsEndsIn{from{max-height:0;opacity:0}to{max-height:56px;opacity:1}}" +
    "@media (prefers-reduced-motion:reduce){.zvs-march,.zvs-gpulse{animation:none}}";

  function injectCSS() {
    if (document.getElementById("zvs-style")) return;
    var s = document.createElement("style");
    s.id = "zvs-style";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function fmtDefault(v) { return "$" + Math.round(v).toLocaleString("en-US"); }

  function svgEl(n, attrs, parent) {
    var e = document.createElementNS(NS, n);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e);
    return e;
  }

  function zbValueSlider(container, opts) {
    opts = opts || {};
    var anchors = (opts.anchors || [])
      .slice(0, 6)
      .map(function (a) { return { value: +a.value, label: a.label || "" }; })
      .sort(function (a, b) { return a.value - b.value; });
    if (!anchors.length) throw new Error("zbValueSlider: supply 1-6 anchors");
    var fmt = opts.format || fmtDefault;
    // one anchor — or all anchors sharing one value — renders the static display
    var single = anchors.length === 1 || anchors[anchors.length - 1].value === anchors[0].value;
    var id = ++uid;

    injectCSS();

    // x-position per anchor: proportional to value within [PAD, 100-PAD]
    var vmin = anchors[0].value, vmax = anchors[anchors.length - 1].value;
    anchors.forEach(function (a) {
      a.p = single ? 50 : PAD + (a.value - vmin) / (vmax - vmin) * (100 - 2 * PAD);
    });
    // curve height per anchor: value floor + span-zoomed rise
    function ay(a) {
      var frac = single ? 1 : (a.value - vmin) / (vmax - vmin);
      return CURVE_H - (H_MIN + frac * (CURVE_H - H_MIN));
    }

    var headlineEl = null, subEl = null;
    if (opts.headline !== false) {
      headlineEl = document.createElement("p");
      headlineEl.className = "zvs-headline";
      container.appendChild(headlineEl);
      subEl = document.createElement("p");
      subEl.className = "zvs-sub"; // the snapped anchor's label, quiet, under the number
      container.appendChild(subEl);
    }
    // never let the number (or the full range) wrap: shrink to fit one line
    function setHeadline(t, label) {
      if (!headlineEl) return;
      headlineEl.textContent = t;
      headlineEl.style.fontSize = "38px";
      var w = headlineEl.clientWidth;
      if (w && headlineEl.scrollWidth > w)
        headlineEl.style.fontSize = Math.max(20, Math.floor(38 * w / headlineEl.scrollWidth)) + "px";
      subEl.textContent = label || "";
    }

    var slide = document.createElement("div");
    slide.className = "zvs-slide" + (single ? " zvs-static" : "");
    container.appendChild(slide);

    var svg = svgEl("svg", { "class": "zvs-curve", viewBox: "0 0 1000 " + CURVE_H, preserveAspectRatio: "none", "aria-hidden": "true" }, slide);
    var d;
    if (single) {
      // one value: the whole chart IS that value — full height, edge to edge
      d = "M0 " + CURVE_H + " L0 0 L1000 0 L1000 " + CURVE_H + " Z";
    } else {
      var pts = anchors.map(function (a) { return [a.p * 10, ay(a)]; });
      d = "M0 " + CURVE_H + " L0 " + pts[0][1] + " L" + pts[0][0] + " " + pts[0][1];
      for (var s = 0; s < pts.length - 1; s++) {
        var dx = (pts[s + 1][0] - pts[s][0]) / 2.2; // flat tangents: rounded, monotone
        d += " C" + (pts[s][0] + dx) + " " + pts[s][1] + " " + (pts[s + 1][0] - dx) + " " + pts[s + 1][1] + " " + pts[s + 1][0] + " " + pts[s + 1][1];
      }
      d += " L1000 " + pts[pts.length - 1][1] + " L1000 " + CURVE_H + " Z";
    }
    var defs = svgEl("defs", {}, svg);
    var grad = svgEl("linearGradient", { id: "zvsGrad" + id, x1: 0, y1: 0, x2: 500, y2: 0, gradientUnits: "userSpaceOnUse" }, defs);
    var lo = svgEl("stop", { offset: 0 }, grad);
    var hi = svgEl("stop", { offset: 1 }, grad);
    // color resolution: script colors option > CSS vars > zBuyer defaults
    var colors = opts.colors || {};
    var cs = getComputedStyle(container);
    function col(scriptColor, varName, fallback) {
      return scriptColor || (cs.getPropertyValue(varName) || "").trim() || fallback;
    }
    lo.setAttribute("stop-color", col(colors.fillLo, "--zvs-lo", "#7FC4FF"));
    hi.setAttribute("stop-color", col(colors.fillHi, "--zvs-hi", "#1D4FD7"));
    var clip = svgEl("clipPath", { id: "zvsClip" + id }, defs);
    var clipRect = svgEl("rect", { x: 0, y: 0, width: 500, height: CURVE_H }, clip);
    var trackPath = svgEl("path", { d: d, fill: col(colors.track, "--zvs-track", "#E4EAF3") }, svg);
    var fillPath = svgEl("path", { d: d, fill: "url(#zvsGrad" + id + ")", "clip-path": "url(#zvsClip" + id + ")" }, svg);

    // deepest blue always rides the clip edge (the handle)
    function paintCurve(p) {
      var w = Math.max(40, p * 10);
      clipRect.setAttribute("width", w);
      grad.setAttribute("x2", w);
    }

    if (!single) {
      anchors.forEach(function (a) {
        var dot = document.createElement("span");
        dot.className = "zvs-dot";
        dot.style.left = a.p + "%";
        dot.style.top = (SLIDE_H - BOTTOM - CURVE_H + ay(a)) + "px";
        if (colors.dot) dot.style.background = colors.dot;
        dot.title = (a.label ? a.label + " — " : "") + fmt(a.value);
        slide.appendChild(dot);
      });
    }

    var handle = document.createElement("span");
    handle.className = "zvs-handle";
    if (colors.handle) handle.style.background = colors.handle;
    handle.tabIndex = single ? -1 : 0;
    handle.setAttribute("role", "slider");
    handle.setAttribute("aria-label", opts.ariaLabel || "Explore the value range");
    slide.appendChild(handle);

    var idx = -1; // untouched: headline keeps the full range
    function snapTo(i) {
      if (single) return;
      idx = Math.max(0, Math.min(anchors.length - 1, i));
      var a = anchors[idx];
      handle.classList.add("zvs-snap");
      handle.style.left = a.p + "%";
      paintCurve(a.p);
      setHeadline(fmt(a.value), a.label);
      handle.setAttribute("aria-valuetext", fmt(a.value) + (a.label ? " — " + a.label : ""));
      if (typeof opts.onSelect === "function") opts.onSelect(a, idx);
    }

    if (single) {
      var only = anchors[0];
      handle.style.left = "50%";
      handle.setAttribute("aria-valuetext", fmt(only.value) + (only.label ? " — " + only.label : ""));
      setHeadline(fmt(only.value), only.label);
      paintCurve(100);
    } else {
      handle.style.left = "50%";
      handle.setAttribute("aria-valuetext", fmt(vmin) + " to " + fmt(vmax));
      setHeadline(fmt(vmin) + " – " + fmt(vmax));
      paintCurve(50);

      var dragging = false;
      function pctFromX(clientX) {
        var r = slide.getBoundingClientRect();
        return Math.max(PAD, Math.min(100 - PAD, ((clientX - r.left) / r.width) * 100));
      }
      slide.addEventListener("pointerdown", function (e) {
        dragging = true;
        handle.classList.remove("zvs-snap"); // free movement while dragging
        try { slide.setPointerCapture(e.pointerId); } catch (err) {}
        var p0 = pctFromX(e.clientX);
        handle.style.left = p0 + "%";
        paintCurve(p0);
        e.preventDefault();
      });
      slide.addEventListener("pointermove", function (e) {
        if (!dragging) return;
        var p = pctFromX(e.clientX);
        handle.style.left = p + "%";
        paintCurve(p);
      });
      function endDrag(e) {
        if (!dragging) return;
        dragging = false;
        var p = pctFromX(e.clientX), best = 0;
        anchors.forEach(function (a, i) {
          if (Math.abs(a.p - p) < Math.abs(anchors[best].p - p)) best = i;
        });
        snapTo(best);
      }
      slide.addEventListener("pointerup", endDrag);
      slide.addEventListener("pointercancel", endDrag);
      handle.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight" || e.key === "ArrowUp") { snapTo(idx < 0 ? 0 : idx + 1); e.preventDefault(); }
        else if (e.key === "ArrowLeft" || e.key === "ArrowDown") { snapTo(idx < 0 ? 0 : idx - 1); e.preventDefault(); }
      });
    }

    // end labels: min + max with their anchor labels (never for single)
    if (!single && opts.endLabels !== false) {
      var ends = document.createElement("div");
      ends.className = "zvs-ends";
      [anchors[0], anchors[anchors.length - 1]].forEach(function (a, i) {
        var end = document.createElement("div");
        end.className = "zvs-end" + (i ? " zvs-right" : "");
        var b = document.createElement("b");
        b.textContent = fmt(a.value);
        end.appendChild(b);
        if (a.label) {
          var sp = document.createElement("span");
          sp.textContent = a.label;
          end.appendChild(sp);
        }
        ends.appendChild(end);
      });
      container.appendChild(ends);
    }

    /* ---- pending-offer mode (opts.pending, single anchor only): the chart
       waits for a second anchor — dimmed fill, marching dashed preview of
       the future two-anchor curve, pulsing landing dot, ticker, and the Z
       mark bobbing over the spot. deliver(anchor) (or the built-in demo
       timer) runs an animated arrival: the overlay lifts, this same chart's
       path morphs into the exact two-anchor curve, then the widget
       re-renders as a real range slider — pixel-identical, no flash. ---- */
    var pend = null;
    if (single && anchors.length === 1 && opts.pending) pend = buildPending();
    function buildPending() {
      var conf = opts.pending === true ? {} : opts.pending;
      var EXT = 26, S = .22, yFloor = CURVE_H - H_MIN;
      var ov = svgEl("svg", { "class": "zvs-wait", "aria-hidden": "true" }, slide);
      ov.style.height = (CURVE_H + EXT) + "px";
      var W = ov.clientWidth || slide.clientWidth || 600;
      var xo = .05 * W, xm = .95 * W, dxW = (xm - xo) / 2.2;
      var yO = EXT + yFloor;
      var gScrim = svgEl("g", {}, ov); // pending scrim: this chart isn't final
      svgEl("rect", { x: 0, y: EXT, width: W, height: CURVE_H, fill: "#0E1B33", opacity: .3 }, gScrim);
      var gDash = svgEl("g", {}, ov);  // future-curve preview + landing dot
      svgEl("path", { d: "M0 " + yO + " L" + xo + " " + yO +
        " C" + (xo + dxW) + " " + yO + " " + (xm - dxW) + " " + EXT + " " + xm + " " + EXT +
        " L" + W + " " + EXT,
        fill: "none", stroke: "#FFFFFF", "stroke-width": 2, opacity: .6,
        "stroke-dasharray": "5 6", "class": "zvs-march" }, gDash);
      svgEl("circle", { cx: xo, cy: yO, r: 4.5, fill: "#FFFFFF", "class": "zvs-gpulse" }, gDash);
      var gTop = svgEl("g", {}, ov);   // annotations + ticker + the mark
      svgEl("line", { x1: xo, y1: EXT, x2: xo, y2: yO - 6, stroke: "#FFFFFF",
        "stroke-width": 1.5, "stroke-dasharray": "3 5", opacity: .5 }, gTop);
      var lbl = svgEl("text", { x: xo + 12, y: yO - 5, fill: "#FFFFFF", opacity: .85 }, gTop);
      lbl.style.font = "600 10.5px Inter,system-ui,sans-serif";
      lbl.textContent = conf.label || "your offer lands here";
      // ticker: gradient-masked band right of the (inert) handle
      var mx0 = W * .5 + 22, mx1 = W - 4;
      var mdefs = svgEl("defs", {}, ov);
      var mg = svgEl("linearGradient", { id: "zvsTk" + id, gradientUnits: "userSpaceOnUse",
        x1: mx0, y1: 0, x2: mx1, y2: 0 }, mdefs);
      [[0, "#000"], [.08, "#fff"], [.92, "#fff"], [1, "#000"]].forEach(function (s) {
        svgEl("stop", { offset: s[0], "stop-color": s[1] }, mg);
      });
      svgEl("rect", { x: mx0, y: EXT + 40, width: mx1 - mx0, height: 16, fill: "url(#zvsTk" + id + ")" },
        svgEl("mask", { id: "zvsTkm" + id }, mdefs));
      var mq = svgEl("g", { mask: "url(#zvsTkm" + id + ")" }, gTop);
      var mts = [0, 1].map(function () { // two copies = seamless loop
        var t = svgEl("text", { x: mx0 + 8, y: EXT + 51, fill: "#FFFFFF", opacity: .85 }, mq);
        t.style.font = "600 10.5px Inter,system-ui,sans-serif";
        t.textContent = conf.ticker || "Awaiting your cash offer — usually arrives in under a minute";
        return t;
      });
      var mper = mts[0].getComputedTextLength() + 70;
      var piece = svgEl("g", {}, gTop); // the mark, monochrome, over the landing spot
      svgEl("polygon", { points: Z_W, fill: "#3BA4F4" }, piece);
      svgEl("polygon", { points: Z_B, fill: "#3BA4F4" }, piece);
      var yB = (EXT - 2) - 158 * S, lastBob = 0;
      function place(bob) {
        lastBob = bob;
        piece.setAttribute("transform", "translate(" + (xo - 100 * S) + " " + (yB + bob) + ") scale(" + S + ")");
      }
      place(0);
      var raf = 0, t0 = performance.now(), delivered = false, timer = 0;
      if (!REDUCED) (function loop(now) {
        var t = (now - t0) / 1000;
        place(2.8 * Math.sin(t * 2.4));
        var off = (t * 30) % mper;
        mts[0].setAttribute("x", mx1 - off);
        mts[1].setAttribute("x", mx1 - off + mper);
        raf = requestAnimationFrame(loop);
      })(t0);
      if (conf.demo) timer = setTimeout(function () { // stand-in for the API response
        deliver({ value: conf.demo.value, label: conf.demo.label });
      }, conf.demo.delay || 5000);
      function stop() { cancelAnimationFrame(raf); clearTimeout(timer); }
      function finish(a) {
        var next = {};
        for (var k in opts) if (k !== "pending" && k !== "anchors") next[k] = opts[k];
        next.anchors = [
          { value: anchors[0].value, label: anchors[0].label },
          { value: +a.value, label: a.label || "" }
        ];
        container.innerHTML = "";
        container.classList.add("zvs-arrive"); // dots + end labels ease in
        var inner = zbValueSlider(container, next);
        setTimeout(function () { container.classList.remove("zvs-arrive"); }, 700);
        ret.anchors = inner.anchors; // graft the range instance onto the api
        ret.snapTo = inner.snapTo;
        if (typeof conf.onDeliver === "function") conf.onDeliver(inner);
      }
      function deliver(a) {
        if (delivered || !a) return;
        delivered = true; stop();
        if (REDUCED) { finish(a); return; }
        var xA = PAD * 10, xB = (100 - PAD) * 10, dxT = (xB - xA) / 2.2;
        var dived = lastBob, swapped = false, m0 = performance.now();
        function ph(t, lo, hi) { return Math.max(0, Math.min(1, (t - lo) / (hi - lo))); }
        (function step(now) {
          var t = now - m0;
          var p1 = easeInOut(ph(t, 0, 350));     // wake: scrim + annotations lift
          gScrim.setAttribute("opacity", 1 - p1);
          gTop.setAttribute("opacity", 1 - p1);
          place(dived + 26 * p1);                // the mark dives to its spot
          var pm = easeInOut(ph(t, 250, 950)), yL = yFloor * pm; // chart reshapes
          var d2 = "M0 " + CURVE_H + " L0 " + yL + " L" + xA + " " + yL +
                   " C" + (xA + dxT) + " " + yL + " " + (xB - dxT) + " 0 " + xB + " 0" +
                   " L1000 0 L1000 " + CURVE_H + " Z";
          trackPath.setAttribute("d", d2);
          fillPath.setAttribute("d", d2);
          var wc = 1000 - 500 * pm;              // fill recedes to the midpoint
          clipRect.setAttribute("width", wc);
          grad.setAttribute("x2", wc);
          gDash.setAttribute("opacity", 1 - ph(t, 850, 1150)); // preview fades as the real curve lands
          if (!swapped && t >= 850 && headlineEl) {
            swapped = true;
            headlineEl.style.transition = "opacity .16s";
            headlineEl.style.opacity = "0";
            setTimeout(function () {
              var lo = Math.min(anchors[0].value, +a.value), hi = Math.max(anchors[0].value, +a.value);
              setHeadline(fmt(lo) + " – " + fmt(hi));
              headlineEl.style.opacity = "1";
            }, 170);
          }
          if (t < 1200) requestAnimationFrame(step);
          else finish(a);
        })(m0);
      }
      return { deliver: deliver, stop: stop };
    }

    var ret = {
      element: container,
      anchors: anchors,
      snapTo: snapTo,
      deliver: function (a) { if (pend) pend.deliver(a); }, // the arrival (API callback)
      destroy: function () { if (pend) pend.stop(); container.innerHTML = ""; }
    };
    return ret;
  }

  global.zbValueSlider = zbValueSlider;
})(window);
