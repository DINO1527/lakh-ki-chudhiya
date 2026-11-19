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

Before Cloudflare deployments can succeed, create the two named Workers, set repository Actions secrets listed in [ENVIRONMENTS.md](ENVIRONMENTS.md), allow the GitHub app to access this repository, configure least-privilege Cloudflare API tokens and protect `main`. Do not add secrets to Wrangler vars or commit local env files.

## Supabase setup path

Use Supabase CLI v3.2.0 with the owner's authenticated account. Confirm the project reference in the dashboard before each hosted write. For UAT, run the following from the repository root after code review:

```sh
pnpm dlx supabase@3.2.0 login
pnpm dlx supabase@3.2.0 seed buckets --remote=<confirmed-uat-project-ref>
pnpm dlx supabase@3.2.0 db push --dry-run --remote=<confirmed-uat-project-ref>
pnpm dlx supabase@3.2.0 db push --remote=<confirmed-uat-project-ref>
```

Inspect each target and migration diff; do not use `--yes`. Load `supabase/seeds/uat_catalogue.sql` only into the confirmed UAT project, then run `supabase/tests/catalogue_rls.sql` and `supabase/tests/storage_policies.sql`. A real upload/download test is pending implementation of the media admin workflow and an owner-approved/licensed test image. This hosted test path does not need Docker.

After UAT acceptance and separate release approval, configure the same bucket and apply the same migration files to live using the confirmed live reference. Do not apply UAT seeds to live. Database and application rollback paths remain separate; prefer forward database fixes and test recovery before a live release.

Supabase's [database migration guide](https://supabase.com/docs/guides/deployment/database-migrations) documents `db push`; [Storage configuration](https://supabase.com/docs/guides/local-development/cli/config) documents buckets in `supabase/config.toml`, and the CLI's `seed buckets` command synchronizes those declarations. Supabase GitHub integration is optional and not currently part of this repository's release workflow.

## Current state

- Cloudflare Workers hosting config exists, but remote Worker creation/deployment, GitHub secrets and domain remain to be completed by the owner.
- Supabase bucket and policies are now versioned in the repository. Hosted UAT/live projects have not been changed in this session because no authenticated Supabase CLI session or MCP tool is available. The pinned CLI was used only for local config validation.
- Worker preview was not run, per the owner's preference. Actual hosted migration, bucket sync, Storage API upload/download, Auth and RLS checks remain pending.
- Reference docs: [Cloudflare Next.js](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/) · [OpenNext setup](https://opennext.js.org/cloudflare/get-started) · [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) · [Supabase pricing](https://supabase.com/pricing) · [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control) · [Supabase Auth SMTP](https://supabase.com/docs/guides/auth/auth-smtp) · [Next.js PWA](https://nextjs.org/docs/app/guides/progressive-web-apps)
