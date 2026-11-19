# Database and deployment environments

Use two hosted environments: UAT and live, each in a separate Supabase project. Development and testing target UAT. Product images use the same private `product-media` bucket definition in each project; their objects remain independent. Cloudflare Workers host the application and have no object-storage binding.

The owner supplied separate project references and designated one UAT and one live. Verify project names and roles in the dashboards before the first database change. Project references and credentials stay in secure owner notes or environment-specific secret stores; never commit them.

## Environment roles

| Environment | Purpose | Data and operations |
| --- | --- | --- |
| Local development and checks | Feature work and automated checks | Use UAT URL and publishable key only if local database access is configured. The owner requested hosted inspection instead of local preview. Use synthetic catalogue and test accounts; no live credentials or customer data. |
| UAT | Shared isolated hosted project for development and QA acceptance | Owner-designated project. Synthetic fixtures only; no real messaging, payment, or customer records. |
| Live | Customer-facing release from `main` after branch and environment protections are configured | Separate owner-designated project. Owner-approved catalogue and transactions only; never load mock seed data. |

Keep UAT and live as separate Supabase projects. Apply the same checked-in migrations, in order, to both so table and column names stay identical. Apply and verify each migration to UAT first; promote those exact migration files to live only after UAT acceptance and release approval. Configure the bucket identically in each project, but never copy objects or customer data between them. Load only approved UAT fixtures. The `develop` branch is the planned UAT deployment branch; `main` is the live release branch.

The current Supabase Free plan lists 1 GB file storage, 5 GB cached egress, 5 GB uncached egress, two active projects and pausing after a week of low activity. It also lists 500 MB database size per project; automatic backups and branching are not included. Usage above free allowances may require a paid plan. Confirm current limits and account capacity before launch. Do not upgrade or enable billing without explicit approval. [Supabase pricing](https://supabase.com/pricing) · [Free project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)

## Credentials and application configuration

The app reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Use UAT values for development and tests, and live values only in the live deployment environment restricted to `main`. Configure the same variable names with different values in each environment. `.env.example` contains unmistakable placeholders; it is not a working connection. Publishable keys do not replace RLS, authorization or least-privilege grants. Never place a Supabase secret/service-role key in a `NEXT_PUBLIC_*` variable, browser bundle, checked-in file, log or test fixture. No service-role key is required for the current application.

Wrangler defines separate Worker environments named `lakh-ki-chudhiya-uat` and `lakh-ki-chudhiya-live`, with `APP_ENV` set to `uat` and `live` respectively. Keep deployment credentials in GitHub Actions secrets, not in `vars` or this repository. The owner requested inspecting hosted deployments instead of local preview.

GitHub Actions maps `develop` pushes to the UAT Worker. Live deployment is a separate manual `workflow_dispatch` from `main`, so UAT can be inspected before promoting. Pull requests run verification only and never receive deployment credentials. The deploy jobs reference GitHub environments named `uat` and `live`; protect `main` and restrict the `live` environment to `main` in repository settings. For a private repository on GitHub Free, environment secrets and deployment branch restrictions may be unavailable; confirm current GitHub plan limits before relying on them. Follow GitHub's [environment availability rules](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments).

Configure these repository Actions secrets before enabling deployments:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN_UAT` and `CLOUDFLARE_API_TOKEN_LIVE` (separate tokens, scoped to their one Worker)
- `SUPABASE_UAT_URL` and `SUPABASE_UAT_PUBLISHABLE_KEY`
- `SUPABASE_LIVE_URL` and `SUPABASE_LIVE_PUBLISHABLE_KEY`

Use each project's URL and publishable key from its dashboard. These values are public-client configuration but remain environment-specific. Never substitute a secret/service-role key. The Cloudflare tokens stay in Actions secrets; do not add them to Wrangler `vars`, `.dev.vars`, code or logs. The workflow builds with the branch's Supabase values and deploys to the matching Worker. It does not run on pull requests, apply database migrations, load fixtures or create Storage buckets.

Cloudflare Workers Editor can deploy code to an existing Worker; initial Worker creation requires a broader Workers Admin role. Create the two named Workers in the dashboard, then use separate least-privilege Editor tokens for CI. See [Workers permissions](https://developers.cloudflare.com/workers/authorization/workers/).

## Supabase Storage and database setup

The repository declares one private bucket, `product-media`, in `supabase/config.toml`. It accepts JPEG, PNG, WebP and AVIF images up to 5 MiB. This private setting is intended for both projects; hosted bucket creation is pending. Policies in `supabase/migrations/20261118020000_supabase_storage_policies.sql` limit anonymous signed-URL creation to published images attached to published products; they deny object listing and draft access. Admin Storage writes require a trusted `app_metadata.role=admin` claim. The admin workflow that assigns this claim and media upload UI are not implemented yet.

Use Supabase CLI v3.2.0 with an authenticated owner account. Always specify the project reference explicitly and inspect the command's printed target and diff:

```sh
pnpm dlx supabase@3.2.0 login
pnpm dlx supabase@3.2.0 seed buckets --remote=<confirmed-uat-project-ref>
pnpm dlx supabase@3.2.0 db push --dry-run --remote=<confirmed-uat-project-ref>
pnpm dlx supabase@3.2.0 db push --remote=<confirmed-uat-project-ref>
```

The bucket-sync command creates/updates the declared bucket through Supabase Storage; the database push applies migrations. Do not use `--yes`; inspect the target project and confirm each write prompt. Do not use the live project reference for UAT work.

For UAT fixtures, review `supabase/seeds/uat_catalogue.sql` and apply it only to the confirmed UAT project using the documented SQL workflow. It contains synthetic, unmistakably non-saleable catalogue rows and no photos, customer data, reviews, orders or credentials. Never apply it to live.

Run `supabase/tests/catalogue_rls.sql` and `supabase/tests/storage_policies.sql` against UAT after migrations and bucket creation. Verify published rows, draft protections, exact-stock denial, private bucket state and operation-scoped Storage policies. A real upload and signed-download check still needs the media API workflow and an owner-approved/licensed test image. This hosted path does not require Docker.

To prepare live after UAT acceptance, inspect the live target separately, then run `pnpm dlx supabase@3.2.0 seed buckets --remote=<confirmed-live-project-ref>` and `pnpm dlx supabase@3.2.0 db push --dry-run --remote=<confirmed-live-project-ref>`; apply only after an explicit live release approval. Never load UAT fixtures into live. The same migration files must reach both projects in the same order.

Supabase GitHub integration can watch repository branches, but it is not the current database release pipeline. Follow Supabase's current [GitHub integration guide](https://supabase.com/docs/guides/deployment/branching/github-integration) before enabling it. The repository's Cloudflare workflow does not apply Supabase migrations or storage configuration. Supabase's [database migration guide](https://supabase.com/docs/guides/deployment/database-migrations) documents the separate migration push path.

## Current setup status

- `.env.example` contains placeholder values only. No Supabase credentials belong in the repository.
- The owner supplied separate project references for UAT and live. Verify which dashboard is UAT/live before writes.
- `supabase/config.toml` and migrations now declare the same private image bucket and access rules for both projects; hosted configuration is not confirmed applied.
- The named Cloudflare Workers have not been confirmed created or deployed.
- The GitHub workflow maps `develop` to UAT and offers a separate manual live deployment from `main`; repository secrets and branch protections still need owner setup.
- No Supabase migration, bucket sync, seed or database test was run in this workspace because there is no authenticated Supabase CLI session or Supabase MCP tool in this session. Supabase CLI v3.2.0 was invoked only to validate local config. Docker is not required for the hosted UAT path.
