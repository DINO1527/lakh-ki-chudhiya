# ADR 0001: Stage 0 runtime and adapter evaluation

- **Status:** Provisional; local Worker preview passed, integration gates remain
- **Date:** 2026-11-18
- **Decision owner:** Project owner

## Context

The approved application is one Next.js App Router TypeScript app on Cloudflare Workers, with Supabase for Auth/PostgreSQL and R2 for product media. PROJECT_SPEC.md prefers real Next.js with OpenNext initially and requires a small comparison with vinext before finalizing the adapter. The repository began as a documentation kit without an application or Git metadata.

## Findings

- Cloudflare's current Next.js guide recommends vinext for new Workers apps. Its official OpenNext guide lists App Router, Route Handlers, RSC and SSR as supported and recommends migration to vinext only when compatibility allows.
- The current OpenNext Cloudflare package is 1.20.17. Its peer range accepts Next.js `>=16.4.5` and requires Wrangler `^4.148.0`; selected Next 16.4.6 and Wrangler 4.164.0 satisfy those declared constraints.
- The starter keeps genuine Next.js and uses OpenNext for the initial runtime proof because that matches the approved preference and actual framework implementation. It keeps the adapter behind package scripts/config only; no domain code depends on vinext or vendor APIs except the small R2 smoke handler.
- `pnpm dlx vinext@1.4.6 check` reported 3/3 imports supported, 1/1 config option supported, one App Router page/layout and three route handlers recognized, with no reported issues. This is a static compatibility scan, not a Worker build/runtime proof. The current vinext Cloudflare adapter is beta and has documented feature gaps, so it is not selected from this scan alone.
- OpenNext 1.20.17 built the project and ran in local Wrangler/workerd preview. The smoke script verified SSR, health route cache headers, local R2 fixture read, manifest, and service-worker exclusions. Supabase integration behavior was skipped because no local Supabase instance/config was available.
- No production resources, remote bucket, Supabase project, or deployment are configured. R2 fixture is local-only; the smoke route requires a local flag.

## Decision

Proceed with a local OpenNext proof of concept first. Compare the same SSR, route-handler, cookie, R2, manifest/service-worker and cache-isolation requirements against vinext before committing to production adapter support. Do not change the Next.js framework or deploy either path during Stage 0.

## Consequences

- The adapter remains provisional pending Supabase Auth/query smoke, stronger public/private cache-isolation coverage, and an equivalent vinext Worker-runtime comparison.
- Cloudflare's preference for vinext is a material risk; its Next.js API reimplementation needs feature-level validation against the required commerce, auth and admin flows.
- OpenNext warns that Windows is not fully supported and initially hit a symlink permission error with pnpm's isolated layout. The hoisted layout let the Worker build and preview complete while retaining a single exact-version pnpm lockfile.
