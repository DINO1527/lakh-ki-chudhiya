---
name: inventory-management
description: Implement per-variant stock, inventory adjustments, atomic reservations and order transitions.
---

# Inventory Management

## Before work
Read root AGENTS.md, docs/BUSINESS_RULES.md and PROJECT_SPEC.md sections 8–9. Inspect current implementation, git status and milestone scope. Use fixture data and authorized environments only.

## Workflow
1. Read actual schema and order transition contract; verify permissions.
2. Identify acceptance criteria and failure scenarios; plan the smallest maintainable change.
3. Use SQL transactions/locks and constraints; reserve on confirmation, consume on dispatch, release cancellation before dispatch once; pending expiry no deduction; audit adjustments with reason.
4. Add or update focused tests and relevant documentation.

## Verification
Test two concurrent confirmations for last unit, duplicate calls, insufficient stock, cancel/dispatch, role denial and rollback; no automatic post-dispatch restock.

## Failure handling and completion
If credentials, assets, external tools or runtime compatibility are missing, implement safe local work where possible, label unverified gates and report actual blocker. Do not silently switch architecture, fake success, deploy, provision paid services or operate production. Report changed files, exact checks and remaining risk in docs/PROGRESS.md.
