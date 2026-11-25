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
- Signed-in staff can change their own password at **Admin → Account security**. The current password is rechecked and the new password must contain at least 12 characters. Email recovery is not enabled by this page.
- Staff can edit products, variants, collections, homepage copy and inventory. Owners have the same access plus team management.
- Team access assigns only existing Auth users by UUID. Membership is stored outside user-editable metadata and checked on every admin operation and through RLS.
- To remove access, an owner marks that member inactive. The owner cannot deactivate their own membership; another active owner must manage it. The database prevents removal of the last active owner.
- Owners can review field-level change history under **Admin → Activity**. Inventory adjustments have their own movement log with quantity deltas and reasons.

## Product and image lifecycle

Create a draft, enter verified details, add one or more SKUs, upload real product photography with useful alternative text, assign collections, and use the private preview. Publishing requires care instructions, an active variant and at least one image. Draft media is private; public signed URLs are issued only when both image metadata and product status are published. Archive hides the product from public catalogue queries. Product records are archived instead of deleted.

Image uploads accept JPEG, PNG, WebP and AVIF up to 5 MiB. The server checks the file signature, assigns a random storage path, and records metadata after upload. Archiving an image revokes its public signing policy while retaining the object for controlled cleanup.

## Inventory

The inventory page shows exact on-hand, reserved and available quantities to staff. Adjust by a signed integer delta (for example `5` or `-1`) and enter a reason. PostgreSQL locks the variant row, rejects zero changes and changes that would put on-hand below reserved, applies the quantity change and records the actor, reason and delta in one transaction. There is no direct quantity update permission for browser clients.

Cart activity does not create orders or reserve stock. The Stage 3/4 order functions reserve stock only when staff confirms an order, consume the reservation at dispatch, and release it when an order is cancelled before dispatch. Never edit reserved quantities directly or treat a WhatsApp handoff as a reservation.

## Orders and customers

Customer orders appear under **Admin → Orders** with immutable product/variant/price snapshots, delivery contact details, payment state, and an event history. Prices are calculated on the server; checkout confirms the complete displayed quote, including each line, so offsetting price changes with the same subtotal still require review.

New orders are unpaid and `pending_confirmation`. Review contact details and stock before choosing **confirmed**; that transition reserves the ordered variants transactionally. Move orders through processing and packed, then choose dispatched to consume reserved stock. Delivery can be marked after dispatch. Cancellation is available only before dispatch and releases only that order's active reservations. Payment is separate from fulfilment; no gateway or automatic WhatsApp delivery is configured.

Delivery fees are entered as a verified amount with an audit reason before dispatch. Until staff records a fee, the total remains incomplete and the storefront labels delivery as pending confirmation. Do not invent a fee or promise a delivery date. Customer listings and order details are staff-only; access is checked using the active staff membership and database policies.

The UAT pastel collage fixture is an unpublished synthetic draft. Its size labels, prices and quantities are QA data only. Add the supplied image through the admin product-media workflow and review it before publishing even in UAT; never copy the seed to live.

## Content and current limits

Homepage hero copy is editable and can be saved as draft, published or archived. When no published hero row exists, the storefront uses its existing generic fallback copy. The dashboard currently manages orders and customer listings in addition to products, inventory, content, and staff. Reviews, delivery methods, checkout methods, payment gateways, and reports remain future work.
