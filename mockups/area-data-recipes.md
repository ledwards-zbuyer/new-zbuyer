# Area-data recipes — ZIP days-on-market, HUD FMR, median income

The token-free report pipeline makes two outside calls: the REAPI AVM pull and
**one AI request** that returns property/area data. Property-record fields
(facts, sale history, liens, comps, flags, assessor split) are standard
property-data territory; the only three fields that are *area* data the AI
request must hunt down are:

| # | Field | Feeds |
|---|-------|-------|
| 6 | ZIP average days on market | Two-timelines 54d/~109d, ledger, captions |
| 7 | HUD Fair Market Rent by bedroom | The rent ladder |
| 10 | Area median household income | Equity in human terms |

This doc gives your dev (a) a **paste-ready prompt block** written for a
low-level model — imperative steps, literal URLs, exact JSON paths, sanity
bounds, and null-on-failure rules, no judgment calls — and (b) setup/caching
notes, including the zero-AI alternatives.

---

## Paste this into the property/area prompt

Your code substitutes every `{PLACEHOLDER}` before the prompt is sent — the
model never builds or transforms a string. Build these from the subject
property's address:

| Placeholder | Rule | Example |
|---|---|---|
| `{ZIP}` | 5-digit ZIP | `65802` |
| `{CITY_URL}` | city, Title-Case, spaces → hyphens | `San-Francisco` |
| `{ST}` | 2-letter state, UPPER | `MO` |
| `{st}` | 2-letter state, lower | `mo` |
| `{city_url}` | city, lowercase, spaces → hyphens | `san-francisco` |
| `{STATE_URL}` | full state name, Title-Case, spaces → hyphens | `New-York` |
| `{HUD_TOKEN}` | HUD USER API token (setup below) | — |
| `{CENSUS_KEY}` | Census API key (setup below — required at our volume) | — |

```
=== AREA DATA (3 fields) — follow these steps exactly, do not improvise ===

GLOBAL RULES
- Use your fetch tool for every URL below. {ZIP} is the subject property's
  5-digit ZIP code — it is already substituted into the URLs.
- Never invent, estimate, or round a number you did not find. If a step
  fails, use that field's FALLBACK. If every fallback fails, set the field
  to null and continue.
- A number counts only if it passes the SANITY CHECK for its field.
  A number that fails the check = that step failed.
- Strip "$" and "," from numbers before output.

FIELD 1: zip_avg_dom — average days on market near ZIP {ZIP}
Work through the LEVELS in order. STOP at the first level that gives you a
number passing the SANITY CHECK, and record which level it was. This field
must end with a number — the last level is the whole country.

HOW TO READ A PAGE (same at every level): in the page text, find the first
occurrence of the phrase "days on market". Take the whole number right
before or right after that phrase. Example: "homes sell after 54 days on
the market" -> 54.

LEVEL 1 — ZIP:
  a. Fetch: https://www.redfin.com/zipcode/{ZIP}/housing-market
  b. If a failed: fetch
     https://www.realtor.com/realestateandhomes-search/{ZIP}/overview
     and find "Median days on market"; take the number next to it.
  c. If b failed: web-search:  median days on market {ZIP}
     Accept a number ONLY from redfin.com, realtor.com, or rockethomes.com.
LEVEL 2 — CITY (only if every Level 1 step failed):
  a. Fetch: https://www.realtor.com/realestateandhomes-search/{CITY_URL}_{ST}/overview
     and find "Median days on market"; take the number next to it.
  b. If a failed: fetch https://www.rockethomes.com/real-estate-trends/{city_url}-{st}
  c. If b failed: web-search:  median days on market {CITY_URL} {ST}
     (same three allowed domains).
LEVEL 3 — STATE (only if every Level 2 step failed):
  a. Fetch: https://www.redfin.com/state/{STATE_URL}/housing-market
  b. If a failed: web-search:  median days on market {STATE_URL} state
     (same three allowed domains).
LEVEL 4 — NATIONAL (only if every Level 3 step failed):
  a. Fetch: https://www.redfin.com/us-housing-market
  b. If a failed: web-search:  median days on market united states
     (same three allowed domains).

SANITY CHECK (every level): whole number between 5 and 365.
Record: the number, the level it came from ("zip", "city", "state" or
"national"), the domain, and the month the page describes if shown
(format YYYY-MM).

FIELD 2: hud_fmr — HUD Fair Market Rents by bedroom for ZIP {ZIP}
1. Fetch (GET): https://www.huduser.gov/hudapi/public/usps?type=2&query={ZIP}
   with HTTP header:  Authorization: Bearer {HUD_TOKEN}
2. In the JSON reply, open data.results (a list). Pick the entry with the
   LARGEST tot_ratio. Copy its geoid — 5 digits, example "29077".
3. Fetch (GET): https://www.huduser.gov/hudapi/public/fmr/data/{geoid}99999
   — that is the geoid from step 2 with 99999 appended — with the same
   Authorization header.
4. In the JSON reply, open data.basicdata.
   - If basicdata is a LIST: use the entry whose zip_code equals {ZIP}.
     If no entry matches, use the first entry in the list.
   - If basicdata is a single OBJECT: use it.
5. Copy these five numbers exactly as named:
   Efficiency, One-Bedroom, Two-Bedroom, Three-Bedroom, Four-Bedroom.
   Also copy the year field.
6. SANITY CHECK: every rent between 300 and 6000.
7. FALLBACK: none. If any step fails, set all five rents to null.

FIELD 3: median_household_income — for ZIP {ZIP}
1. Fetch (GET):
   https://api.census.gov/data/2023/acs/acs5?get=NAME,B19013_001E&for=zip%20code%20tabulation%20area:{ZIP}&key={CENSUS_KEY}
2. The reply is a JSON list with exactly 2 rows (a header row, then a data
   row). In the SECOND row, take the SECOND item. It is a string like
   "58917". Convert it to a whole number.
3. FALLBACK (use if step 1 errored or the number is negative): take the
   geoid you copied in FIELD 2 step 2. Its first 2 digits are the state
   code, its last 3 digits are the county code. Fetch:
   https://api.census.gov/data/2023/acs/acs5?get=NAME,B19013_001E&for=county:LAST3&in=state:FIRST2&key={CENSUS_KEY}
   (substitute LAST3 and FIRST2). Read the reply the same way as step 2.
4. SANITY CHECK: between 15000 and 300000.

OUTPUT — add exactly this object to your JSON answer:
"area_data": {
  "zip_avg_dom": { "days": <number|null>, "geo": "<zip|city|state|national|null>",
                   "source": "<domain|null>", "as_of": "<YYYY-MM|null>" },
  "hud_fmr": { "efficiency": <number|null>, "br1": <number|null>, "br2": <number|null>,
               "br3": <number|null>, "br4": <number|null>, "fy": "<year|null>" },
  "median_household_income": { "dollars": <number|null>, "geo": "<'ZCTA {ZIP}' or county NAME>",
                               "vintage": "ACS 2023 5-year" }
}
```

---

## One-time setup (dev)

- **HUD token** (fields 2's two calls): free. Register at
  https://www.huduser.gov/hudapi/public/register — create an access token in
  the account page. Tokens are long-lived JWTs; inject as `{HUD_TOKEN}`.
- **Census key — REQUIRED at our volume**: the Census API allows only ~500
  unkeyed requests per day per IP, and we generate ~2,000 requests/day.
  Register a free key at https://api.census.gov/data/key_signup.html
  (instant, one-time) and inject it as `{CENSUS_KEY}` — the URLs above
  already carry the parameter. Keyed access has no published hard cap
  (reasonable use expected — the ZIP cache below keeps us far under any
  radar).
- **Vintage bumps**: change `2023/acs/acs5` to the newest vintage each
  December (2024 5-year released Dec 2025, etc.). HUD FMRs roll each federal
  fiscal year (Oct 1) — the API's default year tracks this automatically.

## Why these sources / gotchas

- **Field 1 has no official free API.** Redfin/Realtor market pages carry the
  number in plain page text, which is why the recipe is fetch-and-read with a
  domain-restricted search as last resort — and a ZIP → city → state →
  national ladder so it always lands on a number. Mind their terms of
  service. If you want a guaranteed answer even with every fetch down, add a
  dev-owned constant as a final step (e.g. `days: 55, geo: "national",
  source: "default"`).
  **Display note:** the report's captions say "average 54d in 65802" — only
  say "in {ZIP}" when `geo` is `zip`; for city/state/national numbers the
  copy should name what the number actually describes (e.g. "average 51d in
  Springfield" / "…statewide" / "…nationally").
  **Most reliable alternative (zero tokens):** Realtor.com Research publishes
  monthly CSVs at every rung of the same ladder — ZIP, county, metro, state,
  national (`RDC_Inventory_Core_Metrics_Zip.csv` etc. from
  https://www.realtor.com/research/data/ — columns `postal_code` /
  `median_days_on_market`). Download monthly in code, look up ZIP first and
  walk up the same ladder, and pass the number INTO the prompt instead
  (then delete FIELD 1 from the block).
- **Fields 2 and 3 are deterministic GETs** — they don't need a model at all.
  The prompt versions exist to keep everything inside the one AI request; if
  you'd rather, call them from the backend and pass the values in.
- **SAFMR branching** (field 2 step 4): in Small Area FMR metros HUD returns
  `basicdata` as a per-ZIP list; elsewhere it's one county/metro-wide object
  that applies to every ZIP in it. The branch handles both.
- **ZCTA caveat** (field 3): Census ZCTAs approximate USPS ZIPs; a few
  PO-box-only ZIPs have no ZCTA — that's what the county fallback is for.
- **Cache by ZIP — this is the volume plan, not a nice-to-have**: at ~2,000
  leads/day, hitting these sources per-lead means ~2k Census calls and ~4k
  HUD calls a day (field 2 is two GETs per uncached lead), plus per-token
  rate limiting on HUD's side. All three values change slowly — days on
  market monthly, FMR and income yearly — so keep a `zip → {dom, fmr,
  income, fetched_at}` table, look it up BEFORE the AI request, and only let
  the model fetch when the ZIP is missing or stale (then write back).
  After warm-up, nearly every lead is a cache hit and the outside APIs see
  only first-time-ZIP traffic. Throttle any backfill/burst gently.
