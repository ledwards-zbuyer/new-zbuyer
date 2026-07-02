# zBuyer Homepage Redesign — Handoff

Working redesign of the public **zbuyer.com** seller funnel. Chosen concept: **#1 Classic**
(Zillow-style photo hero), built for real in `mockups/option-1-classic.html`.

- **Live preview:** https://ledwards-zbuyer.github.io/new-zbuyer/mockups/option-1-classic.html
- **Terms comparison tool:** https://ledwards-zbuyer.github.io/new-zbuyer/mockups/compare-terms.html
- **Title comparison tool:** https://ledwards-zbuyer.github.io/new-zbuyer/mockups/compare-title.html
- **DR landing page:** https://ledwards-zbuyer.github.io/new-zbuyer/mockups/landing-classic-blue.html
- **Homepage vs lander comparison:** https://ledwards-zbuyer.github.io/new-zbuyer/mockups/compare-pages.html
  (three cards: homepage, empty lander, lander pre-popped via the Alex Smith example link)
- GitHub Pages serves `main`; every push is live in ~1 minute.

## Current funnel

1. **Hero address step** — CTA **"Get my cash value report →"** — Smarty US Autocomplete
   Pro on `#addr`
   (`mockups/assets/address-autocomplete.js`, embedded key in `assets/smarty-config.js`,
   host-locked to github.io / zbuyer.com / localhost — `file://` can't test it).
2. **Contact step (modal)** — titled **"Request Cash Value Estimate"** — name / phone /
   email + required **"Open to selling?"** intent chips (Now / Soon / Eventually / No)
   + matched-pros disclosure + TCPA consent.
3. **"You're all set!" step** — confirmation only: success graphic, "a local expert will
   be in touch to discuss your cash value and best selling options",
   CTA **View Cash Value Report →**, quiet **Do not contact me** link.
4. **SMS step** — "One last thing": opt in to get the report link texted
   (number prefilled from contact step). CTA and "No thanks" both land on
   `report-classic-blue.html` (demo dashboard screenshot).

Modal logic lives in `mockups/assets/lead-modal.js` (vanilla JS, no deps).

## Changes made & why

### 1. SMS step reframed, then the final step split in two
- The old single step mixed a *statement* ("an expert will contact you" — already covered
  by the TCPA consent) with a *question* ("want the link texted?"). One card + one CTA made
  declining the text feel like backing out of the consent just given.
- **Fix:** split into two screens. The all-set screen is pure confirmation (no ask, nothing
  to decline); the SMS screen is the only live question. Both of its buttons still reach the
  report, so skipping the text clearly skips *only* the text.
- SMS copy: bigger question line + small centered note "This will update your primary
  contact phone."
- The step's 3 illustration boxes (`assets/box_*.webp`) were dropped as visually busy;
  each screen got one calm inline-SVG graphic instead (success check / phone + text bubble).
  The `.webp` files are now unused (prune later).
- **"Do not contact me" is a placeholder** — it currently behaves like the CTA and
  continues to the SMS step. Real behavior undecided.

### 2. "Selling Timeframe" dropdown → "Open to selling?" chips
- Multi-year data showed **no timeframe answer predicts selling likelihood** — the question
  demands a prediction people can't make, pushing honest users to escape answers.
- Separately, conversions drop when users must read and compare multiple prose options.
- **Fix:** a self-ordering continuum of one-word chips — **Now · Soon · Eventually** —
  visible inline (no dropdown click, no hidden list). Position conveys meaning; there is
  nothing to read. It asks about their *present state*, not a future commitment.
- "Eventually" beat "Someday" for when-not-if framing. A **"Never"** chip existed briefly
  as a quality valve and was removed for conversion; restore it by adding one
  `<button ... data-val="never">Never</button>` back — nothing else references it.
- Values submit as `now / soon / eventually / no`.
- **"No" chip added 2026-07-01** (softer heir to "Never"): sits at the far right, sized to
  its word (`.lm-chip-no` — `flex:0 0 auto` + horizontal padding) while the other three
  keep equal widths; all four on one line. Styled quieter than its peers (weight 500,
  `#9ba8bb`) so it reads as an escape hatch, not a fourth peer — full blue when selected.
  The submit-without-answer validation highlight skips it too
  (`.lm-chips.invalid .lm-chip:not(.lm-chip-no)`): only Now / Soon / Eventually turn red.
  Currently on **both** the homepage and the DR lander; the plan is to keep it lander-only,
  homepage-only, or both **depending on conversion rate** once traffic data comes in —
  removing it anywhere is deleting one `<button>` line.
- The question sits in a soft container matching the disclosure box, title centered,
  header-sized but muted in color (it was drawing too much eye).

### 3. Matched-pros disclosure (multi-buyer leads)
- A lead can be sold to up to **6 named buyers**; listing all of them ate ~6 lines and
  pushed the form below the mobile fold.
- A collapse-to-one-line "+N more" toggle was built first, then **reverted**: compliance
  requires every buyer name visible **without interaction**.
- **Fix instead — reclaim space elsewhere:**
  - Removed the redundant **Cancel** button (X, Esc, and backdrop-click all close).
  - Intro paragraph trimmed from 3 lines to 2.
  - Chips shortened slightly; intent label promoted to box header.
  - Pros list typography matched to the consent text below it (11px/10.5px, light
    `#8a97ab`, label in muted slate) — the disclosure reads as one quiet legal block.
- Worst-case 6-buyer form now fits above the mobile fold. Demo data carries the worst case
  on purpose.

### 4. Mobile behavior
- **Bottom-anchored modal:** every step's card is a natural-height bottom sheet on ≤560px
  (`margin-top:auto` on `.lm-card` in the mobile media block). `margin-top:auto` was chosen
  over `align-items:flex-end` deliberately: when the card is taller than the viewport
  (keyboard open, small phone), the auto margin collapses to 0 and the top stays
  scrollable; flex-end would trap it off-screen.
- **Address focus scroll:** on ≤768px, focusing `#addr` jump-scrolls the search box to the
  top of the page so the suggestion list gets the space above the keyboard (before: ~1
  visible suggestion; after: 4–5). It runs at 60ms *and* 350ms (the keyboard resize can
  undo the first attempt) and temporarily overrides `html{scroll-behavior:smooth}` —
  a smooth scroll loses the race against the keyboard animation.
- **Autocomplete unclipped:** `.hero` must **not** have `overflow:hidden` — it clipped the
  Smarty list at the hero/trust-strip boundary. The hero bg is `inset:0` so nothing else
  escapes.

### 5. Terms comparison tool (`mockups/compare-terms.html`)
- Internal chooser (noindex) to preview the funnel under each sale model:
  - **Exclusive Lead** → default (no param, also `?terms=exclusive`): single named pro +
    consent says "your matched real-estate professional".
  - **Max Sold** → `?terms=maxsold`: 6-buyer list + "its real-estate partners".
- Markup carries the Exclusive default; `lead-modal.js` swaps in the Max Sold worst case
  when `?terms=maxsold` is present. (Default flipped to Exclusive 2026-07-01 for a team
  demo of the hero-title comparison.) **Consent wording differences are placeholders**
  pending final legal language.

### 6. Direct-response landing page (`mockups/landing-classic-blue.html`)
- Stripped funnel for paid traffic (email/SMS): logo-only header, hero + address box, then
  nothing but "© zBuyer · Terms · Privacy" at the bottom. `noindex`. Content sits high (not
  centered) so the short page still leaves keyboard room for suggestions on mobile.
- **Modal lock-in** via `<body data-dr>` (behavior in `lead-modal.js`): backdrop has no
  `data-close` (click-off can't dismiss), X + Escape close ONLY on the contact step (the one
  with the consent terms), no back buttons anywhere.
- **z-param pre-pop** (the real email/SMS link convention):
  `?zfname=Alex&zlastname=Smith&zphone=6238805511&zemail=alex@gmail.com&zstreet=1401+Candlewood+Dr&zcity=Pittsburg&zstate=PA&zzipcode=15240`
  - Address: composed string fills the box instantly; a silent Smarty lookup then upgrades it
    to the top suggestion's canonical address (sets `window.zbSelectedAddress`). Multi-unit
    umbrella results are skipped. The Smarty search deliberately **omits the z-param zip**:
    Smarty filters (returns nothing) on a wrong zip instead of correcting it, so we send
    street+city+state and let Smarty supply the canonical zip — bad zips in email links get
    fixed in the box. (`address-autocomplete.js`)
  - Contact: name/phone/email prefill (phone through `formatPhone`). (`lead-modal.js`)
  - Landing markup ships empty inputs — no John Doe demo data. `zcredit` currently ignored.
  - Prefill code runs on any page carrying the params; the homepage without params is unchanged.
- Lander logo = `assets/logo-blue-dark.png`, same file as the homepage nav (was briefly
  `zbuyer-white.png` — corrected to match).
- **Street View hero background** (`assets/streetview-bg.js` + `assets/streetview-config.js`):
  when z-params carry an address, the hero swaps the stock house photo for the **Google
  Street View image of that address** (clear photo, same dark overlay). A free metadata
  call gates the swap: no imagery → default photo stays, Google's gray placeholder is
  never shown, and nothing is billed. Key lives in `streetview-config.js`
  (`window.GMAPS_STREETVIEW_KEY`) — working live, verified against the Alex Smith example
  (real house renders behind the overlay). Make sure the key is referrer-restricted
  (`ledwards-zbuyer.github.io/*`, `localhost:8741/*`, `zbuyer.com/*`) and API-restricted
  to *Street View Static API*. Caveats: image maxes at 640×640
  (soft full-bleed on desktop, fine on mobile) and renders bill ~$7/1,000. Lander-only —
  the homepage never loads these scripts.

### 7. Hero copy workshop (2026-07-01)
- **Title:** report-language alternatives were workshopped; decision was to **keep the
  original** ("See your home's cash value today."). The runner-up — a single-line lowercase
  lockup **"cash value home report"** (blue "cash value" + white "home report", maximized
  size) — is parked behind `?title=b2`, with `mockups/compare-title.html` as the phone-
  friendly jump page for team review. It's a candidate for the paid-traffic lander title.
- **Sub-line** (all versions): "Your report blends pricing models with local agent and
  investor insight to pinpoint your home's cash value." Replaced the old expert/cash-offer
  line to center the *report*. NOTE: the modal contact-step sub now reads nearly the same —
  flagged, unresolved.
- **Form-step title:** "View Cash Value Report" → **"Request Cash Value Estimate"**
  (both pages). The all-set step's CTA still says "View Cash Value Report →".

## Testing

- **Harness:** `mockups/shots/harness.html` (untracked scratch dir) iframes the real page
  and drives it: `?step=contact | err | allset | sms | ac | acfocus`, plus
  `&terms=exclusive`. Serve the repo root first (`python -m http.server 8741`).
- **Headless screenshots:** Chrome `--headless --screenshot --window-size=... --virtual-time-budget=4000`
  against `http://localhost:8741/...`. Use Windows `file:///C:/...` URLs for static pages.
  Local headless Chrome clamps the layout viewport to ~474px min — verify mobile at ≥500px.
- Smarty needs a real authorized host (github.io / localhost via http, not file://).

## Open items

1. **"Do not contact me"** — decide real behavior (suppress expert contact? pairs naturally
   with a restored "Never" chip / no-contact routing).
2. **Exclusive vs Max Sold consent language** — replace placeholders with final legal copy.
3. **pulse.zbuyer.com prefill params** — `firstname/lastname/email/phone/address/city/state/zzipcode`
   + intent value are best guesses except `zzipcode`; confirm exact names before launch.
4. **Prune** unused `mockups/assets/box_*.webp`.
5. **Stats/testimonials** on the homepage are placeholders pending real data.
6. **"No" chip rollout** — currently on both pages; decide lander-only vs both once
   conversion-rate data exists. Pairs naturally with open item 1 (a "No" answer could
   route to a no-contact path).
7. **Hero title** — original kept for now; B2 lockup (`?title=b2`) pending team review,
   possible lander variant.
8. **Street View background** — live and verified; confirm the key's referrer/API
   restrictions in Google Cloud console, and revisit desktop softness (640px cap) if it
   bothers anyone.
