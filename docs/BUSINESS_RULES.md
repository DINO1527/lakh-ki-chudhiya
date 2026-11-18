# Business invariants (PROJECT_SPEC sections 8–11 authoritative)

| Area | Required invariant |
|---|---|
| Catalogue | Draft/archive hidden from public queries, media, sitemap and search; authenticated preview only |
| Variants | Unique SKU and valid product size/colour combination, stock per variant, real product media |
| Cart | Quantities bounded positive integers; guest storage contains no PII; deterministic merge; no reservation |
| Prices | Server recalculates from authoritative current data; immutable order item snapshots; no floating money |
| Delivery | Configured exact fee or explicit quote pending; never invent a fee |
| Checkout | Idempotency and atomic order/items write; pending_confirmation, unpaid; reference alone not access |
| Messaging | Customer sends message manually; WhatsApp link not delivery proof or payment |
| Stock | Reserve atomically on confirmation; consume on dispatch; release on cancellation before dispatch |
| Reviews | Delivered eligible order item, authenticated owner, one active review/item; approved only public |
| Admin | Explicit owner/staff permissions, audit sensitive updates, no self-assigned role |
| Payments | All gateway methods unavailable until implemented/configured/verified; WhatsApp channel not gateway |

## Order transitions
pending_confirmation -> confirmed -> processing -> packed -> dispatched -> delivered.
Cancel from pending/confirmed/processing/packed only; release reservation once if present. Expire stale pending orders (proposal 48h configurable); no stock impact. Post-dispatch return/inspection/restock is a separate controlled action; never automatically restock on cancel. Invalid transitions fail without state changes. Concurrent confirmations cannot reserve more than available. Order, fulfilment and payment status are distinct. Reports distinguish paid revenue from order value.

## Checkout recovery
Before external navigation persist order and secure access. On retry after uncertainty reuse idempotency key for equivalent request; reject changed payload with same key. If prices change before submit, show and require acknowledgment. Provide order summary and retry/copy link; do not clear cart until save succeeds. Admin may confirm after contacting customer; insufficient stock requires resolution. Guest links must use secure expiring access mechanism; minimize WhatsApp personal data.

## Reviews and settings
Moderate for content/privacy, not rating sentiment. Editing a review returns it to pending. Avoid fabricated ratings. Future payment toggles must be server-validated against capabilities and permissions; unconfigured controls show unavailable, no SDK or fake payment at launch.
