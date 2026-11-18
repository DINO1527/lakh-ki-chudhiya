---
name: pwa-development
description: Implement installability, service worker, safe offline browsing, caching and performance.
---

# Pwa Development

## Before work
Read root AGENTS.md, PROJECT_SPEC.md section 12 and docs/DEPLOYMENT.md. Inspect current implementation, git status and milestone scope. Use fixture data and authorized environments only.

## Workflow
1. Review adapter and service-worker scope, current public/private routes and offline requirements.
2. Identify acceptance criteria and failure scenarios; plan the smallest maintainable change.
3. Build manifest/icons, offline public allowlist and bounded versioned cache; exclude personalized payloads and mutation requests; show stale indicator, offline cart only, disable submit; clear sensitive state on logout.
4. Add or update focused tests and relevant documentation.

## Verification
Test airplane mode, reconnection, offline fallback, updates, account A/B isolation and actual Worker preview; no offline queued orders.

## Failure handling and completion
If credentials, assets, external tools or runtime compatibility are missing, implement safe local work where possible, label unverified gates and report actual blocker. Do not silently switch architecture, fake success, deploy, provision paid services or operate production. Report changed files, exact checks and remaining risk in docs/PROGRESS.md.
