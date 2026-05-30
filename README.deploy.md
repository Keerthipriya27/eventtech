Deployment and secrets guide
===========================

1) SECURITY FIRST — rotate any secrets you accidentally shared

- You pasted sensitive keys into chat. Treat them as leaked: rotate your Supabase service role key and your OpenAI API key immediately from their dashboards.
- Supabase: Project → Settings → API → Regenerate Service Role Key. Replace usage and revoke the old key.
- OpenAI: https://platform.openai.com/account/api-keys → Revoke old key and create a new one.

2) Prepare `.env` (local, gitignored)

- Copy `.env.example` to `.env` in the repo root and fill in real values. Do NOT commit `.env`.

3) Apply DB migrations (one-time)

Replace `DB_USER`, `DB_PASS`, `DB_HOST`, and `DB_NAME` and run each:

```bash
psql "postgres://DB_USER:DB_PASS@DB_HOST:5432/DB_NAME" -f supabase/migrations/20260531_create_sponsor_requests.sql
psql "postgres://DB_USER:DB_PASS@DB_HOST:5432/DB_NAME" -f supabase/migrations/20260531_create_notifications.sql
psql "postgres://DB_USER:DB_PASS@DB_HOST:5432/DB_NAME" -f supabase/migrations/20260531_create_audit_logs.sql
psql "postgres://DB_USER:DB_PASS@DB_HOST:5432/DB_NAME" -f supabase/migrations/20260531_create_sponsor_matches_cache.sql
```

Or use Supabase SQL Editor: open each SQL file and run.

4) Deploy functions with Supabase CLI

- Install & login:

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

- Deploy functions (ensure envs are provided in dashboard or `--env-file .env`):

```bash
supabase functions deploy sponsor-request --project-ref YOUR_PROJECT_REF --env-file .env
supabase functions deploy telemetry --project-ref YOUR_PROJECT_REF --env-file .env
supabase functions deploy sponsor-match --project-ref YOUR_PROJECT_REF --env-file .env
```

5) Set function environment variables (recommended via Supabase dashboard)

- Dashboard: Project → Functions → select function → Settings → Add variable. Add at minimum:
  - `SUPABASE_URL` (your project URL)
  - `SUPABASE_SERVICE_ROLE_KEY` (service role key)
  - `OPENAI_API_KEY` (for sponsor-match)
  - `SENDGRID_API_KEY` (optional)

6) Quick verification

- Start app locally:
```bash
npm install
npm run dev
# open http://localhost:8081/sponsor
```
- Click Connect on an event → UI should call `/functions/v1/sponsor-request`.
- Confirm rows in Supabase Table Editor: `sponsor_requests`, `notifications`, `audit_logs`, `sponsor_matches_cache`.

7) Additional suggestions

- Move service-role usage only to server/edge functions (done in this repo). Never expose service role to clients.
- Add email provider keys to environment and extend `sponsor-request` to send an email to event owners.
- Monitor audit logs and rotate keys regularly.
