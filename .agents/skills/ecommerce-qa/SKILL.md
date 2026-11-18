---
name: ecommerce-qa
description: Plan, execute and document regression, security and release verification for store features.
---

# Ecommerce Qa

## Before work
Read root AGENTS.md, docs/TEST_PLAN.md, docs/SECURITY.md and docs/PROGRESS.md. Inspect current implementation, git status and milestone scope. Use fixture data and authorized environments only.

## Workflow
1. Read acceptance criteria, affected modules, known blockers and actual runtime; use fixture-only data.
2. Identify acceptance criteria and failure scenarios; plan the smallest maintainable change.
3. Create risk-based unit/SQL/integration/E2E tests; cover negative permissions, stock races, duplicate checkout, payment gates, offline and visual accessibility; use Playwright and optional DevTools.
4. Add or update focused tests and relevant documentation.

## Verification
Run exact relevant commands, include pass/fail/skip and sanitized artifacts; verify Worker build/preview and update progress; never assert unrun tests passed.

## Failure handling and completion
If credentials, assets, external tools or runtime compatibility are missing, implement safe local work where possible, label unverified gates and report actual blocker. Do not silently switch architecture, fake success, deploy, provision paid services or operate production. Report changed files, exact checks and remaining risk in docs/PROGRESS.md.
