# Z-beat Loading Widget — Developer Guide

`z-beat-tap.html` is the Z-beat as a live loading sphere: a single self-contained HTML file (zero dependencies, zero network requests) that runs the animated Z on the glass ball. This document covers deployment, the embed mode, customization, and enough of the internals to modify it confidently.

> **2026-08-03 simplification:** the press-and-hold "status word" interaction (the stencil font, typesetter, and strip-morph engine, plus its `?msg=` API) was removed to cut complexity and processing. What remains is the idle beat plus one easter egg — **double-tap recolors the sphere**. This guide describes the current file.

## What it does

The sphere runs the Z-beat idle loop: the two arrows wind up, whip around the ball in opposite directions, reconnect, and the assembled Z takes a lap — repeating on a ~6.5 second cycle. A **double-tap** (two presses within 320 ms) recolors the entire sphere through the four approved colorways — Primary, Stage Navy, Sky, Porcelain. That's the whole input surface: an easter egg, not a control. To *start* on a particular colorway, pass `?pal=` (see the querystring API below).

Users with `prefers-reduced-motion` get a static locked Z, and the animation frame loop never starts — zero per-frame work.

## Deployment

It's a static file. Drop it anywhere — GitHub Pages next to the mockups, the funnel origin, or open it straight from disk — and it works. There are no fonts, images, scripts, or API calls to whitelist, so it passes strict CSP and works offline.

Its home is `mockups/z-beat-tap.html` in the new-zbuyer repo, with this doc beside it as `z-beat-tap-docs.md`.

To embed it in a page, use an iframe with `?bare=1`:

```html
<iframe src="/mockups/z-beat-tap.html?bare=1"
        style="width:280px;height:280px;border:0;touch-action:none"
        title="zBuyer loading"></iframe>
```

`?bare=1` is the chromeless embed mode: it hides the zBuyer wordmark, the caption, and the floor shadow, and makes the page background transparent, so the embedding page's background shows through the iframe. In bare mode the ball also fills **96%** of the frame (instead of the standalone page's 88%-with-breathing-room) — the same proportion as the flat interstitial loop's circle, so the two read as the same size at equal frame sizes. Without the flag you get the full standalone page (wordmark, caption, shadow, white background).

**`touch-action:none` on the iframe element matters on phones.** The widget suppresses text selection, callouts, and context menus within its own page, but the child page's `touch-action` cannot stop the *parent* document from claiming a gesture — without the attribute, a double-tap on the sphere becomes double-tap-zoom on the embedding page. Mouse input is unaffected either way.

## The querystring API

| Param | Meaning |
| --- | --- |
| `bare=1` | Chromeless embed: no wordmark, no caption, no floor shadow, transparent background, ball fills 96% of the frame |
| `pal=primary` \| `navy` \| `sky` \| `porcelain` | Starting colorway (also accepts `stage-navy`, or an index `0`–`3`). Unknown values fall back to Primary. The double-tap easter egg still cycles onward from wherever you start |
| `t=SECONDS` | Freezes the beat at that point in the ~6.55 s cycle (no animation loop). This is the frame-export hook — the shipped GIF/WebP loops were captured headless by stepping `t`, exactly like z-dance's `?t` |

Combine them freely: `z-beat-tap.html?bare=1&pal=sky`. The design guide's colorway row is exactly that — four small `?bare=1&pal=…` iframes.

## Tuning knobs

Everything intentional lives in named constants near the top of the script.

| Constant | Default | Controls |
| --- | --- | --- |
| `DBL` | 320 ms | Double-tap detection window |
| `T` | 2.5 | Idle-beat tempo multiplier (higher = slower) |
| `PALS` | 4 entries | The colorway roster and order |
| `K` (in `layout()`) | `min(0.88·min(vw,vh), 430)/124` standalone; `0.96·min(vw,vh)/100` bare | Sphere size. Standalone caps the ball at ~347px on big screens; bare has no cap — the embedding frame is the size control |

## Adding a colorway

A colorway is one `PALS` entry plus a matching pair of gradients in the SVG `<defs>`. The entry controls everything at once:

```js
{name:'Stage Navy', glass:'glassN', shade:'shadeN',
 rim:'rgba(59,164,244,.30)', rimW:.7,
 A:[255,255,255],            // first arrow (RGB)
 B:[59,164,244],             // second arrow
 ghost:.30,                  // back-hemisphere show-through opacity
 sheen:1}                    // specular intensity (bright balls want less)
```

`glass` and `shade` name `radialGradient` ids in defs — copy an existing pair and recolor the stops. On light balls, keep the arrows readable against the glass (Porcelain runs primary-blue arrows for exactly this reason). Tip: gradient stops with `stop-opacity` below 1 make the ball translucent — the page shows through the sphere, which pairs naturally with `?bare=1` embeds (a "Glass" colorway built this way was tried 2026-08-03 and removed the same day).

## How it works, briefly

The Z is the design guide's exact polygons, decomposed into convex quads and sliced into 92 hair-fine vertical strips, each lifted onto the sphere with an azimuthal-equidistant mapping (arc distance proportional to flat distance — honest letterform proportions at every angle). Strips are individual SVG `<path>` elements repositioned every frame by plain JavaScript — no CSS 3D, no filters in the hot path — which is why it runs reliably on iOS Safari.

The idle beat is a pure function of time (`autoState`) with cartoon timing: anticipation wind-up, back-eased overshoot, damped settle. Two strip sets exist — one sliced perpendicular to the arrows' travel (the "dance") and one sliced vertically (the spin lap) — and the loop swaps whichever the current phase needs. Strips crossing to the back hemisphere move into a frosted, ghosted group so the Z reads through the glass.

Performance: ~92 path updates per frame at 60 fps, roughly 1,300 vertex transforms — light work for any phone from the last several years. The only per-frame allocation is path strings; there's no DOM churn outside hemisphere crossings. Under `prefers-reduced-motion` there is no frame loop at all.

## Support and accessibility

Targets all evergreen browsers including iOS Safari. `prefers-reduced-motion` renders the locked Z statically with no animation loop; double-tap recoloring still works. The widget suppresses text selection, touch callouts, and context menus within its page.

## File inventory

`z-beat-tap.html` — the widget, self-contained. Non-interactive exports of the sphere for email/marketing hosts (fixed colorway, no easter egg, 320px, full-cycle loop): `assets/z-sphere-{primary|navy|sky|porcelain}.webp` (true soft alpha — prefer wherever WebP is accepted) and matching `.gif` (flattened on white). The flat top-down mark ships separately as `assets/z-dance.gif` / `z-dance-transparent.gif` / `z-dance.webp`. Questions or extensions — new colorways, tempo changes — are localized changes in the sections above.

## Links

- Live widget: <https://ledwards-zbuyer.github.io/new-zbuyer/mockups/z-beat-tap.html> (embed with `?bare=1`)
- Source on GitHub: <https://github.com/ledwards-zbuyer/new-zbuyer/blob/main/mockups/z-beat-tap.html>
- Embedded live (bare mode) in the [design guide](https://ledwards-zbuyer.github.io/new-zbuyer/mockups/design-guide.html) ("Z-beat — the loading interstitial"), which also holds the flat interstitial loop.
- Other widget guides: [value slider](https://ledwards-zbuyer.github.io/new-zbuyer/mockups/value-slider-docs.html) · [estimate tray](https://ledwards-zbuyer.github.io/new-zbuyer/mockups/estimate-tray-docs.html)
