# ADR 0005: server-priced guest orders and inspected stock returns

- **Status:** Accepted; UAT schema and rollback-only SQL acceptance passed, app/live release pending
- **Date:** 2026-11-24
- **Context:** The owner clarified that one product represents one named colour/design, variant choices are sizes, and a sellable item is a complete bangle set. The store needs scheduled product/collection offers, delivery fees, COD, future online payment, and reversible order-linked stock handling.

## Decision

- Keep a colour in the product name and media gallery; SKU variants represent size only. Quantity and inventory count complete sets, never individual bangles.
- Store delivery fee and COD eligibility on each product. Require an explicit fee before publication; zero means free delivery. For mixed carts, charge the highest selected product fee once and persist it on the order.
- Offer records target one product or collection and define minimum complete sets, percentage, validity window and enabled state. PostgreSQL chooses the greatest eligible discount, applies it only to eligible merchandise, and does not stack promotions.
- Keep a small guest cart in browser storage with only variant IDs and quantities. PostgreSQL recalculates prices, availability, offer, COD eligibility and delivery, then atomically saves a pending unpaid order and immutable line snapshots. An order-specific expiring HTTP-only cookie authorizes the guest receipt.
- Keep online payment unavailable. The existing manual option only saves the order for the customer to contact the store; WhatsApp opens only after an explicit click. COD is available only when the store and every selected product enable it and remains unpaid until delivery is recorded.
- Do not reserve on cart or order save. Staff confirmation reserves SKU sets atomically; dispatch consumes the reservation; unpaid cancellation releases pre-dispatch reservations. Record manual payment/refund separately from fulfilment. A paid pre-dispatch order requires a recorded full manual refund before cancellation.
- Delivery failure does not restock. Staff inspect each returned line and classify every dispatched set as sellable, damaged or missing. Only sellable sets are restocked, with totals required to match dispatched quantity and an idempotency key recorded in the inventory ledger.

## Consequences

- Database RPCs remain authoritative for pricing, offers, stock, payment eligibility and order transitions. TypeScript validates inputs and presents state but cannot override database calculations.
- The data-only compatibility migration splits legacy multi-colour products while retaining variant IDs, SKUs, stock and order snapshots. It copies collection membership, archives ambiguous unlinked galleries, and drafts the affected products until staff upload verified images. Variant-linked media on a multi-colour product stops the migration for manual mapping.
- Reservation, dispatch, release and return movements carry both order and order-line references. A return inspection classifies the full dispatched line exactly once; only its sellable count is added back to stock.
- Delivery zones, account checkout, automated WhatsApp messaging and payment gateways are not implemented by this decision. Actual WhatsApp details, product content, prices, stock and delivery policies remain owner inputs.
- The three ordered catalogue/commerce migrations and rollback-only UAT SQL tests pass. UAT application deployment, visual/accessibility checks and live migration/release remain separate gates.
- This decision does not mark any project stage complete. Staff-admin, visual/accessibility and Worker hosting acceptance remain separate release gates.
