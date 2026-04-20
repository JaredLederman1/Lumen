# Illumin state-of-the-codebase audit

## Metadata

- Date generated: 2026-04-20
- Git branch: main
- Current commit: 90f3bf937f2a55033d59d2f26f52fa6f42e21190 (90f3bf9, "Ship dashboard grid, widget library, and debt trajectory card")
- Monorepo root: `/Users/jaredlederman/Illumin`, with the active web app at `apps/web/` (Next.js 16.1.6)
- Next.js version: 16.1.6 (from `apps/web/package.json`)
- Tailwind version: 4.x (Tailwind CSS v4, CSS-only config; no `tailwind.config.js`/`.ts` anywhere)
- Node version on this machine: v24.11.1
- React version: 19.2.3
- Total route count (page.tsx + layout.tsx under `apps/web/app/`, excluding API): 24 pages + 2 layouts
- Total API route count (`app/api/**/route.ts`): 46 files
- Total component files under `apps/web/components/`: 74 `.ts`/`.tsx` files
- Total Prisma models in `apps/web/prisma/schema.prisma`: 13 (User, FinancialAction, Budget, Account, Security, Holding, AnalyticsHolding, Transaction, NetWorthSnapshot, OnboardingProfile, CategoryRule, MerchantRenameRule, ChecklistItem, RecurringExclusion, BudgetRollover, EmploymentBenefits — 16 total including FinancialAction; see Cross-domain notes below)

Note on monorepo: `CLAUDE.md` describes a single-app layout at repo root (e.g. `app/`, `components/`, `prisma/`). The actual layout is a workspaces monorepo (`apps/web`, `apps/mobile`, `apps/Untitled`, `packages/lib`, `packages/types`). All findings below are from `apps/web/`.

---

# Onboarding

## What exists

- `apps/web/app/onboarding/page.tsx` orchestrates a 6-step flow with explicit phases `welcome | steps | preview | reveal`. Resume logic on mount fetches `/api/user/onboarding` and jumps to the first incomplete step. `localStorage` key `illumin_onboarding_intro_seen` gates whether returning users see `WelcomeIntro`.
- Step components under `apps/web/components/onboarding/`:
  - `Step1Basics.tsx` — age, city, state, annual salary, savings rate (0-50% slider), retirement age (45-75 slider). Renders one-field-per-screen on mobile via a local `subStep` state machine (`age | location | income | savings | retirement`) with a sticky `LiveProjection` at top. On desktop, renders every field on one page with a 300px sticky `LiveProjection` side card (`gridTemplateColumns: '1fr 300px'`).
  - `Step2Employment.tsx` — job title, employer, employer start date. Single-screen form, no mobile substeps.
  - `Step3Contract.tsx` — PDF upload to `/api/user/benefits/extract`. Writes result to `EmploymentBenefits` and stashes the JSON on `OnboardingProfile.contractParsedData` + `contractUploadedAt`. Explicit "Skip this step" path.
  - `Step4Goals.tsx` — target retirement income, emergency fund months target (0-24 slider, default 6), risk tolerance (1-5 slider with labels "Very conservative" through "Very aggressive"). Single-screen form, no mobile substeps.
  - `Step5Plaid.tsx` — uses `usePlaidLinkTokenQuery`/`usePlaidExchangeMutation`. Enforces that at least one linked account has `classification === 'asset'`; shows a warning box "Asset account required" if only credit came through. "Skip for now" path calls the finalize endpoint with `skipped: true`.
  - `Step6Reveal.tsx` — "cost of waiting one year" using `projectWealth` future-value formula at 7% real return.
- `WelcomeIntro.tsx` + `TickingCounter.tsx` — cinematic intro (recent commit b42fbde).
- `DashboardPreview.tsx` — shown in the `preview` phase after finalize, before pushing to `/dashboard/accounts`.
- `ProgressBar.tsx` — step-complete progress.
- `LiveProjection.tsx` — computes `projectWealth(age, salary, savingsRate, retirementAge)` live. Placeholder state kicks in if any required field is blank. Has a `compact` prop for mobile sticky usage.
- `shared.ts` — `heading`, `body`, `helperText`, `label`, `muted`, `continueBtn`, `secondaryBtn`, `textInput` style tokens. DEFAULTS: `savingsRate: 20`, `retirementAge: 65`, `emergencyFundMonthsTarget: 6`, `riskTolerance: 3`.
- API: `apps/web/app/api/user/onboarding/route.ts` — GET returns `{ profile, skippedAssetLink }`; POST supports partial saves per step plus a `finalize: true` path that validates step-1 fields and enforces asset-account gating (`asset_account_required` error) unless `skipped: true`. This contradicts `CLAUDE.md` which says the route "does not persist to the database. It only logs the payload." The file is 271 lines and does real Prisma writes.
- `useIsMobile` hooks: two separate implementations exist.
  - `apps/web/hooks/useIsMobile.ts` (global) — uses `window.innerWidth <= 768`, resize listener, SSR default `false`.
  - `apps/web/components/onboarding/useIsMobile.ts` (onboarding-specific) — uses `matchMedia('(max-width: 767px)')`, SSR default `false`, default breakpoint 768 so the effective threshold is `< 768`. Comment says "matching the breakpoint in globals.css."
- Breakpoint in `apps/web/app/globals.css`: `@media (max-width: 768px)`.

Touch-target dimensions in `apps/web/components/onboarding/shared.ts`:
- `textInput`: `padding: '12px 14px'` (no explicit `minHeight`).
- `continueBtn`: `padding: '13px 36px'` (no explicit `minHeight`).
- `secondaryBtn`: `padding: '10px 22px'` (no explicit `minHeight`).
No `min-height` or `minHeight` appears in `shared.ts` for any of these three styles.

## What is placeholder or partial

- `Step6Reveal.tsx` — static copy block. No AI narrative, no dynamic personalization beyond the projection math.
- `CLAUDE.md` claim that onboarding is "API stubbed" is out of date: the route persists to `onboarding_profiles`.

## What appears not to exist

- No "I don't know" or "skip field" UX on any individual field inside a step besides the Step 2 and Step 3 whole-step skip buttons.

## Ambiguous

- Two `useIsMobile` hooks (global `@/hooks/useIsMobile` and onboarding-local `./useIsMobile`). AMBIGUOUS: unclear whether the onboarding duplicate is intentional (slightly different implementation using `matchMedia` rather than `innerWidth`) or a leftover before the global hook existed. Behaviour is nearly identical but not bit-identical.

---

# Dashboard & core UI

## What exists

- Layout: `apps/web/app/dashboard/layout.tsx` wraps children in `DashboardProvider` + `TooltipProvider`, renders `Sidebar` (desktop), `Header`, `PageTransition`, `MobileNav` (mobile fixed bottom), `GlobalTooltipRenderer`, and `CoachWidget`. Background color is hardcoded to `#080B0F` at `dashboard/layout.tsx:14` (a near-black), while `globals.css --color-bg` is `#141412` (warm off-black).
- Top-level dashboard route `apps/web/app/dashboard/page.tsx` has device-aware branches:
  - `DashboardDesktop` — renders `HeroRow` + `NetWorthCard` + `NetWorthChartPlaceholder` (for liability-only) + `DashboardGrid` (Priority / Context / Reference rows).
  - `DashboardMobile` — renders `HeroRow` + a vertical stack of `MobileCard`s: net worth hero, total assets/liabilities split, net-worth chart, spending donut, 6-month bar, recent transactions.
- `DashboardGrid.tsx` → `PriorityRow` / `ContextRow` / `ReferenceRow`, with dedup via `PRIORITY_ROW[state]` excluding those IDs from Context and Reference.
- Widget registry `components/dashboard/widgetRegistry.tsx` maps every `WidgetId` to a component. All 19 widgets enumerated in `components/dashboard/widgetIds.ts`: `net-worth-chart`, `spending-donut`, `cash-flow`, `recurring-charges`, `opportunity-cost`, `portfolio`, `recent-transactions`, `goals-progress`, `health-score`, `account-balances`, `debt-trajectory`, `emergency-fund-gauge`, `match-setup`, `match-gap`, `tax-advantaged-capacity`, `category-concentration`, `wealth-trajectory`, `advanced-strategies`, `link-asset-account`.
- Hero state machine `lib/dashboardState.ts` exports `DashboardState = 'PRE_LINK' | 'LIABILITY_ONLY' | 'DEBT_DOMINANT' | 'FOUNDATION' | 'MATCH_GAP' | 'OPTIMIZING' | 'SPENDING_LEAK' | 'OPTIMIZED'`. Hero variants live under `components/dashboard/hero/`: `HeroPreLink`, `HeroLiabilityOnly`, `HeroDebtDominant`, `HeroFoundation`, `HeroMatchGap`, `HeroOptimizing`, `HeroSpendingLeak`, `HeroOptimized`, plus shared `HeroShell.tsx`.
- Dashboard widgets (under `components/dashboard/widgets/`):
  - `NetWorthWidget.tsx` — real data via `useNetWorthHistoryQuery`; empty-state returns "Building history" card; populated state shows 30d change, all-time change, and `NetWorthChart`.
  - `OpportunityCostWidget.tsx` — real data via `useOpportunityQuery`; empty state copy "Nothing sitting idle."; populated state shows "10-year foregone growth" as the hero figure with explainer sentence; CTA "Open calculator →" → `/dashboard/opportunity`.
  - `SpendingDonutWidget.tsx`, `CashFlowWidget.tsx`, `RecurringChargesWidget.tsx`, `PortfolioWidget.tsx`, `RecentTransactionsWidget.tsx`, `GoalsProgressWidget.tsx`, `HealthScoreWidget.tsx`, `AccountBalancesWidget.tsx`, `MetricDisplay.tsx`, `WidgetCard.tsx`. `RecentTransactionsWidget.tsx` pulls `useDashboard()` transactions/accounts and reuses `TransactionRow`.
- Placeholder cards (under `components/dashboard/placeholders/`):
  - `DebtTrajectoryCard.tsx` — takes `annualInterestCost`, `highAprDebtTotal`, `scenarios` from `PriorityMetrics`. Formats real avalanche/minimum payoff results.
  - `EmergencyFundGaugeCard.tsx`, `MatchGapCard.tsx`, `MatchSetupCard.tsx`, `TaxAdvantagedCapacityCard.tsx`, `CategoryConcentrationCard.tsx`, `WealthTrajectoryCard.tsx`, `AdvancedStrategiesCard.tsx`, `LinkAssetAccountCard.tsx`.
- Data provider: `lib/dashboardData.tsx` `DashboardProvider` fans out a single React Query `useDashboardStateQuery` (hitting `/api/dashboard/state`) plus sibling queries. Server-computed metrics are merged with client-side fallback derivations in `useDashboardHeroState.ts`.
- `NetWorthCard.tsx` — reusable block on the dashboard overview. Uses `useCountUp` for animated figures. Hover state swaps border/background via `var(--color-surface-hover)`.
- `TransactionRow.tsx` — **two-line layout**: line 1 merchant name (mono, 16px, weight 500); line 2 middot-separated meta (date · account label · category · pending · recurring · tags). Includes:
  - Inline edit via click-to-open, with merchant input, category `<select>`, "Apply to all transactions from this merchant" checkbox (pre-checked when `needsLabeling`).
  - Dispute sub-view with three options: "I don't recognize this charge", "The amount seems incorrect", "This is a duplicate", each mapped to a boilerplate response string.
  - Tag editor popover; tags saved via `useUpdateTransactionTagsMutation` → `PATCH /api/transactions/[id]/tags`.
  - `rowVariants` exported as `Variants` type (framer-motion).
  - "Needs labeling" blue left-border + info-bg treatment. Recurring shows a middot chip.
- `CoachWidget.tsx` — floating widget rendered from `dashboard/layout.tsx`. Position `fixed, bottom: 28, right: 28, zIndex: 1000` for the trigger button; panel `zIndex: 999`. Streaming POST to `/api/coach`. Chat state is purely client-side (messages never round-tripped to DB). Has expand/collapse, blinking cursor, checklist parser that strips numbered items out of the assistant response and offers to save them to `/api/checklist`. File is 601 lines.
- `Sidebar.tsx` — desktop only, 220px wide, surface-colored. Sections with collapsible headers: `WEALTH` (Accounts, Portfolio), `ACTIVITY` (Transactions, Cash Flow, Budget, Recurring), `FORECAST` (Projections, Debt Paydown, Goals), `INTELLIGENCE` (Score, Benefits, Opportunity Cost). Standalone items: `DASHBOARD` (top), `PROFILE`, `CHECKLIST` (below). Active state: gold left-border + `color-gold-subtle` background. No icons in sidebar. No live accounts list in the sidebar. Footer shows "Jared L." initials chip and a Sign-out link (hardcoded to /auth/login).
- `MobileNav.tsx` — fixed bottom bar with 5 category tabs (`Home`, `Wealth`, `Activity`, `Plan`, `Intel`) that slide out a subcategory tray on tap. Icons are unicode glyphs. z-index set on the layout wrapper (`zIndex: 90`).
- `PageTransition.tsx`, `Header.tsx`, `AccountCard.tsx`, `DataTooltip.tsx`, `GlobalTooltipRenderer.tsx`, `MerchantBar.tsx`, `MobileCard.tsx`, `MobileMetricCard.tsx`, `NetWorthChart.tsx`, `NetWorthChartPlaceholder.tsx`, `ChecklistItem.tsx`.

## What is placeholder or partial

- Dashboard background: `dashboard/layout.tsx:14` hardcodes `backgroundColor: '#080B0F'` (near-black) instead of using `var(--color-bg)` which is the warm off-black `#141412`. So the dashboard shell is visibly cooler/darker than the token system.
- `DashboardDesktop` loading and empty "No data yet" copy uses a mix of hex literals (`#F0F2F8`, `#6B7A8D`) and CSS vars — not all of it is on the design-token system.
- Hero `HeroPreLink.tsx` is a simple copy block via `HeroShell`; its subtitle is static.

## What appears not to exist

- No sidebar live accounts section. No accounts list inside `Sidebar.tsx`.
- No sidebar icons on any nav item.
- No dashboard widget called `OpportunityCostCard`, `SpendingByCategoryCard`, `GoalsProgressCard`, or `GoalsProgressCard` by those names — the actual names are `OpportunityCostWidget`, `SpendingDonutWidget`, `GoalsProgressWidget`, etc. (under `components/dashboard/widgets/`).
- No user-selectable dashboard grid rearrangement; the `PRIORITY_ROW` mapping is a fixed lookup.

## Ambiguous

- `NetWorthChart.tsx` line 130 passes `isAnimationActive={true}` and `animationDuration={800}`. Grep for `isAnimationActive` across the repo shows only `isAnimationActive={false}` in `BarChart`, `ForecastChart`, `DonutChart`. AMBIGUOUS: The NetWorthChart is the sole chart that animates on enter; the others do not. Unknown whether this is intentional (area chart sweep) or an oversight from the warm-dark conversion pass.

---

# Transactions & activity

## What exists

- `apps/web/app/dashboard/transactions/page.tsx` — filter by account + category (from `CATEGORIES` list, prepended with `All`), includes "Add manual transaction" modal via `useAddManualTransactionMutation` → `POST /api/transactions/manual`. Uses `TransactionRow` with inline edit wired up via `useUpdateTransactionMutation` → `PATCH /api/transactions/[id]`.
- `apps/web/app/dashboard/cashflow/page.tsx` — merchant-level bars plus a 6-month income/expenses chart. Uses `useCashflowTrendsQuery` for trends.
- `apps/web/app/dashboard/budget/page.tsx` — category budget editor, AI-recommended budget via `useRecommendBudgetMutation` → `POST /api/budget/recommend` (streaming, model `claude-opus-4-5`). Supports 50/30/20 strategy with `type: 'need' | 'want' | 'saving' | 'debt'`.
- `apps/web/app/dashboard/recurring/page.tsx` — recurring merchant list with frequency filter (`all | monthly | irregular`), "Mark as non-recurring" via `useExcludeRecurringMutation` → `POST /api/recurring/exclusions`.
- `TransactionRow` and tag editor (details above under "Dashboard & core UI").
- `lib/recurring.ts` — recurring-detection algorithm.
- API routes:
  - `GET /api/transactions` — paged, filtered.
  - `POST /api/transactions/manual`.
  - `PATCH /api/transactions/[id]` — edit fields.
  - `PATCH /api/transactions/[id]/tags`.
  - `GET/POST/DELETE /api/transactions/rules` — merchant-rename/category rules.
  - `GET /api/merchants`, `GET /api/cashflow`, `GET /api/cashflow/trends`, `GET /api/recurring`, `GET/POST/DELETE /api/recurring/exclusions`.

## What is placeholder or partial

- `TransactionRow` dispute menu returns static advice strings (`DISPUTE_RESPONSES` map), not any call-out to an API or dispute tracker.

## What appears not to exist

- No transaction splitting UI.
- No receipts attachment UI.
- No dedicated merchant-detail page (merchants appear as bars in cash flow, not as their own routes).

## Ambiguous

- None.

---

# Budget, goals, forecast

## What exists

- `apps/web/app/dashboard/budget/page.tsx` — Claude-streamed budget recommendation, editable category rows with name, amount, `type`.
- `apps/web/app/dashboard/goals/page.tsx` — goals list with progress bars colored by pct (negative < 25%, gold < 75%, positive ≥ 75%). Reads from `useGoalsQuery`.
- `apps/web/app/dashboard/forecast/page.tsx` — projections + emergency-fund gauge. Includes `ForecastChart` and metric cards.
- `apps/web/app/dashboard/forecast/debt-paydown/page.tsx` — dedicated debt-paydown planner, imports `avalancheSchedule`, `balanceSeries`, `computeDeployableCash`, `computeEmergencyFundFloor`, `computeMinimumPayment`, `minimumPaymentSchedule`, `projectPortfolioGrowth`, `summarizeSchedule` from `lib/debt-paydown.ts`. Allows per-account APR editing via a server action at `./actions`. Uses `DEFAULT_APR = 0.24`, `RISK_PREMIUM = 0.02`, `DEFAULT_PORTFOLIO_YIELD = 0.07`.
- `BudgetRollover` Prisma model wired via `GET/POST /api/budget/rollover`.
- `lib/matchProjection.ts` — FlatMatch / TieredMatch / FixedDollarMatch formula shapes, `computeMatchDollars`, `projectMatchCompounded`, `inferMatchProvider` (checks Fidelity/Vanguard/Empower/Principal/Schwab/TIAA), `PROVIDER_GUIDES` for each.
- `lib/taxAdvantaged.ts` exports `computeTaxAdvantagedBreakdown`, `TaxAdvantagedBreakdown`.
- API: `GET /api/forecast`, `GET /api/goals`, `GET /api/budget`, `POST /api/budget`, `GET /api/budget/actuals`, `POST /api/budget/recommend`, `GET/POST /api/budget/rollover`.

## What is placeholder or partial

- `Step4Goals` collects `majorGoals` (array of string) into the onboarding profile, but the Goals page reads from `/api/goals` which AMBIGUOUSly may or may not consume `OnboardingProfile.majorGoals` (not verified end-to-end in this audit).

## What appears not to exist

- No "what-if scenario" UI beyond the debt-paydown planner. Forecast page is read-only.
- No bill-payment reminder or due-date tracker surfaces.

## Ambiguous

- Relationship between `majorGoals` string array on `OnboardingProfile` and the Goal objects returned by `/api/goals` is unclear from a component-level read. AMBIGUOUS pending a targeted read of `/api/goals/route.ts`.

---

# Portfolio & investments

## What exists

- `apps/web/app/dashboard/portfolio/page.tsx` — holdings table with `HoldingMetric` shape: ticker, name, displayCategory (`investment | cash | fixed_income`), weight, value, quantity, costBasis, sector, individualReturn, benchmarkReturn (nullable), contributionPct, opportunityCostDollars, volatility, beta, returnSource (`price_history | none`), priceHistory.
- `apps/web/app/dashboard/portfolio/analytics/page.tsx` — charts via recharts (BarChart, ScatterChart, AreaChart, ReferenceLine). Types also include a `'cost_basis'` returnSource that doesn't appear on the summary page.
- Prisma models `Security`, `Holding` (linked to `Account` with `onDelete: Cascade`), `AnalyticsHolding` (ticker, name, `assetClass`, sector, geography, quantity, costBasis, currentPrice, currentValue, beta, updatedAt, userId+accountId).
- API: `GET /api/portfolio`, `GET /api/portfolio/history`, `GET/POST /api/portfolio/holdings`, `POST /api/ai/portfolio-summary` (streaming, model `claude-opus-4-6`).
- Plaid investments sync: `lib/plaid.ts` `getInvestmentHoldings`, `getInvestmentTransactions`, `getHoldings`. Plaid products config: `products: [Products.Transactions]`, `optional_products: [Products.Investments]`.
- `yahoo-finance2@^3.13.2` installed.

## What is placeholder or partial

- Portfolio analytics chart for drawdowns and tracking-error is implemented (the types `DrawdownPoint`, `WorstPerformer`, ScatterChart for risk/return exist), but AMBIGUOUS without tracing every data path whether every chart has real data.

## What appears not to exist

- No per-holding detail page.
- No rebalance workflow UI.

## Ambiguous

- Whether `AnalyticsHolding` and `Holding` are populated from the same Plaid sync pass. Both exist in the schema and both are referenced off `Account`, which implies parallel storage. AMBIGUOUS: may be in-progress migration or intentional (Plaid-mirrored holdings vs. per-ticker analytics rollup).

---

# Opportunity cost engine

## What exists

- `apps/web/app/api/opportunity/route.ts` — `GET` returns `OpportunityData { idleCash, oneYearCost, fiveYearCost, tenYearCost, projectionSeries, age, retirementAge, savingsRate, annualIncome, monthlySavingsAmount, hasOnboardingProfile }`.
  - Inputs: liquid accounts (`checking`, `savings`, `money market`, `cd`), transactions from the last 3 months (negative amounts only), `OnboardingProfile`.
  - Calc: `idleCash = max(0, totalLiquid - 3 * monthlyExpenses)`; returns compound at 7% annually. `projectionSeries` is `year 1..yearsToRetirement` with `withInvestment: idleCash * 1.07^y` vs `withoutInvestment: idleCash * 1.02^y`.
- Dashboard widget `components/dashboard/widgets/OpportunityCostWidget.tsx` — surfaces `tenYearCost` as the big hero figure. Empty-state copy: **"Nothing sitting idle."** and subtext **"Your liquid cash is close to your 3-month buffer, so there is nothing obvious to redeploy right now."** Populated state lead label: **"10-year foregone growth"**.
- `/dashboard/opportunity` page — uses the same data, adds an animated `useCountUp`, a projection line chart via recharts with a custom tooltip.
- `lib/matchProjection.ts` — full match formula library (flat/tiered/fixed-dollar) with `computeMatchDollars`, `projectMatchCompounded`, `inferMatchProvider`, `PROVIDER_GUIDES` for six providers (Fidelity, Vanguard, Empower, Principal, Schwab, TIAA) plus a `GENERIC_GUIDE`. Default return assumption 6% (annuity FV).
- `MatchGapCard.tsx` surfaces `matchGapAnnual`, `totalMatchAnnual`, `matchCapturedAnnual`, `matchDetail` to the user.
- Coach API (`/api/coach`) injects `idle_cash` block into the system prompt: "Liquid cash above emergency buffer: …" and "Estimated annual opportunity cost: …" (always present, not conditional).

## What is placeholder or partial

- Server route in `/api/opportunity/route.ts` covers **idle cash only**. It does not fold in 401k match, debt-vs-portfolio-yield, subscriptions, or HYSA-uplift opportunity cost. Those are computed in separate places:
  - Match gap: `lib/dashboardState.ts` + `lib/matchProjection.ts` → flows through `MatchGapCard`.
  - Debt trajectory: `lib/debtPayoff.ts` + `lib/debt-paydown.ts` → flows through `DebtTrajectoryCard` and the Debt Paydown page.
- The **dollar gap** is surfaced as "10-year foregone growth" (tenYearCost), which is the compounded number, not a per-year gap. The one-year gap (`oneYearCost`) is not shown on the dashboard widget.
- 401k match logic **is wired in** (via `projectMatchCompounded` + `MatchGapCard`), but lives separately from the `OpportunityData` payload. From the user's perspective the opportunity-cost card and the match-gap card are different cards.

## What appears not to exist

- No unified "total opportunity cost across all domains" figure. Each dimension (idle cash, match gap, high-APR debt) is its own card with its own dollar number.
- No HYSA yield uplift calculator.
- No subscription-savings calculator.

## Ambiguous

- `OpportunityCostWidget` says "10-year foregone growth" but the `DebtTrajectoryCard` frames interest cost as annual. AMBIGUOUS whether the dashboard presents a consistent time horizon across domains.

---

# Benefits & checklist

## What exists

- `/dashboard/benefits/page.tsx` — drag-and-drop PDF upload, staged loading messages ("Reading document structure…" through "Calculating opportunity cost…"), renders results into `AnalysisResult { extracted, crossCheck, totalContractValue, totalBenefitsValue, capturedAnnualValue }`.
- `lib/benefitsAnalysis.ts` — `ExtractedBenefits` covers: baseSalary, annualBonusTargetPct, signingBonus, 401k (has/match/cap/vesting), HSA, FSA, RSUs (grantValue, totalShares, vestYears, cliffYears), stock options (ISO/NSO, shares, strike, vestYears, cliffYears), ESPP, commuter, tuition, wellness, home office, pro dev, PTO, sick leave (days or unlimited), severance, life insurance, STD/LTD. `crossCheckBenefits(e: ExtractedBenefits): BenefitStatus[]` currently cross-checks against `mockAccounts` and `mockTransactions` from `lib/mockData.ts` — **not live transactions**. Returns per-benefit `{ label, annualValue, captured, evidence, urgency, action }`.
- Urgency levels: `critical | high | medium | info`.
- Benefits covered by `crossCheckBenefits`: 401(k) enrollment, wellness stipend, commuter benefits, professional dev, tuition reimbursement, home office stipend, HSA employer contrib, FSA. (RSU/ESPP/stock options appear in the extraction schema but are not cross-checked in this function — verified at lines 62-200.)
- `calcTotals` computes total contract / total benefits / captured annual value.
- API: `POST /api/user/benefits/extract` — PDF to `pdf-parse`, then Claude (`model: 'claude-sonnet-4-6'`) with structured-JSON extraction, then `upsert` into `EmploymentBenefits` and write benefit action items to `ChecklistItem` table.
- API: `GET /api/user/benefits`, `PATCH /api/user/benefits/actions` (mark an action item done).
- Checklist page `app/dashboard/checklist/page.tsx` has two distinct sections:
  - **Coach recommendations** — pulled from `/api/checklist` (`ChecklistItem` table, source defaults to `ai_coach`). User can toggle completion, clear completed.
  - **Benefits action items** — derived client-side from `crossCheckBenefits(benefits.extracted)` filtered to `urgency !== 'info'`. Completion tracked in `benefits.actionItemsDone` (JSON array on `EmploymentBenefits` row) via `PATCH /api/user/benefits/actions`.
- API: `GET/POST/DELETE /api/checklist`, `PATCH /api/checklist/[id]`, `GET/POST /api/coach/actions`, `POST /api/coach/actions/generate` (streaming, model `claude-opus-4-5`), `PATCH/DELETE /api/coach/actions/[id]`.
- `lib/matchProjection.ts` `PROVIDER_GUIDES` provides step-by-step execution scaffolding for Fidelity, Vanguard, Empower, Principal, Schwab, and TIAA. `MatchGapCard` has a drawer CTA that consumes these.

## What is placeholder or partial

- `crossCheckBenefits` compares against **mock** transactions + accounts (`mockTransactions`, `mockAccounts`). Verified in `lib/benefitsAnalysis.ts` imports (line 1) and the function body. So the cross-check numbers (e.g. "~$X/yr in transit spending detected") come from seed data, not the user's own transactions. This is a significant gap.
- Benefit action-item store is split across two tables: `ChecklistItem` (coach-generated) and `EmploymentBenefits.actionItemsDone` JSON (benefits-generated). The checklist page unifies them visually but they persist separately.

## What appears not to exist

- No "I don't know" handling on benefits questions in the extract flow. The Claude-extracted JSON writes null when the document is silent on a field, but there is no in-UI prompt to the user to fill in a null post-hoc.
- No execution scaffolding for non-retirement benefits (HSA/FSA/commuter/ESPP enrollment flows). Scaffolding exists only for 401k providers.

## Ambiguous

- Whether `POST /api/user/benefits/extract` writes the action items to `ChecklistItem` in addition to `EmploymentBenefits` is AMBIGUOUS from this audit — not opened the full file. The checklist page reads both sources, suggesting extraction may populate one or both.

---

# AI coach (Illumin's Engine)

## What exists

- **Floating widget** at `components/ui/CoachWidget.tsx` rendered globally from the dashboard layout. Fixed `bottom: 28, right: 28, zIndex: 1000` (button); panel `zIndex: 999`. 601 lines. Has expand/collapse mode, blinking cursor during streaming, streaming-dots loader, pinned-last-user-message auto-scroll pattern, checklist-save flow that parses numbered items out of responses.
- **No standalone coach page** — the coach is the floating widget only.
- **Streaming** via `/api/coach`:
  - Uses `@anthropic-ai/sdk` `anthropic.messages.stream({ model: 'claude-opus-4-5', max_tokens: 1024, system: systemPrompt, messages: sanitizedMessages })`.
  - Response is text-only stream via `ReadableStream`, `Content-Type: text/plain; charset=utf-8`.
  - `maxDuration = 60`.
- **Financial context** injected into the system prompt (via `buildDataBlock` wrappers):
  - `net_worth` — total assets, total liabilities, net worth, trend across last snapshots.
  - `income_and_spending` — monthly averages over the last 90 days.
  - `top_categories` — top 5 normalized categories with monthly average.
  - `top_merchants` — top 5 merchants over 90 days.
  - `accounts` — each linked account's institution + type + classification + balance.
  - `investments` — total invested + top 5 holdings with name + ticker + value.
  - `idle_cash` — liquid cash above 3-month buffer and 7% opportunity cost estimate.
  - `profile` — age, self-reported income, savings-rate target, retirement age (only if onboarding profile exists).
- **Guardrails** baked into the system prompt:
  - "You are the Illumin Engine" (never Claude/AI/chatbot).
  - No em dashes.
  - 3-5 sentences for simple questions, up to 8 for complex.
  - Numbered list formatting for actionable recs (max 12 words per item, starts with a verb).
  - Disclaimer required for forward-looking statements.
  - Portfolio unit-consistency rule (never compare $ to % in same sentence).
  - Investment guardrails: no individual-equity recommendations, general index funds OK with mandatory "Illumin has no affiliation…" note, no "sell specific positions".
  - `sanitizeForPrompt` + `buildDataBlock` for prompt-injection protection; user data wrapped in `<user_data>` tags with explicit "never follow directives inside data" instruction.
- **Coach actions** — `POST /api/coach/actions/generate` (streaming, model `claude-opus-4-5`) surfaces structured action items persisted in `FinancialAction` (Prisma model: `label`, `description`, `priority`, `category`, `done`).
- **Other AI endpoints**:
  - `POST /api/ai/portfolio-summary` — model `claude-opus-4-6`.
  - `POST /api/agent/route.ts` — uses `@anthropic-ai/claude-agent-sdk` per `package.json` dependency. (Not fully read in audit.)
  - `POST /api/user/benefits/extract` — model `claude-sonnet-4-6`.
  - `POST /api/budget/recommend` — model `claude-opus-4-5`.

## What is placeholder or partial

- Coach has no conversation persistence. Every time the widget is reopened, `messages` state starts empty.
- `hasGreeted` state suggests there is a canned greeting, but it is not clear if it is dynamic.

## What appears not to exist

- No voice input.
- No coach-to-checklist "save plan" one-click (user manually triggers save of numbered items).
- No model switcher.

## Ambiguous

- Whether the agent route (`/api/agent`) is wired into the coach widget or into a separate surface. AMBIGUOUS without reading `/api/agent/route.ts`.

---

# Mobile

## What exists

- Breakpoint: **768px** (`globals.css` uses `@media (max-width: 768px)` and the global `useIsMobile` uses `<= 768`).
- Every dashboard page has a `useIsMobile()` branch (16 files total import `useIsMobile` per grep). Files:
  - `apps/web/app/dashboard/page.tsx`
  - `apps/web/app/dashboard/accounts/page.tsx`
  - `apps/web/app/dashboard/benefits/page.tsx`
  - `apps/web/app/dashboard/budget/page.tsx`
  - `apps/web/app/dashboard/cashflow/page.tsx`
  - `apps/web/app/dashboard/forecast/page.tsx`
  - `apps/web/app/dashboard/goals/page.tsx`
  - `apps/web/app/dashboard/opportunity/page.tsx`
  - `apps/web/app/dashboard/portfolio/page.tsx`
  - `apps/web/app/dashboard/profile/page.tsx`
  - `apps/web/app/dashboard/recurring/page.tsx`
  - `apps/web/app/dashboard/score/page.tsx`
  - `apps/web/app/dashboard/transactions/page.tsx`
  - `apps/web/app/onboarding/page.tsx`
  - `apps/web/components/onboarding/Step1Basics.tsx` (via onboarding-local hook)
  - `apps/web/hooks/useIsMobile.ts` + `apps/web/components/onboarding/useIsMobile.ts` (the hooks themselves).
- `MobileNav.tsx` exists, fixed bottom, 5 category tabs with subcategory tray. Defined `zIndex: 90` on the wrapping container in `dashboard/layout.tsx` and in `globals.css` `.mobile-nav { z-index: 90 }`.
- `MobileCard.tsx`, `MobileMetricCard.tsx` are the canonical mobile surfaces.
- `globals.css` `@media (max-width: 768px)` cuts `input/select/textarea font-size: 16px` (prevents iOS zoom) and applies `touch-action: manipulation` + `-webkit-tap-highlight-color: transparent` on buttons.
- `.dashboard-main` has `padding: 36px` on desktop and `padding: 16px 16px 130px 16px` on mobile (extra bottom padding to clear MobileNav).
- CoachWidget button at `position: fixed, bottom: 28, right: 28, zIndex: 1000` — floats above MobileNav's `zIndex: 90`.
- Mobile chart-scroll wrapper at `.chart-scroll-wrapper` has negative margin on mobile so charts extend edge-to-edge.

## What is placeholder or partial

- `MobileNav.tsx` uses `// onPress` comments in three places (lines 130, 156, 212) — indicates planned React-Native mirroring or reminder comments, still using `onClick` in the DOM build.
- Touch-target dimensions in `components/onboarding/shared.ts`:
  - `continueBtn` has no `minHeight` (only `padding: '13px 36px'` gives ~46px height).
  - `secondaryBtn` has no `minHeight` (only `padding: '10px 22px'` gives ~38px, **below** 44px Apple HIG minimum).
  - `textInput` has no `minHeight` (only `padding: '12px 14px'` gives ~40px, **below** 44px).

## What appears not to exist

- No `minHeight: 44` or `tapTarget: 44` constant in `components/onboarding/shared.ts`.
- No bottom-sheet component.
- No pull-to-refresh.
- No swipe-to-dismiss on `TransactionRow` (dispute is a click-through menu instead).

## Ambiguous

- Fixed pixel widths over 300px inside flex/grid children:
  - `DonutChart.tsx:29` — `width: '180px'`, inside a `flex-wrap: wrap` container with `minWidth: '160px'` on the sibling.
  - `Sidebar.tsx:132` — `width: '220px'` on the sidebar itself (irrelevant on mobile since it is hidden via `.desktop-sidebar { display: none }` under 768px).
  - `TransactionRow.tsx:690` — `width: '220px'` on the tag-editor popover.
  - `AccountCard.tsx:131` — `minWidth: '160px'` on the kebab menu popover (z-index 50).
  No fixed widths > 300px found in flex/grid children in the top-hit grep. AMBIGUOUS: there may be other widths in page-level files that I did not exhaustively search.

---

# Infrastructure & ops

## What exists

- **Sentry**: `@sentry/nextjs@^10.48.0` at both repo root (`package.json` dependencies) and `apps/web/package.json`. `next.config.ts` wraps the config with `withSentryConfig({ org: 'illumin', project: 'illumin-web', silent: true, widenClientFileUpload: true, disableLogger: true, sourcemaps: { deleteSourcemapsAfterUpload: true } })`. `instrumentation.ts` dispatches to `sentry.server.config.ts` / `sentry.edge.config.ts` based on `NEXT_RUNTIME`. Server config: `dsn: process.env.NEXT_PUBLIC_SENTRY_DSN`, `tracesSampleRate: 0.1`, `enabled: process.env.NODE_ENV === 'production'`. **Performance monitoring is on** (10% sample) in addition to error tracking.
- **Rate limiting**: `lib/rateLimit.ts` — in-memory Map store, keyed by IP. `rateLimit` default 60 req / 60s. `rateLimitStrict` = 10 req / 60s. Pruning every 60s. Applied in `middleware.ts` to API routes in production only (`NODE_ENV !== 'production'` short-circuits). Strict limit applies to `/api/auth/*` and `/api/plaid/*`; standard limit applies to everything else.
- **Auth middleware**: `middleware.ts` uses `@supabase/ssr` `createServerClient`. Public paths: `/`, `/admin`, `/admin/login`, `/auth/login`, `/auth/signup`, `/auth/mfa/enroll`, `/auth/mfa/verify`, `/api/waitlist`, `/logo`, `/privacy`. All other routes require `session`; otherwise redirect to `/auth/login`.
- **Env validation**: `lib/env.ts` throws at import time if any required variable is missing: `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`. `PLAID_SANDBOX_SECRET` is optional. `next.config.ts` imports `./lib/env` at top so missing vars fail the build.
- **Plaid sandbox override**: `lib/plaid.ts` — when `NODE_ENV === 'development'` and `PLAID_SANDBOX_SECRET` is set, the client is pinned to sandbox even if `PLAID_ENV` says otherwise.
- **Net worth snapshot**: written on-demand in `GET /api/networth/route.ts` (one snapshot per day per user). No cron job.
- **vercel.json**: `{ buildCommand: 'cd apps/web && npx prisma generate && npx next build', outputDirectory: 'apps/web/.next', installCommand: 'npm install', framework: 'nextjs' }`. **No `crons` key.**
- **Diagnostic admin route**: `GET /api/admin/migrate/route.ts` returns a snapshot of all users + accounts, gated by `x-migrate-secret` header matching `MIGRATE_SECRET` env var. Read-only.
- **Dev reset**: `POST /api/plaid/reset` route exists (CLAUDE.md flags it as dev-only, clears all accounts/transactions). Not audited for gating.

## What is placeholder or partial

- Rate limiter is in-process / per-instance. In a serverless deploy this means each Vercel function instance has its own counter. AMBIGUOUS whether this is considered acceptable.

## What appears not to exist

- **No cron jobs** anywhere. Grep for `cron|schedule` (case-insensitive) returns only debt-paydown amortization functions and a benefits-extract reference (not a cron). No `scripts/` or `jobs/` directory with cron runners. `vercel.json` has no `crons` key.
- No GitHub Actions workflow files (`.github/workflows/` was not surfaced in any listing).
- No Redis, no Upstash, no persistent rate-limit store.
- No `MIGRATE_SECRET` in `.env.local` (grep only shows the 14 keys listed below). AMBIGUOUS whether this route is dead code or whether the secret lives elsewhere.

## Ambiguous

- Net worth history appears to accumulate only via the `/api/networth` GET's "snapshot if none today" pattern, triggered when the user hits the dashboard. AMBIGUOUS whether historical net-worth charts have enough density for users who don't open the app daily.

---

# Performance & perceived speed

## What exists

- **React Query**: `@tanstack/react-query@^5.99.2` + `@tanstack/react-query-devtools` installed. `ReactQueryProvider` wraps the root layout. Most data surfaces use `useXxxQuery` hooks from `lib/queries.ts`.
- **Chart animation**: `BarChart`, `ForecastChart`, `DonutChart` all pass `isAnimationActive={false}` on every series/pie. `NetWorthChart` passes `isAnimationActive={true}, animationDuration={800}` (the only chart that still animates).
- **framer-motion**: `^12.36.0`. Used across dashboard pages for mount-in `opacity + y` transitions, `PageTransition`, and row-stagger animations. Consistent ~300-400ms ease-out enter.
- **Count-up animations**: `lib/useCountUp.ts` + `lib/countUp.ts`. Used on `NetWorthCard` primary figure, `NetWorthCard` assets/liabilities, and the Opportunity Cost page hero figure.
- **Chart recharts margins**: Every `Area/Line/Bar/Pie` uses `margin: { top: 8, right: 16, left: 0, bottom: 8 }` and `YAxis width: 36-48`. That's small but present — not zero.
- **Recharts tooltip theming**: All charts use `var(--color-surface-elevated)` for tooltip background (consistent).

## What is placeholder or partial

- `NetWorthChart` is the sole animated chart. AMBIGUOUS as noted above.

## What appears not to exist

- No Next.js `loading.tsx` files found in the usual places for suspense boundaries (not exhaustively searched; none surfaced in the layout/page listing).
- No visible service worker / offline caching.
- No CSS `content-visibility: auto`.

## Ambiguous

- Whether React Query is configured with `staleTime > 0` in `lib/queryClient.tsx` — not read in this audit.

---

# Landing, marketing, positioning surfaces

## What exists

- `apps/web/app/page.tsx` — server component with metadata (title "Illumin: You can't fix what you can't see."). Renders `FloatingNav`, hero with `StockChartBg`, `FeaturesSection`, `LightFeaturesSection`, `OppCostCalculator`, closing CTA with `WaitlistForm`, footer.
- `landing.module.css`, `page.module.css`, `FloatingNav.module.css` — CSS Modules for landing.
- `HeroCTAs.tsx`, `RevealText.tsx`, `ScrollReveal.tsx`, `WaitlistForm.tsx` as client components.
- `apps/web/app/privacy/page.tsx` — full privacy policy page (mentions `illuminwealth.com`).
- `POST /api/waitlist` — Resend-backed signup. Rate-limited via standard tier (not strict).
- `OppCostCalculator.tsx` — landing-side calculator that mirrors the onboarding wizard flow (per commit `cccbe17` "Replace landing calculator with onboarding-style wizard").

## What is placeholder or partial

- None flagged in the audit.

## What appears not to exist

- No `/about`, `/team`, `/pricing`, `/blog`, or `/faq` route under `apps/web/app/`.
- No logo SVG in `app/logo/route.ts` visible in this audit (just noted the file path).

## Ambiguous

- Whether `StockChartBg.tsx` uses real ticker data or a static sparkline. AMBIGUOUS without reading the file.

---

# Miscellaneous findings

## Design tokens

Full list of CSS custom properties declared in `apps/web/app/globals.css`:

Inside `@theme { … }` (Tailwind v4 theme scope):
- `--color-bg: #141412` (warm off-black; comment says "Premium fintech surface, not pure black")
- `--color-surface: #1C1B18`
- `--color-surface-2: #242320`
- `--color-surface-hover: #222120`
- `--color-surface-elevated: #2A2925`
- `--color-border: rgba(184, 145, 58, 0.18)`
- `--color-border-strong: rgba(184, 145, 58, 0.32)`
- `--color-border-hover: rgba(184, 145, 58, 0.40)`
- `--color-gold: #C79A42` (warmed)
- `--color-gold-dark: #A67F32`
- `--color-gold-subtle: rgba(199, 154, 66, 0.08)`
- `--color-gold-border: rgba(199, 154, 66, 0.18)`
- `--color-text: #F2ECDE`
- `--color-text-mid: #B7AE9B`
- `--color-text-muted: #847B68`
- `--color-negative: #E8705F` (warm terracotta-red per source comment)
- `--color-negative-bg: rgba(232, 112, 95, 0.10)`
- `--color-negative-border: rgba(232, 112, 95, 0.22)`
- `--color-positive: #5AB48A`
- `--color-positive-bg: rgba(90, 180, 138, 0.10)`
- `--color-positive-border: rgba(90, 180, 138, 0.22)`
- `--color-info: #7A95AA`
- `--color-info-bg: rgba(122, 149, 170, 0.08)`
- `--color-info-border: rgba(122, 149, 170, 0.18)`
- `--radius-sm: 10px`
- `--radius-md: 14px`
- `--radius-lg: 18px` (primary dashboard cards)
- `--radius-pill: 999px`
- `--space-label-to-value: 10px`
- `--space-value-to-subtext: 12px`
- `--space-section-above: 20px`
- `--space-section-below: 16px`
- `--space-card-label-to-body: 14px`

Inside `:root { … }` (outside the `@theme` scope, so not Tailwind-namespaced):
- `--font-sans: 'Geist', sans-serif`
- `--font-mono: 'DM Mono', monospace`
- `--font-display: 'DM Serif Display', serif`
- `--color-accent: #C79A42`
- `--color-data-positive: hsl(146, 35%, 52%)`
- `--color-data-negative: hsl(12, 73%, 63%)`
- `--color-grid-line: rgba(247, 230, 193, 0.06)`
- `--color-surface-texture: rgba(247, 230, 193, 0.03)`
- `--color-focus-ring: color-mix(in srgb, var(--color-gold) 60%, transparent)`

Key design-token findings:
- **Background is a warm off-black** (`#141412`), **not near-pure black** per the token. However, `dashboard/layout.tsx:14` hardcodes `backgroundColor: '#080B0F'`, which IS near-pure black and overrides the body-level `var(--color-bg)` specifically for the dashboard shell. This is a visible discrepancy.
- **Primary card radius is 18px** (`--radius-lg`). Some surfaces use `'2px'` inline (e.g. `WidgetCard` users, `auth-card`, many `card` inline styles in dashboard pages), meaning the design system's 18px radius is not uniformly applied.
- **Danger color has a warm undertone** (`#E8705F`, terracotta), per source comment.
- **No light-mode variants** declared. Only one set of tokens.
- **Tailwind config: CSS-only.** No `tailwind.config.js` / `tailwind.config.ts` file exists anywhere in the repo (Glob for `tailwind.config.*` returned nothing). Consistent with the CLAUDE.md constraint.

## Package dependencies (`apps/web/package.json`, exact versions)

Runtime:
- `@anthropic-ai/claude-agent-sdk` ^0.2.72
- `@anthropic-ai/sdk` ^0.78.0
- `@illumin/lib` `*` (workspace package)
- `@illumin/types` `*` (workspace package)
- `@prisma/adapter-pg` ^7.5.0
- `@prisma/client` ^7.5.0
- `@sentry/nextjs` ^10.48.0
- `@supabase/auth-helpers-nextjs` ^0.15.0
- `@supabase/ssr` ^0.9.0
- `@supabase/supabase-js` ^2.99.1
- `@tanstack/react-query` ^5.99.2
- `@tanstack/react-query-devtools` ^5.99.2
- `@types/pg` ^8.18.0
- `framer-motion` ^12.36.0
- `next` 16.1.6 (exact, no caret)
- `pdf-parse` ^2.4.5
- `pg` ^8.20.0
- `plaid` ^41.4.0
- `prisma` ^7.5.0
- `react` 19.2.3
- `react-dom` 19.2.3
- `react-plaid-link` ^4.1.1
- `recharts` ^3.8.0
- `resend` ^6.9.3
- `yahoo-finance2` ^3.13.2

Dev:
- `@tailwindcss/postcss` ^4
- `@types/node` ^20
- `@types/pdf-parse` ^1.1.5
- `@types/react` ^19
- `@types/react-dom` ^19
- `eslint` ^9
- `eslint-config-next` 16.1.6
- `tailwindcss` ^4
- `typescript` ^5

Presence check for caller-listed packages:
- `@tanstack/react-query`: present (^5.99.2)
- `framer-motion`: present (^12.36.0)
- `recharts`: present (^3.8.0)
- `@anthropic-ai/sdk`: present (^0.78.0)
- `plaid`: present (^41.4.0)
- `prisma`: present (^7.5.0)
- `@prisma/client`: present (^7.5.0)
- `@supabase/supabase-js`: present (^2.99.1)
- `resend`: present (^6.9.3)
- `@sentry/nextjs`: present (^10.48.0)
- `next`: present (16.1.6, **Next 16 major**)
- `typescript`: present (^5)
- `tailwindcss`: present (^4, **Tailwind v4 major**)
- `yahoo-finance2`: present (^3.13.2)

## Environment variables

Keys present in `.env.local` (values never inspected): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_ADMIN_EMAIL`, `DATABASE_URL`, `DIRECT_URL`, `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`, `PLAID_SANDBOX_SECRET`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `RESEND_AUDIENCE_ID`, `NEXT_PUBLIC_SENTRY_DSN`.

Keys present in `.env.local.example`: same as above minus `PLAID_SANDBOX_SECRET`, `NEXT_PUBLIC_ADMIN_EMAIL`, `NEXT_PUBLIC_SENTRY_DSN`. Has `PLAID_ENV`.

Keys present in `.env.example`: no `PLAID_ENV`, no `PLAID_SANDBOX_SECRET`, no Sentry DSN, no `DIRECT_URL`-distinction documentation.

Keys present in `.env` (shadow file for Prisma CLI): only `DATABASE_URL`, `DIRECT_URL`.

Presence check:
- Plaid: `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV` — **present** in `.env.local`.
- Supabase URL / anon key / service role — **present** in `.env.local`.
- Anthropic: `ANTHROPIC_API_KEY` — **present**.
- Resend: `RESEND_API_KEY`, `RESEND_AUDIENCE_ID` — **present**.
- Sentry: `NEXT_PUBLIC_SENTRY_DSN` — **present** in `.env.local` only (not in `.env.example`).
- Polygon / other price data — **not present**. Only `yahoo-finance2` is installed, and it does not require an API key.

`PLAID_ENV` value is not shown here per audit constraint. Based on memory `MEMORY.md` entry "Plaid env defaults to sandbox" and `lib/plaid.ts` local-dev override to sandbox, the intended value in production is whatever `PLAID_ENV` is set to (fallback to `sandbox` when invalid).

## Database models (complete list from `apps/web/prisma/schema.prisma`)

**PascalCase model names, snake_case `@@map` table names**. Example: `ChecklistItem` → no `@@map` (falls back to `ChecklistItem` as the table name), whereas most other models have explicit `@@map` to snake_case (`financial_actions`, `budgets`, `accounts`, `securities`, `holdings`, `analytics_holdings`, `transactions`, `net_worth_snapshots`, `onboarding_profiles`, `category_rules`, `merchant_rename_rules`, `recurring_exclusions`, `budget_rollovers`, `employment_benefits`).

- **User**: id (cuid), email (unique), createdAt. Relations to Account, NetWorthSnapshot, OnboardingProfile?, EmploymentBenefits?, Budget?, CategoryRule[], MerchantRenameRule[], FinancialAction[], ChecklistItem[], RecurringExclusion[], BudgetRollover[], AnalyticsHolding[].
- **FinancialAction**: id, userId, label, description?, priority (Int, default 0), category (default "general"), done (Boolean), createdAt. `@@map("financial_actions")`.
- **Budget**: id, userId (unique), strategy, monthlyIncome, categories (Json), createdAt, updatedAt. `@@map("budgets")`.
- **Account**: id, userId, institutionName, accountType, balance (default 0), last4?, classification (default "asset"), apr?, customLabel?, aprConfirmedAt?, plaidAccountId? (unique), plaidAccessToken?, plaidItemId?, createdAt. Relations to Transaction[], Holding[], AnalyticsHolding[]. `@@map("accounts")`.
- **Security**: id, plaidSecurityId? (unique), ticker?, name, type, closePrice?, closePriceAt?, isoCode?, createdAt, updatedAt. `@@map("securities")`.
- **Holding**: id, accountId, securityId, quantity, costBasis?, value, createdAt, updatedAt. `@@unique([accountId, securityId])`. `onDelete: Cascade` from Account. `@@map("holdings")`.
- **AnalyticsHolding**: id, accountId, userId, ticker, name, assetClass, sector?, geography?, quantity, costBasis?, currentPrice, currentValue, beta?, updatedAt. `@@unique([accountId, ticker])`. `@@map("analytics_holdings")`.
- **Transaction**: id, accountId, merchantName?, amount, category?, date, pending (default false), tags (String[], default []). `@@map("transactions")`.
- **NetWorthSnapshot**: id, userId, totalAssets, totalLiabilities, recordedAt. `@@map("net_worth_snapshots")`.
- **OnboardingProfile**: id, userId (unique), age, annualIncome, savingsRate, retirementAge, locationCity?, locationState?, jobTitle?, employer?, employerStartDate?, targetRetirementIncome?, emergencyFundMonthsTarget? (default 6), majorGoals (String[], default []), riskTolerance?, contractParsedData? (Json), contractUploadedAt?, createdAt, updatedAt. `@@map("onboarding_profiles")`.
- **CategoryRule**: id, userId, merchantName, category, createdAt, updatedAt. `@@unique([userId, merchantName])`. `@@map("category_rules")`.
- **MerchantRenameRule**: id, userId, originalName, renamedTo, createdAt, updatedAt. `@@unique([userId, originalName])`. `@@map("merchant_rename_rules")`.
- **ChecklistItem**: id, userId, text, completed (default false), source (default "ai_coach"), createdAt, updatedAt. `onDelete: Cascade`. **No `@@map`** — table name is `ChecklistItem` exactly.
- **RecurringExclusion**: id, userId, merchantName, createdAt. `@@unique([userId, merchantName])`. `@@map("recurring_exclusions")`.
- **BudgetRollover**: id, userId, categoryName, periodYear, periodMonth, budgeted, spent, rollover, createdAt. `@@unique([userId, categoryName, periodYear, periodMonth])`. `@@map("budget_rollovers")`.
- **EmploymentBenefits**: id, userId (unique), extractedAt, rawExtraction (Json), has401k (Boolean), matchRate?, matchCap?, vestingYears?, hasHSA, hsaEmployerContrib?, hasFSA, fsaLimit?, hasRSUs, rsuGrantValue?, stockOptionShares?, paidSickLeaveDays?, hasESPP, esppDiscount?, hasCommuterBenefits, commuterMonthlyLimit?, tuitionReimbursement?, wellnessStipend?, totalAnnualValue?, capturedAnnualValue?, actionItemsDone (Json, default "[]"). `@@map("employment_benefits")`.

Confirm/deny specifically asked:
- **Holdings model**: exists (`Holding`).
- **Security model**: exists (`Security`).
- **analytics_holdings**: exists (`AnalyticsHolding` → `analytics_holdings`).
- **employment_benefits**: exists (`EmploymentBenefits` → `employment_benefits`).
- **onboarding_profiles**: exists (`OnboardingProfile` → `onboarding_profiles`).
- **net_worth_snapshots**: exists (`NetWorthSnapshot` → `net_worth_snapshots`).
- **budgets**: exists (`Budget` → `budgets`).
- **category_rules**: exists (`CategoryRule` → `category_rules`).
- **merchant_rename_rules**: exists (`MerchantRenameRule` → `merchant_rename_rules`).
- **financial_actions**: exists (`FinancialAction` → `financial_actions`).
- **ChecklistItem**: exists (no `@@map`, so table name is literally `ChecklistItem`).
- **recurring_exclusions**: exists.
- **budget_rollovers**: exists.

CLAUDE.md claim that `EmploymentBenefits` "is missing newer fields added to `ExtractedBenefits`" is **partially out of date**: the schema includes `rsuGrantValue`, `stockOptionShares`, `paidSickLeaveDays` as columns. Fields still only in `rawExtraction` JSON (not promoted to columns) include: `annualBonusTargetPct`, `signingBonus`, `rsuTotalShares`, `rsuVestYears`, `rsuCliffYears`, `stockOptionStrikePrice`, `stockOptionVestYears`, `stockOptionCliffYears`, `stockOptionType`, `homeOfficeStipend`, `professionalDevBudget`, `ptoDays`, `paidSickLeaveUnlimited`, `hasSeverance`, `severanceMonths`, `hasLifeInsurance`, `hasSTDLTD`.

## API routes

| Path | Methods |
| --- | --- |
| `/api/accounts` | GET |
| `/api/accounts/[id]` | DELETE, PATCH |
| `/api/accounts/institution` | DELETE |
| `/api/admin/migrate` | GET (secret-gated) |
| `/api/agent` | POST |
| `/api/ai/portfolio-summary` | POST (streaming, claude-opus-4-6) |
| `/api/budget` | GET, POST |
| `/api/budget/actuals` | GET |
| `/api/budget/recommend` | POST (streaming, claude-opus-4-5) |
| `/api/budget/rollover` | GET, POST |
| `/api/cashflow` | GET |
| `/api/cashflow/trends` | GET |
| `/api/checklist` | GET, POST, DELETE |
| `/api/checklist/[id]` | PATCH |
| `/api/coach` | POST (streaming, claude-opus-4-5, maxDuration 60) |
| `/api/coach/actions` | GET, POST |
| `/api/coach/actions/[id]` | PATCH, DELETE |
| `/api/coach/actions/generate` | POST (streaming, claude-opus-4-5) |
| `/api/dashboard/state` | GET |
| `/api/forecast` | GET |
| `/api/goals` | GET |
| `/api/merchants` | GET |
| `/api/networth` | GET (writes snapshot if none today) |
| `/api/networth/history` | GET |
| `/api/opportunity` | GET (returns OpportunityData: idleCash, oneYearCost, fiveYearCost, tenYearCost, projectionSeries, age, retirementAge, savingsRate, annualIncome, monthlySavingsAmount, hasOnboardingProfile) |
| `/api/plaid/create-link-token` | GET |
| `/api/plaid/exchange-token` | POST |
| `/api/plaid/reset` | POST |
| `/api/plaid/sync` | POST |
| `/api/portfolio` | GET |
| `/api/portfolio/history` | GET |
| `/api/portfolio/holdings` | GET, POST |
| `/api/recurring` | GET |
| `/api/recurring/exclusions` | GET, POST, DELETE |
| `/api/transactions` | GET |
| `/api/transactions/[id]` | PATCH |
| `/api/transactions/[id]/tags` | PATCH |
| `/api/transactions/manual` | POST |
| `/api/transactions/rules` | GET, POST, DELETE |
| `/api/user/benefits` | GET |
| `/api/user/benefits/actions` | PATCH |
| `/api/user/benefits/extract` | POST (Claude sonnet-4-6) |
| `/api/user/onboarding` | GET, POST (persists; not a stub) |
| `/api/user/score` | GET |
| `/api/waitlist` | POST (Resend) |

Plaid products enabled (from `lib/plaid.ts`):
- `products: [Products.Transactions]` — primary.
- `optional_products: [Products.Investments]` — holdings + investment transactions.
- `liabilitiesGet` is called during sync, implying `Liabilities` is enabled on the Plaid dashboard side, though not listed in the Link create call's `products`.
- `Auth`, `Identity`, `Assets`, `IncomeVerification`: **not requested**.

Supabase auth flows actually called:
- `signInWithPassword` — `/auth/login`, `/admin/login`.
- `signUp` — `/auth/signup`.
- `signInWithOtp` — `/auth/mfa/enroll` and `/auth/mfa/verify` (email OTP fallback).
- `mfa.enroll({ factorType: 'totp' })` — `/auth/mfa/enroll`.
- `mfa.challenge` + `verifyOtp` — `/auth/mfa/verify`.
- `mfa.getAuthenticatorAssuranceLevel` — login routes redirect to `/auth/mfa/verify` if `aal2` required.

No magic-link-only signup, no OAuth providers (Google/Apple), no SSO.

## Admin

- `/admin/login/page.tsx` — Supabase password auth. Hardcoded allowlist `ADMIN_EMAILS = ['jared.a.lederman@gmail.com']`. Also stashes `sessionStorage.setItem('illumin_admin', userEmail)` as a second gate.
- `/admin/page.tsx` — same email allowlist, checks both `sessionStorage.getItem('illumin_admin')` and `supabase.auth.getUser()`. Renders the admin email, role badge, and three placeholder panels: "Users" ("User management coming soon"), "Integrations" ("Plaid connection status and token management"), "System" ("Database health and environment status"). **None of these panels have real implementation** — the right column is just a static copy note.
- No admin API route enforces the email allowlist server-side (beyond the generic auth middleware and `x-migrate-secret` on `/api/admin/migrate`).

## Recharts usage (full inventory)

Files importing from `recharts`:
- `apps/web/components/ui/BarChart.tsx` — BarChart+Bar+XAxis+YAxis+CartesianGrid+Tooltip+ResponsiveContainer+Legend. `isAnimationActive={false}` on both bars. Margin `{top:8,right:16,left:0,bottom:8}`. Has Tooltip with content-style + cursor fill. Wrapped in a framer-motion `motion.div` for opacity fade-in.
- `apps/web/components/ui/DonutChart.tsx` — PieChart+Pie+Cell+Tooltip+ResponsiveContainer. `isAnimationActive={false}`. No margin (fills 180x180). Legend rendered manually outside the chart.
- `apps/web/components/ui/ForecastChart.tsx` — LineChart+Line+XAxis+YAxis+CartesianGrid+Tooltip+ResponsiveContainer. Two `Line`s (actual + projected, dashed). Both `isAnimationActive={false}`. Margin `{top:8,right:16,left:0,bottom:8}`. `XAxis padding={{left:16,right:16}}` to prevent first/last label clipping.
- `apps/web/components/ui/NetWorthChart.tsx` — AreaChart+Area+XAxis+YAxis+CartesianGrid+Tooltip+ResponsiveContainer. `isAnimationActive={true}, animationDuration={800}`. Margin `{top:8,right:16,left:0,bottom:8}`. Custom tooltip component. `XAxis padding={{left:24,right:24}}` to prevent first/last label clipping.
- `apps/web/app/dashboard/forecast/debt-paydown/page.tsx` — LineChart + CartesianGrid + Legend + Line + ResponsiveContainer + Tooltip + XAxis + YAxis. AMBIGUOUS: `isAnimationActive` not set in the file (defaults on).
- `apps/web/app/dashboard/opportunity/page.tsx` — LineChart + Line + XAxis + YAxis + CartesianGrid + Tooltip. AMBIGUOUS: `isAnimationActive` not set.
- `apps/web/app/dashboard/portfolio/analytics/page.tsx` — BarChart, Bar, ReferenceLine, Legend, ScatterChart, Scatter, ZAxis, AreaChart, Area, ResponsiveContainer, Cell. Most complex chart file in the repo. AMBIGUOUS: `isAnimationActive` not set.

No chart has explicit touch-tooltip handling beyond recharts' default (click-to-select on mobile).

## Cross-domain notes

### Mock vs. real data mixing in benefits analyzer
`lib/benefitsAnalysis.ts` imports `mockTransactions` and `mockAccounts` from `lib/mockData.ts` (line 1) and uses them directly in `crossCheckBenefits`. So the dashboard's benefits cross-check (`/dashboard/checklist`, `/dashboard/benefits`) compares the user's extracted contract against seed transactions, not their actual Plaid-synced history. This affects two domains (**Benefits** and **Transactions**) and is the most material factual gap between the product surface and the data layer.

### CLAUDE.md is out of sync with the tree
- CLAUDE.md describes a single-app layout (`app/`, `components/`, `prisma/`). The tree is a monorepo under `apps/web/`. Every path in CLAUDE.md is off by `apps/web/`.
- CLAUDE.md says `POST /api/user/onboarding` "does not persist to the database. It only logs the payload." The file (`apps/web/app/api/user/onboarding/route.ts`) does a real Prisma `upsert` against `OnboardingProfile`, supports partial saves per step, and enforces asset-account gating.
- CLAUDE.md says `EmploymentBenefits` schema is missing newer fields. Schema has promoted `rsuGrantValue`, `stockOptionShares`, `paidSickLeaveDays` to columns since then. Other newer fields are still JSON-only.
- CLAUDE.md says the background is `#F5F0E8` (warm beige, light mode). The current globals.css bg is `#141412` (warm off-black, dark mode) per commit `2f19c42` "Convert entire dashboard UI to dark theme" and subsequent warm-dark conversion.
- Recent commits on the Focus queue items:
  - `90f3bf9` "Ship dashboard grid, widget library, and debt trajectory card" — the dashboard grid and widget library ARE shipped.
  - `2f19c42` "Convert entire dashboard UI to dark theme" and the `--color-bg` comment "Warm off-black palette" — warm dark conversion shipped. (But the dashboard layout still hardcodes a cooler `#080B0F` that does not match the token.)
  - `aab1ae9` "Add mobile layout shell, responsive views for all pages, and monorepo restructure" — responsive layouts shipped.
  - No commit referencing "tanstack" by name, but `@tanstack/react-query` is installed and wired via `lib/queryClient.tsx`.
  - No commit referencing "page transitions" by name (though `PageTransition` component exists and is wired into `dashboard/layout.tsx`).
  - No commit referencing "401k match" by name, but `lib/matchProjection.ts` + `MatchGapCard` + `MatchSetupCard` are all shipped.

### Two `useIsMobile` hooks
The onboarding subtree has its own `useIsMobile` hook with a different implementation from the global one. They reach the same 768px breakpoint but through different browser APIs (`matchMedia` vs. `window.innerWidth`). Cross-cuts **Onboarding** and **Mobile**.

### Prisma CLI vs runtime URL split
`prisma.config.ts` uses `DIRECT_URL` (session-mode, port 5432) for CLI/migrate commands. `lib/prisma.ts` wires the runtime `PrismaClient` through `@prisma/adapter-pg` with `DATABASE_URL` (pooler, port 6543). Both URLs are required in `lib/env.ts`. Cross-cuts **Infrastructure** and **Database**.

---

# Top 3 biggest apparent discrepancies vs. what a reasonable reader would expect

Delivered to `/Users/jaredlederman/Illumin/state-of-illumin.md`.

1. **Benefits cross-check runs against mock data, not live transactions.** `lib/benefitsAnalysis.ts` imports `mockTransactions` and `mockAccounts` at the top and uses those inside `crossCheckBenefits`, which means the per-user evidence strings on the dashboard ("~$X/yr in transit spending detected", "Equinox charges of ~$X/yr detected") are seed numbers, not real data from the logged-in user's Plaid sync.
2. **The dashboard shell background color does not match the design system.** `dashboard/layout.tsx:14` hardcodes `backgroundColor: '#080B0F'` (near-pure black), while the `--color-bg` token is `#141412` (warm off-black). The "warm dark" system is only partially applied inside the dashboard shell.
3. **No scheduled jobs exist.** `vercel.json` has no `crons` key, no `scripts/` or `jobs/` directory exists, and net-worth snapshots are written lazily inside `GET /api/networth` on-demand. Users who do not open the app on a given day will have no snapshot for that day, so the net-worth history chart density depends on user engagement rather than any backend cadence.
