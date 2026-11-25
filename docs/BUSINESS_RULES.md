# Business invariants (PROJECT_SPEC sections 8–11 authoritative)

| Area | Required invariant |
|---|---|
| Catalogue | Draft/archive hidden from public queries, media, sitemap and search; authenticated preview only |
| Variants | One product identifies one named colour/design; size is the only SKU choice; one SKU per product/size; stock counts complete sets |
| Cart | Quantities bounded positive integers; guest storage contains no PII; deterministic merge; no reservation |
| Prices | Server recalculates from authoritative current data; immutable order item snapshots; no floating money |
| Delivery | Product requires an explicit fee before publication; zero means free; a mixed cart pays the highest selected product fee once |
| Checkout | Idempotency and atomic order/items write; pending_confirmation, unpaid; reference alone not access |
| Messaging | Customer sends message manually; WhatsApp link not delivery proof or payment |
| Stock | Reserve atomically on confirmation; consume on dispatch; release on pre-dispatch cancellation; order-linked movements record each change |
| Reviews | Delivered eligible order item, authenticated owner, one active review/item; approved only public |
| Admin | Explicit owner/staff permissions, audit sensitive updates, no self-assigned role |
| Payments | All gateway methods unavailable until implemented/configured/verified; WhatsApp channel not gateway |

## Order transitions
pending_confirmation -> confirmed -> processing -> packed -> dispatched -> delivered; a dispatched order may instead enter delivery_failed.
Cancel from pending/confirmed/processing/packed only; release reservation once if present. Expire stale pending orders (proposal 48h configurable); no stock impact. Delivery failure does not restock. After a return, staff classify every dispatched set on each order line as sellable, damaged or missing in one idempotent inspection; only sellable sets return to stock. Invalid transitions fail without state changes. Concurrent confirmations cannot reserve more than available. Order, fulfilment and payment status are distinct. Reports distinguish paid revenue from order value.

## Checkout recovery
Before external navigation persist order and secure access. On retry after uncertainty reuse idempotency key for equivalent request; reject changed payload with same key. If prices change before submit, show and require acknowledgment. Provide order summary and retry/copy link; do not clear cart until save succeeds. Admin may confirm after contacting customer; insufficient stock requires resolution. Guest links must use secure expiring access mechanism; minimize WhatsApp personal data.

## Reviews and settings
Moderate for content/privacy, not rating sentiment. Editing a review returns it to pending. Avoid fabricated ratings. Future payment toggles must be server-validated against capabilities and permissions; unconfigured controls show unavailable, no SDK or fake payment at launch.
