---
name: whatsapp-checkout
description: Implement validated order persistence, guest access, WhatsApp handoff and retry.
---

# Whatsapp Checkout

## Before work
Read root AGENTS.md, PROJECT_SPEC.md sections 9.1–9.4 and docs/BUSINESS_RULES.md. Inspect current implementation, git status and milestone scope. Use fixture data and authorized environments only.

## Workflow
1. Check cart, quote, delivery config, business number, idempotency and actor/guest authorization.
2. Identify acceptance criteria and failure scenarios; plan the smallest maintainable change.
3. Calculate amount server-side, require reconfirmation on change, atomically persist order items and snapshots; create authorized summary; encode wa.me link with minimized PII; customer presses Send; clear submitted items after save.
4. Add or update focused tests and relevant documentation.

## Verification
Test network retry, duplicate key/payload conflict, insufficient stock, price changes, guest access, reopen/copy and blocked external link; intercept chat, never send real order.

## Failure handling and completion
If credentials, assets, external tools or runtime compatibility are missing, implement safe local work where possible, label unverified gates and report actual blocker. Do not silently switch architecture, fake success, deploy, provision paid services or operate production. Report changed files, exact checks and remaining risk in docs/PROGRESS.md.
