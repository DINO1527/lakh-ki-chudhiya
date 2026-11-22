# ADR 0004: database-backed staff access and atomic inventory adjustments

- **Status:** Accepted for Stage 2 implementation
- **Date:** 2026-11-22
- **Context:** The Stage 1 catalogue schema already stores on-hand quantities in `product_variants`, exposes only a generated availability flag to shoppers, and has no staff membership, adjustment audit or admin workflows. Stage 2 needs staff authentication, product publishing, private media, and traceable SKU stock edits.

## Decision

- Store trusted staff assignments in `public.staff_members` with `owner` and `staff` roles. The owner bootstraps the first account through the database-owner SQL procedure. There is no public signup or self-assignment path. Server pages and every server action verify the Supabase Auth user and active membership; RLS repeats the check for data access.
- Replace the previous Storage JWT metadata policy with the same database membership check. This keeps access removal on one source of truth and avoids relying on mutable user metadata or a service-role key.
- Keep `stock_on_hand` on `product_variants` to preserve the existing catalogue read model. Add `reserved_quantity` for the later order stage and derive public `is_available` from active status and `stock_on_hand > reserved_quantity`. Exact quantities remain ungranted to public roles.
- Route quantity edits through `adjust_inventory`, which row-locks the variant, rejects reductions below reserved stock, applies the delta and records an immutable `inventory_movements` row with actor and reason in the same transaction.
- Keep order confirmation, reservations, dispatch and cancellation transitions for Stage 4. Stage 2 adjustments do not reserve stock for a pending order.
- Keep product status changes behind publish/archive database functions. Publishing requires an active variant, care instructions and an image; it publishes eligible draft image metadata in the same transaction.

## Consequences

- The one-to-one `inventory` table in the conceptual model is represented by quantity columns on the existing variant row for this migration. This avoids duplicate stock state; a future migration may extract it only if a real need appears.
- A database owner must bootstrap one owner account once in each environment. Until then, login succeeds only for Auth users who have an active staff row, and the admin workspace remains inaccessible.
- UAT must receive the Stage 2 migration before the updated Worker. Live requires the same ordered migration set after UAT acceptance and explicit release approval. The UAT fixture is never copied to live.
