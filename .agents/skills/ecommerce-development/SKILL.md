---
name: ecommerce-development
description: Implement catalogue, product publishing, search, cart, accounts, wishlist, and commerce behavior.
---

# Ecommerce Development

## Before work
Read root AGENTS.md, PROJECT_SPEC.md sections 6–10 and docs/BUSINESS_RULES.md. Inspect current implementation, git status and milestone scope. Use fixture data and authorized environments only.

## Workflow
1. Identify workflow, auth/ownership, actual source of truth, price/stock rules and scope priority.
2. Identify acceptance criteria and failure scenarios; plan the smallest maintainable change.
3. Use server-rendered public data, validated variants and URL filters; keep unpublished media private; merge carts deterministically, no cart stock reservation; authorize each action.
4. Add or update focused tests and relevant documentation.

## Verification
Test published/draft visibility, variant/stock selection, stale price and cart/account isolation; run related E2E and RLS checks.

## Failure handling and completion
If credentials, assets, external tools or runtime compatibility are missing, implement safe local work where possible, label unverified gates and report actual blocker. Do not silently switch architecture, fake success, deploy, provision paid services or operate production. Report changed files, exact checks and remaining risk in docs/PROGRESS.md.
