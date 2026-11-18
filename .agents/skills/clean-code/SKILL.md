---
name: clean-code
description: Apply SOLID, maintainable TypeScript, composition and safe refactoring to code changes.
---

# Clean Code

## Before work
Read root AGENTS.md, docs/CODING_STANDARDS.md. Inspect current implementation, git status and milestone scope. Use fixture data and authorized environments only.

## Workflow
1. Identify responsibilities, duplication and actual change scope; inspect existing patterns.
2. Identify acceptance criteria and failure scenarios; plan the smallest maintainable change.
3. Keep pure domain rules testable and components focused; use narrow abstractions only where justified; reduce client boundaries and avoid circular imports.
4. Add or update focused tests and relevant documentation.

## Verification
Run lint, typecheck and affected tests; review diff for unrelated refactors, hidden side effects and duplicated invariants.

## Failure handling and completion
If credentials, assets, external tools or runtime compatibility are missing, implement safe local work where possible, label unverified gates and report actual blocker. Do not silently switch architecture, fake success, deploy, provision paid services or operate production. Report changed files, exact checks and remaining risk in docs/PROGRESS.md.
