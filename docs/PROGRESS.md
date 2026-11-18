# Development progress

**Last updated:** 2026-11-18  
**Current milestone:** Stage 1 — design/catalogue (in progress by owner direction; Stage 0 exit gate remains incomplete)

## Initial state

The workspace was a documentation and skill kit with no application code and no `.git` metadata. Stage 0 began with repository, toolchain, architecture, design, security and skill review. The owner later directed moving to the next stage. Stage 0 remains incomplete; its outstanding gates are preserved below and are not marked waived or passed.

## Stage status

| Stage                | Status      | Evidence                                                                                                                                                                                                                               |
| -------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 Foundation         | In progress | Next.js scaffold, OpenNext Worker build/local preview, local R2 fixture read and smoke checks pass. Supabase Auth/RLS query and full cache-isolation gates remain. See below and ADR 0001.                                             |
| 1 Design/catalogue   | In progress | Responsive storefront, empty catalogue states, draft catalogue migration, and tested variant-selection/price rules added. Real catalogue, supplier size chart, assets, database application/RLS tests, and wired product pages remain. |
| 2 Admin/catalogue    | Not started | Stage 1 only.                                                                                                                                                                                                                          |
| 3 Account/cart       | Not started | Stage 1 only.                                                                                                                                                                                                                          |
| 4 Orders             | Not started | Stage 1 only.                                                                                                                                                                                                                          |
| 5 Reviews/reports    | Not started | Stage 1 only.                                                                                                                                                                                                                          |
| 6 Experience/release | Not started | Stage 1 only.                                                                                                                                                                                                                          |
| 7 Expansion          | Deferred    | Separate owner direction required.                                                                                                                                                                                                     |

## Requirements and skills consulted

Read `AGENTS.md`, `PROJECT_SPEC.md`, `README.md`, `DESIGN.md`, `FILE_STRUCTURE.md`, all documents in `docs/`, and all 13 project skills in `.agents/skills/`. Applied `project-architecture` and `clean-code`; reviewed the rest for future routing. Reviewed recommended GitHub skills and connected MCP availability in [ADR 0002](decisions/0002-agent-skills-and-tools-review.md). No optional external skill or MCP server was installed. Reviewed current official Next.js, Cloudflare, OpenNext and Supabase documentation/pricing; runtime choice and vinext scan are recorded in [ADR 0001](decisions/0001-stage0-runtime.md).

## Changes

- Added a single strict TypeScript Next.js App Router application scaffold, exact package pins and pnpm lockfile, lint/format/type/test scripts, CI workflow, examples and ignored local secrets.
- Added OpenNext/Workers config, generated Cloudflare types, local-only R2 fixture and Worker smoke script.
- Added server-only Supabase client setup, a smoke migration with RLS enabled, and a health endpoint. No Supabase project or credentials are configured.
- Added a minimal home page, web manifest, offline page, and scoped service worker. The service worker excludes API and cookie-bearing account/admin/checkout/order/auth paths.
- Added ADRs for adapter evaluation and skills/MCP review. Updated README and deployment notes to describe the actual Stage 0 state.
- Stage 1 first slice: added shared storefront header/footer and empty state, responsive design tokens, home/shop/collections/size guide pages, and a catalogue schema migration with published-row RLS and public column grants that omit exact stock counts. Product pages remain unavailable until real product records/assets are supplied.
- Added pure product-variant resolution and LKR minor-unit formatting rules, plus an accessible variant picker component. The component is ready for product pages but is not exposed on the empty catalogue routes.
- Created only local ignored `.dev.vars` and `.wrangler/state` fixture data. No remote service/resource, GitHub mutation, deployment, production credential or billing change was used.
- Documented local/UAT/live Supabase separation and Worker/R2 isolation in `docs/ENVIRONMENTS.md`, and added UAT-only synthetic catalogue SQL under `supabase/seeds/` (outside the automatic seed path). No hosted database or deployment resources were provisioned; fixture SQL has not been executed.

## Toolchain and compatibility evidence

- Available: Node `v24.12.0`, pnpm `10.34.5`, Git `2.53.0`, Docker `29.6.2` (daemon not running). Supabase CLI was absent; WSL distro enumeration returned access denied.
- Pinned: Next.js `16.4.6`, React `19.3.1`, OpenNext Cloudflare `1.20.17`, Wrangler `4.164.0`, Supabase SSR `0.12.7`, Supabase JS `2.119.0`.
- OpenNext peer metadata accepts the selected Next.js and Wrangler versions. `pnpm dlx vinext@1.4.6 check` reported 3/3 imports and 1/1 config option supported, recognized the App Router page/layout and three handlers, and reported no issues. This scan is not a Worker runtime test; vinext remains beta with documented compatibility gaps. See ADR 0001.
- The project uses pnpm's hoisted dependency layout because OpenNext on Windows warned that Windows is unsupported and its bundler hit a symlink permission error with the isolated layout. The hoisted layout allowed Worker build/preview.
- `pnpm audit --prod`: **PASS**, no known vulnerabilities found at audit time. Direct dependency license metadata reviewed: MIT except TypeScript Apache-2.0 and Wrangler MIT OR Apache-2.0.
- Free-tier quotas are limits, not a guarantee of zero cost. R2 remote activation entails account/billing setup; no remote R2 bucket was created. See `docs/DEPLOYMENT.md` and ADR 0001.

## Checks and actual outcomes

| Command / action                                                                    | Result                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm lint`                                                                         | PASS, no lint errors after excluding generated Worker outputs and generated Cloudflare type declarations. The first rerun surfaced generated `.wrangler` files; lint ignores were corrected.                                                                                                                                                     |
| `pnpm format:check`                                                                 | PASS after formatting the checked-in generated type and smoke script. The script includes `scripts/`.                                                                                                                                                                                                                                            |
| `pnpm typecheck`                                                                    | PASS.                                                                                                                                                                                                                                                                                                                                            |
| `pnpm test`                                                                         | PASS, one Stage 0 smoke unit test.                                                                                                                                                                                                                                                                                                               |
| `pnpm build`                                                                        | PASS, Next.js production build.                                                                                                                                                                                                                                                                                                                  |
| `pnpm cf:build`                                                                     | PASS after switching to the hoisted pnpm layout and running with required local filesystem permissions.                                                                                                                                                                                                                                          |
| Local R2 fixture put                                                                | PASS using Wrangler `--local --persist-to .wrangler/state`; no remote bucket.                                                                                                                                                                                                                                                                    |
| `pnpm cf:preview`                                                                   | PASS; OpenNext Worker ran in local Wrangler/workerd at `http://127.0.0.1:8787`.                                                                                                                                                                                                                                                                  |
| `pnpm test:worker` while preview ran                                                | PASS for SSR 200, health 200/no-store, local R2 read 200/no-store, manifest and service worker availability, and exclusion of API/cookie-bearing routes. Supabase private no-store headers were checked, but actual backend behavior was **SKIPPED** because there is no local Supabase configuration; the smoke endpoint returned expected 503. |
| `pnpm audit --prod`                                                                 | PASS, no known vulnerabilities found at audit time.                                                                                                                                                                                                                                                                                              |
| `pnpm install --frozen-lockfile` after changing linker while `node_modules` existed | Did not complete: pnpm refused to replace `node_modules` without an interactive TTY (`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`). This is not a clean-install result; validate from a clean checkout/CI.                                                                                                                                       |
| Git status | Root commit created locally on `master`; no remote is configured. GitHub destination is needed to push. |

## Stage 1 checks

| Command / check                          | Result                                                                                                                                                                                                                                                                       |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`                              | PASS after the new storefront pages and components were added.                                                                                                                                                                                                               |
| `pnpm format:check`                      | PASS after the Worker smoke assertion and documentation updates.                                                                                                                                                                                                             |
| `pnpm typecheck`                         | PASS.                                                                                                                                                                                                                                                                        |
| `pnpm test`                              | PASS, 7 tests across the Stage 0 smoke and Stage 1 variant/price domain tests.                                                                                                                                                                                               |
| `pnpm build`                             | PASS; home, shop, collections and size-guide routes generated.                                                                                                                                                                                                               |
| `pnpm cf:build`                          | First sandboxed run failed with Windows access denied resolving OpenNext config; rerun with required local filesystem access passed.                                                                                                                                         |
| `pnpm cf:preview`                        | PASS; new pages served by local Wrangler/workerd.                                                                                                                                                                                                                            |
| `pnpm test:worker`                       | Initial run failed because the smoke script still expected the old Stage 0 home copy. Updated it to assert the new home heading and all three Stage 1 routes; rerun PASS. R2/health/PWA checks pass; Supabase behavior remains **SKIPPED** without a local Supabase project. |
| Catalogue migration database test        | Not run: Docker daemon is stopped and no local/approved Supabase instance is configured.                                                                                                                                                                                     |
| Visual screenshot / axe / keyboard audit | Not run: computer-use browser session failed to initialize in this workspace. Semantic landmarks, skip link, focus styling and reduced-motion CSS are present but not visually/accessibility-audited.                                                                        |

No GitHub Actions workflow was run remotely. These local checks do not close Stage 0 Auth/query/cache-isolation or clean-install gates.

## Remaining Stage 0 gates and limitations

- Docker daemon is stopped, Supabase CLI is absent, and no approved development Supabase credentials/project are configured. Auth SSR cookies, RLS query and mutation have **not** been smoke-tested. Do not connect production.
- Full public/private cache-isolation coverage and equivalent vinext Worker-runtime comparison remain. The static vinext compatibility scan does not establish runtime compatibility.
- No remote R2 resource, deployment, custom domain, production secrets, SMTP or billing activation. R2 remote setup needs explicit approval.
- No owner-provided logo, product photography/models, final palette confirmation, sizing, price/inventory/policy, WhatsApp number or domain is present. Stage 0 has no storefront catalogue or commercial flows.
- The Worker smoke test is local and narrow. It is not production security, load, accessibility, disaster-recovery or end-to-end commerce verification.
- A local Git repository has an initial commit on `master` and no remote. The requested GitHub push needs the destination repository URL (or an explicit instruction to create a repository, including its visibility/organization). No GitHub repository was identified from the connected account.

## Stage 1 current limits

- The supplied palette is explicitly proposed rather than owner-approved; the interface uses those tokens as a working direction. Typeface choices are system fallbacks until licensed assets are selected.
- No saleable products, prices, inventory, confirmed variants, verified size chart, collections or product media were supplied. The customer pages therefore show honest empty states and no fabricated catalogue entries, reviews or product imagery.
- The catalogue migration is drafted but was not applied to a Supabase instance. RLS and column grants need database-level tests before publishing any catalogue. Admin authoring, public product queries, filters, product detail, collection detail and product structured data remain to be implemented.
- Variant resolution and price formatting have unit coverage, but the picker has not been wired to a published product query or Worker-rendered product page because there is no approved catalogue data or generated Supabase DB type set yet.
- The abstract ring artwork is decorative CSS, not a product rendering or product photograph.

## Decisions and next step

OpenNext remains the provisional adapter because actual local build and workerd preview passed and it preserves the approved Next.js implementation. Stage 1 is now underway by owner direction, while Stage 0's Auth, query, full cache-isolation, clean-install and vinext Worker comparison remain incomplete and unwaived. Continue Stage 1 with local-only schema validation when Supabase is available; collect owner-approved product data and assets before adding any sellable catalogue or public product page. The UAT environment and seed workflow are documented, but require an owner-provided isolated project before hosted verification. Do not create remote resources or enable billing without owner authorization.

## Pending owner inputs

Brand/logo, product photos/models, size chart, LKR prices, inventory, verified WhatsApp number, delivery fees/policies, domain, and dev/prod credentials plus SMTP. No payment gateway merchant access is available. These inputs do not block safe local foundation work.
