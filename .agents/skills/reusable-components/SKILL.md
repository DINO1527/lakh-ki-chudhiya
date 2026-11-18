---
name: reusable-components
description: Create or refactor shared UI primitives, product components and composable layouts.
---

# Reusable Components

## Before work
Read root AGENTS.md, DESIGN.md and docs/CODING_STANDARDS.md. Inspect current implementation, git status and milestone scope. Use fixture data and authorized environments only.

## Workflow
1. Search for existing component, variants, tokens and accessibility patterns.
2. Identify acceptance criteria and failure scenarios; plan the smallest maintainable change.
3. Prefer composition/typed props; feature-specific components stay local until stable shared need; reuse shadcn primitives, consistent semantics and responsive behavior; no direct privileged data access.
4. Add or update focused tests and relevant documentation.

## Verification
Test interaction, keyboard, focus, disabled/error/loading states; inspect imports, visual variants and duplicate components.

## Failure handling and completion
If credentials, assets, external tools or runtime compatibility are missing, implement safe local work where possible, label unverified gates and report actual blocker. Do not silently switch architecture, fake success, deploy, provision paid services or operate production. Report changed files, exact checks and remaining risk in docs/PROGRESS.md.
