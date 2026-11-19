# Database and deployment environments

Use two hosted database environments: UAT and live, each in a separate Supabase project. Development and testing target UAT. A disposable local Supabase stack may be used when a test needs destructive resets. Keep Cloudflare Worker configuration, secrets, and R2 media namespaces separate as well. A project URL, key, Worker name, or bucket name must never be shared between UAT and live.

The owner reports creating one Supabase project. Based on the requested routing, treat it as the intended UAT project until the project name/role is verified in the dashboard. A second, separate Supabase project is required for live. This repository has not created either project or applied any database changes. Project references and credentials belong in secure owner notes or environment-specific secret stores; never commit them.

## Environment roles

| Environment | Purpose | Data and operations |
| --- | --- | --- |
| Local development and testing | Feature work, local preview, and authorized database-backed tests | Intended to connect to UAT using UAT URL and publishable key only. Use synthetic catalogue and test accounts; no live credentials or customer data. This connection is not configured yet. |
| UAT | Shared isolated hosted project for development and QA acceptance | Owner-created project is intended for UAT, pending dashboard verification. Synthetic fixtures only; no real messaging, payment, or customer records. |
| Live | Customer-facing release from `main` after branch and environment protections are configured | Separate live project, not yet created. Owner-approved catalogue and transactions only; never load mock seed data. |

Keep UAT and live as separate Supabase projects. Use the same checked-in migration files, in the same order, on both projects so table and column names stay identical. Apply and verify each migration on UAT first; promote those exact migration files to live only after UAT acceptance and release approval. Do not copy live customer, order, authentication, or media data into UAT. Load only approved UAT fixtures. The `main` branch is the live release target; development and testing use UAT. Branching is not part of this design.

The current Supabase Free plan lists two active projects, 500 MB database size per project, and pausing after a week of low activity; automatic backups and branching are not included. Confirm free-project capacity on the owner's account and current limits before creation. Do not upgrade or enable billing without explicit approval. [Supabase pricing](https://supabase.com/pricing) · [Free project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)

## Credentials and application configuration

The app currently reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The intended mapping is UAT values for local development and tests, and live values only in a live deployment environment restricted to `main`. Configure the same variable names with different values in each environment. `.env.example` remains a local placeholder. Publishable keys are designed for client use; they do not replace RLS, authorization, or least-privilege grants. Never place a Supabase secret/service-role key in a `NEXT_PUBLIC_*` variable, browser bundle, checked-in file, log, or test fixture. The current app has no service-role key configured.

For Cloudflare, define each Worker environment and its bindings explicitly: Wrangler does not inherit environment bindings or variables. Use separate UAT/live Worker names and R2 buckets, and set `APP_ENV` to `uat` or `live` respectively. Keep credentials in the environment-scoped Worker secret store or approved CI secret store, not in `vars` or this repository. Use `.dev.vars.uat` only for local UAT-targeted preview when needed; keep it ignored and never create a local live credentials file. The current workflow runs CI only; GitHub environment secrets, Worker environments, and automatic deployment are not configured.

When configuring GitHub Actions, use separate `uat` and `live` environments. Development and authorized database tests receive UAT values only. Restrict the `live` environment to the `main` branch and require owner approval before a live deployment. Pull request jobs must never receive live credentials. These branch and environment protections are not configured yet.

Before connecting a local app to a hosted project, verify the project reference and URL in the dashboard and compare them with the intended environment. Keep UAT and live credentials in separate deployment scopes. Never use a live credential for local testing.

## UAT database setup and fixture data

1. Confirm the owner-created project is UAT in the dashboard; record its project reference in the owner's secure operations notes, not Git. Create a separate live project using the free plan only if account capacity allows.
2. Confirm the UAT project reference in the dashboard before connecting the app or applying SQL. Apply reviewed migrations to UAT in order using the approved deployment workflow. Do not use the seed file as a migration.
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

UAT success does not imply live readiness. Keep migration and application rollbacks separate; prefer forward database fixes and test restore procedures before a live release. The live project must receive the same migration files as UAT; do not copy UAT rows or fixtures into live.

## Current setup status

- Local `.env.example` points at the standard local Supabase URL and uses a placeholder publishable key.
- No project references, keys, Worker bindings, or buckets are present in the repo.
- One owner-created Supabase project is intended for UAT, pending dashboard confirmation. The separate live project has not been created. No remote migration, seed, deployment, or resource provisioning was run by Codex.
- UAT seed execution and database-level RLS verification remain pending project verification and database tooling. The Supabase MCP URL is project-scoped, which disables its account-management tools; the active session exposes no Supabase tools for project creation. No database calls have been made through MCP.
