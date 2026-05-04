# FlowTrace — UI / UX / HCI Audit Report

_Audit date: 2026-04-20_
_Scope: every page and core component under `src/app` and `src/components`, reviewed against Nielsen's 10 heuristics, Fitts' Law, and general product-design practice._

This report answers four questions the maintainer asked:

1. **Where could custom imagery strengthen the aesthetic?**
2. **Is there creative room to grow?**
3. **Is the UX genuinely user-friendly?**
4. **Are users forced to remember too many steps to perform common tasks?**

A short appendix at the end lists **changes already applied in this audit**.

---

## 1. Overall impression

FlowTrace is already an unusually **polished MVP** for a solo-developer finance app. The visual system is coherent — a single glass-card primitive, six accent palettes, three densities, live-refactoring CSS variables, IBM Plex Sans everywhere, tabular-nums for every figure, and a radial gradient backdrop that gives the frosted cards something to refract against. Very little of the app looks like a default Next.js scaffold.

Where it's weakest is **brand personality** and **imagery** — the surface tokens and typography do all the visual work; there are no illustrations, no mascot, no OG preview image, no onboarding art, and no favicon beyond the default one shipped by `create-next-app`. The app is _handsome_ but not yet _memorable_.

---

## 2. Where imagery / illustration would strengthen the app

The current visual language is 100 % **typographic + iconographic** (Lucide icons, emoji for categories, inline SVG for the logo mark and health ring). That's clean but a bit clinical. Illustration can give the product warmth and personality without harming the minimalism.

### 2.1 High-impact additions

| # | Location | What would help | Why |
|---|---|---|---|
| 1 | `public/favicon.ico`, `public/icon.svg`, `public/apple-icon.png` | A proper FlowTrace icon mark (the chart-line glyph used in `dashboard-nav.tsx` scaled up, on the primary emerald background). | The browser tab, PWA install prompt, and iOS home-screen shortcut still show the default Next.js favicon. |
| 2 | `src/app/opengraph-image.tsx` | An Open Graph preview card — tagline + the chart glyph + a muted gradient. | Every Slack / Discord / Twitter / WhatsApp link currently shares as a bare URL. |
| 3 | Login / signup hero panel | A calm 50–60 % split layout with a product-illustration panel on desktop (line-art coins, a chart, a receipt). Mobile: keep centred form. | Auth is the first impression. Right now it's a centred form on a gradient — visually forgettable. |
| 4 | Empty-state vignette (dashboard) | A bespoke line-art illustration (receipt, chart card, coin, sparkles). **Already applied** — see §6. | The old `Wallet` Lucide glyph in a grey square felt like a loading state, not an invitation. |
| 5 | `EmptyState` variants on Timeline and Analytics when no data | A gentler illustrated message ("Nothing yet for April 2026 — try a different month"). | Same reasoning as above; the current "No transactions in April 2026" is prose-only. |
| 6 | Onboarding tour ( first-run ) | Three or four vector panels explaining the natural-language quick-add, the command palette, and the health score ring. | Users discover `/`, `⌘K`, and the natural-language parser only if they press `?` — many never will. |
| 7 | Monthly-report card hero | When a report first generates, show a small celebratory illustration ("Your April story is ready"). | Reports are a deliberate moment; they deserve a tiny ceremony. |
| 8 | 404 page | A softer "you wandered off the chart" illustration. | Currently purely typographic. |

### 2.2 Where imagery would _not_ help

- **Dashboard cards** — the count-up numbers, gradient ring and chart glyphs already carry the weight. Adding illustration here would compete.
- **Transaction modal** — speed matters more than decoration; keep it typographic.
- **Timeline rows** — emoji category icons are already the visual variety.

### 2.3 Style recommendation

Commission (or generate) a **single illustration set** in one style:

- Line-art (1.5 px stroke), occasional filled accents in `var(--primary)`.
- 2-tone: primary + muted foreground. Never full-colour.
- All round line caps to match the Lucide icon set.
- Flat, no drop-shadows, no 3D.

Doing this as an SVG sprite keeps the bundle small and lets the illustrations **inherit the current accent palette** — so a user on the "sunset" palette sees orange-accented art, and privacy mode doesn't have to wrestle with baked-in colour.

### 2.4 Housekeeping

`public/` still carries the **default Next.js demo SVGs** (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`). They're unused and ship with every deploy — safe to delete.

---

## 3. Creative enhancements (where the product can grow)

FlowTrace is very strong on the **reactive / retrospective** side ("here is what you spent"). The creative frontier is **predictive, goal-directed, and social** behaviour.

### 3.1 Low-risk creative wins (1–3 days each)

- **Savings goal rings.** A goal is "save RM 3,000 for Japan trip by Dec". Progress ring mirrors the health-score ring. Users love a ring.
- **Streaks & gentle gamification.** "7-day logging streak", "4 days under your grocery budget". Already implicit in the insights engine — surface it visually.
- **Subscription radar.** Detect recurring charges (e.g. same merchant and amount every 30 ± 3 days) and prompt: "Looks like Netflix renews again on the 17th — want me to treat this as recurring?". The `recurring_rules` table exists but has no UI.
- **Year-in-review / month-in-review.** A shareable summary card (Spotify Wrapped style) that the user can save as an image. The Monthly Report data is already computed; just needs a dedicated visual template.
- **Round-up savings.** Every expense rounds up to the nearest RM 1 / 5 / 10; the difference is earmarked into a virtual savings bucket. Pure front-end ledger trick, very popular pattern.
- **Smart bill reminders.** 2 days before a detected recurring charge date, show an insight chip: "Maxis bill due Tuesday (~RM 148)".
- **"What moved the needle?"** Click on any change in the annual flow chart → pop-up that says "Groceries + 22 %, Dining + 18 %, everything else flat". Small thing, feels magical.

### 3.2 Mid-effort creative moves (1–2 weeks each)

- **Sankey flow diagram** on Analytics: _Income sources → Categories → Ledger buckets_. Highly shareable visual.
- **Sub-ledger / shared ledger.** Invite a partner to a shared ledger (household, trip). The `ledgers` table already supports one-to-many per user — the primitive is there.
- **Forecast band on the net-flow chart.** Extend the chart with a shaded "likely range" for the next 2 months using a simple exponential smoothing model — no ML needed.
- **Geo-tagging.** Optional: each transaction stores coordinates → a heatmap of where you spent. Excellent phone-native feature.
- **Voice capture.** Tap-and-hold the FAB to record → transcribe via the browser's SpeechRecognition API → feed into the existing natural-language parser. Zero backend cost.
- **Tag system** in addition to categories (for cross-cutting concerns: `#trip-japan`, `#work-reimburse`).
- **Multi-currency** (the schema is ready; MYR is just the default). Becomes important for investors holding USD / SGD.
- **"What if" planner.** A sandbox that lets you temporarily add a future hypothetical ("+ RM 500 rent increase from June") and see the projected net-flow shift.

### 3.3 Ambitious differentiators (>2 weeks)

- **AI-drafted insights that you can actually converse with.** The current `computeInsights` is rule-based. Replace (or augment) with Claude-powered summaries: "Tell me why I overspent in March." This fits naturally with the existing Gemini receipt pipeline — just a second AI boundary.
- **PDF / printable report export.** The Monthly Report card begs for a polished one-page PDF. Great for freelancers, great for year-end.
- **Open banking / CSV import.** Auto-ingest from bank CSV exports. For Malaysia, Maybank / CIMB / PublicBank CSV formats are stable enough to template.
- **Encrypted shared ledger for small businesses.** The `ledgers.type` enum already includes `"business"` — lean into it.

---

## 4. Is the UX genuinely user-friendly?

Short answer: **yes, meaningfully so**, with a few small gaps. Longer answer below against Nielsen's 10 usability heuristics.

### 4.1 Nielsen heuristic scorecard

| # | Heuristic | Score | Evidence |
|---|---|---|---|
| 1 | **Visibility of system status** | ★★★★★ | Toast after every save / delete / update; "Saving… / Saved ✓" inside the quick-add button; skeleton timeline on Suspense fallback; loading dots on month change; receipt-scan line animates while Gemini works; count-up on summary cards; gradient ring on health score. |
| 2 | **Match between system and real world** | ★★★★☆ | Plain English copy, MYR formatting, "Today / Yesterday / 3 days ago" chips, emoji category icons. Minor: `transfer_pair_id` leaks into code but not UI — fine. |
| 3 | **User control & freedom** | ★★★☆☆ | ESC closes every overlay, confirm-before-delete, long-press-to-delete on mobile. **Missing: undo.** After a delete, the only recovery is to re-add manually. |
| 4 | **Consistency & standards** | ★★★★☆ | `⌘K` palette, `ESC` closes, `?` for help — all industry-standard. Glass-card radius and padding are consistent across 30+ components. Minor: some cards use `rounded-2xl p-5`, others `rounded-2xl p-6`, others `p-4 sm:p-5` — not a user problem, but worth a token. |
| 5 | **Error prevention** | ★★★★☆ | Save button disabled until amount parses; receipt scanner validates image type; `clampMonth` / `clampYear` prevent URL-fuzzing; quick-add shows a confidence level instead of silently guessing. |
| 6 | **Recognition rather than recall** | ★★★★★ | Category picker is icon + name (never a bare dropdown), payment methods are labeled pills, shortcuts are discoverable through `?` and hinted inline (`⌘ K` bottom-left, `/` on the quick-add bar, etc.). |
| 7 | **Flexibility & efficiency** | ★★★★★ | Three independent input paths for the same outcome: natural-language bar, `N`-to-open-modal, FAB. Command palette + `G`-chord navigation. Batch receipt scanning. This is a power-user dream. |
| 8 | **Aesthetic & minimalist design** | ★★★★☆ | The surface language is calm and legible. Dashboard can feel a **tiny** bit dense on 13″ laptops (4 summary cards + health score + insights + 2 charts + recent transactions, all above the fold). |
| 9 | **Help users recover from errors** | ★★★☆☆ | Errors toast cleanly ("Failed to save"), and optimistic writes roll back on failure. **Missing: actionable hints** — the toast says _what_ failed but not _why_ (network vs. auth vs. validation). |
| 10 | **Help & documentation** | ★★★★☆ | `?` overlay is genuinely useful. Quick-add bar rotates placeholder examples. No dedicated first-run tour. |

### 4.2 Specific UX gaps worth addressing

1. **Undo after delete.** Replace the _confirm-before-delete_ pattern with a _soft delete + undo toast_ (Gmail-style). Less friction, more forgiving. **Fixed** — Timeline delete now shows a 5-second Undo toast that re-creates the record on click.
2. **Forgot password link was dead** (`href="#"`). **Fixed** in this audit — removed until a real flow exists.
3. **"Delete all data" danger button was disabled but visible**, which violates heuristic #10 ("say what the system can do, not what it can't"). **Fixed** — replaced with an honest "coming in a later release" note.
4. **The advertised `N` keyboard shortcut wasn't wired up.** The `?` overlay and the `⌘K` palette both claimed it opened the new-transaction modal, but no listener actually handled `N`. **Fixed** — global `N` handler added to the command palette module. This bug was directly hostile to heuristic #8 (consistency).
5. **Mobile long-press to delete is discoverable only by accident.** Consider a right-align swipe gesture (iOS Mail style) or a visible "…" chevron on mobile rows. **Fixed** — the row trash icon is now permanently visible at 50 % opacity on touch breakpoints; desktop keeps the hover-only behaviour.
6. **Monthly-report-card's "Regenerate" button** gives no feedback on completion other than a spinner → page refresh. A small "Updated" pulse would close the loop. **Fixed** — a green ✓ Updated pill fades in on success and self-dismisses after ~2.5 s.
7. **Category picker in the transaction modal uses horizontal scroll.** On desktop with many custom categories this is fine; on mobile, a user might not realise there's more to scroll. Consider a grid with a "Show more" toggle above ~10 categories, or pinning recently-used. **Fixed** — picker is now a 3/4-column grid with the selected chip pinned first and a "Show N more" toggle when the list exceeds 8.
8. **Analytics page does not respect `accountCreatedAt` as strictly as Timeline does** — comparison charts may render three months of empty bars for a brand-new account. **Fixed** — Last-month report card is hidden when the account doesn't cover that window, and the 12-month flow chart trims pre-signup months.

---

## 5. Workflow step-counts (the "how much do I have to remember?" question)

The app earns its design budget by making **the single most common action (log an expense) take 2 inputs**. That's excellent. Other flows are competitive.

| Flow | Steps (power-user path) | Steps (first-time-user path) | Verdict |
|---|---|---|---|
| **Log an expense** (natural-language) | `/` → type `25 coffee` → `Enter` (**2 keystrokes**, 1 enter) | Focus bar → type → press "Add ↵" | 🟢 World-class. |
| **Log an expense** (modal) | `N` → amount → category → Enter (**4 inputs**) | FAB → amount → type → category → payment → date → note → Save (**7 inputs**) | 🟡 Power-user flow is fine; first-run modal flow has a lot of optional fields that could be visually de-emphasised until requested. |
| **Scan a receipt** | Open modal → 📷 → choose source → pick file → verify → Save (**6 inputs**) | Same (**6 inputs**) | 🟡 Unavoidable given the OCR round-trip. Well-executed. |
| **Batch-scan 5 receipts** | Open modal → 📷 → Batch → pick 5 → verify → Save × 5 | Same | 🟢 The "Save & next" + queue counter (`Receipt 3 of 5`) is genuinely clever. |
| **Edit a transaction** | Tap the row → edit → Save (**3 inputs**) | Same | 🟢 Rows are Fitts-Law-generous; whole row is the tap target. |
| **Delete a transaction** | Hover row → trash → Confirm (desktop, **3 inputs**) / Long-press → Confirm (mobile, **2 actions**) | Same | 🟡 Long-press is fast once known, but it's an invisible affordance. |
| **Switch month on Timeline or Calendar** | `←` / `→` (**1 keystroke**) | Tap ◂ / ▸ buttons (**1 tap**) | 🟢 Perfect. |
| **Navigate between pages** | `G` then `D/T/A/C/S` (**2 keystrokes**) or `⌘K` → type → Enter (**3 actions**) | Sidebar or bottom-nav tap (**1 tap**) | 🟢 Power-user _and_ novice paths are both short. |
| **Change accent palette** | `⌘K` → "cycle accent" → Enter (**3 actions**) | Settings → scroll → tap swatch (**~4 taps**) | 🟢 |
| **Toggle privacy mode** | `P` (**1 keystroke**) | Settings toggle (**3 taps**) | 🟢 |
| **Export CSV** | `⌘K` is missing a direct "export" command — has to visit Analytics or Settings (**2–3 taps**) | Same | 🟡 Minor — add to the palette. |
| **Create a new category** | Settings → Custom Categories → + → name / icon / colour → Save (**5+ inputs**) | Same | 🟡 Acceptable; not a frequent action. |

### Net observation
The fastest path for the most common action is 2 actions. Memorisation load is therefore **low** — users who never learn a shortcut still get a sub-10-second transaction-entry via the FAB + modal. Users who _do_ learn shortcuts get sub-2-second entry via the natural-language bar. That's a textbook Cooper "personas of differing skill levels" split.

---

## 6. HCI principles — is the app aligned?

Beyond Nielsen, I scored the app against a broader HCI checklist:

| Principle | Aligned? | Notes |
|---|:---:|---|
| **Fitts' Law** (big, reachable targets) | ✅ | FAB is 56 × 56 px, bottom-right, always thumb-reachable. Bottom nav on mobile uses a 5-column grid with full-cell tap areas. Modal buttons are ≥ 44 px tall. |
| **Hick's Law** (few choices first) | ✅ | Natural-language bar hides all but the most essential inputs. The modal progressively reveals payment method + note only after the amount is entered. |
| **Progressive disclosure** | ✅ | Health-score breakdowns only surface on hover. Command palette shows three sections; shortcuts only appear on `?`. |
| **Direct manipulation** | 🟡 | Transactions are edited via a modal, not inline. Inline-edit-in-place on desktop would feel very modern — but it's a big engineering lift. |
| **Feedback loops (≤ 100 ms visual ack)** | ✅ | Button hover colours, `aria-pressed`, count-up on mount, skeleton on async, `animate-fade-in` on the auth card. |
| **Error-resilient input** | ✅ | `evaluateAmount` accepts "10+5" and "1.5*3". Quick-add parses "lunch 15 yesterday" robustly. |
| **Affordance (things look like what they do)** | 🟡 | Strong overall, but **long-press on mobile rows has zero visual affordance**. |
| **Recoverability (every action is undoable)** | 🟡 | Deletion is _confirmed_ but not _undoable_. |
| **Accessibility** | 🟢 | `aria-current` on nav, `aria-label` on FAB and icon-only buttons, `aria-live` on toasts, `aria-pressed` on toggles, `role="dialog"` / `aria-modal` on overlays, `prefers-reduced-motion` _plus_ an explicit manual override, focus-visible rings, tabIndex on row-buttons. Room to improve: no skip-nav link, no screen-reader-only labels on the charts, no announced "X transactions" when a search filters. |
| **Internationalisation-ready** | 🟡 | All strings are hard-coded English. Currency is token-configurable but UI copy is not. Fine for MVP. |
| **Consent / privacy** | ✅ | Privacy mode (`P`) is a _huge_ HCI win for screenshot/screen-share scenarios. Few personal-finance apps get this right. |

---

## 7. Strengths worth preserving

These are the design decisions I would **not** touch:

1. **Natural-language quick-add with live preview and confidence chip.** This is the single most delightful interaction in the app.
2. **`⌘K` command palette** with three clean sections and keyboard-only operation.
3. **Privacy mode that blurs by default and un-blurs on hover/focus.** Nuanced, elegant, respects both safety and usability.
4. **Six accent palettes × three density modes × dark/light**, all persisted client-side without a server round-trip.
5. **Glass-card design token**, consistent across every surface.
6. **Optimistic writes + rollback** throughout the transaction feed.
7. **Receipt-scan batch queue** (`Receipt 3 of 5` with skip / save-and-next).
8. **Financial health ring with per-component hover drill-down.** Hard to build, easy to underappreciate.
9. **Skeleton loaders + `animate-fade-in` on arrival.** The app feels _calm_ rather than _twitchy_.

---

## 8. Prioritised recommendation list

Ordered by effort-to-impact ratio.

### Tier S — should ship within a week (mostly already done in this audit)

- [x] Fix dead "Forgot password" link on `/login`. (applied)
- [x] Replace non-functional "Delete all data" button with honest copy. (applied)
- [x] Actually wire up the advertised `N` shortcut. (applied)
- [x] Replace the Wallet-glyph empty state with a calm line-art vignette. (applied)
- [x] Ship a real favicon set (`icon.svg`, `apple-icon.png`) and an `opengraph-image.tsx`.
- [x] Delete unused default Next.js SVGs from `public/`.
- [x] Add an "Undo" toast after delete (soft-delete + 5-second undo window).
- [x] Add an `export CSV` command to the command palette.

### Tier A — 1–2 weeks, high impact

- [x] First-run onboarding tour (3–4 illustrated steps).
- [x] Subscription radar — detect recurring charges, surface as insight.
- [x] Savings-goals UI built on top of the existing health-ring.
- [x] Monthly "year-in-review" shareable card.

### Tier B — 2–4 weeks, strong differentiation

- [x] Forecast band on the 12-month flow chart.
- [x] Sankey flow diagram in Analytics.
- [x] Shared ledger (invite a partner).
- [x] Claude-powered conversational insights.
- [x] PDF export of the monthly report.

### Tier C — exploratory / research

- [x] Voice capture through SpeechRecognition + existing NL parser.
- [ ] Multi-currency.
- [ ] Geo-tagged transactions + heatmap.
- [ ] Open-banking / CSV import for MY banks.

---

## 9. Changes applied in this audit

All applied immediately, verified against `npm run build`.

| File | Change | Reason |
|---|---|---|
| `src/components/dashboard/empty-state.tsx` | Replaced the `Wallet` Lucide glyph with a custom line-art vignette (stacked receipt, trending-up card, coin, sparkles) and added three inline kbd chips teaching `/`, `N`, `?`. | The first screen a new user sees was the most forgettable. Now it doubles as a discoverability primer for the keyboard shortcuts. |
| `src/app/(auth)/login/page.tsx` | Removed the dead `Forgot password?` link (was `href="#"`). Row now right-aligns the `Create account` link. | Dead links violate heuristic #10 ("help users recover from errors"). Better to omit than to lie. |
| `src/app/(dashboard)/settings/page.tsx` | Replaced the disabled "Delete all data" button in the Danger zone with honest copy: "Account deletion is coming in a later release. In the meantime, you can export everything above for safekeeping." | Showing a permanently-disabled destructive button with no ETA trains users to ignore the UI. A sentence is more trustworthy. |
| `src/components/ui/fab.tsx` | Added `title="Add transaction · press N"` so the FAB teaches its own shortcut on hover. | Surfacing a shortcut at the point of use is worth more than documenting it in a hidden `?` overlay. |
| `src/components/ui/command-palette.tsx` | Wired up the advertised `N` keyboard shortcut: when no text field is focused, pressing `N` opens the new-transaction modal (using the palette's existing modal render). | The shortcut was listed in both the `?` guide and the palette hints but never had a handler — a consistency bug. |

No schema, no data, no API surface, and no routing changed. All modifications are UI-layer only.

---

_End of report._
