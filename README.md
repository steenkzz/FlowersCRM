# Growth Intelligence

An AI agent layer on top of an ERP's existing customer base. The business
thesis: launch a near-free AI-generated e-commerce storefront for ERP
customers, take a 1% commission on their online sales, and grow ERP seats as
they grow. This app identifies which customers to target, and why.

Upload a customer-base export (`.xlsx`, with an optional second "Pricing
Inputs" sheet) and get one dashboard, four tabs.

## Pricing

A second sheet named "Pricing Inputs" (label in column A, value in column
C) is parsed into a `pricingConfig` object — tier base prices, per-seat
block pricing, the revenue tier gate, sponsor-share economics, add-on
pricing. Labels are fuzzy-matched (typos and common rewordings tolerated,
`$`/`%` formatting handled) and fall back to sensible defaults for any
key the sheet omits. Every dollar figure in the app — license ARR
estimates, seat-growth pricing, sponsor payouts — is computed from this
config, not hardcoded. The CRM sheet's own `Pricing Tier` and
`Est. License ARR (USD)` columns are used when present; when absent, tier
is derived from revenue vs. the config's tier gate and ARR is estimated
from the tier's base price.

## Tabs

1. **Qualified Leads** — a deterministic 0–100 score computed client-side
   from six normalized, weighted metrics (Annual Revenue, Customers On
   File, ValPay GMV, Revenue Growth YoY, Avg Custom Work Value, Avg
   Support Value). Six live sliders control the weights and re-rank
   instantly — no network call. Click a row to lazily fetch (and cache) a
   2–3 sentence AI explanation + next action from `/api/explain`.
2. **E-Commerce Opportunities** (the star) — for a selected account or the
   top 20 by revenue, `/api/ecomm-scan` sends Claude + the web search tool
   to visit the account's website and judge whether they already sell
   online. Returns confidence, evidence, an estimated online GMV, and a
   draft outreach email. `commissionRevenueForUs` (1% of estimated GMV)
   and `projectedNewSeats` (from the pricing config's per-tier seat model)
   are computed deterministically server-side from the account's own CRM
   data, not trusted to model arithmetic. A funnel ranks accounts by
   commission opportunity, with a live agent-activity feed and an
   animated "new revenue unlocked" counter that sums as scans complete.
3. **Innovation Partners** — client-side ranks accounts by Avg Yearly
   Custom Work Value, flags the top 10, and drafts a personalized
   Innovation Partner invitation per account via `/api/invite`.
4. **Pipeline** — a reusable six-stage funnel board (`<PipelineFunnel>`),
   rendered for two pipelines toggled by a switch: E-Commerce (top 25 by
   opportunity value, from accounts with $0 ValPay GMV or online-store
   signals in Notes) and Innovation Partners (top 15 by custom work
   value). Cards seed into stages 1–5 via a deterministic hash of the
   account name, weighted toward earlier stages. Entering "Automated AI
   Reachout" triggers the same scan/invite API used by Tabs 2/3 (reusing
   a cached result if one already exists); entering "Meeting Booked"
   triggers a new lazy, cached 3-bullet prep brief from
   `/api/meeting-prep`. All agentic calls across both pipelines share a
   single concurrency limiter capped at 3 in flight — extra calls queue
   with a spinner on the card rather than firing immediately. Header
   metrics (total / weighted / closed-won pipeline value) recompute live
   as cards move; Closed Lost is a small bucket below the board, not a
   seventh column.

All four tabs stay mounted once accounts are loaded (visibility toggles
via CSS, not conditional rendering) — switching tabs never discards scan
results, explanations, drafted invitations, or pipeline stage moves. The
E-Commerce scan cache and the Innovation invite cache are lifted to the
top level and shared between their respective tab and the Pipeline tab.

Everything lives in React state — no database, no auth, no `<form>` tags,
no server persistence. Re-running a scan/explanation on an already-cached
account is instant.

## Local development

```bash
npm install
npm run dev
```

Set `ANTHROPIC_API_KEY` in `.env.local` to enable live AI calls. Without
it, every API route returns a graceful fallback object (score/GMV 0, a
"manual review needed" note) so the UI never breaks.

## Deploying

This repo is linked to a Vercel project. Set `ANTHROPIC_API_KEY` as an
environment variable in the Vercel project settings (Production +
Preview), then `vercel --prod`.
