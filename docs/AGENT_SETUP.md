# External skills, plugins, MCP and code references

The bundled local skills work as documentation without installation. External skills are optional, not application runtime dependencies. Start with only the capabilities currently needed. Inspect upstream SKILL.md, license, scripts, install paths and latest compatible version/commit before installation. Verify exact skill names using the CLI discovery option. Do not run repository scripts merely because a skill recommends them. Record selected version/commit, purpose, license, reviewer and permissions in `docs/decisions/` or a skill inventory. References below are recommendations, not audited packages.

## Skill sources
| Source | Use | Priority |
|---|---|---|
| https://github.com/addyosmani/agent-skills | Spec-driven implementation, TDD, quality review, security, refactoring | Core |
| https://github.com/vercel-labs/agent-skills | React best practices, composition and web design guidelines | Core |
| https://github.com/vercel/next.js/tree/canary/skills | Next.js-specific guidance; verify path/skills at install | Core if available |
| https://github.com/anthropics/skills/tree/main/skills/frontend-design | Intentional frontend design | Design |
| https://github.com/nextlevelbuilder/ui-ux-pro-max-skill | UI/UX design research and refinement | Optional design |
| https://github.com/pbakaus/impeccable | Visual polishing, alternate design guidance | Optional design |
| https://github.com/shadcn-ui/ui/tree/main/skills/shadcn | Component/registry guidance | Core UI |
| https://github.com/supabase/agent-skills | PostgreSQL best practices | Core data |
| https://github.com/cloudflare/skills | Workers deployment and runtime | Core hosting |
| https://github.com/openai/skills | General agent skills; verify current catalog | Optional |
| https://github.com/microsoft/playwright-cli | Browser workflows and agent skill (verify setup) | QA |

## Selective installation examples
Use https://github.com/vercel-labs/skills and inspect `npx skills --help` first. Commands below are illustrative; verify package version, skill name and current flags. Run from repo root, select Codex/project scope; never global by default. For reproducibility prefer reviewed pinned ref/release per CLI documentation, not mutable main in ongoing CI. `--list` previews available skills; review before install.

```bash
npx skills add addyosmani/agent-skills --list
npx skills add vercel-labs/agent-skills --list
npx skills add supabase/agent-skills --list
npx skills add cloudflare/skills --list
# After review, select these exact skills only when present:
npx skills add addyosmani/agent-skills --skill code-review-and-quality -a codex
npx skills add vercel-labs/agent-skills --skill vercel-react-best-practices -a codex
npx skills add anthropics/skills --skill frontend-design -a codex
npx skills add shadcn-ui/ui --skill shadcn -a codex
npx skills add supabase/agent-skills --skill supabase-postgres-best-practices -a codex
npx skills list
```

For Addy Osmani, also discover test-driven-development, code-simplification, security-and-hardening, frontend-ui-engineering and planning skills. For Vercel discover composition patterns and web design guidance. Cloudflare: select Workers skills after listing. Supabase: select the Storage and Postgres guidance after reviewing the upstream skills. UI/UX Pro Max provides its own setup path if needed; use upstream Codex guide instead of guessing install flags. Impeccable is an alternate design reviewer; do not enable conflicting style directions. `DESIGN.md` is the project authority. No commands above were executed in creating the kit.

## Reference repositories (not skills)
| Repository | What to learn | Caveat |
|---|---|---|
| https://github.com/alan2207/bulletproof-react | Feature structure, boundaries, reusable React | Adapt to App Router and server-only modules |
| https://github.com/vercel/commerce | Catalogue, cart, SEO, storefront | Shopify implementation; no Shopify dependency for this project |
| https://github.com/thefrontkit/nextjs-ecommerce-starter | Layout and components | Community; verify availability/license |
| https://github.com/mstobrawa/moonmade | Jewellery storefront concepts | Community; verify availability/license |
| https://github.com/rainyDayssss/cube-store | E-commerce admin patterns | Community; verify availability/license |
| https://github.com/OWASP/CheatSheetSeries | Security reference | Apply to actual threat model |

Read selected examples as patterns, not clone wholesale. Confirm current code, license, dependencies and security before reuse. No copying competitor assets, brand or fake data. Community examples may be stale or incompatible.

## UI and 3D code references
- https://github.com/shadcn-ui/ui — UI primitives.
- https://github.com/motiondivision/motion — essential animation.
- https://github.com/mrdoob/three.js — underlying graphics.
- https://github.com/pmndrs/react-three-fiber and https://github.com/pmndrs/drei — optional lazy 3D viewer.
- https://github.com/darkroomengineering/lenis — optional smooth scroll only after accessibility/performance checks.
- https://github.com/magicuidesign/magicui — effects inspiration; avoid duplicate library stacks.

## MCP and plugin setup
MCP servers are agent tools, not website services. Use official docs directly if no server is required. Only enable a reviewed tool for the current task; pin versions and grant least privilege. No production data or keys; do not grant remote mutation without explicit authorization. Example TOML is inert. Consult current Codex project config trust and MCP documentation before copying selected entries into `.codex/config.toml`. Some tools can be installed via agent plugins; do not activate duplicate plugin and MCP instances.

| Tool | Source | Use |
|---|---|---|
| Context7 | https://github.com/upstash/context7 | Framework/library documentation |
| Playwright MCP | https://github.com/microsoft/playwright-mcp | Browser interaction and visual QA |
| Chrome DevTools MCP | https://github.com/ChromeDevTools/chrome-devtools-mcp | Console, network and performance |
| shadcn MCP | https://ui.shadcn.com/docs/mcp | Component discovery |
| Supabase MCP | https://supabase.com/docs/guides/getting-started/mcp | Isolated dev project, read-only where feasible |
| GitHub MCP | https://github.com/github/github-mcp-server | Repo/issue/PR after authorization |
| Figma MCP | https://developers.figma.com/docs/figma-mcp-server/ | Design-to-code when design exists |
| Codex skills/config | https://developers.openai.com/codex/skills/ | Project-level discovery |

For MCPs requiring credentials/OAuth, follow upstream docs; don't write tokens in repo. Browser tools may visit only allowed targets; never make live orders, payments or production data changes. Verify actual test suite independently of MCP. Stage 0 may proceed with CLI/docs only.

## Current Supabase setup

- Codex user config has separate project-scoped servers named `supabase` (UAT) and `supabase-live` (live). Both report OAuth authentication; write-capable calls require approval. Project-scoped URLs disable account-management tools.
- Installed only `supabase-postgres-best-practices` in `.agents/skills/` from `supabase/agent-skills` v0.1.9 (commit `544bfc5`), using `skills@1.7.2`; the skill metadata version is 1.1.1. `skills-lock.json` records the content hash. The MIT notice is in `THIRD_PARTY_NOTICES.md`.
- The general `supabase` skill remains uninstalled because its imperative schema workflow recommends a `db pull` pattern that differs from this repository's reviewed, checked-in migration workflow. Follow project migration guidance in `docs/ENVIRONMENTS.md`.
