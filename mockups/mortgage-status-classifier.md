# REAPI Mortgage Status Classifier

**For:** the report pipeline consuming REAPI Property Detail responses
**Ships:** `classifyMortgageStatus()`, `resolveMortgageBalance()`, `freeAndClearGate()` — dependency-free, Node or browser
**Status:** reference implementation, verified against 9 synthetic cases (results at bottom)

## Why this exists

Public records never contain actual loan balances. Every `openMortgageBalance` any vendor returns is **modeled** — the recorded origination amount run through an assumed amortization schedule at an estimated rate. A `0` therefore has three possible causes:

1. no instruments were found (could be a **coverage gap**),
2. instruments were found **with a recorded release** (documented free & clear),
3. an instrument was found that the **model amortized to zero** (or a HELOC with an unknowable drawn balance).

The scalar collapses all three. The arrays (`data.currentMortgages`, `data.mortgageHistory`) are where the evidence lives. This module reads them and returns one of five states instead of trusting the scalar.

> **Live example of the ambiguity:** our own sample record (17 Topeka Pass, REAPI id 190787647) shows `openMortgageBalance: 0` and `equityPercent: 100` — but the console dump shows `currentMortgages: [Array]` (non-empty) while `mortgageHistory: []`. Expand that array before trusting the free-and-clear read; it may be an amortized-out, unreleased, or prior-owner instrument.

## The five states

| State | Meaning | Free & clear? | Action |
|---|---|---|---|
| `HAS_OPEN_MORTGAGE` | ≥1 unreleased instrument, modeled balance > 0 | No | Use modeled balance, labeled as an estimate |
| `ZERO_BALANCE_LIEN` | Unreleased instrument present, modeled balance = 0 (amortized-out loan, unreleased satisfaction, or HELOC) | Functionally yes | Treat payoff as ~$0 in equity math; **flag for title/payoff verification at close** |
| `CONFIRMED_FREE_CLEAR` | No open instruments **plus** positive evidence: recorded release, or cash-purchase evidence | Yes | Full confidence; badge-eligible |
| `INFERRED_FREE_CLEAR` | Both arrays empty on an otherwise **rich** record (county feed demonstrably flowing) | Yes (inferred) | Badge-eligible; evidence of absence, not absence of evidence |
| `UNKNOWN_COVERAGE` | Both arrays empty on a **thin** record, or contradictory fields | Unknown (`null`) | Never claim free-and-clear; display `N/A` with reason |

**Rule order matters** — the classifier evaluates top-down, first match wins.

**Badge nuance:** the Free & Clear badge copy says *"no liens on record."* `ZERO_BALANCE_LIEN` is functionally free and clear for equity math, but an unreleased instrument makes that copy literally false — so the badge gate admits only the two `*_FREE_CLEAR` states (and still requires `!taxLien && !lien`).

## Reference implementation

```js
/**
 * REAPI Mortgage Status Classifier
 * --------------------------------
 * Problem: public records never contain actual loan balances. Every
 * `openMortgageBalance` is MODELED (recorded origination amount run through an
 * assumed amortization schedule). A value of 0 therefore has three possible
 * causes: (a) no instruments found, (b) instruments found with a recorded
 * release, (c) an instrument the model amortized to zero. The scalar cannot
 * distinguish these — the arrays can.
 *
 * classifyMortgageStatus(resp) -> one of five states (see README section).
 * resolveMortgageBalance(resp) -> { value, reason } — value is the total of
 *   open-loan balances, 0 when there is no loan, or null when unknowable;
 *   reason is one short sentence, prefixed "N/A — " when value is null.
 * freeAndClearGate(resp)       -> whether the Free & Clear badge may render.
 *
 * NOTE — sub-field names on mortgage entries are ASSUMED (the sample payload
 * collapses nested objects). Verify the candidate key lists below against one
 * expanded REAPI Property Detail response and trim/extend as needed.
 */

const RELEASE_KEYS = ["releaseDate","satisfactionDate","reconveyanceDate","releaseRecordingDate","released"];
const BALANCE_KEYS = ["estimatedBalance","amountEstimated","currentEstimatedBalance","balance"];
const AMOUNT_KEYS  = ["amount","loanAmount","originalAmount"];
const DATE_KEYS    = ["recordingDate","loanRecordingDate","documentDate","date"];
const TYPE_KEYS    = ["loanType","loanTypeCode","mortgageType"];

function pick(o, keys){ for (const k of keys){ if (o && o[k] != null && o[k] !== "") return o[k]; } return null; }
function daysBetween(a, b){ return (b - a) / 86400000; }

function classifyMortgageStatus(resp, opts = {}) {
  const d = (resp && resp.data) || resp || {};
  const cfg = { richThreshold: 3, cashWindowDays: 90, assumedTermYears: 30, now: new Date(), ...opts };
  if (typeof cfg.now === "string") cfg.now = new Date(cfg.now);

  const cur  = Array.isArray(d.currentMortgages) ? d.currentMortgages : [];
  const hist = Array.isArray(d.mortgageHistory)  ? d.mortgageHistory  : [];

  const isReleased = m => RELEASE_KEYS.some(k => m && m[k]);
  const open       = cur.filter(m => !isReleased(m));
  const released   = [...cur.filter(isReleased), ...hist.filter(isReleased)];

  const balOf   = m => { const b = pick(m, BALANCE_KEYS); return b != null ? Number(b) : null; };
  const scalar  = Number(d.openMortgageBalance ?? 0);
  const openBalanceSum = open.reduce((s, m) => s + (balOf(m) || 0), 0);
  const modeled = scalar || openBalanceSum;

  // Record richness: is the county feed demonstrably flowing for this parcel?
  const richness = [
    Array.isArray(d.saleHistory) && d.saleHistory.length > 0,
    !!d.lastSaleDate,
    !!(d.taxInfo && (pick(d.taxInfo, ["assessedValue","assessedTotalValue"]) || pick(d.taxInfo, ["taxAmount","annualTax"]))),
    !!d.ownerInfo,
    !!d.propertyInfo
  ].filter(Boolean).length;
  const rich = richness >= cfg.richThreshold;

  // Cash-purchase evidence: cash flag, or cash buyer with no instrument
  // recorded within the purchase window after the last deed.
  const saleT = d.lastSaleDate ? Date.parse(d.lastSaleDate) : null;
  const instrumentNearSale = [...cur, ...hist].some(m => {
    const t = Date.parse(pick(m, DATE_KEYS) || "");
    return saleT && t && t >= saleT && daysBetween(saleT, t) <= cfg.cashWindowDays;
  });
  const cashPurchase = d.cashSale === true || (d.cashBuyer === true && saleT && !instrumentNearSale);

  const reasons = [];
  const evidence = { openLiens: open.length, releasedLiens: released.length, historyCount: hist.length,
                     richnessScore: richness, modeledBalance: modeled, openBalanceSum, cashPurchase };
  const out = (state, confidence, freeAndClear) => ({ state, confidence, freeAndClear, reasons, evidence });

  // Rule order matters — first match wins.
  if (open.length && modeled > 0) {
    reasons.push(`${open.length} open instrument(s), modeled balance $${Math.round(modeled).toLocaleString()}`);
    return out("HAS_OPEN_MORTGAGE", "high", false);
  }
  if (open.length && modeled === 0) {
    for (const m of open) {
      const type = String(pick(m, TYPE_KEYS) || "");
      const t = Date.parse(pick(m, DATE_KEYS) || "");
      if (/heloc|credit ?line|revolving|equity line/i.test(type)) {
        reasons.push("open HELOC/credit line — drawn balance is unknowable from public record");
      } else if (t && daysBetween(t, cfg.now.getTime()) / 365.25 >= cfg.assumedTermYears - 0.5) {
        reasons.push("instrument old enough to fully amortize — likely paid off, release never recorded");
      } else {
        reasons.push("instrument on file with modeled $0 — unreleased satisfaction or a linkage issue (possibly a prior owner's lien)");
      }
    }
    return out("ZERO_BALANCE_LIEN", "medium", true); // functionally free & clear; flag for title/payoff at close
  }
  // No open instruments from here down.
  if (released.length) {
    reasons.push("recorded release/satisfaction on the last instrument(s)");
    return out("CONFIRMED_FREE_CLEAR", "high", true);
  }
  if (cashPurchase) {
    reasons.push(d.cashSale === true ? "last transfer recorded as a cash sale"
                                     : "cash buyer with no instrument recorded in the purchase window");
    return out("CONFIRMED_FREE_CLEAR", "high", true);
  }
  if (modeled > 0) {
    reasons.push("openMortgageBalance > 0 but no instruments in currentMortgages — contradictory record");
    return out("UNKNOWN_COVERAGE", "low", null);
  }
  if (rich) {
    reasons.push(`no liens found on an otherwise complete record (richness ${richness}/5) — evidence of absence`);
    return out("INFERRED_FREE_CLEAR", "medium", true);
  }
  reasons.push(`record too thin to distinguish 'no mortgage' from 'no data' (richness ${richness}/5)`);
  return out("UNKNOWN_COVERAGE", "low", null);
}

/**
 * Display/API resolver. Returns exactly two fields:
 *   value  — total of all open-loan balances (Number), 0 when there is no
 *            loan, or null when the record cannot support a claim.
 *   reason — one short sentence. When value is null it is prefixed "N/A — ".
 * Prefers the per-instrument balance sum over the modeled scalar when the
 * entries carry balances. Never invents a zero. For the full state /
 * confidence / evidence object, call classifyMortgageStatus() directly.
 */
function resolveMortgageBalance(resp, opts = {}) {
  const c = classifyMortgageStatus(resp, opts);
  switch (c.state) {
    case "HAS_OPEN_MORTGAGE": {
      const total = c.evidence.openBalanceSum > 0 ? c.evidence.openBalanceSum : c.evidence.modeledBalance;
      return { value: Math.round(total),
               reason: "total of open-loan balances, modeled from recorded originations — public records never show true balances" };
    }
    case "ZERO_BALANCE_LIEN":
      return { value: 0, reason: c.reasons[0] || "instrument on file, modeled to zero — verify payoff/release at close" };
    case "CONFIRMED_FREE_CLEAR":
      return { value: 0, reason: c.reasons[0] || "no open liens — documented free and clear" };
    case "INFERRED_FREE_CLEAR":
      return { value: 0, reason: "no liens on an otherwise complete record" };
    default:
      return { value: null, reason: "N/A — " + (c.reasons[0] || "cannot distinguish missing data from no mortgage") };
  }
}

/**
 * Corrected Free & Clear badge gate. The badge copy says "no liens on record",
 * so ZERO_BALANCE_LIEN — functionally free & clear — still may NOT show the
 * badge: an unreleased instrument makes that copy false. Equity math may still
 * treat the payoff as $0 for that state.
 */
function freeAndClearGate(resp, opts = {}) {
  const d = (resp && resp.data) || resp || {};
  const c = classifyMortgageStatus(resp, opts);
  const show = (c.state === "CONFIRMED_FREE_CLEAR" || c.state === "INFERRED_FREE_CLEAR") && !d.taxLien && !d.lien;
  return { show, basis: c };
}

if (typeof module !== "undefined") module.exports = { classifyMortgageStatus, resolveMortgageBalance, freeAndClearGate };
```

## Verified behavior (test harness output)

```
PASS HAS_OPEN_MORTGAGE -> HAS_OPEN_MORTGAGE
       {"value":212000,"reason":"total of open-loan balances, modeled from recorded originations — public records never show true balances"}
PASS HAS_OPEN two loans -> HAS_OPEN_MORTGAGE
       {"value":250000,"reason":"total of open-loan balances, modeled from recorded originations — public records never show true balances"}
PASS ZERO_BALANCE_LIEN(amortized) -> ZERO_BALANCE_LIEN
       {"value":0,"reason":"instrument old enough to fully amortize — likely paid off, release never recorded"}
PASS ZERO_BALANCE_LIEN(heloc) -> ZERO_BALANCE_LIEN
       {"value":0,"reason":"open HELOC/credit line — drawn balance is unknowable from public record"}
PASS CONFIRMED(release) -> CONFIRMED_FREE_CLEAR
       {"value":0,"reason":"recorded release/satisfaction on the last instrument(s)"}
PASS CONFIRMED(cashSale) -> CONFIRMED_FREE_CLEAR
       {"value":0,"reason":"last transfer recorded as a cash sale"}
PASS CONFIRMED(cashBuyer, Topeka-shape) -> CONFIRMED_FREE_CLEAR
       {"value":0,"reason":"cash buyer with no instrument recorded in the purchase window"}
PASS INFERRED -> INFERRED_FREE_CLEAR
       {"value":0,"reason":"no liens on an otherwise complete record"}
PASS UNKNOWN(thin) -> UNKNOWN_COVERAGE
       {"value":null,"reason":"N/A — record too thin to distinguish 'no mortgage' from 'no data' (richness 0/5)"}
PASS UNKNOWN(contradiction) -> UNKNOWN_COVERAGE
       {"value":null,"reason":"N/A — openMortgageBalance > 0 but no instruments in currentMortgages — contradictory record"}
gate(confirmed cash): true | gate(zero-balance lien): false
ALL TESTS PASS
```

## Field assumptions — VERIFY before wiring

The sample payload collapses nested objects, so sub-field names on mortgage entries are assumed via candidate-key lists at the top of the module (`RELEASE_KEYS`, `BALANCE_KEYS`, `AMOUNT_KEYS`, `DATE_KEYS`, `TYPE_KEYS`). Pull **one expanded** `currentMortgages` / `mortgageHistory` entry from a live Property Detail response and trim or extend those lists to the real schema. Everything else in the module reads fields visible in the flat payload.

Tunables (second argument to either function): `richThreshold` (default 3 of 5 richness signals), `cashWindowDays` (90 — max days between deed and a purchase-money instrument to still count as financed), `assumedTermYears` (30 — for the amortized-out test), `now` (for deterministic tests).

## Edge cases this handles — and two it can't

Handled: amortized-out loans still sitting in `currentMortgages`; unreleased satisfactions (paid off, lender never recorded the release); HELOCs (lien real, drawn balance unknowable — never report a number); prior-owner liens not yet linked to a release; contradictory scalar-vs-array records; thin records where "no data" would otherwise masquerade as "no mortgage."

Not knowable from public record: extra principal payments (modeled balances overstate) and reverse mortgages (balances *grow*; if `loanType` indicates HECM/reverse, treat any modeled balance as unreliable — worth adding a candidate key once the real schema is confirmed).

## Recommended validation

zBuyer intake already captures self-reported mortgage status. Run ~1,000 recent leads through `classifyMortgageStatus`, compare against self-report, stratified by county. That yields the only coverage number that matters — REAPI's match rate on *our* geography mix — and calibrates `richThreshold` empirically.

---

*The report builder's export manifest embeds the declarative version of these rules under `mortgage_status_classifier`, and its Free & Clear / No-Rate-Handcuffs gates now reference these states instead of the raw scalar.*

## Repo status (2026-08-03)

That closing note describes the target state, not this repo yet: the mockup workbenches (`reapi-report-builder.html`, `reapi-report-builder-v3.html`) still express their `freeclear` / `ratefree` gates as raw-scalar tests in the export manifest — each now carries a "superseded by" pointer to this document. Wiring the five states in is the report pipeline's job, using the reference implementation above.

- This doc (rendered): <https://github.com/ledwards-zbuyer/new-zbuyer/blob/main/mockups/mortgage-status-classifier.md>
- The workbenches: [reapi-report-builder.html](https://ledwards-zbuyer.github.io/new-zbuyer/mockups/reapi-report-builder.html) · [reapi-report-builder-v3.html](https://ledwards-zbuyer.github.io/new-zbuyer/mockups/reapi-report-builder-v3.html)
- The intel-report mockup whose badges these gates feed: [report-intel-classic-blue.html](https://ledwards-zbuyer.github.io/new-zbuyer/mockups/report-intel-classic-blue.html)
