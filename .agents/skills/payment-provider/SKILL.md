---
name: payment-provider
description: Design checkout settings and later verified PayHere, Koko or Mintpay provider integration.
---

# Payment Provider

## Before work
Read root AGENTS.md, PROJECT_SPEC.md section 11 and docs/SECURITY.md. Inspect current implementation, git status and milestone scope. Use fixture data and authorized environments only.

## Workflow
1. Identify authorized scope and actual provider docs/merchant access; launch has no gateway integration.
2. Identify acceptance criteria and failure scenarios; plan the smallest maintainable change.
3. Separate checkout communication and payment states; use capability/config/verification gate server-side; never allow UI toggle to activate missing provider; later verify signature, order, amount/currency and replay protection with sandbox and explicit approval.
4. Add or update focused tests and relevant documentation.

## Verification
Test unimplemented provider blocked, permission denied, manual order unpaid; future sandbox failure/duplicate callbacks, never collect raw cards or perform live charge.

## Failure handling and completion
If credentials, assets, external tools or runtime compatibility are missing, implement safe local work where possible, label unverified gates and report actual blocker. Do not silently switch architecture, fake success, deploy, provision paid services or operate production. Report changed files, exact checks and remaining risk in docs/PROGRESS.md.
