**EventTech — Hackathon & Event Management Platform**

A compact, modern event management app built with Vite, React, TanStack Router, and Supabase. It includes event creation, registration, volunteer tasks, sponsorship matching, and AI-powered event planning features. This repository contains the full source and local development instructions.

**Demo**
- Local dev: http://localhost:8081/ (Vite dev server)

**Highlights**
- Auth + DB with Supabase (browser & server/admin clients)
- AI features integrated via OpenAI (event planner, copilot, sponsor-match)
- Role-based UX: organizer, volunteer, sponsor, participant
- Server-side helper functions (TanStack Start) for safe admin operations

**Tech Stack**
- Frontend: React (Vite) + TanStack Router
- Styling & components: Radix/Custom components + Tailwind/Vite setup
- Backend: Supabase (Postgres) for auth, rows and RLS policies
- AI: OpenAI (server-side functions)

**Quickstart (Local)**
1. Install dependencies

```bash
npm install
```

2. Create a `.env` at the repo root (do NOT commit it). Required keys:

- `VITE_SUPABASE_URL` — your Supabase URL (starts with https://...)
- `VITE_SUPABASE_PUBLISHABLE_KEY` — public anon key (VITE_ prefixed for client)
- `SUPABASE_URL` — same as VITE_SUPABASE_URL (server usage)
- `SUPABASE_PUBLISHABLE_KEY` — same anon key for server-side when needed
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (server only; keep secret)
- `OPENAI_API_KEY` — your OpenAI API key (server-side only)

Example `.env` (local only):

```env
# Vite-exposed public keys
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

# Server-only keys (do NOT commit)
SUPABASE_SERVICE_ROLE_KEY=service_role_...
OPENAI_API_KEY=sk-...
```

3. Run the dev server

```bash
npm run dev
# open http://localhost:8081/
```

4. (If you see DB errors such as "Could not find the table 'public.events' in the schema cache") apply the migrations in `supabase/migrations/20260525182111_c028c753-97cf-4928-ac58-c8b70806586b.sql` to your Supabase project. Options:

- Paste the SQL into the Supabase SQL Editor (app.supabase.com → project → SQL) and run it.
- Or use the Supabase CLI to push migrations from this repo.

**Applying migrations (SQL Editor)**
1. Open: https://app.supabase.com/project/<your-project-ref>/sql
2. Paste the contents of `supabase/migrations/20260525182111_c028c753-97cf-4928-ac58-c8b70806586b.sql` and execute.

**Important security note**
- Never commit `.env` or secret keys. Rotate any keys you accidentally committed earlier.
- `SUPABASE_SERVICE_ROLE_KEY` must only be used on server-side functions.

**Testing the main flows**
- Sign up (uses server-side admin create user when available)
- Create an event (Organizers) — the dashboard provides a modal to create events. The `start_date` field accepts `datetime-local` and is normalized to an ISO timestamp.
- Register for events (Participants)
- Volunteer tasks & claim/complete flows
- Sponsor match and AI features powered by server functions

**Developer notes**
- If the dev server opens on a different port, check the terminal output for the Local URL.
- The project uses TanStack Start server functions in `src/integrations/supabase/*` for server-only operations.
- AI-related functions live in `supabase/functions/` and are proxied by the frontend to the project functions endpoints.

**Why select me**
If you're evaluating contributors or finalists, here's why I should be selected for this project:

- I built and maintained the core features: auth flows, role-based UI, event lifecycle, and AI integrations.
- I resolved critical issues (merge conflict resolution, SSR supabase export shape, server signup to avoid email throttling) and validated the end-to-end signup → dashboard flow.
- I can iterate quickly: run migrations, deploy the functions, and finalize AI tuning with your OpenAI key.
- Contact / GitHub: https://github.com/Keerthipriya27

Replace the author/contact details above with your preferred name, email, or portfolio link to personalize this README before sharing.

**License**
This repo contains project code. Add an explicit license file if you intend to open-source or share it.

--
_This README was generated and added to the repository to make the project easy to evaluate and run locally. Personalize the sections above (Author, Demo link, and Contact) before sharing._
