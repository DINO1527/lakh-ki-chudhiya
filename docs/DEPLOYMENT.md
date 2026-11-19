# Local development and Cloudflare deployment

## Stage 0

1. Inspect workspace and available Node LTS/pnpm/Git/Docker. Check current Next.js/React/OpenNext/Workers adapter peer/runtime compatibility and pricing. Pin chosen versions in package manifest/lockfile; record ADR. Do not switch framework without approval.
2. Scaffold one TypeScript App Router project, configure formatting/lint/typecheck/test, `.env.example`, ignored secrets and GitHub CI definitions. Configure `wrangler.jsonc`, OpenNext config, supported compatibility date and nodejs_compat as required by adapter. Follow official setup, do not invent unsupported config.
3. Start local Supabase if feasible (CLI/Docker), or obtain approval for an isolated dev project. Verify SSR cookies, RLS query, simple mutation and R2 local/dev binding. Use separate media namespaces. No production data. Test actual workerd preview including public/private cache separation and service-worker scope. R2 local binding is suitable for Stage 0; remote R2 setup requires an account and billing activation, so do not provision it without explicit owner approval.
4. Record actual commands, outputs, deployed/undeployed resources, compatibility limits and any credentials gates. No live deployment or paid provisioning without approval.

## Budget controls

Target $0 platform recurring cost within verified quotas; not a guarantee. Workers free requests/CPU, Supabase DB/storage/egress/auth quotas and inactivity pause, R2 billing activation and overage must be checked against current official pricing. Track usage; no automatic upgrades. Custom domain, SMTP and assets may cost. Use public optimized images, pre-generate thumbnails offline, no paid image runtime by default, cache public assets efficiently. Limit file uploads and abusive API calls. Supabase default email is restricted; verify custom SMTP and authorized sender before public registration/recovery; use local mail testing otherwise.

## Environment setup and operations

Development and testing are intended to use the UAT Supabase project; the `main` release target uses a separate live Supabase project. Apply the same ordered migration files to both so schema names stay aligned. UAT and live also require separate Cloudflare Worker environments, secret scopes, and R2 buckets. Wrangler environment bindings/vars must be configured independently. The owner supplied project references for both environments; dashboard verification is pending, and the application/Worker connections are not configured. Branch protection, environment secrets, and deployment automation are not configured; the current GitHub workflow runs CI only. See [ENVIRONMENTS.md](ENVIRONMENTS.md) for project separation, UAT-only fixture workflow, target verification and release steps.

Do not commit `.env.local` or `.dev.vars`; never use production credentials for local testing. Configure actual WhatsApp number, catalogue, delivery, policies, domain/SSL and owner accounts only from owner values. Test UAT with synthetic fixtures, RLS, cache, health checks and load constraints. Prepare database export/restore and R2 media backup outside the provider; do not assume free managed backup. Production approval gate: critical tests, owner signoff, plan/billing review, migration compatibility, rollback strategy, monitoring, real assets and legal/business content. Roll back app version separately from DB migration; prefer forward fixes/expand-contract and test restore.

References: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/ ; https://opennext.js.org/cloudflare/get-started ; https://developers.cloudflare.com/workers/platform/limits/ ; https://developers.cloudflare.com/r2/pricing/ ; https://supabase.com/pricing ; https://supabase.com/docs/guides/auth/auth-smtp ; https://nextjs.org/docs/app/guides/progressive-web-apps
