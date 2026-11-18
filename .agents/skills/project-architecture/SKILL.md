---
name: project-architecture
description: Plan or change feature boundaries, file structure and dependencies in the Next.js monolith.
---

# Project Architecture

## Before work
Read root AGENTS.md, docs/ARCHITECTURE.md and FILE_STRUCTURE.md. Inspect current implementation, git status and milestone scope. Use fixture data and authorized environments only.

## Workflow
1. Locate owning feature and existing entry points; identify server/client crossing and cross-feature dependencies.
2. Identify acceptance criteria and failure scenarios; plan the smallest maintainable change.
3. Keep routes thin, domain pure and data access server-only; choose feature-first placement; use cross-feature orchestration only when needed; record ADR for major change.
4. Add or update focused tests and relevant documentation.

## Verification
Check dependency direction, import boundaries, runtime build and focused tests; avoid empty architecture layers.

## Failure handling and completion
If credentials, assets, external tools or runtime compatibility are missing, implement safe local work where possible, label unverified gates and report actual blocker. Do not silently switch architecture, fake success, deploy, provision paid services or operate production. Report changed files, exact checks and remaining risk in docs/PROGRESS.md.
