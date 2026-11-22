# Admin and stock operations

## First owner setup

The public site has no staff signup. Create or invite the first owner through the intended Supabase Auth dashboard, then use the Supabase SQL Editor as the database owner to create the membership. Replace the placeholder with that existing Auth user's UUID and run this once against the selected project:

```sql
insert into public.staff_members (user_id, role, is_active)
values ('<AUTH_USER_UUID>', 'owner', true);
```

Do not put the UUID, password, or project credentials in Git. Confirm that the SQL Editor is connected to the intended UAT project. Repeat with the correct owner account only after the separate live release gate. If another account is already an owner, use **Admin → Team access** instead of direct SQL.

## Sign-in and roles

- Staff sign in at `/admin/login` using their Supabase Auth email and password. Public registration is disabled. Password resets and invitations are handled by the owner through the approved Auth setup.
- Staff can edit products, variants, collections, homepage copy and inventory. Owners have the same access plus team management.
- Team access assigns only existing Auth users by UUID. Membership is stored outside user-editable metadata and checked on every admin operation and through RLS.
- To remove access, an owner marks that member inactive. The owner cannot deactivate their own membership; another active owner must manage it. The database prevents removal of the last active owner.
- Owners can review field-level change history under **Admin → Activity**. Inventory adjustments have their own movement log with quantity deltas and reasons.

## Product and image lifecycle

Create a draft, enter verified details, add one or more SKUs, upload real product photography with useful alternative text, assign collections, and use the private preview. Publishing requires care instructions, an active variant and at least one image. Draft media is private; public signed URLs are issued only when both image metadata and product status are published. Archive hides the product from public catalogue queries. Product records are archived instead of deleted.

Image uploads accept JPEG, PNG, WebP and AVIF up to 5 MiB. The server checks the file signature, assigns a random storage path, and records metadata after upload. Archiving an image revokes its public signing policy while retaining the object for controlled cleanup.

## Inventory

The inventory page shows exact on-hand, reserved and available quantities to staff. Adjust by a signed integer delta (for example `5` or `-1`) and enter a reason. PostgreSQL locks the variant row, rejects zero changes and changes that would put on-hand below reserved, applies the quantity change and records the actor, reason and delta in one transaction. There is no direct quantity update permission for browser clients.

Stage 2 stock adjustment does not create or reserve customer orders. Stage 4 will add order confirmation, atomic reservations, dispatch consumption and cancellation release. Do not manually change reserved quantities or treat a WhatsApp handoff as a reservation.

## Content and current limits

Homepage hero copy is editable and can be saved as draft, published or archived. When no published hero row exists, the storefront uses its existing generic fallback copy. The dashboard does not yet manage orders, customers, reviews, delivery fees, checkout methods or reports; those belong to later milestones.
