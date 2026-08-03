# Z-beat Loading Widget — Developer Guide

`z-beat-tap.html` is the interactive version of the Z-beat: a single self-contained HTML file (~24 KB, zero dependencies, zero network requests) that idles on the animated Z sphere and turns into a branded loading indicator when the user presses and holds. This document covers deployment, the URL API, customization, and enough of the internals to modify it confidently.

## What it does

At rest, the sphere runs the Z-beat idle loop: the two arrows wind up, whip around the ball in opposite directions, reconnect, and the assembled Z takes a lap — repeating on a ~6.5 second cycle. When the user **presses and holds**, the beat freezes mid-pose and the Z's strips fly across the sphere, reassembling as a status message ("Loading") wrapped onto the surface, breathing gently while held. On **release**, every strip flies back to the exact frozen pose and the beat resumes mid-phrase. Each successive press advances through the message cycle. A **double-tap** (two presses within 320 ms) recolors the entire sphere through the four approved colorways — Primary, Stage Navy, Sky, Porcelain — without consuming a message step. Users with `prefers-reduced-motion` get a static locked Z; presses swap states without animation.

The default message cycle is: Loading → Still loading → Working on it → Still working on it → Processing → Still processing.

## Deployment

It's a static file. Drop it anywhere — GitHub Pages next to the mockups, the funnel origin, or open it straight from disk — and it works. There are no fonts, images, scripts, or API calls to whitelist, so it passes strict CSP and works offline.

The recommended home is `mockups/z-beat-tap.html` in the new-zbuyer repo, with this doc beside it as `z-beat-tap-docs.md`, following the value-slider-docs pattern.

To embed it in a page, use an iframe:

```html
<iframe src="/mockups/z-beat-tap.html?msg=Loading listings"
        style="width:100%;height:520px;border:0;touch-action:none"
        title="zBuyer loading"></iframe>
```

The iframe matters for one reason: the widget claims every pointer gesture on its page (`touch-action:none`, listeners on `document`) so that press-and-hold never scrolls or selects. Inside an iframe that capture is naturally scoped to the widget; pasted inline into a scrolling page, it would eat the page's touch input.

**`touch-action:none` on the iframe element is required, not optional.** The child page's own `touch-action` cannot stop the *parent* document from claiming a touch gesture as a scroll — without it, holds on phones get `pointercancel`ed the moment the finger drifts and the press appears dead (double-tap becomes double-tap-zoom, too). Mouse input is unaffected either way. If you ever need it inline, scope the pointer listeners to the `.stage` element instead of `document` and restore scrolling outside it — a five-line change, but the iframe is the zero-thought path.

## The `?msg` querystring API

One parameter overrides the entire message cycle, so a single hosted file can say different things per context.

| Syntax | Meaning |
| --- | --- |
| `?msg=Please wait` | Single message, every press |
| `?msg=First\|Second\|Third` | `\|` separates cycle steps (press order) |
| `Still working~on it` | `~` inside a message becomes a line break |
| spaces | Literal spaces are fine; `%20` also works |

Examples:

```
z-beat-tap.html?msg=Loading listings
z-beat-tap.html?msg=Loading|sending it now|Still working~on it
```

An empty or missing `msg` falls back to the six defaults. Messages are typeset, centered, and auto-scaled to fit the sphere's readable window, so long copy shrinks rather than clipping — two short lines (via `~`) always beat one long one.

### Supported characters

The widget renders text with its own stencil font, built from the same geometry system as the Z. The current set is:

lowercase `a c d e g i k l n o p r s t w` · capitals `L P S W` · apostrophe, period, space

Unknown characters are silently skipped. A capital with no cap glyph falls back to its lowercase form (so `LOADING` renders, just not as full caps). If funnel copy needs letters outside this set, add glyphs (below) — each is a few lines.

## Tuning knobs

Everything intentional lives in named constants near the top of the script.

| Constant | Default | Controls |
| --- | --- | --- |
| `MESSAGES` | six statuses | Default press cycle (querystring overrides) |
| `TO_WORD` / `TO_Z` | 800 / 650 ms | Strip-flight duration out to the word / home to the Z |
| `THROB_AMP` / `THROB_MS` | 0.04 / 1000 | Held-word breathing: ±4% scale on a 1 s cycle |
| `DBL` | 320 ms | Double-tap detection window |
| `T` | 2.5 | Idle-beat tempo multiplier (higher = slower) |
| `PALS` | 4 entries | The colorway roster and order |
| `K` (in `layout()`) | `min(0.88·min(vw,vh), 430)/124` | Sphere size — change 430 for a different max pixel size |

## Adding a message

If it uses the supported characters, it's just a string — edit `MESSAGES` or pass `?msg=`. Nothing else to touch: the typesetter measures, centers, fits, and the slicer guarantees the Z's 92 strips cover any message the fitter accepts.

## Adding a glyph

Glyphs are defined on a shared grid: stroke weight **6**, x-height between **y 90–114** (baseline 114), capitals rise from **y 78**, descenders drop to **y 126**. Each glyph is a function returning its pieces at cursor `x`, plus an advance width. Pieces are convex polygons — use the `rw(x, y, w, h)` rectangle helper, which inflates every rect by 0.35 so abutting pieces overlap and never show hairline seams. Diagonal strokes are allowed as convex quads (see `k`).

The lowercase `c`, complete:

```js
'c':{adv:19, pc:function(x){ return [
  rw(x,90,17,6),      // top bar
  rw(x,96,6,12),      // left side
  rw(x,108,17,6)      // bottom bar
]; }},
```

Rules of thumb: pieces within a glyph should overlap wherever they're meant to connect (the inflation handles exact-abutment automatically); keep every piece convex; intentional gaps — like the `i`'s tittle — need more than ~1 unit of clearance so the inflation doesn't bridge them.

## Adding a colorway

A colorway is one `PALS` entry plus a matching pair of gradients in the SVG `<defs>`. The entry controls everything at once:

```js
{name:'Stage Navy', glass:'glassN', shade:'shadeN',
 rim:'rgba(59,164,244,.30)', rimW:.7,
 A:[255,255,255],            // first arrow (RGB)
 B:[59,164,244],             // second arrow
 word:[255,255,255],         // status-text color — must contrast the ball
 ghost:.30,                  // back-hemisphere show-through opacity
 sheen:1}                    // specular intensity (bright balls want less)
```

`glass` and `shade` name `radialGradient` ids in defs — copy an existing pair and recolor the stops. The one rule that bites: on light balls, `word` cannot stay white (Porcelain uses primary blue for exactly this reason).

## How it works, briefly

The Z is the design guide's exact polygons, decomposed into convex quads and sliced into 92 hair-fine vertical strips, each lifted onto the sphere with an azimuthal-equidistant mapping (arc distance proportional to flat distance — honest letterform proportions at every angle). Strips are individual SVG `<path>` elements repositioned every frame by plain JavaScript — no CSS 3D, no filters in the hot path — which is why it runs reliably on iOS Safari.

The idle beat is a pure function of time (`autoState`) with cartoon timing: anticipation wind-up, back-eased overshoot, damped settle. On press, the current pose is captured; each Z strip is assigned a slice of the target message (messages are typeset from the stencil font, sliced by the same system, sorted left-to-right) and interpolated point-for-point over `TO_WORD`. Point counts are matched by perimeter resampling *during flight only* — the held word renders from corner-exact geometry, which is what keeps stroke joints seamless. Release reverses the flight to the captured pose and restarts the idle clock exactly where it froze.

Performance: ~92 path updates per frame at 60 fps, roughly 1,300 vertex transforms — light work for any phone from the last several years. The only per-frame allocation is path strings; there's no DOM churn outside the morph boundaries.

## Support and accessibility

Tested approach targets all evergreen browsers including iOS Safari. `prefers-reduced-motion` renders the locked Z statically and disables the throb and flights; press still swaps content instantly. The widget suppresses text selection, touch callouts, and context menus within its page so long-presses belong to the interaction — one more reason the iframe boundary is the right embed seam.

## File inventory

`z-beat-tap.html` — the widget, self-contained. Related non-interactive assets from the same system: `z-beat-sphere.html` and `z-beat-duo.html` (ambient versions), and the exported `z-beat-*.webp` / `.gif` loops for email and marketing. Questions or extensions — new glyphs, new colorways, scoped-embed conversion — are all localized changes in the sections above.

## Links

- Live widget: <https://ledwards-zbuyer.github.io/new-zbuyer/mockups/z-beat-tap.html> (try `?msg=Loading listings`)
- Source on GitHub: <https://github.com/ledwards-zbuyer/new-zbuyer/blob/main/mockups/z-beat-tap.html>
- The funnel's non-interactive Z-beat interstitial lives in the [design guide](https://ledwards-zbuyer.github.io/new-zbuyer/mockups/design-guide.html) ("Z-beat — the loading interstitial"); the ambient `z-beat-sphere.html` / `z-beat-duo.html` files are not in this repo.
- Other widget guides: [value slider](https://ledwards-zbuyer.github.io/new-zbuyer/mockups/value-slider-docs.html) · [estimate tray](https://ledwards-zbuyer.github.io/new-zbuyer/mockups/estimate-tray-docs.html)
