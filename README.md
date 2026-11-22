# Lakh Ki Chudhiya | Stage 2 in progress

This workspace began as a documentation and skill kit for a premium handcrafted lac bangle store. It now contains a Next.js App Router foundation, a Cloudflare Workers adapter build, responsive storefront catalogue routes, and a protected admin workspace for products, collections, homepage content, staff access and per-SKU stock adjustments. Stage 2 migrations and hosted Worker checks pass on UAT and live. The live Worker is deployed at `https://lakh-ki-chudhiya-live.dinoshan-theiventhiran.workers.dev`. The shop shows empty states when no approved catalogue is configured; UAT fixtures are synthetic and visibly marked not for sale. Real product imagery, owner-approved prices and verified sizes are still required before sale. It is **not a production storefront**. The 13 bundled project skills remain available, and the reviewed Supabase Postgres best-practices skill is installed at project scope.

## Start in Codex

1. Extract the ZIP, including hidden `.agents` and `.codex` folders, to a project directory. If merging into existing code, review differences before overwriting any file.
2. Open the project folder in Codex. Use Node.js 24.12.0 and pnpm 10.34.5 as pinned by this foundation. The checked in pnpm lockfile and exact package pins are authoritative.
3. Run `pnpm install`. Copy `.env.example` to `.env.local` and fill only with UAT URL and publishable key values for local development and tests. The publishable key is not a secret, but the ignored `.env.local` file must not be committed. Never put live credentials or Supabase secret/service-role keys in checked-in files or browser variables.
4. `pnpm dev` starts Next.js locally. `pnpm cf:build` builds the Worker bundle. Local preview commands are documented for cases where the owner requests them. GitHub Actions deploys `develop` pushes to the UAT Worker; live deployment is a separate manual dispatch from `main`. See `docs/ENVIRONMENTS.md` for required Actions secrets and remaining account setup.
5. Review `docs/PROGRESS.md`, `docs/ADMIN_OPERATIONS.md` and `docs/decisions/` before continuing. Stage 0 still needs application Auth/query/cache-isolation evidence and a vinext Worker-runtime comparison. Stage 1 accessibility acceptance is incomplete. Keep development and testing on UAT; do not use production credentials for local testing or publish unverified products.

## Database environments

Development and testing target `lakh-ki-chudhiya-uat`; the `main` release target uses the separate `lakh-ki-chudhiya-live` Supabase project. Both projects receive the same ordered migrations. The synthetic catalogue fixture at `supabase/seeds/uat_catalogue.sql` is UAT-only and is deliberately not part of automatic database reset. Never load UAT fixtures into live. Setup and release guidance is in [`docs/ENVIRONMENTS.md`](docs/ENVIRONMENTS.md). UAT and live Stage 2 Workers and hosted smoke checks pass. Project names were confirmed in the authenticated Supabase project list; references remain outside this repository.

## Navigation

| File                     | Purpose                                     |
| ------------------------ | ------------------------------------------- |
| AGENTS.md                | Always-on repository policy                 |
| PROJECT_SPEC.md          | Full requirements and launch/deferred scope |
| DESIGN.md                | Jewellery UI/UX and visual system           |
| FILE_STRUCTURE.md        | Target folder tree and ownership            |
| docs/ARCHITECTURE.md     | Patterns, dependency boundaries, data flow  |
| docs/CODING_STANDARDS.md | SOLID, reuse, naming, TypeScript, quality   |
| docs/BUSINESS_RULES.md   | State transitions and invariants            |
| docs/SECURITY.md         | Threats, RLS, media privacy and testing     |
| docs/TEST_PLAN.md        | Test matrix and gates                       |
| docs/DEPLOYMENT.md       | Local/Worker verification and budget        |
| docs/ENVIRONMENTS.md     | Local/UAT/live isolation and UAT fixtures   |
| docs/ADMIN_OPERATIONS.md | First-owner setup, staff roles and stock flow |
| docs/AGENT_SETUP.md      | GitHub skills, references and MCP guidance  |
| docs/SKILL_MAP.md        | Project skill routing                       |
| docs/PROGRESS.md         | Initial baseline and stage tracking         |

The original project specification is retained with minor integration edits. Sri Lanka/LKR, single store, WhatsApp-assisted orders, reservation at confirmation and a free-tier target remain the starting assumptions. Palette and design are proposals, not owner-approved assets.

## Media storage

Product images use separate private Supabase Storage `product-media` buckets in UAT and live. The Stage 2 migration moves Storage writes to active database-backed staff membership. The bucket's 5 MiB image limit and accepted MIME types are in `supabase/config.toml`; access policies are versioned in migrations. Cloudflare Workers host the app. See `docs/ENVIRONMENTS.md` and ADRs 0003–0004. Supabase Free includes limited storage and egress quotas, so free use is not guaranteed at any traffic level.
