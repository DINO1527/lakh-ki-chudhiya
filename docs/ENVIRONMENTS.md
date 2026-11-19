# Database and deployment environments

Use three isolated stages: local development, UAT, and live. UAT and live each use a separate Supabase project (Postgres, Auth settings, API keys, and backups). Keep Cloudflare Worker configuration, secrets, and R2 media namespaces separate as well. A project URL, key, Worker name, or bucket name must never be shared between UAT and live.

This document describes the intended setup. No UAT or live Supabase project, Cloudflare Worker, R2 bucket, custom domain, secret, or deployment has been created or configured by this repository change. Project references and credentials must come from the owner; do not commit them.

## Environment roles

| Environment | Purpose | Data and operations |
| --- | --- | --- |
| Local | Day-to-day development, preferably Supabase CLI and local services | Synthetic fixtures only; no real customer data or live credentials |
| UAT | Owner and QA acceptance against an isolated hosted project | Synthetic catalogue and test accounts only; no real WhatsApp messaging, payment, or customer records |
| Live | Customer-facing store | Owner-approved real catalogue and transactions; never load mock seed data |

Keep one database per environment. Do not copy live customer, order, authentication, or media data into UAT. Configure the same reviewed migrations in order, then load only approved UAT fixtures. Supabase supports separate development, staging, and production projects; project branching is optional and plan-dependent.

## Credentials and application configuration

The app currently reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. `.env.example` is for local development. In UAT and live, configure those values separately in the deployment's environment-specific variable/secret store. Publishable keys are designed for client use; they do not replace RLS, authorization, or least-privilege grants. Never place a Supabase secret/service-role key in a `NEXT_PUBLIC_*` variable, browser bundle, checked-in file, log, or test fixture. The current app has no service-role key configured.

For Cloudflare, define each Worker environment and its bindings explicitly: Wrangler does not inherit environment bindings or variables. Use separate UAT/live Worker names and R2 buckets, and set `APP_ENV` to `uat` or `live` respectively. Keep credentials in the environment-scoped Worker secret store or approved CI secret store, not in `vars` or this repository. Use `.dev.vars.uat` only for local UAT-targeted preview when needed; keep it ignored and never create a local live credentials file. No automatic deployment or resource provisioning is configured here.

Before connecting a local app to a hosted project, verify the project reference and URL in the dashboard and compare them with the intended environment. Keep UAT and live credentials in separate deployment scopes. Never use a live credential for local testing.

## UAT database setup and fixture data

1. Create/obtain the UAT Supabase project and record its project reference in the owner's secure operations notes, not Git.
2. Confirm the project reference in the dashboard before linking the Supabase CLI. Apply reviewed migrations to UAT in order using the approved deployment workflow. Do not use the seed file as a migration.
3. Review `supabase/seeds/uat_catalogue.sql`; it contains synthetic, unmistakably non-saleable catalogue rows and no photos, customer data, reviews, orders, or credentials.
4. Run the file only against the confirmed UAT project. From an authorized machine with the Supabase CLI installed, replace `your-uat-project-ref` with the confirmed UAT project reference and run `supabase db query --remote=your-uat-project-ref --file supabase/seeds/uat_catalogue.sql`. Confirm the CLI's printed `Target:` project and interactive write prompt before proceeding. Do not use `--yes` or a live project reference.
5. Query the catalogue through the application and verify published rows are visible, the draft row is hidden by RLS, inactive/out-of-stock behavior is correct, and no exact stock count is exposed to public roles.
6. To remove the fixtures, delete only the rows whose fixture SKUs begin `UAT-` and the two known fixture slugs after confirming the same UAT project reference. Do not run broad truncation or cleanup statements.

The fixture file is intentionally outside Supabase's default `supabase/seed.sql` path and is not wired to automatic database reset/start. It is not safe to execute against live. The data is not yet validated against a running database because no Supabase CLI or database is configured in this workspace. Supabase's default local startup/reset only executes `supabase/seed.sql`; keep this UAT file separate from configured seed paths.

## Release path

1. Review code and SQL; run local checks and database/RLS tests.
2. Apply migrations to UAT; load UAT-only fixtures; complete functional, security, and owner acceptance checks.
3. Obtain owner approval for the release, confirm backup/restore readiness and free-tier/billing limits, and review migration/rollback strategy.
4. Apply the same migration artifacts to live through an explicit, separately targeted operation. Do not load any UAT seed into live.
5. Deploy the live Worker only after environment variables, secrets, bindings, domain, monitoring, and rollback have been verified.

UAT success does not imply live readiness. Keep migration and application rollbacks separate; prefer forward database fixes and test restore procedures before a live release.

## Current setup status

- Local `.env.example` points at the standard local Supabase URL and uses a placeholder publishable key.
- No UAT/live project references, keys, Worker bindings, or buckets are present in the repo.
- No remote migration, seed, deployment, or resource provisioning was run.
- UAT seed execution and database-level RLS verification remain pending confirmation that the owner-provided Supabase project is UAT and access to database tooling. Supabase MCP OAuth is configured in the owner's Codex user config; no database calls have been made through it.
