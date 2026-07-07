# FORM DESIGNER — lessons from the zBuyer seller funnel

A playbook of form/funnel design principles learned building the zBuyer lead-capture
flow (address → contact/consent → all-set → SMS opt-in → report), distilled from live
iterations, thumb tests, and multi-year conversion data. Each rule carries the concrete
example that taught it. Reference implementation: `mockups/option-1-classic.html` +
`mockups/landing-classic-blue.html` + `mockups/assets/lead-modal.js`.

---

## 1. Asking questions

**Ask about the present, never the future.** People can't predict when they'll sell a
home; a "Selling Timeframe" dropdown demands a commitment they can't make, so honest
users pick escape answers ("just curious") that poison the data. Multi-year zBuyer data
showed *no* timeframe answer predicted selling likelihood. Replaced with "Open to
selling?" — a question about their current state, answerable instantly and honestly.

**One-word, self-ordering options beat prose.** Conversions drop measurably when users
must read multiple statements to locate themselves among the answers. A continuum of
single words — **Now · Soon · Eventually** — needs no reading: position conveys meaning.
If an option needs a sentence to be understood, the question is wrong.

**Word choice carries commitment framing.** "Eventually" beat "Someday" because it says
*when-not-if*; "Someday" is a daydream. On a continuum, every word should presume the
outcome and vary only the distance to it.

**One live question per screen.** The final step originally mixed "an expert will
contact you" (a settled fact, already consented to) with "want the link texted?" (a real
ask). One card + one CTA made declining the text feel like backing out of the consent.
Split into two screens: the all-set screen is pure confirmation — *nothing to decline* —
and the SMS screen is the only live question. Statements inform; questions ask; never
let them share a container.

**Never put "I'm selling" in the user's mouth.** Selling a home is personal, and when
someone "is selling" is genuinely ambiguous — sign in the yard? browsing listings? years
before either? Every question must survive without the user ever conceding a sale
exists. Two tools: *hypothetical framing* ("If you ever sold — what would matter
most?") and *anchoring the ask to something they already requested* — "What should your
report focus on?" is a preference about their report, not a confession about their
life, so answering honestly is self-serving. Corollary: kill confessional options.
"Financial Problems" and "Too many repairs" demand disclosure of distress; a
needs-based ask ("Fast cash" / a repairs slider) carries the identical routing signal
with no confession. The legacy why-selling categories collapse onto one Speed⟷Price
axis — ask about the axis, not the private reason behind their position on it.

## 2. Choice UI (chips, dropdowns, escape hatches)

**Visible chips beat any dropdown.** A dropdown hides the options behind a tap and makes
the scan cost invisible until it's paid. Inline chips show the whole answer space at a
glance. (The dropdown era still taught its own lessons: put the label *inside* the field
and make the *whole* field tappable, not just the caret.)

**Build a quality valve, price it consciously.** An exit option ("Never" / "No") filters
low-intent leads at the cost of conversion. Make it a one-line add/remove
(`<button data-val="no">No</button>` — nothing else references it) so the
conversion-vs-quality dial can be turned per traffic source once CR data exists.

**De-emphasize the exit, don't hide it.** The "No" chip is narrower (word-width, not
equal-flex), lighter weight (500 vs 600), and quieter in color (`#9ba8bb`) than its
peers — it reads as an escape hatch, not a fourth peer answer. Selected state still gets
full treatment: de-emphasis ends the moment the user chooses it.

**Validation should point at the answers you want.** When the user submits without
choosing, only Now/Soon/Eventually highlight red — the "No" chip stays quiet
(`.lm-chips.invalid .lm-chip:not(.lm-chip-no)`). Error styling is a nudge; don't nudge
toward the exit.

**Give squeezed options air before rethinking them.** "Eventually" looked crushed after
adding the fourth chip. Before redesigning, reclaim invisible space: gaps 8→6px,
container side padding trimmed, exit-chip padding narrowed. The three main chips kept
their equal widths; the layout survived.

## 3. Step & flow architecture

**Declining an ask must visibly cost nothing.** On the SMS step, *both* buttons ("Text
Me the Link →" and "No thanks, just show my report") land on the report. Skipping the
text clearly skips only the text — never the reward.

**Phrase the decline so it still delivers value.** "No thanks, *just show my report*"
promises the payoff inside the refusal. Compare "No thanks" alone, which reads as
abandoning the whole thing.

**Keep funnel language continuous.** Hero CTA "Get my cash value report →" → form step
"Request Cash Value Estimate" → all-set CTA "View Cash Value Report →". One object,
promised, requested, delivered. When a step renames the thing, users wonder if it's
still the same thing.

**An opt-in must not look like an opt-out.** The SMS step is framed as *getting* the
report link ("Want your report link texted to you so you can open it anytime?"), not as
revisiting the consent just given. A small italic meta-note ("This will update your
primary contact phone.") carries the side effect without making it the headline.

**One calm graphic per step, matched to the step's message.** Three illustrated boxes on
one step read as busy; each screen got a single inline-SVG graphic instead — success
check for "all set" (the *feeling*, not an "expert" icon), phone + text bubble for SMS.
Size icons to the text they sit beside.

## 4. Consent & compliance

**Compliance is a layout constraint, not a UI choice.** Every buyer a lead is sold to
must be named *visible without interaction* — a collapse-to-"+N more" toggle was built
and reverted. When legal text can't shrink, reclaim space elsewhere: remove the
redundant Cancel (X/Esc/backdrop already close), trim the intro a line, tighten gaps.

**Make legal text one quiet block.** The matched-pros list and TCPA consent share
typography (11px/10.5px, light `#8a97ab`, labels in muted slate) so the disclosure reads
as a single unobtrusive legal unit instead of competing paragraphs.

**Design the worst case.** The demo data deliberately carries the 6-buyer maximum so
every layout decision is tested against the tallest legal block, not the prettiest one.

## 5. Mobile ergonomics (thumb tests are the verdict)

**CTAs live at the bottom.** Every modal step is a natural-height bottom sheet on
mobile — buttons land under the thumb. Implementation: `margin-top:auto` on the card,
*not* `align-items:flex-end` — the auto margin collapses to 0 when the card is taller
than the viewport (keyboard open, small phone) so the top stays scrollable; flex-end
traps it off-screen.

**Choreograph scroll around the keyboard.** Focusing the address box scrolls it to the
*top* of the page (suggestion list gets the space the keyboard leaves); picking an
address blurs the input (dismisses the keyboard) and reverse-scrolls the CTA to the
*bottom* (thumb reach). Each scroll runs twice (e.g. 60ms + 350ms) because the keyboard
resize can undo the first attempt, and each temporarily overrides
`html{scroll-behavior:smooth}` — a smooth scroll loses the race against the keyboard
animation.

**Never auto-focus inputs on mobile.** Auto-focus pops the keyboard over content the
user hasn't read yet.

**Suggestion lists need vertical room.** `.hero{overflow:hidden}` clipped the
autocomplete dropdown at a section boundary — containers above a floating list must
never clip. On short pages (the DR lander), park the content *high* rather than
vertically centered so the keyboard has somewhere to be.

**Natural height, no filler.** Steps that stretched viewport-tall "for balance" read as
broken. Cards take their natural height, anchored where the thumb is.

## 6. Copy & visual hierarchy

**Soften anything that demands more eye than it deserves.** The "Open to selling?"
label at header size in ink-dark pulled attention off the answers — same size, muted
color fixed it. Titles orient; answers convert.

**Center and contain floating questions.** The intent question in a soft container with
a centered title reads as one structured unit; a side-aligned label above bare chips
read as disconnected furniture.

**Match sizes of parallel elements across steps.** The all-set step's expert line and
the SMS step's question are the same 16.5px — sibling steps at equal visual weight feel
like one designed system.

**Meta-information goes small, centered, italic.** Side effects and clarifications
("This will update your primary contact phone.") sit under the main line in 12.5px
italic muted — present, not competing.

## 7. Validation & errors

- Validate on submit, not on the way in; **clear the error the moment the field is
  corrected**.
- Center the message under the fields it refers to.
- Error copy is an invitation, not a scold: "Please tell us if you're open to selling."
- Highlight the fields/options that resolve the error — and only those (see the No-chip
  exclusion above).

## 8. Prefill & inbound data

**Prefill everything you know, silently verify it.** Paid-traffic links carry z-params
(`zfname/zlastname/zphone/zemail/zstreet/zcity/zstate/zzipcode`). The address box fills
with the composed string *instantly* (never blank while waiting on a network call), then
a silent Smarty lookup upgrades it to the canonical verified address.

**Never trust inbound data — and don't let verification *filter* when it should
*correct*.** A wrong zip in the link left the wrong zip in the box, because Smarty
treats a zip in the search as a filter (zero results) rather than something to fix.
Sending street+city+state only lets Smarty supply the canonical zip. Real lead data had
a wrong zip on the *first* test address; assume dirty data is normal.

**Format as you fill.** Prefilled phones run through the same progressive formatter as
typed ones — prefilled values must be indistinguishable from carefully entered ones.

**Demo data on demos, empty fields in production paths.** The homepage mockup ships
John Doe so every reviewer sees the filled state; the DR lander ships empty inputs and
fills only from params.

## 9. Traffic-source variants (homepage vs direct-response lander)

**The prettiest funnel and the highest-converting funnel are different pages.** The
homepage carries nav, trust strip, stats, how-it-works — credibility for organic
visitors. The DR lander (paid email/SMS clicks) strips to logo, hero, address box,
copyright: the click already carried intent; everything else is a leak.

**Lock the modal on paid traffic.** On the lander: backdrop click can't dismiss,
Escape/X work only on the consent step (the one with terms), no back buttons. Gate it
with one body attribute (`data-dr`) on shared JS so the homepage keeps its polite
close-anywhere behavior from the same file.

**Personalization is cheap and startling.** The Street View image of the pre-popped
address as the hero background ("this is YOUR house") is a URL, a free coverage check,
and a graceful fallback. Gate billable calls behind free metadata; widen the panorama
search radius (50m default misses deep lots); never show the provider's error
placeholder.

## 10. Process — how these lessons were actually learned

- **Workshop copy in options, render them in real card styling, pick, then build.**
  Words were chosen from A/B/C/D drafts rendered side-by-side, not argued in the abstract.
- **Screenshot-verify every change at mobile (≤560px logical) and desktop widths**
  before pushing; drive real flows with a harness page rather than hand-clicking.
- **The phone thumb test is the final verdict** — headless rendering has artifacts
  (virtual-time scroll/animation quirks, network races) that pass or fail falsely.
- **Park rejected variants behind a query param** (`?title=b2`, `?terms=maxsold`) with a
  jump page for phone comparison — decisions stay reversible and demoable.
- **Every accepted change ships immediately** (commit → push → live in ~1 min) so tests
  happen on the real device against the real page.
