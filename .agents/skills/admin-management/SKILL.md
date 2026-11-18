---
name: admin-management
description: Implement protected admin catalogue, content, orders, customers, inventory, reports and reviews workflows.
---

# Admin Management

## Before work
Read root AGENTS.md, PROJECT_SPEC.md section 10 and docs/SECURITY.md. Inspect current implementation, git status and milestone scope. Use fixture data and authorized environments only.

## Workflow
1. Identify owner/staff permissions and sensitive data; inspect existing server actions and RLS.
2. Identify acceptance criteria and failure scenarios; plan the smallest maintainable change.
3. Guard each read/write server-side; use accessible reusable data tables, pagination, confirmations and audit logs; draft preview private; label paid revenue vs order value; sanitize exports.
4. Add or update focused tests and relevant documentation.

## Verification
Test staff vs owner and direct API access, audit event, invalid state, mobile/keyboard, PII minimization and accurate reporting.

## Failure handling and completion
If credentials, assets, external tools or runtime compatibility are missing, implement safe local work where possible, label unverified gates and report actual blocker. Do not silently switch architecture, fake success, deploy, provision paid services or operate production. Report changed files, exact checks and remaining risk in docs/PROGRESS.md.
