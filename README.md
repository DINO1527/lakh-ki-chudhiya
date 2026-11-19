# Lakh Ki Chudhiya | Stage 1 in progress

This workspace began as a documentation and skill kit for a premium handcrafted lac bangle store. It now contains a Next.js App Router foundation, a local OpenNext/Cloudflare Workers proof of concept, and the first responsive storefront pages. The shop intentionally shows empty states until real product imagery, sizes, prices and inventory are supplied. It is **not a production storefront**. The 13 bundled project skills remain available, and the reviewed Supabase Postgres best-practices skill is installed at project scope. The owner's Codex user config has separate OAuth-authenticated Supabase MCP entries for UAT and live.

## Start in Codex

1. Extract the ZIP, including hidden `.agents` and `.codex` folders, to a project directory. If merging into existing code, review differences before overwriting any file.
2. Open the project folder in Codex. Use Node.js 24.12.0 and pnpm 10.34.5 as pinned by this foundation. The checked in pnpm lockfile and exact package pins are authoritative.
3. Run `pnpm install`. Configure `.env.local` only when a local or approved development Supabase instance is available. Copy `.dev.vars.example` to `.dev.vars` only for local Worker preview. Never put production secrets in these files.
4. `pnpm dev` starts Next.js locally. `pnpm cf:build` builds the Worker bundle; `pnpm cf:preview` serves it in local workerd/Wrangler. `pnpm test:worker` checks the preview while it is running. Deployment has not been performed.
5. Review `docs/PROGRESS.md` and `docs/decisions/` before continuing. Stage 0 still needs a local Supabase Auth/database smoke test and a vinext Worker-runtime comparison. Stage 1 has no published products; its catalogue migration must be applied and tested locally before data-backed catalogue work. Do not use production credentials or publish unverified products.

## Database environments

Development and testing target UAT; the `main` release target uses a separate live Supabase project. Both projects must receive the same ordered migration files so their table and column names stay aligned. The synthetic catalogue fixture at `supabase/seeds/uat_catalogue.sql` is UAT-only and is deliberately not part of automatic database reset. Confirm each project role before any hosted database write; never load UAT fixtures into live. Setup and release guidance is in [`docs/ENVIRONMENTS.md`](docs/ENVIRONMENTS.md). The owner supplied separate project references for UAT and live; dashboard verification is pending. Branch protection and deployment secrets are not configured yet.

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
| docs/AGENT_SETUP.md      | GitHub skills, references and MCP guidance  |
| docs/SKILL_MAP.md        | Project skill routing                       |
| docs/PROGRESS.md         | Initial baseline and stage tracking         |

The original project specification is retained with minor integration edits. Sri Lanka/LKR, single store, WhatsApp-assisted orders, reservation at confirmation and a free-tier target remain the starting assumptions. Palette and design are proposals, not owner-approved assets.
