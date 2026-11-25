# Catalogue, promotions, delivery and stock rules

## Owner's requested model

- A product is one named design in one colour. Include the colour in its product name, for example **Royal Wedding Set — Ruby Red**. Do not ask shoppers to choose a colour.
- A product's variants are sizes only. Each size has its own SKU, price and stock count. A product may have one or more real product photos showing different angles.
- `set_count` means the number of bangles inside one sellable set and must be at least two. Cart quantity and stock count mean complete sets. A five-bangle set with stock 8 is eight sellable sets; no individual bangle option is created.
- Collections group products and have their own cover/gallery images. Products can appear in more than one collection.

## Offer rules

- An offer is either product-targeted or collection-targeted. A collection offer counts eligible product quantities across the selected collection; a product offer counts that product only.
- Configure a minimum number of sellable sets, percentage discount, optional start/end timestamps, and an enabled switch. Timestamps are stored in UTC and displayed in Asia/Colombo.
- Apply the discount to eligible merchandise subtotal only; delivery is excluded. Recalculate it on the server from current product, variant and promotion records, then snapshot the discount on the order.
- Do not stack promotions. If several offers qualify, use the greatest valid discount for the order. Keep compare-at pricing informational and separate from an offer.
- An offer cannot be enabled without a valid target, positive quantity and discount, and (when supplied) an end later than its start. A disabled, future, expired or otherwise ineligible offer gives no discount.

## Delivery and payment rules

- Every product must have an explicit delivery fee before publication. Enter zero to mark it as free delivery. For a mixed cart, charge the highest product fee once per order; snapshot that fee so later product edits do not alter existing orders.
- COD has a store-level switch and a per-product eligibility switch. Show COD only when the store and every product in the cart allow it. A COD order remains unpaid until the order is delivered and staff record collection.
- The current non-gateway method saves the order and lets the customer continue to WhatsApp manually. It does not send a message or mark payment received.
- Online payment remains unavailable until a real provider is implemented, configured with secrets outside the database, and verified in sandbox. A settings label or switch alone must never claim payment succeeded.
- Save the final delivery fee, chosen method, discount and totals as order snapshots. Later setting changes must not change an existing order. A recorded manual payment must be fully refunded and recorded before a pre-dispatch cancellation can release stock.

## Inventory and delivery failure rules

- Adding to cart and submitting an unconfirmed order do not change stock. Admin confirmation atomically reserves the exact size SKU quantity; available stock is on-hand minus reserved.
- Dispatch atomically consumes the reservation and reduces on-hand once. Cancellation before dispatch releases a reservation once.
- A delivery failure alone does not put stock back. When the parcel returns, staff classify every dispatched set on each order line as sellable, damaged, or missing. Only the inspected sellable quantity is restocked.
- Record one complete inspection against the original order line in one database transaction, lock the SKU, require classified totals to equal the quantity dispatched and enforce an idempotency constraint. Repeated submissions cannot restore the same units twice. Damaged/missing units remain out of stock and require a reason.
- Payment and fulfilment status remain separate. COD collection, delivery failure and restocking are distinct events.

## Gaps found before implementation

| Area | Current state | Change required |
|---|---|---|
| Collections | Name, slug, description, status and ordering only | Collection image gallery and private-draft/published media lifecycle |
| Products | Product name and details; media upload exists but storefront uses placeholders | Public image gallery on cards and product page |
| Variants | Colour/design stored per SKU; shoppers filter/select colour | Move legacy colour groups into separate named products; each product has size-only SKUs |
| Sellable unit | Product already has `set_count` | Explain and enforce stock/quantity as complete sets |
| Promotions | No schema or admin workflow | Offer records, target selection, schedule and enable switch; server checkout calculation |
| Delivery | No delivery settings or checkout | Per-product fee required before publishing, one order-level fee snapshot |
| COD / online | No checkout methods or checkout | COD eligibility/settings; online provider capability gate; order/payment state separation |
| Orders | Guest/account checkout, order records and basic stock transitions exist | Add server-priced discount/delivery/payment snapshots, delivery-failure status and order-linked stock movements |
| Return stock | Manual inventory adjustment only | Order-linked, inspected, idempotent restock transaction |

## Implementation status and remaining gates

1. **Catalogue foundation:** implemented in `20261123000000_catalogue_data_backfill.sql` and `20261124000000_catalogue_product_colours_and_media.sql`. The backfill splits legacy colour groups into separate named products while preserving variant IDs, SKUs, stock, order snapshots and collection membership. Ambiguous multi-colour galleries are archived and the products held as drafts for photo review. The schema then removes colour as a stored/selectable variant dimension, enforces one SKU per size, stores product/collection image galleries, and guards publication. Variant-linked legacy media stops the migration for manual mapping rather than being assigned to the wrong colour.
2. **Commerce settings and offers:** implemented locally in `20261124010000_commerce_checkout_offers_delivery_orders.sql` with owner-controlled WhatsApp/COD settings, product delivery/COD fields, product/collection offers, schedules and enable switches.
3. **Cart and guest checkout:** implemented locally with a client-side cart containing IDs and set quantities only, server-priced quotes, one best eligible offer, an order-level delivery fee, COD gating, idempotent guest order snapshots and expiring private receipt cookies. Online payment remains unavailable.
4. **Order inventory lifecycle:** implemented with pending orders that do not reserve stock, atomic confirmation/dispatch/cancel transitions, delivery-failure recording, full-line return classification, sellable-only restock, and order-linked/idempotent inventory movements. A paid order cannot release stock on cancellation until its full refund is recorded.
5. **Release gates:** local lint, changed-file formatting, typecheck, unit tests and production Next build pass. The three ordered migrations and rollback-only UAT catalogue/storage/order/offer/inventory assertions pass. Cloudflare Worker CI/deployment, storefront/admin browser checks, visual/accessibility review, and live migration/deployment remain release steps. Checkout is not ready for real orders until the owner configures a verified WhatsApp number, real product images/prices/stock and delivery fees, and bootstraps an owner account.

The catalogue and commerce migrations and rollback-only database checks have passed in UAT. The app release and live rollout remain pending. Keep checkout fail-closed until required store settings and verified commercial product data are configured.
