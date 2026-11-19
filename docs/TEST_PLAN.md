# QA and release gates

Test with synthetic fixtures and authorized development data. Use Vitest for pure functions, SQL tests for RLS/RPC/concurrency, Playwright for UI, axe for accessibility, Worker preview for runtime compatibility. Bruno optional API collections; no credentials in git.

| ID | Scenario | Expected / evidence |
|---|---|---|
| CAT-01 | Draft -> preview -> publish -> archive | Staff preview only; public visibility and cache invalidation correct |
| CAT-02 | Filter+sort+size/colour | Correct variant, URL state, price/stock |
| CAT-03 | UAT published/draft RLS and public columns | `supabase/tests/catalogue_rls.sql` proves published fixture visible, draft/inactive variant hidden, out-of-stock variant visible as unavailable, and exact stock count denied to `anon` |
| CART-01 | Guest persistence and merge | Dedup by variant, quantities capped/revalidated, no PII |
| CART-02 | Update/remove and stale prices | Correct totals; show changes and reconfirm |
| AUTH-01 | Register/login/reset/logout | Session flow, safe redirect, SMTP gate; no cached private state |
| AUTH-02 | Direct API and cross-user access | 401/403/404 as appropriate; RLS rejects |
| ORD-01 | Guest/auth checkout | Atomic snapshots, reference, unpaid/pending, secure access |
| ORD-02 | Duplicate submission | Single order; mismatched replay rejected |
| ORD-03 | WhatsApp handoff absent/blocked | Persisted order; reopen/copy; no false sent status |
| ORD-04 | Tampered price/quantity | Server rejects/requotes; no invalid order |
| INV-01 | Concurrent confirmation last unit | Exactly one successful reservation |
| INV-02 | Duplicate confirm/dispatch/cancel | No double deduction or release |
| INV-03 | Cancel/expire before dispatch | Release only existing reservation; pending expiry no effect |
| INV-04 | Invalid transition/post-dispatch | Reject; no automatic restock |
| REV-01 | Delivered vs undelivered review | Only owner of eligible delivered item; uniqueness |
| REV-02 | Moderate/edit | Approved public; edit pending; rating uses approved only |
| PAY-01 | Enable future provider without integration | Backend refuses; no gateway shown or false payment |
| MED-01 | Private Supabase bucket and `storage.objects` policies | `supabase/tests/storage_policies.sql` checks private bucket and operation-scoped published signing/admin policies; real API upload/signed-download test still requires UAT setup and a licensed test image |
| ADMIN-01 | Staff/owner scope | Direct forbidden actions fail, audit log |
| PWA-01 | Offline catalogue/cart | Cached public data labeled stale; checkout disabled |
| PWA-02 | Logout/account switch | No private cache or identity leakage |
| UI-01 | Mobile/desktop keyboard, contrast, touch | No overflow; meaningful focus; accessible controls |
| UI-02 | Reduced motion/no WebGL | Static fallback and usable product page |
| RUN-01 | Worker preview SSR/auth/API/Supabase Storage/PWA | Evidence in actual workerd, not only next dev; no storage binding is expected on the Worker |

## Acceptance procedure
Each new change starts with expected behavior and risk list. Test happy, edge, failure and negative permissions; write failing regression test when appropriate. Use concurrency tests with independent DB sessions. Intercept WhatsApp external navigation; do not send real message. Use mobile/desktop viewport, record traces/screenshots with fixtures. Check public caching after staff updates. Verify migrations on fresh local DB and upgrade path when appropriate. CI target scripts: `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`, plus adapter-specific build/preview and SQL command defined in Stage 0. These are proposed, not currently executable. No release with unresolved critical security, money, stock, auth or order failures. Record exact results and skips in PROGRESS.md.
