---
name: seo-optimization
description: Implement truthful storefront metadata, product structured data, discovery and performance.
---

# Seo Optimization

## Before work
Read root AGENTS.md, PROJECT_SPEC.md sections 6,12 and DESIGN.md. Inspect current implementation, git status and milestone scope. Use fixture data and authorized environments only.

## Workflow
1. Inspect public routes, canonical URL, real catalogue data, caching and media.
2. Identify acceptance criteria and failure scenarios; plan the smallest maintainable change.
3. Server-render metadata, sitemap/robots, Product/Breadcrumb markup with real LKR values and approved ratings only; noindex private/draft; optimize responsive images and cache revalidation.
4. Add or update focused tests and relevant documentation.

## Verification
Check rendered HTML, structured data, sitemap excludes drafts, noindex private routes, no fake reviews; measure mobile lab performance.

## Failure handling and completion
If credentials, assets, external tools or runtime compatibility are missing, implement safe local work where possible, label unverified gates and report actual blocker. Do not silently switch architecture, fake success, deploy, provision paid services or operate production. Report changed files, exact checks and remaining risk in docs/PROGRESS.md.
