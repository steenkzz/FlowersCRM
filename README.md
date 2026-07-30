# Intelligence CRM

Don't migrate your CRM. Drop in your spreadsheet and get an intelligent CRM
in 30 seconds.

Upload an existing CRM export (`.xlsx`), and the app enriches every account
with live web research, scores it 0–100 on "AI opportunity likelihood",
explains the score, and drafts a personalized outreach email for follow-up.

## How it works

1. **Upload** — drag-and-drop an `.xlsx` export. Parsed client-side with
   `xlsx`; unknown columns are tolerated, expected ones are matched by
   flexible header aliases (`Company`, `Contact Name`, `Contact Role`,
   `Email`, `Sector`, `Employees`, `Region`, `Current Software`,
   `Customer Since`, `Last Activity`, `Annual Revenue (EUR)`,
   `Open Opportunity`, `Notes`).
2. **Review** — every parsed row shown in a table before anything is sent
   to the API.
3. **Research & score** — `/api/enrich` calls Claude (`claude-sonnet-4-6`)
   with the `web_search_20250305` tool per account, combining the CRM
   record with live web findings into a JSON verdict. Accounts are
   enriched with concurrency 4, with a live activity feed streaming
   progress.
4. **Results** — ranked list by AI opportunity score, with a
   green/amber/gray badge. Click a row to expand full reasoning, web
   findings, recommended action, and a ready-to-copy draft email.

Everything lives in React state — no database, no auth, no server
persistence. Re-running enrichment on an already-processed account is a
no-op (results are cached in memory for the session).

## Local development

```bash
npm install
npm run dev
```

Set `ANTHROPIC_API_KEY` in `.env.local` to enable live enrichment. Without
it, `/api/enrich` returns a graceful fallback object so the UI never
breaks — you'll just see score 0 and a "manual review needed" note instead
of real research.

## Deploying

This repo is linked to a Vercel project. Set `ANTHROPIC_API_KEY` as an
environment variable in the Vercel project settings (Production +
Preview), then `vercel --prod`.
