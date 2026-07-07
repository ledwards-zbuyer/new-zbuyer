# zBuyer Homepage Redesign — Handoff

Working redesign of the public **zbuyer.com** seller funnel. Chosen concept: **#1 Classic**
(Zillow-style photo hero), built for real in `mockups/option-1-classic.html`.

- **Live preview:** https://ledwards-zbuyer.github.io/new-zbuyer/mockups/option-1-classic.html
- **Terms comparison tool:** https://ledwards-zbuyer.github.io/new-zbuyer/mockups/compare-terms.html
- **Title comparison tool:** https://ledwards-zbuyer.github.io/new-zbuyer/mockups/compare-title.html
- **DR landing page:** https://ledwards-zbuyer.github.io/new-zbuyer/mockups/landing-classic-blue.html
- **Homepage vs lander comparison:** https://ledwards-zbuyer.github.io/new-zbuyer/mockups/compare-pages.html
  (three cards: homepage, empty lander, lander pre-popped via the Alex Smith example link)
- **Report comparison tool:** https://ledwards-zbuyer.github.io/new-zbuyer/mockups/compare-report.html
  (three value-display strategies × Exclusive/Max Sold on the rebuilt report page)
- GitHub Pages serves `main`; every push is live in ~1 minute. A `.nojekyll` file at the
  repo root makes Pages deploy the raw files (the default Jekyll build started failing
  flakily 2026-07-02 with no content cause; we never needed it). Browsers cache pages for
  10 min — during rapid iterations, test with a throwaway `?v=N` param.
- **If pushes stop going live:** the Pages backend can wedge itself (2026-07-02 PM: every
  push-triggered deploy after 14:25 failed with a generic "Deployment failed, try again
  later" in the Actions run, the push's legacy build record sat in `building` forever,
  and the site kept serving the last good deploy). Re-running the failed workflow does
  NOT fix it, and neither does poking a rebuild for a commit whose build is already
  stuck. What works, per incident: push a **fresh commit** (empty is fine), then
  `gh api -X POST repos/ledwards-zbuyer/new-zbuyer/pages/builds`, then confirm
  `gh api repos/ledwards-zbuyer/new-zbuyer/pages --jq .status` returns `built` and
  curl the live URL. Repeat on the next push if it recurs — it's GitHub-side.

## Current funnel

**Lead submission (lander only):** the DR lander is wired to the real Pulse Path lead
API — see §9. The homepage and compare pages remain inert demos.

1. **Hero address step** — CTA **"Get my cash value report →"** — Smarty US Autocomplete
   Pro on `#addr`
   (`mockups/assets/address-autocomplete.js`, embedded key in `assets/smarty-config.js`,
   host-locked to github.io / zbuyer.com / localhost — `file://` can't test it).
2. **Contact step (modal)** — titled **"Request Cash Value Estimate"** — name / phone /
   email + matched-pros disclosure + TCPA consent.
3. **Intent step — "Tune your cash value" (2026-07-06)** — the full qualifier box in one bottom
   sheet: required **"Open to selling?"** chips (Now / Soon / Eventually / No) +
   **"What should your report focus on?"** chips (Fast cash / **Both — ships
   pre-selected**, a visible default that submits unless changed / Top price) +
   optional **"Any repairs needed?"** wedge slider (17 track positions for smooth
   dragging, bucketed into 5 display/data levels — "No repairs — move-in ready" →
   "A full remodel"; untouched = nothing sent; display is iconic — a sparkle
   at rest, then 1-4 hammers as it slides — while the text labels live on as
   aria-valuetext and the RepairsNeeded field value). **The visible dial is a custom
   element**, not the native range thumb — iOS Safari ignores custom thumb geometry
   (dial fell short of the wedge tip and sank below its peak); the invisible native
   input handles touch/drag/keys while lead-modal.js positions the dial so its center
   tracks exactly [8px, width-8px] (the wedge's ends) and always crests above the
   wedge. **Dragging is pointer-event driven on the wedge itself** (pointer capture +
   touch-action:none; the native input is pointer-inert, kept for keyboard/AT) — iOS
   accepts taps on appearance:none range inputs but won't track drags, since drag
   capture belongs to the native thumb. Sub-line: "Your answers
   shape what your report highlights." (an earlier "nothing here commits you to
   anything" was cut — over-reassurance reads as suspicious).
4. **"You're all set!" step** — confirmation only: success graphic, "a local expert will
   be in touch to discuss your cash value and best selling options",
   CTA **View my Report →** (fires RealtorOpt="ok"), quiet **Do not contact me** link (fires DNC="true").
5. **SomethingSpecial step (2026-07-07, replaced the SMS step)** — "Anything else we
   should know?" / "Upgrades or features that could affect your value — totally
   optional." A free multiline box + five tap-to-add suggestion chips (Solar panels /
   Pool / New roof / Remodeled kitchen / Finished basement — tapping appends to the
   box, chips light up when their text is present, typing stays free). One button,
   no validation: **"View my Report →"**; sends `SomethingSpecial` only if the box
   has content. The finale beat's caption is now **"Sending your report link to your
   phone…"** (the report is texted to the contact phone by the backend on finalize;
   the SMS opt-in question is gone). Lands on `report-classic-blue.html` (§8).

Modal logic lives in `mockups/assets/lead-modal.js` (vanilla JS, no deps).

**`FORM_DESIGNER.md`** distills every form/funnel design principle learned across the
project (question framing, choice UI, step architecture, consent layout, mobile
ergonomics, prefill hygiene, traffic-source variants, process) — read it before
changing the funnel.

## Changes made & why

### 1. SMS step reframed, split in two — then replaced by SomethingSpecial
- **2026-07-07: the SMS step was removed entirely.** The report link now texts to the
  contact phone automatically (finale caption says so); the report page carries an
  "Access anytime: we texted your report link to (xxx) xxx-xxxx" notice with an
  "Update my mobile number" modal (pre-popped phone; Update saves `phone` through the
  same lead session via SaveLeadData; `?demoPhone=` previews it). The step's slot now
  holds the optional SomethingSpecial notes step (see Current funnel #5). History of
  the SMS step below, kept for the rationale:
- The old single step mixed a *statement* ("an expert will contact you" — already covered
  by the TCPA consent) with a *question* ("want the link texted?"). One card + one CTA made
  declining the text feel like backing out of the consent just given.
- **Fix:** split into two screens. The all-set screen is pure confirmation (no ask, nothing
  to decline); the SMS screen is the only live question. Both of its buttons still reach the
  report, so skipping the text clearly skips *only* the text.
- SMS copy (final, 2026-07-06): **"Can we text you the report?"** — Lucas's own
  six-word cut, beating longer drafts; + small centered italic note "This will update
  your primary contact phone." CTA "Text my Report →".
- The all-set step's expert line ("A local zBuyer expert will be in touch shortly…")
  carries the same `lm-q` size (16.5px) as the SMS question, so the two closing steps
  read at equal weight.
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
  - Address: composed string fills the box instantly, then a **silent resolution chain**
    upgrades it (`address-autocomplete.js`; each attempt logs a `[Prepop]` line in the
    prior funnel's QA format — Source/Result/Reason/Input/Output):
    1. **S1 Smarty** — search = street (+city); state goes in `include_only_states` (a
       FILTER param, never search text — state/zip inside the search text is why the old
       funnel's Smarty attempts failed on partials like "291 E Shorecrest Dr WA"). Zips
       are never sent at all: they lie, Smarty supplies the canonical one.
    2. **S2 Smarty** — street only + state filter (city may be the dirty part).
    3. **G Google geocode** — Maps JS SDK lazy-loaded only on Smarty miss; key in
       `assets/google-config.js` (referrer-restricted; Maps JavaScript API + Geocoding
       API; ~$5/1k, billed only when Smarty misses twice). **Granularity guard:** only
       street-level results (street_number + route) are accepted — Google fuzzy-matches
       garbage to towns/bare roads, and a wrong address is worse than the raw string.
    4. **S3 Smarty** — re-attempt from Google's components.
    Smarty success at any stage = canonical address + `window.zbSelectedAddress` + Pulse
    saves (identical to a manual pick) + `queryStringAddressSuccess=true`. Google-only
    success fills the box + saves Google's components. **Total failure BLANKS the box**
    (per Lucas 2026-07-06 — never leave an unverified string in it) and saves
    `queryStringAddressSuccess=false`. Multi-unit umbrellas stay skipped. Verified live:
    clean, no-city/no-zip (Shorecrest→Shelton), wrong zip, garbage (blank), and the
    Camdlewood→Candlewood typo rescue (G→S3).
  - Contact: name/phone/email prefill (phone through `formatPhone`). (`lead-modal.js`)
  - Landing markup ships empty inputs — no John Doe demo data. `zcredit` currently ignored.
  - Prefill code runs on any page carrying the params; the homepage without params is unchanged.
- Lander logo = `assets/logo-blue-dark.png`, same file as the homepage nav (was briefly
  `zbuyer-white.png` — corrected to match).
- **Street View hero background — currently OFF** (the two `<script>` includes are
  commented out at the bottom of `landing-classic-blue.html`; uncomment to re-enable).
  How it works when on (`assets/streetview-bg.js` + `assets/streetview-config.js`):
  when z-params carry an address, the hero swaps the stock house photo for the **Google
  Street View image of that address** (clear photo, same dark overlay). A free metadata
  call gates the swap: no imagery → default photo stays, Google's gray placeholder is
  never shown, and nothing is billed. The key slot is `window.GMAPS_STREETVIEW_KEY` in
  `streetview-config.js` — **currently the placeholder**: the original key was exposed,
  scrubbed from git history, and **deleted in Google Cloud console (2026-07-02) — the
  incident is fully closed**. To re-enable: create a fresh key, apply restrictions
  BEFORE first use (HTTP referrers `ledwards-zbuyer.github.io/*`, `localhost:8741/*`,
  `zbuyer.com/*`; API-restrict to *Street View Static API*), paste it into
  `streetview-config.js`, and uncomment the two script includes at the bottom of
  `landing-classic-blue.html`. The feature was verified working end to end before
  removal. Caveats: image maxes at 640×640
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

### 8. Cash Value Report v2 (2026-07-02)

`report-classic-blue.html` rebuilt from a static Zoodealio-dashboard screenshot into a
real page (classic-blue tokens, vanilla JS, no deps). The "Powered by Zoodealio" badge
was removed 2026-07-07. The masthead shows the SUBMITTED address (funnel stores the
verified chip text in sessionStorage as zbAddressDisplay; the report swaps it in on
load) while values and home stats remain static demo data. The old
`report-dashboard*.png` assets are deleted.

- **Why:** the funnel's promised object ("Get my cash value report → … → View Cash
  Value Report →") finally lands on a page that looks like the funnel — and the page
  exists to **test the value-display dilemma** instead of arguing it: the untested
  2003-era assumption that showing numbers sets expectations agents must overcome,
  plus the investor wrinkle (an investor's real offer shouldn't sit beside a bigger
  Zoodealio number).
- **Structure:** masthead (title, address, facts, photo) → expert slot **above the
  fold** → value module → property details + net-equity cards → value-history chart
  (inline SVG, 5y/10y toggle) → minimal footer.
- **`?values=` param — three value-display strategies** (default `combined`):
  - `combined` — one wide range ($312K–$371K demo) drawn as an INTERACTIVE slider
    (2026-07-07): muted outer track, selected range prominent between two end knobs,
    unlabeled anchor dots at Cash+ ($345K, 55.3%) and Cash+ w/ repairs ($355K, 70.6%).
    A tall orange pill handle (matching the repairs dial) drags freely and snaps to
    the nearest of the four anchors on release; ONLY then does the big headline swap
    from the full range to the snapped anchor's value. Keyboard arrows step between
    anchors; `?snap=0-3` presets it for screenshots. Values labeled at the ends only.
    Most member-protective at rest: interior offers are positions, not numbers, until
    the user chooses to explore.
  - `options` — a range per path (Cash / Cash+ featured / List), expert as
    tie-breaker CTA. Exposes the Cash+ number.
  - `spectrum` — all paths as interval bars on one Speed ⟷ Price axis; the geometry
    teaches the tradeoff.
  - **Anchoring rule (all three):** no number is ever labeled "your home's value" —
    every figure is the outcome of a way to sell.
- **`?terms=` param** (default exclusive, matching the funnel): `exclusive` = Jason
  Dalbey concierge card; `maxsold` = the 6-buyer roster (same names as the funnel
  disclosure) cycling through the same card slot as a **scroll-snap carousel**
  (1-up mobile / 3-up desktop, dots + arrows). Value-module CTAs swap "Jason" →
  "your pros" via `.xName` spans.
- **CSS gotcha:** `main>.wrap>*{min-width:0}` is load-bearing — without it the
  carousel's min-content width (6 unshrinkable cards) propagates up the flex column
  and widens the whole page past the mobile viewport.
- All values are demo numbers; wiring real Zoodealio / RealEstateAPI data is out of
  scope for the mockup. Contact CTAs are demo `tel:` links; net-equity button is
  not live.

### 9. Pulse Path lead API integration (2026-07-06) — lander only
The DR lander now submits real leads to zBuyer's internal API
(`legacy.zbuyer.com/lr/AjaxServer.aspx`; CORS `*`, no client secret — the site stays
fully static, no backend needed).

- **Client:** `mockups/assets/pulse-api.js` + `assets/pulse-config.js`. Including these
  two scripts IS the enable switch — the homepage and compare tools don't load them and
  stay inert demos. All state (submissionID, request counter, field snapshot, pixel
  HTML, contact cache) lives in `sessionStorage` (per-tab session, survives the
  navigation to the report page).
- **Flow:** `InitNewLead` on page load (srcURL = full page URL → mid/affid attribution
  rides along automatically; **test links must carry `?mid=56&affid=testing`**);
  `SaveLeadData` on field blur / chip select / address pick (partial leads, incrementing
  `cnt`); `GetContactOptInNames` once per session (cached — API returns different sets
  per call) drives the **live matched-pros disclosure** (checkbox list when
  `renderAsCheckboxes:true`, static line otherwise; `OptInContactID` saved per contact
  on submit); `FinalizeLead` fires on the SMS step's exit (both buttons), returns pixel
  HTML stashed for the report page, which injects it into `#pixelDiv`. Navigation never
  blocks on the API (2.5s cap).
- **Field names are CANONICAL** (list from Lucas 2026-07-06; mapping table `F` at the top
  of pulse-api.js). Highlights: page-load `queryString*` echoes of the raw URL params
  (missing parts = literal `"null"`), `queryStringAddressSuccess` true/false from the
  prepop chain, resolved components as `StreetAddress`/`City`/`State`/`Zip`, contact as
  `name`/`phone`(digits-only)/`email`/`credit`, lifecycle flags
  (`AddressSubmitClicked`, `ContactFormDisplayed`, `contactOptInNames` +
  `contactOptInNames_renderAsCheckboxes`, `ContactFormSubmit`), consent record
  (`trustedform.com_TCPATerms` = the exact disclosure+consent text displayed;
  `trustedform.com_CertURL` from the TrustedForm script now on the lander),
  `ListedQuestion` (defaults "No" until OnboardAPI is ready), `RealtorOpt` = "ok" on the
  all-set CTA (its "Do not contact me" link instead fires `DNC` = "true" and NO
  RealtorOpt), `SellingTimeFrame` = the chip's visible text (Now/Soon/Eventually/No),
  `SMSOptIn` yes/no on the SMS step (a yes also updates `phone` to the texted number).
- **WhySelling reworked (2026-07-06):** the legacy "Why are you interested in the cash
  value?" prose list (six options incl. the confessional "Financial Problems") is
  replaced by the "Tune your report" step. Rationale: the legacy answers collapse onto
  one Speed⟷Price axis (repairs/financial/inherited = fast-as-is; upgrading = top
  dollar) — the same axis the report page draws — so a report-anchored ask yields the
  same investor-vs-agent routing signal with zero selling admission (Lucas's rule:
  never put "I'm selling" in the user's mouth). Fields: `WhySelling` = focus chip text
  (Fast cash / Both / Top price); `RepairsNeeded` = slider label ("No repairs —
  move-in ready" … "A full project") — **RepairsNeeded is not canonical yet, confirm
  the name with the API team**. `SomethingSpecial` remains reserved.
- **Doc deviations observed live:** dead submissionID → HTTP **403** (docs say 400) —
  client re-inits and replays the field snapshot on either; ContactOptIn responses carry
  an undocumented `showOnMeetTheExpertsPage` flag; live response had
  `renderAsCheckboxes:false` with a single "HousingNow.com" contact.
- **Verified:** full curl sequence (init → saves incl. OptInContactID → finalize
  returned `PixelID=TEST-ValuationForm` pixel HTML) + in-browser render of the live
  contact in the disclosure via harness on localhost.
- **Not yet wired (later phases):** Onboard AVM values into the report page
  (`PulseAPI.avmDetail`/`getReport` helpers already exist), GetAreaPropValue,
  reCaptcha verification, report-page expert card from the cached contact set.

### 10. Z-mark motion asset + funnel interstitial (2026-07-06/07)
`mockups/assets/z-dance.html` (animated SVG/CSS, ~3KB, crisp at any size) +
`z-dance.gif` (420px) — the logo's two triangles seen from above: they enter at the
same angle, walk toward each other along the seam (pure translation, constant gap),
spin once **as a rigid pair** (the only rotation lives on a shared group — independent
rotation/overlap structurally impossible), pause as the exact logo Z, spin away, part.
Palindrome loop (entrance defined once; animation-direction:alternate plays it back
out exactly the way it came), ~1s empty-stage dwell at the offstage turnaround, travel
distance clears the circle rim completely. Exports: `z-dance.gif` (dark stage),
`z-dance-transparent.gif` (arrows only, binary alpha), `z-dance.webp` (arrows only,
TRUE soft alpha — use this over the transparent gif wherever WebP is accepted).
`?t=SECONDS` freezes any frame; `?bare=1` = arrows only on transparent; honors
prefers-reduced-motion. Palette-swappable (two fill values).
**Funnel interstitial ("Z beat"):** a 1.5s one-shot of the dance (walk in, rigid spin,
lock the Z) plays between modal steps — contact→intent, intent→all-set, all-set→SMS —
via `runZBeat(target)` in lead-modal.js (data-screen="zbeat" panel in both pages). **Finale beat (SMS→report):** the full
cycle — in, hold, back out (~3.3s via 2 alternate iterations) — with the caption
"Your report is on the way"; FinalizeLead fires underneath it, so the beat doubles as
cover for the API round-trip. A beatSeq guard keeps stale beat timers from stomping a
newer screen. Reduced-motion shows the locked Z statically. NOTE: headless
virtual-time screenshots show late-restarted CSS animations pinned at frame 0
(state=running, transform=0% — a rendering artifact of the test rig, same genre as the
2026-07-01 scroll-race artifact); real browsers restart class-swapped animations
normally — verify beats on-device.

## Testing

- **Harness:** `mockups/shots/harness.html` (now tracked) iframes the real page
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
4. **Stats/testimonials** on the homepage are placeholders pending real data.
5. **"No" chip rollout** — currently on both pages; decide lander-only vs both once
   conversion-rate data exists. Pairs naturally with open item 1 (a "No" answer could
   route to a no-contact path).
6. **Hero title** — original kept for now; B2 lockup (`?title=b2`) pending team review,
   possible lander variant.
7. **Street View background** — built, verified, then switched OFF; the exposed key was
   scrubbed and deleted. To re-enable: new restricted key + uncomment the two script
   includes (see the DR-lander section). Revisit desktop softness (640px cap) if it
   bothers anyone.
8. **Report value-display strategy** — which `?values=` variant ships (and per which
   terms model) is a data/team decision; the param matrix on `compare-report.html`
   exists so it can be tested. Working hypothesis: Max Sold (investors in the mix)
   wants `combined`, Exclusive can afford `options`.
9. **Report carousel behavior** — no autoplay for now; revisit swipe affordance after
   the phone thumb test.
