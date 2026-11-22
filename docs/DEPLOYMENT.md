# Local development and Cloudflare deployment

## Stage 0

1. Inspect workspace and available Node LTS/pnpm/Git/Docker. Check Next.js/React/OpenNext/Workers adapter peer and runtime compatibility. Pin chosen versions and record decisions.
2. Configure one TypeScript App Router project, format/lint/typecheck/test, `.env.example`, ignored secrets, GitHub CI, `wrangler.jsonc`, and OpenNext.
3. Configure Supabase Auth/Postgres and a private `product-media` Storage bucket with RLS policies. Use the UAT project for development and tests; live remains isolated.
4. Record actual commands, outputs, undeployed resources, limits and credential gates. Do not deploy live or enable paid services.

The owner requested hosted inspection rather than local preview. Do not run Worker preview unless that preference changes.

## Budget controls

The target is $0 recurring platform cost only within verified free quotas; it is not a guarantee. Supabase Free currently lists 1 GB file storage, 5 GB cached and 5 GB uncached egress, 500 MB database per project, two active projects and pausing after one week of inactivity. The selected bucket has a stricter 5 MiB per-image limit. Check usage and plan limits before launch; no automatic upgrade or paid service. Custom domain, SMTP, assets or quota overage can cost money. Pre-generate optimized images, cache approved public media appropriately, and rate-limit upload paths. Supabase's default email service is restricted; confirm SMTP before public sign-up and recovery.

## Environment setup and operations

Development and testing use the UAT Supabase project; `main` targets the separate live project. GitHub Actions maps `develop` pushes to the UAT Worker. Live uses a separate manual `workflow_dispatch` from `main` after UAT inspection; pull requests run checks only. Wrangler names the Workers `lakh-ki-chudhiya-uat` and `lakh-ki-chudhiya-live`.

Product media is stored in Supabase Storage. The two Supabase projects each receive the same private bucket definition and RLS policies; bucket objects are isolated per project. The GitHub Cloudflare workflow does not apply database migrations, load fixtures or sync Storage buckets.

Before Cloudflare deployments can succeed, create the named Workers, set up the `uat` and `live` GitHub environments and secrets listed in [ENVIRONMENTS.md](ENVIRONMENTS.md), configure least-privilege Cloudflare API tokens and protect `main`. The repository's existing GitHub Actions workflow is the deployment path; do not configure a second Cloudflare Workers Builds integration. Do not add secrets to Wrangler vars or commit local env files.

## Supabase setup path

Use Supabase CLI v3.2.0 with the owner's authenticated account. Confirm the project reference in the dashboard before each hosted write. For UAT, run the following from the repository root after code review:

```sh
pnpm dlx supabase@3.2.0 login
pnpm dlx supabase@3.2.0 seed buckets --remote=<confirmed-uat-project-ref>
pnpm dlx supabase@3.2.0 db push --dry-run --remote=<confirmed-uat-project-ref>
pnpm dlx supabase@3.2.0 db push --remote=<confirmed-uat-project-ref>
```

Inspect each target and migration diff; do not use `--yes` unless the owner approved that exact target and operation. The UAT bucket, four migrations and synthetic fixture are applied. Stage 2's rollback-only assertions passed through `supabase db query --remote=<confirmed-uat-project-ref> --file supabase/tests/stage2_admin_inventory.sql --yes`; this path does not start a local Supabase database. The earlier `supabase test db --remote` pg_prove runner failed because the scripts are not pgTAP plans and the runner lacked Storage metadata access. A real upload/download test is pending an owner-approved/licensed test image.

After UAT inspection and explicit release authorization, configure the same bucket and apply the same migration files to live using the confirmed live reference. Do not apply UAT seeds to live. For the current rollout, the owner explicitly requested both UAT and live; UAT hosted smoke checks passed before the live migrations and bucket were applied. Database and application rollback paths remain separate; prefer forward database fixes and test recovery before a live release.

Supabase's [database migration guide](https://supabase.com/docs/guides/deployment/database-migrations) documents `db push`; [Storage configuration](https://supabase.com/docs/guides/local-development/cli/config) documents buckets in `supabase/config.toml`, and the CLI's `seed buckets` command synchronizes those declarations. Supabase GitHub integration is optional and not currently part of this repository's release workflow.

## Current state

- UAT Stage 2 code is on `develop` and the Worker deployment succeeded in GitHub Actions run `45033822520`. The UAT URL is `https://lakh-ki-chudhiya-uat.dinoshan-theiventhiran.workers.dev`. The hosted smoke passed storefront/catalogue route checks, published/draft fixture visibility, health responses, no-store headers, manifest and service-worker exclusions.
- Supabase UAT and live have the private bucket and all four ordered repository migrations. UAT has the synthetic fixture; live has no UAT fixture data. Rollback-only Stage 1 RLS/Storage and Stage 2 authorization/stock assertions pass on UAT; the updated Storage-policy and Stage 2 assertions pass on live.
- Supabase CLI project display names still match. UAT and live were mapped from the documented UAT migration and fixture state; project references remain outside the repository. Verify the selected project ref in the Supabase dashboard before any hosted write.
- The live Worker deployment is pending. Worker preview was not run, per the owner's preference. Positive staff workflows, Storage API upload/download, browser accessibility and full Auth/cache-isolation checks remain pending. UAT and live have zero active staff memberships, so the owner must bootstrap the first owner in each environment before staff sign-in can succeed.
- The local Stage 2 implementation passes lint, formatting, typecheck, 16 unit tests, Next.js build and Cloudflare Worker bundle build. The Windows OpenNext compatibility warning and experimental Node.js middleware warning remain. Stage 1 visual/accessibility acceptance remains incomplete and is not recorded as waived.
- GitHub Actions run `45033822520` passed verification and `deploy-uat`; deployment environments/secrets were present for that run. Check that they remain configured before a new release. The earlier Stage 1 run was `44515268221`.
- Reference docs: [Cloudflare Next.js](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/) · [OpenNext setup](https://opennext.js.org/cloudflare/get-started) · [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) · [Supabase pricing](https://supabase.com/pricing) · [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control) · [Supabase Auth SMTP](https://supabase.com/docs/guides/auth/auth-smtp) · [Next.js PWA](https://nextjs.org/docs/app/guides/progressive-web-apps)
