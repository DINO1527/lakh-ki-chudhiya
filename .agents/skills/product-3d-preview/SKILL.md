---
name: product-3d-preview
description: Implement performance-conscious optional 3D bangle hero or product preview and motion.
---

# Product 3D Preview

## Before work
Read root AGENTS.md, DESIGN.md and PROJECT_SPEC.md sections 3,7. Inspect current implementation, git status and milestone scope. Use fixture data and authorized environments only.

## Workflow
1. Inspect real licensed assets, target browser, current bundle and static fallback.
2. Identify acceptance criteria and failure scenarios; plan the smallest maintainable change.
3. Use client-only dynamic import of R3F/Drei/Three; load poster first, cap DPR, pause offscreen, dispose resources, use reduced-motion and non-WebGL fallback; avoid simulating exact product without assets.
4. Add or update focused tests and relevant documentation.

## Verification
Measure mobile load/Worker bundle; test touch, fallback, reduced motion, keyboard and no WebGL; record asset size and limits.

## Failure handling and completion
If credentials, assets, external tools or runtime compatibility are missing, implement safe local work where possible, label unverified gates and report actual blocker. Do not silently switch architecture, fake success, deploy, provision paid services or operate production. Report changed files, exact checks and remaining risk in docs/PROGRESS.md.
