# Growth Intelligence

An AI agent layer on top of an ERP's existing customer base. The business
thesis: launch a near-free AI-generated e-commerce storefront for ERP
customers, take a 1% commission on their online sales, and grow ERP seats as
they grow. This app identifies which customers to target, and why.

Upload a customer-base export (`.xlsx`) and get one dashboard, three tabs.

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
   and `projectedNewSeats` (~1 per $2M of projected revenue growth) are
   computed deterministically server-side from the account's own CRM
   data, not trusted to model arithmetic. A funnel ranks accounts by
   commission opportunity, with a live agent-activity feed and an
   animated "new revenue unlocked" counter that sums as scans complete.
3. **Innovation Partners** — client-side ranks accounts by Avg Yearly
   Custom Work Value, flags the top 10, and drafts a personalized
   Innovation Partner invitation per account via `/api/invite`.

All three tabs stay mounted once accounts are loaded (visibility toggles
via CSS, not conditional rendering) — switching tabs never discards scan
results, explanations, or drafted invitations.

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
