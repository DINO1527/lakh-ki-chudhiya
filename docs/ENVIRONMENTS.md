# Database and deployment environments

Use two hosted environments: UAT and live, each in a separate Supabase project. Development and testing target UAT. Product images use the same private `product-media` bucket definition in each project; their objects remain independent. Cloudflare Workers host the application and have no object-storage binding.

The owner supplied separate project references and designated one UAT and one live. Verify project names and roles in the dashboards before the first database change. Project references and credentials stay in secure owner notes or environment-specific secret stores; never commit them.

## Environment roles

| Environment                  | Purpose                                                                                     | Data and operations                                                                                                                                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local development and checks | Feature work on `codex/*` and integration through `dev`                                | Use UAT URL and publishable key only if local database access is configured. `dev` has no hosted Worker or separate Supabase project. Use synthetic catalogue and test accounts; no live credentials or customer data. |
| UAT                          | Shared isolated hosted project for development and QA acceptance                            | Owner-designated project. Synthetic fixtures only; no real messaging, payment, or customer records.                                                                                                                           |
| Live                         | Customer-facing release from `main` after branch and environment protections are configured | Separate owner-designated project. Owner-approved catalogue and transactions only; never load mock seed data.                                                                                                                 |

Keep UAT and live as separate Supabase projects. Apply the same checked-in migrations, in order, to both so table and column names stay identical. Apply and verify each migration to UAT first; promote those exact migration files to live only after UAT acceptance and explicit release approval. Configure the bucket identically in each project, but never copy objects or customer data between them. Load only approved UAT fixtures. Local development and the `dev` integration branch use UAT services; they do not introduce a third hosted environment or deployment credential set.

### Branch and release workflow

- `dev` is the protected integration branch. Start each task from the latest `origin/dev`, create a fresh `codex/<short-task-name>` branch, and open a PR from that branch to `dev`. Pull requests into `dev`, `uat` and `main` run verification only; they do not receive deployment secrets.
- Promote integrated work with a PR from `dev` to `uat`. Merging to `uat` runs the UAT Worker deployment. Inspect the hosted UAT result before preparing any live release.
- A live release requires an explicit owner request. Promote accepted `uat` to `main` with a PR, then dispatch the live deployment from `main`; the `live` GitHub environment must require an independent reviewer approval and prevent self-review. Merging to `main` alone does not deploy live.
- The remote `dev` and `uat` refs now both start at `main` (`faf4b436`), which contains the current UAT head through release PR #6. `develop` remains the legacy UAT deployment branch during transition; stop using it for new work, restrict the `uat` environment to branch `uat`, and retire `develop` only after a successful deployment from `uat` has been confirmed.
- Protect `dev`, `uat` and `main` against direct pushes, force pushes and deletion. Require the `verify` status check and resolved conversations. Keep approval counts at zero while this repository has a solo maintainer; add an independent required reviewer when one is available. Configure GitHub's `uat` and `live` environments to allow only branches `uat` and `main` respectively; require a live reviewer and prevent self-review when an independent reviewer is available.

The current Supabase Free plan lists 1 GB file storage, 5 GB cached egress, 5 GB uncached egress, two active projects and pausing after a week of low activity. It also lists 500 MB database size per project; automatic backups and branching are not included. Usage above free allowances may require a paid plan. Confirm current limits and account capacity before launch. Do not upgrade or enable billing without explicit approval. [Supabase pricing](https://supabase.com/pricing) · [Free project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)

## Credentials and application configuration

The app reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Use UAT values for development and tests, and live values only in the live deployment environment restricted to `main`. Configure the same variable names with different values in each environment. `.env.example` contains unmistakable placeholders; it is not a working connection. Publishable keys do not replace RLS, authorization or least-privilege grants. Never place a Supabase secret/service-role key in a `NEXT_PUBLIC_*` variable, browser bundle, checked-in file, log or test fixture. No service-role key is required for the current application.

Wrangler defines separate Worker environments named `lakh-ki-chudhiya-uat` and `lakh-ki-chudhiya-live`, with `APP_ENV` set to `uat` and `live` respectively. The `dev` branch only runs CI and does not deploy or receive Cloudflare/Supabase Actions secrets. Keep deployment credentials in GitHub Actions secrets, not in `vars` or this repository. The owner requested inspecting hosted deployments instead of local preview.

GitHub Actions verifies pushes to `dev`, `uat` and `main`, and PRs targeting those branches. A CI guard permits only `codex/*` → `dev`, `dev` → `uat`, and `uat` → `main`. A push to `uat` deploys the UAT Worker; the `dev` branch has no deploy job. Live deployment is a separate manual `workflow_dispatch` from `main`, after an owner-authorized PR promotion from `uat`. Pull requests never receive deployment credentials. The deploy jobs reference GitHub environments named `uat` and `live`; restrict UAT deployments to branch `uat` and live deployments to `main`, and require live reviewer approval with self-review disabled. Follow GitHub's [environment availability rules](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments).

Create GitHub Actions environments named `uat` and `live`. Add these environment secrets to `uat`:

- `CLOUDFLARE_API_TOKEN_UAT`
- `SUPABASE_UAT_URL`
- `SUPABASE_UAT_PUBLISHABLE_KEY`

Add these environment secrets to `live`:

- `CLOUDFLARE_API_TOKEN_LIVE`
- `SUPABASE_LIVE_URL`
- `SUPABASE_LIVE_PUBLISHABLE_KEY`

Add `CLOUDFLARE_ACCOUNT_ID` as a repository Actions secret shared by both environments. Do not create a `dev` environment or add deployment secrets for `dev`; local work uses UAT's non-live project values. Restrict `uat` deployments to `uat` and `live` deployments to `main`; require an independent reviewer for `live` and enable Prevent self-review. Configure branch rules for `dev`, `uat` and `main` as described above.

Use each project's URL and publishable key from its dashboard. These values are public-client configuration but remain environment-specific. Never substitute a secret/service-role key. Create separate custom Cloudflare Account API tokens for UAT and live. Give each Workers Scripts Edit/Write access scoped to its existing Worker, plus Account Settings Read if Wrangler requires it. Avoid the broad “Edit Cloudflare Workers” template because it also grants KV and R2 permissions. The tokens stay in Actions secrets; do not add them to Wrangler `vars`, `.dev.vars`, code or logs. The existing GitHub Actions workflow is the only deployment pipeline; do not also connect Cloudflare Workers Builds to this repository. The workflow deploys only after `uat` or a manually approved `main` dispatch. It does not run deployments on PRs, apply database migrations, load fixtures or create Storage buckets.

Cloudflare Workers Editor can deploy code to an existing Worker; initial Worker creation requires a broader Workers Admin role. Create the two named Workers in the dashboard, then use separate least-privilege Editor tokens for CI. See [Workers permissions](https://developers.cloudflare.com/workers/authorization/workers/).

## Supabase Storage and database setup

The repository declares one private bucket, `product-media`, in `supabase/config.toml`. It accepts JPEG, PNG, WebP and AVIF images up to 5 MiB. The private bucket is configured in UAT and live. As of the 2026-11-25 homepage release preflight, all nine checked-in migrations are applied in UAT; live has the original four and five later migrations are pending. The Stage 1 migration limits anonymous signed-URL creation to published images attached to published products and denies public object listing and draft access. The Stage 2 migration replaces the earlier `app_metadata.role=admin` Storage check with an active database-backed owner/staff membership check. Live has no copied UAT fixtures.

Use Supabase CLI v3.2.0 with an authenticated owner account. Always specify the project reference explicitly and inspect the command's printed target and diff:

```sh
pnpm dlx supabase@3.2.0 login
pnpm dlx supabase@3.2.0 seed buckets --remote=<confirmed-uat-project-ref>
pnpm dlx supabase@3.2.0 db push --dry-run --remote=<confirmed-uat-project-ref>
pnpm dlx supabase@3.2.0 db push --remote=<confirmed-uat-project-ref>
```

The bucket-sync command creates/updates the declared bucket through Supabase Storage; the database push applies migrations. Do not use `--yes`; inspect the target project and confirm each write prompt. Do not use the live project reference for UAT work.

For UAT fixtures, review `supabase/seeds/uat_catalogue.sql` and apply it only to the confirmed UAT project using the documented SQL workflow. The seed has been applied in UAT and currently creates two synthetic products and three variants. It contains unmistakably non-saleable catalogue rows and no photos, customer data, reviews, orders or credentials. Never apply it to live.

Run the rollback-only SQL checks directly against UAT with `pnpm dlx supabase@3.2.0 db query --remote=<confirmed-uat-project-ref> --file supabase/tests/catalogue_rls.sql` and the matching `storage_policies.sql` command. These direct hosted checks passed on 2026-11-19 for published/draft visibility, exact-stock denial, private bucket state and Storage policy shape. They do not start a local Supabase database. `supabase test db --remote` uses a pg_prove runner container; its first run failed because these scripts are assertion blocks rather than pgTAP plans and the runner lacked access to Storage metadata. Do not use that runner for this no-Docker workflow until the test harness is adapted. A real upload and signed-download check still needs the media API workflow and an owner-approved/licensed test image.

For future live releases, inspect the live target separately, run `pnpm dlx supabase@3.2.0 seed buckets --remote=<confirmed-live-project-ref>` and `pnpm dlx supabase@3.2.0 db push --dry-run --remote=<confirmed-live-project-ref>`, then apply only after explicit release approval. Never load UAT fixtures into live. The same migration files must reach both projects in the same order.

Supabase GitHub integration can watch repository branches, but it is not the current database release pipeline. Follow Supabase's current [GitHub integration guide](https://supabase.com/docs/guides/deployment/branching/github-integration) before enabling it. The repository's Cloudflare workflow does not apply Supabase migrations or storage configuration. Supabase's [database migration guide](https://supabase.com/docs/guides/deployment/database-migrations) documents the separate migration push path.

## Current setup status

- `.env.example` contains placeholder values only. No Supabase credentials belong in the repository.
- Supabase CLI identifies the projects as `lakh-ki-chudhiya-uat` (UAT) and `lakh-ki-chudhiya-live` (live). Their project references are kept outside the repository.
- The private `product-media` bucket is configured in both projects. UAT has all nine checked-in migrations; live has the original four, with five catalogue/commerce migrations pending. UAT has a synthetic fixture; live has no UAT fixture data. The latest live read-only preflight found zero products, collections and variants, and no `public.orders` table. Rollback-only checks previously passed on both environments for their then-current schemas.
- The Stage 2 UAT and live Worker deployments and hosted smoke checks pass. Live was deployed by GitHub Actions run `45035581147`, version `8ccbc69e-bb77-42b7-855f-639240345e68`, to `https://lakh-ki-chudhiya-live.dinoshan-theiventhiran.workers.dev`. The hosted live smoke verified the homepage, catalogue routes, health, private no-store headers, manifest/service-worker exclusions and empty catalogue; `/admin/inventory` redirects unauthenticated visitors to staff sign-in. No local Worker preview was run.
- The source workflow verifies PRs to `dev`, `uat` and `main`, enforces the staged PR path, deploys UAT after a `uat` push, and keeps live manual from `main`. Both remote branches now point to current `main`. The GitHub settings UI requires a fresh GitHub Mobile confirmation before it will save the prepared protection ruleset; the new `uat` deployment and environment restrictions are also pending. Keep the existing `develop` UAT path active until the new `uat` deployment is confirmed.
- Supabase CLI v3.2.0 is authenticated. No credentials or project references are stored in the repository. The Stage 2 code passes local lint, formatting, typecheck, 16 unit tests, Next.js build and Cloudflare Worker bundle build. UAT and live have no active staff memberships, so first-owner bootstrap and positive authenticated workflow checks remain pending.

## Homepage release note (2026-11-25)

- GitHub Actions run `45527595435` (run 44, commit `c1fc117`) passed verification and deployed the static footer SVG and scroll-reveal fixes to UAT. The live deployment job was skipped.
- The live Supabase preflight still shows five catalogue/commerce migrations pending, zero products/collections/variants, and no `public.orders` table. UAT has all nine checked-in migrations. No migration or fixture was written to live.
