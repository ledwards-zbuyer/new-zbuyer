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
 *       }
 *     });
 *     slider.snapTo(1);                   // programmatic snap (0-based)
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
 *   the snapped anchor's value. Keyboard arrows step anchors. Every anchor
 *   gets a dot with a label tooltip.
 *
 *   ONE anchor = static display: full-height fully-filled chart, handle
 *   locked centered, no dots, no end labels, headline shows the value.
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

  var CSS =
    ".zvs-headline{font-size:38px;font-weight:800;letter-spacing:-.03em;text-align:center;color:var(--zvs-ink,#14233D);margin:0 0 4px}" +
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
    ".zvs-end.zvs-right{text-align:right}";

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
    var single = anchors.length === 1;
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

    var headlineEl = null;
    if (opts.headline !== false) {
      headlineEl = document.createElement("p");
      headlineEl.className = "zvs-headline";
      container.appendChild(headlineEl);
    }
    function setHeadline(t) { if (headlineEl) headlineEl.textContent = t; }

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
    svgEl("path", { d: d, fill: col(colors.track, "--zvs-track", "#E4EAF3") }, svg);
    svgEl("path", { d: d, fill: "url(#zvsGrad" + id + ")", "clip-path": "url(#zvsClip" + id + ")" }, svg);

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
      setHeadline(fmt(a.value));
      handle.setAttribute("aria-valuetext", fmt(a.value) + (a.label ? " — " + a.label : ""));
      if (typeof opts.onSelect === "function") opts.onSelect(a, idx);
    }

    if (single) {
      var only = anchors[0];
      handle.style.left = "50%";
      handle.setAttribute("aria-valuetext", fmt(only.value) + (only.label ? " — " + only.label : ""));
      setHeadline(fmt(only.value));
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

    return {
      element: container,
      anchors: anchors,
      snapTo: snapTo,
      destroy: function () { container.innerHTML = ""; }
    };
  }

  global.zbValueSlider = zbValueSlider;
})(window);
