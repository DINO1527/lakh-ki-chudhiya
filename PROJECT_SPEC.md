# Lakh Ki Chudhiya — Agent Development Specification

**Version:** 1.1 | **Date:** 2026-11-18 | **Status:** Initial implementation brief  
**Target:** Codex or compatible repository coding agent  
**Product:** Single-store e-commerce platform for handcrafted lac bangles  
**Deployment:** Cloudflare Workers, Supabase and free-tier-first infrastructure

## 1. Mission and operating instructions

Build a production-oriented, mobile-first, luxury lac bangle storefront and an integrated business management platform. The customer must be able to discover products, preview designs, choose size/colour, manage a cart, create an account, submit orders through WhatsApp and review purchased products. The owner must be able to manage the catalogue, stock, website content, customers, orders, reviews and future checkout methods without editing code.

This is a **single Next.js full-stack application**, not a multi-vendor marketplace. Use one repository and one PostgreSQL database. Do not introduce Medusa, a separate Express/Nest backend, microservices, paid SaaS dependencies or an AI runtime for shoppers at launch.

### Agent rules

- Read existing files, instructions, git status and relevant documentation before changing a repository. Preserve existing work and avoid unrelated refactors.
- Treat this specification as the agreed baseline; identify conflicts and record reasonable assumptions. Do not silently change the business model, stack, hosting provider or feature scope.
- Implement incrementally using the milestones in Section 14. For each milestone, plan, implement, run checks and record evidence. Stop before the next milestone unless asked to continue or the task explicitly authorizes completing multiple milestones.
- Use real persistence and backend authorization. Seed data may be used in local development only; do not ship fake reviews, fake purchases, fake discounts or simulated payment success.
- Ask for owner input only when essential to a live operation (e.g. production credentials, actual product assets, business policies). Continue local development with explicitly labelled test fixtures and configurable settings.
- Prefer verified official documentation and compatible, pinned versions. Never blindly install packages, skills or MCP servers from untrusted sources. Review their instructions and access scope first.
- Do not create billable resources, enable paid plans, deploy production, expose credentials, run destructive migrations or perform live orders without explicit authorization. Do not make commits/pushes unless the user or repository workflow authorizes them.
- All changes must be maintainable, secure, accessible and tested. Report commands actually run, failures, skipped checks and remaining work; never claim unexecuted tests passed.

## 2. Scope and priorities

### Launch requirements (P0)

- Responsive, search-engine-friendly customer storefront and protected admin interface.
- Published product catalogue, collections, filters, search, gallery, quick preview, size/colour variants and stock availability.
- Customer registration, login, logout, password recovery, profile, addresses and order history; guest checkout.
- Persistent shopping cart, wishlist, server-validated checkout and WhatsApp-assisted order submission.
- Admin product draft/preview/publish/archive, media, inventory, orders, customer management, reviews, content, delivery, settings and basic reporting.
- Authentic verified-purchase reviews with moderation.
- Animated, premium design, lightweight 3D hero or viewer with static fallback; installable PWA and safe offline browsing.
- Payment configuration framework with WhatsApp-assisted ordering as the only enabled checkout path.
- Security, RLS, migrations, automated tests, production-compatible Worker build and operational documentation.

### Next enhancements (P1, after P0)

Custom bangle requests, bridal landing pages, discount codes, scheduled content, richer reports, customer review photo uploads if private moderation storage is ready, more individual 3D product assets, optional Google sign-in and improved offline catalogue. Include P1 screens only when backed by working functionality. Basic bridal browsing can use a collection at launch. Push notifications are optional and opt-in.

### Deferred (P2)

Actual card payment (e.g. PayHere), Koko, Mintpay, optional COD/bank transfer, automated WhatsApp Business API messaging, loyalty, AR wrist try-on and additional integrations. No payment SDKs or credentials are required for launch. Design future extension points, not fake implementations.

## 3. Approved languages, framework and libraries

| Component | Selection | Notes |
| --- | --- | --- |
| Primary language | TypeScript (strict) | Frontend and server code |
| UI | React, Next.js App Router | Server Components by default; client components for interaction |
| Markup/styles | HTML5, CSS, Tailwind CSS | Responsive, semantic and accessible |
| Data | PostgreSQL and SQL | Supabase, SQL migrations and transactional RPCs |
| Authentication | Supabase Auth, @supabase/ssr, @supabase/supabase-js | SSR session cookies and backend verification |
| UI primitives | shadcn/ui, Lucide React | Reusable accessible components |
| Animation | Motion (`motion` / `motion/react`) | CSS transitions for simple effects; Lenis only if justified |
| 3D | Three.js, @react-three/fiber, @react-three/drei | Dynamically import client-only components |
| Media | Supabase Storage | Private `product-media` bucket; signed URLs only for published product images |
| Forms | React Hook Form, Zod | Client UX + authoritative server validation |
| Cart state | Zustand | Persist only non-sensitive cart data locally |
| Product gallery | Embla Carousel | Add only if needed |
| Charts | Recharts | Lazy-load in admin |
| PWA | Next.js manifest + service worker | Serwist optional after adapter compatibility test |
| Hosting | Cloudflare Workers + Wrangler | Not static-only Pages export |
| Dev tooling | pnpm, ESLint, Prettier, TypeScript | One lockfile; supported Node.js LTS |
| Testing | Vitest, Playwright, axe-core | Bruno optional for versioned API collections |
| CI | GitHub Actions | Lint, typecheck, test and Worker build |

Do not select arbitrary latest versions for deployment. Pin compatible framework, adapter, React and 3D library versions after validating peer dependencies. Avoid redundant UI/state libraries, full icon packs and always-loaded animation packages.

## 4. Free-tier-first infrastructure and compatibility gate

```
Customer / installed PWA / staff browser
                 |
         Cloudflare Workers
         Next.js App Router
      storefront + admin + API
          /              \
 Supabase Auth/Postgres   Supabase Storage
   RLS + SQL RPCs         private product media
          
 Customer checkout -> wa.me link -> customer sends message
 Staff -> manual order confirmation -> stock/fulfilment updates
```

- Use Supabase for identity, relational records and media. Cloudflare Workers host the app only; do not duplicate catalogue/order data in Cloudflare D1 or store product media on Cloudflare.
- Prefer real Next.js with `@opennextjs/cloudflare` initially as agreed; Cloudflare's current guide recommends vinext for new projects, so compare current compatibility and deployment limits in a small proof of concept. Keep Next.js as the approved framework. Record adapter decision in an ADR; do not silently switch to an alternative runtime framework or paid hosting.
- Phase 0 must demonstrate an SSR page, route handler, session cookie flow, Supabase query, private Supabase Storage policy, manifest/service worker and build/preview in the actual Worker runtime (`workerd`), not just `next dev`. Test private and public caching isolation. Use the adapter's supported scripts/configuration; for OpenNext configure `nodejs_compat` and a supported compatibility date.
- Validate compressed Worker size, cold starts, CPU and request limits. Keep heavy 3D libraries exclusively on the browser side; no runtime native image processing, persistent filesystem, long-running Node server or unsupported modules. Prefer pre-generated WebP/AVIF images and thumbnails; avoid paid runtime transformation features.
- Budget target: zero recurring platform cost **within applicable free allowances**, not guaranteed zero costs. Workers Free currently lists 100,000 requests/day and 10 ms CPU/request. Supabase Free currently lists 500 MB database, 1 GB file storage, 5 GB cached and uncached egress, two active projects and pauses low-activity projects. These limits can change or be exceeded; inspect account usage before launch. Domain, SMTP, overages and assets may cost money. Monitor usage, apply upload/rate limits and never upgrade automatically.
- Local development with Supabase CLI/Docker where available; otherwise use an explicitly approved development project. Separate production data, auth settings, Storage buckets and secrets from development. Never use production customer data in tests.
- Maintain isolated UAT and live Supabase projects; development and testing use UAT. Configure the same private bucket in each project, with independent objects. UAT fixtures must be explicitly synthetic and must never be applied to live; keep Worker secrets environment-scoped. See `docs/ENVIRONMENTS.md`; do not provision hosted resources or invent project credentials.
- Public email/password sign-up and resets require configured production SMTP; default Supabase SMTP is limited. Use local email capture for testing, document the production setup gate, and leave unavailable public auth options disabled rather than pretending email works. Google OAuth is optional and requires owner-supplied credentials.
- Write a manual backup/restore procedure for database migrations/data and media. Retain backups outside the platform under owner control; do not assume free managed backups are downloadable. Never expose backup files publicly.

## 5. Repository organization

Use a single package unless real separation becomes necessary. Suggested structure (adapt to existing code):

```text
lakh-ki-chudhiya/
├── AGENTS.md
├── README.md
├── package.json / pnpm-lock.yaml
├── next.config.ts
├── wrangler.jsonc
├── open-next.config.ts           # if OpenNext selected
├── .env.example
├── .gitignore
├── src/
│   ├── app/
│   │   ├── (storefront)/         # public shopping layout/routes
│   │   ├── (auth)/              # login, registration, recovery
│   │   ├── (customer)/account/  # protected customer pages
│   │   ├── admin/              # protected staff layout/routes
│   │   ├── api/                # route handlers when required
│   │   ├── auth/callback/
│   │   ├── manifest.ts
│   │   ├── robots.ts
│   │   ├── sitemap.ts
│   │   ├── layout.ts
│   │   └── globals.css
│   ├── components/             # UI primitives and shared layout
│   ├── features/               # catalogue, cart, checkout, account,
│   │                            # orders, reviews, inventory, admin, media
│   ├── server/                 # cross-feature auth, transaction orchestration,
│   │                            # integration and permission infrastructure
│   ├── lib/                    # Supabase clients, money, validation, env
│   ├── hooks/
│   ├── stores/
│   ├── types/                  # generated DB and domain types
│   └── styles/                 # tokens and reusable styles
├── public/                     # app icons, offline fallback, licensed assets
├── supabase/
│   ├── migrations/
│   ├── seed.sql                # local-only fixture data
│   └── tests/                  # RLS / SQL business rules
├── tests/{unit,integration,e2e,fixtures}/
├── docs/{ARCHITECTURE,BUSINESS_RULES,TEST_PLAN,DEPLOYMENT,PROGRESS}.md
├── docs/decisions/              # ADRs
├── .agents/skills/              # bundled project-scoped agent skills
├── .github/workflows/
└── scripts/                     # approved setup, backup and media tools
```

Do not create empty architectural layers purely to match the diagram. Organize by domain, keep UI thin, server rules centralized and storage/provider details behind a narrow boundary. Use generated Supabase types, Zod boundary schemas and shared domain types where appropriate. Never expose server-only modules or elevated credentials to client bundles.

## 6. Storefront pages and behavior

| Route | Purpose and primary requirements |
| --- | --- |
| `/` | Hero with optional 3D, collections, featured products, craftsmanship story, genuine reviews only, WhatsApp contact |
| `/shop` | Search, collection/colour/size/price filters, sort, pagination, empty/loading/error states |
| `/collections` | All published collections |
| `/collections/[slug]` | Published collection page, matching products |
| `/products/[slug]` | Gallery, optional video/360/3D, variation selection, price, stock, care instructions, reviews, related products, add-to-cart |
| `/size-guide` | Measurement instructions, inner diameter and size chart with verified supplier sizing |
| `/search` | Search results with filters, no-results state |
| `/wishlist` | Saved products, remove/add to cart with variant selection |
| `/cart` | Variant, quantity, update/remove, server revalidation, subtotal and delivery estimate if available |
| `/checkout` | Guest/authenticated details, delivery, order review, submit and open WhatsApp |
| `/order/[reference]` | Authorized order summary and reopen WhatsApp action; reference alone is not authorization |
| `/login`, `/register` | Authentication and validation |
| `/forgot-password`, `/reset-password` | Email recovery flow |
| `/account` | Profile, saved addresses, sign out |
| `/account/orders`, `/account/reviews` | Own order history/details and eligible reviews |
| `/about`, `/contact` | Brand story, support and business contact from settings |
| `/policies/[slug]` | Privacy, delivery, returns, terms; owner-approved text required |
| `/bridal`, `/custom-order` | P1: bridal collection landing and custom request form |

Global navigation: logo, collection/shop links, search, account, wishlist, cart badge; mobile menu/bottom nav where useful. Footer: support, social links, size guide and policies. Search/filter state should be URL-addressable; public routes use crawlable markup. Unpublished products must not be accessible on public routes, search, sitemap or media endpoints.

### Product variations and preview

- Products can be single bangles, pairs or sets; product data explicitly states what one sellable unit contains. Quantity counts the sellable unit, not individual pieces unless configured so.
- Each sellable SKU has its own size, colour/design, stock and price (or inherits a base price). Disallow unavailable combinations and out-of-stock selection for checkout.
- Store conventional size codes as strings (e.g. `2-4`, `2-6`, `2-8`), not decimal numbers. Store measured inner diameter in mm if supplied. Do not invent actual size conversions; obtain verified supplier measurements.
- Include title, slug, description, material, collection, colour, size, set count, price, optional genuine compare-at price, care guidance, availability and media alt text. Optional handmade variation disclaimer.
- Product cards show primary image, legitimate price and availability, with quick-view and wishlist. Quick-view is keyboard accessible and not a substitute for the canonical product page.
- Selecting a variant updates price, stock, image/3D preview if present. No mandatory 3D asset per SKU. Real product photography is primary; generated/proxy 3D art is illustrative and must not misrepresent a product.
- Allow pinch/zoom or accessible image enlargement, swipe gallery, visible focus, keyboard controls and a static fallback.

## 7. Design system and performance

Direction: royal Indian jewellery craftsmanship combined with modern editorial e-commerce. This is an illustrative direction pending owner brand assets.

| Token | Initial value |
| --- | --- |
| Primary | Royal maroon `#500D1B` |
| Accent | Gold `#D4AF37` |
| Light | Ivory `#FFF5E4` |
| Secondary | Rose `#B76E79` |
| Dark | `#160F12` |
| Headings | Playfair Display or licensed equivalent serif |
| Body | Inter or licensed equivalent sans serif |

Use self-hosted subset fonts with proper licences, meaningful contrast (gold on ivory may need darkening), predictable spacing, generous photography, reusable tokens and restrained animation. Admin may use a simpler light neutral design. No full-page synthetic loading introductions, heavy generic template layout, scroll hijacking or unnecessary animations.

3D: optional lazy-loaded hero ornament or selected product GLB viewer, user-controlled rotate/zoom, reduced-motion fallback, no WebGL requirement for shopping. Asset creation can use Blender. Compress textures and geometry; cap device pixel ratio and pause animation when hidden/offscreen. Use IntersectionObserver/dynamic imports. Start from a lightweight placeholder in development only; actual GLB/photo files must be owner-supplied or licensed before launch.

Accessibility: target WCAG 2.2 AA, keyboard navigation, labels, live cart updates, dialog focus management, reduced-motion support, contrast, touch targets and text alternatives. Visual checks at 360/390/768/1024/1440 px; no horizontal overflow. Aim for LCP <=2.5s, INP <=200ms, CLS <=0.1 at the 75th percentile when field data is available; use Lighthouse/mobile throttling as prelaunch evidence, not a guarantee. Target an initial non-3D page payload under 1 MB where practical; lazy-load media and charts. Avoid layout shifts and unbounded lists.

## 8. Data model and authoritative business rules

Conceptual schema; agent must create versioned SQL migrations with foreign keys, constraints, indexes, timestamps and explicit RLS policies. Use UUID internal IDs and unique human-readable order references. Use exact integer minor units (LKR cents) for prices and totals, ISO currency `LKR`, UTC timestamps (display Asia/Colombo). Never use floating-point money arithmetic. Keep money and state changes on server/SQL.

| Table / domain | Key responsibilities |
| --- | --- |
| `profiles` | Auth user ID, name, phone; customer's own editable fields |
| `staff_members` | Trusted user ID, active flag, role; never user-editable |
| `addresses` | Customer-owned saved contact/delivery addresses |
| `collections` | Title, slug, description, visibility, sort order |
| `products` | Title, slug, descriptions, material, set information, status, timestamps |
| `product_collections` | Many-to-many links |
| `product_variants` | SKU, size code, diameter, colour/design, exact price, active state |
| `product_media` | Supabase Storage path, variant/product association, type, state, alt, sort order |
| `inventory` | Variant ID, on-hand quantity, reserved quantity; non-negative constraints |
| `inventory_movements` | Adjustment/reserve/release/ship history and actor/reason |
| `carts`, `cart_items` | Signed-in cart and unique cart/variant rows; guest cart may be local only |
| `wishlist_items` | Unique user/product rows; optional local guest list |
| `orders` | Customer nullable, reference, contact/address snapshot, currency, delivery/total, statuses, idempotency |
| `order_items` | Immutable SKU/title/variant/price/quantity snapshots |
| `order_events` | Status transitions, reason, actor, time |
| `stock_reservations` | Order/variant, quantity, expiry, reservation state |
| `reviews` | User, delivered order item, product, 1–5 rating, body, moderation status |
| `review_media` | P1 private uploads, moderation and published asset metadata |
| `delivery_zones` | Jurisdiction/zone, fee, availability and notes |
| `site_settings`, `site_content` | Public brand/contact/WhatsApp and versioned page/banner content; no secrets |
| `checkout_methods` | Method key, availability/configured flag, active state, display settings |
| `payment_attempts` | Reserved extension model for actual payment recording/providers; implement only as needed |
| `audit_logs` | Privileged change metadata, actor and timestamp; no raw secrets/addresses in logs |
| `promotions`, `custom_requests` | P1, if implemented; explicit eligibility and status rules |

Business invariants:

- Public reads return only published products, active variants and approved reviews; hide cost/internal metadata. Admin preview is authenticated/no-store with private media access.
- Do not hard-delete products referenced by orders; archive. Order snapshots do not change if current product name, price or image changes.
- Stock available = on-hand minus reserved. Transactions use row locks or equivalent atomic updates with deterministic ordering; check all lines as one operation; no negative inventory, no duplicate movements.
- Do not trust cart prices, totals, roles, review verification flags, user IDs or payment state from browser input. Use authenticated identity and database state. Validate delivery and stock again when accepting an order.
- Idempotency: a retry with same key and same data returns prior order; conflicting reuse is rejected. Scope checkout key to authenticated user or securely bound guest session/token and enforce uniqueness in database.
- Guest order access: use a high-entropy scoped opaque token, store hash server-side, set secure HttpOnly session/cookie as feasible; reference alone is never sufficient. Never expose tokens in WhatsApp links or public cache.
- Account deletion/retention rules must preserve necessary order records while minimizing personal data, consistent with owner-approved policy and applicable law. Avoid claiming legal compliance until reviewed.

## 9. Customer workflows

### 9.1 Login and account

Register using Supabase Auth email/password with verification and production SMTP; login and establish SSR session; redirect safely to intended internal path; allow password recovery, edit profile and manage own addresses, view own orders/reviews, logout. Verify sessions on server. Google OAuth only if configured. Never store passwords in custom tables. Signed-out users can browse and checkout. Merge guest cart on login deterministically by variant, cap against server stock and notify about changed prices/availability. Do not persist another account's private state on logout.

### 9.2 Shopping cart

Select valid size/colour and quantity -> add -> edit/remove -> show estimate -> revalidate on checkout. Guest cart persists locally (no address/contact data). Authenticated cart persists in database, with defined merge semantics. Use integer quantities and reasonable limits; show changed/unavailable items clearly. Wishlist never reserves stock. Cart entries are intent only; no stock deduction on add-to-cart.

### 9.3 WhatsApp checkout (launch path)

1. Customer reviews cart, chooses guest or signed-in checkout, enters contact number/name and required delivery details. Use delivery settings to compute an exact fee or clearly indicate that quote/manual confirmation is needed; no fabricated fee.
2. Server checks input, rate limits abusive requests, verifies public products/variants and recalculates subtotal, discount if available, delivery and total from authoritative records. If price/availability changed, show revised cart and require confirmation before ordering.
3. Create order and immutable items in one transaction with idempotency key. Initial order state `pending_confirmation`, payment state `unpaid` (or `pending_manual`), no permanent stock deduction. Generate readable reference and secure guest access.
4. **Default launch policy:** unconfirmed WhatsApp intents do not reserve stock (prevents abandoned links exhausting inventory). Admin confirmation performs an atomic stock reservation; if insufficient, admin must contact customer and resolve before confirming. Clearly state on checkout that availability is subject to confirmation. Optional timed pre-confirmation holds are deferred; do not mix policies.
5. Present successful order summary and user-clicked WhatsApp button. Generate `https://wa.me/<E164 digits>?text=<URL-encoded message>` from saved record; normalize business number in settings. Include order reference, item names, colour, size, quantities and quoted prices/total (or delivery pending). Minimize personal information sent to external messaging; do not include passwords, tokens, full address or payment secrets. Add a privacy notice.
6. Customer must press Send in WhatsApp. The website cannot know whether message was sent, read or delivered using a click-to-chat link; never claim it did. Order status stays pending until staff confirms. Provide reopen/copy message and order reference if WhatsApp cannot open.
7. Clear submitted cart items only after database save; preserve unrelated items. On network uncertainty retry using same idempotency key rather than create another order. Do not automatically open a new chat before successful order persistence.

Example message (fixture only):

```text
Hello Lakh Ki Chudhiya! Please confirm order LC-000125.
Rajwadi Lac Bangle Set | Royal Red | 2-6 | Qty 2
Subtotal: LKR 4,900
Delivery: LKR 350
Total: LKR 5,250
Availability and payment subject to confirmation.
```

### 9.4 Order and inventory lifecycle

```
pending_confirmation -> confirmed -> processing -> packed -> dispatched -> delivered
        |                   |           |          |
        +-------------------+-----------+----------+--> cancelled (before dispatch)
pending_confirmation -> expired (owner-configured stale intent policy)
```

- Confirm: atomically reserve available stock once. Processing/packing do not decrement again. Dispatch: consume reservation and reduce on-hand exactly once. Cancel before dispatch: release existing reservation exactly once. Expire stale pending intents without changing inventory. After dispatch, use separate return/exception workflow and inspected restock; do not automatically restock on cancellation.
- Default pending intent retention/expiry proposal: 48 hours, configurable; no automatic deletion of records. A small optional scheduled Worker or admin action may expire stale intents. No paid scheduler required. Owner can choose later.
- Keep order, payment and fulfilment concepts distinct. Payment status examples: `unpaid`, `pending_manual`, `paid`, `failed`, `refunded` (actual fields only as needed). WhatsApp order confirmation does not mean paid. Manual payment recording requires authorized staff, amount/reference, reason and audit event. No card collection.
- Show status history, shipment/tracking reference where available. Only authorized staff can perform valid transitions. Aggregate revenue separately for confirmed orders vs actual recorded payments; exclude cancellations/refunds as appropriate and label formulas.

### 9.5 Reviews

Only authenticated customers with a matching delivered order item may post a verified-purchase review. One active review per eligible order item (enforce uniqueness), rating integer 1–5, length limits and safe plain text. Submit as pending; staff approve/reject with reason, optionally respond. Editing returns review to moderation. Published ratings/counts use approved records only; do not suppress negative reviews simply for being negative. Public identity display is minimal (e.g. chosen display name); never expose emails/phone/address. Optional review photos are staged privately, validated, stripped of sensitive metadata when possible and moderated before publishing.

## 10. Admin management platform

Protect the entire `/admin` route group **and** all admin mutations/queries with server authorization. Hiding navigation or checking role in client code is insufficient. Seed/bootstrap the first admin through an explicitly authorized server/SQL procedure, never public registration. P0 roles: owner and staff; staff gets explicit permitted operations, owner handles staff/checkout settings and sensitive reports. Extend roles later. Add MFA for privileged accounts where practical.

| Route | Functions |
| --- | --- |
| `/admin` | Orders by status, paid revenue, low stock, pending reviews, date filters |
| `/admin/products` | Create/edit product, manage variants, attach media, preview, publish, archive |
| `/admin/collections` | Manage collection descriptions, sort, visibility, assigned products |
| `/admin/inventory` | Per-SKU availability, adjust quantity with reason, movement/reservation history |
| `/admin/orders` | Filter/search, view snapshots, confirm, process, pack, dispatch, cancel and audit |
| `/admin/customers` | Authorized customer details/order history, with minimal PII exposure |
| `/admin/reviews` | Moderate text/photo reviews, respond and view audit |
| `/admin/media` | Validate, upload, organize, replace and safely remove unused assets |
| `/admin/content` | Homepage banners, featured collections/products, about and policy content |
| `/admin/settings/delivery` | Delivery zones, fees, service availability, manual quote mode |
| `/admin/settings/checkout` | WhatsApp contact/checkout settings and future provider availability |
| `/admin/settings` | Business profile, contact, brand, staff controls (owner only) |
| `/admin/reports` | Date-range order/paid revenue, best sellers, stock; CSV export with access guard |
| `/admin/promotions`, `/admin/custom-orders` | P1 if corresponding workflows are built |

Product publishing: create draft -> add required variants/media/care details -> authenticated preview -> validate required fields -> publish -> public cache refresh -> archive to hide. Public media publishing follows approval. Admin routes should have tables, pagination, loading/error/empty states, destructive action confirmation, audit entries and mobile-compatible layouts. CSV exports must prevent spreadsheet formula injection and avoid unnecessary PII.

## 11. Payment extension design

WhatsApp is an order communication method, not a payment gateway. Design a checkout strategy registry and separate future payment provider contract.

```ts
// Illustrative contracts; adjust to actual implementation.
type CheckoutMethod = 'whatsapp' | 'cod' | 'bank_transfer' | 'payhere' | 'koko' | 'mintpay';
interface MethodAvailability {
  key: CheckoutMethod;
  implemented: boolean;
  configured: boolean;
  enabled: boolean;
}
interface PaymentProvider {
  createSession(input: VerifiedOrderInput): Promise<ProviderSession>;
  verifyNotification(input: unknown): Promise<VerifiedPaymentEvent>;
  refund?(input: RefundRequest): Promise<RefundResult>;
}
```

Define actual TypeScript DTOs only when used. Provider stubs must fail closed, not return success. Store gateway keys in Worker secrets, not settings tables or browser. Admin toggles only enable a method if implementation exists, credentials are available, and sandbox/verification checks passed. Unavailable methods are disabled and labelled `Not integrated`. Server enforces availability on every checkout; no forced method via crafted request. Keep at least one available checkout method. WhatsApp enabled at launch once a valid number is supplied. Future online providers require merchant access, official integration docs, signature/webhook verification, idempotency, amount/currency/order validation, reconciliation, proper refunds and sandbox tests. Do not build or test real payment integrations now.

## 12. Security, media, APIs and PWA

### Access and validation

- Enable RLS on every exposed Supabase table. Explicit public read policies for published records only; authenticated users can view/mutate only permitted own fields/records. No customer access to internal cost, staff table, stock movements, other orders, settings secrets or private media. Avoid unrestricted database views/functions that bypass RLS.
- Use user-scoped Supabase client by default. Elevated secret/service-role keys bypass RLS and must remain server-only with narrowly scoped use. Check staff/guest authorization before accessing private records. For `SECURITY DEFINER` RPCs set safe search path, schema-qualify objects, restrict EXECUTE grants and validate caller/business data explicitly.
- Protect mutation endpoints from CSRF as appropriate (same-site cookies, trusted origin and tokens where needed). Validate redirect destinations. Use secure cookie settings, safe CSP/security headers, XSS-safe rendering, rate limits for login/checkout/reviews/uploads, optional Cloudflare Turnstile with server verification if abuse demands it. Never trust user HTML or allow arbitrary URL fetching.
- Validate Zod input at server boundaries and database constraints. Use parameterized queries, safe error messages/request IDs, no secrets/PII in logs. No unauthenticated listing of orders/customers. Verify authorization independently for direct API access, not just route layout.

### Product media and Supabase Storage

Use the private `product-media` bucket declared in `supabase/config.toml` for product images in both UAT and live; the projects do not share objects. The bucket limits uploads to 5 MiB and JPEG, PNG, WebP or AVIF. Start with image-only media; 3D/video uploads are out of scope until quotas and moderation workflows are reviewed. Draft/review files must not be reachable by guessed keys or public object listing. `storage.objects` policies allow public users to create short-lived signed URLs only for published media attached to published products; admin Storage mutations require an active owner/staff row in `public.staff_members`, checked through a fixed-search-path database function. Never use editable JWT user metadata or a service-role key in the browser. Generate random object paths; do not trust client filenames. Validate file signatures and size in the upload workflow; optimize thumbnails offline and strip sensitive metadata where feasible. Avoid relying on paid image transformations. Check Supabase's current storage and egress quotas before launch; the free allowance is limited and is not a zero-cost guarantee. Use the Storage API for all object changes; never write directly to Supabase-managed `storage` tables.

### API and data access boundaries

Prefer Server Components for reads and Server Actions or Route Handlers for mutations, with shared service-layer logic. Expose routes only where needed (not mandatory duplicate APIs): `/api/checkout`, `/api/cart`, `/api/reviews`, `/api/admin/products`, `/api/admin/orders/[id]/transition`, `/api/admin/media/upload`. Validate method/payload, role, record ownership, server totals and status transitions. Return structured codes e.g. `VALIDATION_ERROR`, `PRICE_CHANGED`, `INSUFFICIENT_STOCK`, `UNAUTHORIZED`, `FORBIDDEN`, `CONFLICT`. Use consistent status codes (400/401/403/404/409/429/500). Future `/api/payments/[provider]/webhook` not active at launch.

### PWA and caching

Manifest includes name, short name, icons (192/512 and maskable), theme/background colours, standalone display and start URL. Service worker caches versioned static assets, approved public product resources and offline fallback only. Cache bounded public responses with expiry and revalidation; prefer network-first for catalogue when online and show offline/stale indicator when needed. Never cache authenticated pages, `/admin`, checkout, order details, session responses, user data, or mutation requests; exclude personalized Server Component payloads and cookie-bearing responses. Use private/no-store headers and test account-to-account isolation. Clear relevant caches/local state on logout/updates. If offline, allow cached catalogue and local cart edits, disable order submission, show connection status and revalidate on reconnection; do not queue financial/order mutations automatically. Installation support varies by browser/iOS; provide device-specific instructions rather than promise a universal prompt. No push notification requirement at launch.

### SEO

Server-render public content, use meaningful product/collection URLs, metadata, canonical links, Open Graph, sitemap and robots rules; noindex admin/account/checkout/drafts. Add accurate Product/Breadcrumb structured data, LKR prices, real availability, and aggregate rating only when actual approved reviews exist. No fabricated reviews or misleading urgency. Revalidate affected public pages after staff mutations using adapter-supported mechanisms; ensure archived products disappear promptly and private responses never enter shared cache.

## 13. Configuration and owner inputs

Example variable names (agent adapts to confirmed SDK/runtime; never add real values to git):

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=             # optional privileged server-only operations
NEXT_PUBLIC_SITE_URL=
# Optional: TURNSTILE_SECRET_KEY and public site key only when configured
```

Provide `.env.example` and document local `.env.local`/Worker secret setup. Settings in admin: actual brand name/spelling, logo, public business WhatsApp number, contacts, product catalogue/photographs, size measurements, real prices and stock, delivery zones/fees, return/privacy policies. Production credentials and SMTP configuration are supplied privately by the owner. Use placeholders in development only; prevent live checkout when configuration is invalid. Sri Lanka and LKR are initial assumptions; support configurable business details. Do not fabricate policy terms, product claims, customer reviews or existing merchant approval.

## 14. Delivery milestones (implement in order)

| Stage | Work | Exit gate |
| --- | --- | --- |
| 0 — Foundation | Inspect repo; scaffold Next.js/TS; configure package tools, Worker adapter, Supabase and Storage policy proof of concept; create ADR and progress log | Typecheck/build, Worker preview, auth/data/media smoke tests; free-tier compatibility evidence |
| 1 — Design/catalogue | Shared layouts/tokens, responsive home/shop/product/collection pages, migrations, fixture catalogue, variant selection, size guide | Responsive and accessible catalogue, unpublished data protected |
| 2 — Admin/catalogue | Staff auth, product CRUD, staging/publishing, collections, inventory, media, content | Draft -> preview -> publish -> archive works end-to-end; RLS tests |
| 3 — Account/cart | Customer auth/profile, addresses, cart persistence/merge, wishlist | Guest and logged-in session flow, cart consistency, access isolation |
| 4 — Orders | Checkout validation, atomic order persistence, guest authorization, WhatsApp handoff, order admin, stock transitions, checkout settings | Correct totals, idempotency, valid transitions, no oversell, WhatsApp failure recovery |
| 5 — Reviews/reports | Verified reviews, moderation, order history, dashboard, basic reports, delivery settings | Review eligibility and moderation, correct reporting and permission tests |
| 6 — Experience/release | Lightweight 3D/animation, PWA, SEO, performance/security, accessibility, CI, backup/deploy docs | All critical tests pass, actual Worker build/preview, owner launch checklist |
| 7 — Expansion | Only after P0 and separate approval: P1 features, actual payment provider integrations | Feature-specific acceptance and sandbox verification |

## 15. Testing and release acceptance

- Unit: exact money arithmetic, variant resolver, cart merge, input validation, WhatsApp URL encoding, method availability, order transition rules.
- SQL/integration: product visibility, admin/customer/guest permissions, checkout transactions, concurrent attempts to confirm last stock, duplicate idempotency keys, reservation/dispatch/cancel idempotency, ownership checks, review eligibility, invalid inputs, private media.
- Playwright: public catalogue, quick preview, responsive variations, cart, guest and authenticated checkout, save/reopen WhatsApp message (intercept external link; do not send live message), admin publish and confirm/dispatch, delivered order review and moderation, invalid direct API access, offline fallback, PWA install prerequisites. Verify cache isolation after sign out and across users. Exercise mobile and desktop; collect failure screenshots/traces with fixture data only.
- Accessibility and performance: axe, keyboard navigation, reduced motion, WebGL-disabled fallback, mobile throttling; check no private data in public response or cached payload.
- Security: verify RLS under anon/customer/staff roles, price tampering, URL leakage, role escalation, blocked unavailable gateway, media upload validation and no exposed secret. Use only authorized local/staging targets.
- CI scripts: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build` and a documented adapter-specific Worker build/preview smoke test. Add scripts to package.json; do not claim they exist until implemented. Never skip failing checks by default.
- Definition of done: acceptance criteria met, migrations reproducible, security checks passed, responsive UI verified, existing tests pass, documentation and progress updated, known gaps reported. Owner approval required for production deployment. Launch requires real assets and prices, verified business WhatsApp number, delivery/policies, configured auth email, admin setup, backup and free-tier review.

## 16. Agent tools and optional repository skills

Keep this brief as root `PROJECT_SPEC.md`. Follow `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/CODING_STANDARDS.md`, `DESIGN.md` and the project skills included in `.agents/skills/`. See `docs/AGENT_SETUP.md` for curated third-party repositories and MCP configuration guidance. Verify discovery paths and review external tools before installing; the bundled first-party project skills are ready to read.

Suggested tools for the development stage: official documentation/Context7 for current library APIs; Playwright MCP for browser inspection; Chrome DevTools MCP for console/network/performance; shadcn MCP for UI primitives; optional Figma MCP for design and Supabase MCP with a development project and least-privilege access. GitHub MCP may assist with permitted repo/PR actions. Browser automation tests remain versioned in the codebase; MCP availability is not a runtime dependency. Do not link production secrets or allow automatic privileged actions through third-party tools.

## 17. Official technical references

Verify current versions and quotas before implementation. References checked for platform compatibility as of 2026-11-18:

- Cloudflare Next.js: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- Cloudflare OpenNext: https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/
- OpenNext setup: https://opennext.js.org/cloudflare/get-started
- OpenNext troubleshooting: https://opennext.js.org/cloudflare/troubleshooting
- Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- Supabase pricing: https://supabase.com/pricing
- Supabase Storage buckets: https://supabase.com/docs/guides/storage/buckets/fundamentals
- Supabase Storage access control: https://supabase.com/docs/guides/storage/security/access-control
- Supabase Storage helper functions: https://supabase.com/docs/guides/storage/schema/helper-functions
- Supabase pausing: https://supabase.com/docs/guides/platform/free-project-pausing
- Supabase SMTP: https://supabase.com/docs/guides/auth/auth-smtp
- Supabase production checklist: https://supabase.com/docs/guides/deployment/going-into-prod
- Supabase security checklist: https://supabase.com/docs/guides/security/production-checklist
- Next.js PWA: https://nextjs.org/docs/app/guides/progressive-web-apps
- Serwist: https://serwist.pages.dev/docs/next/getting-started
- Codex development workflows: https://developers.openai.com/cookbook/examples/codex/iterating-development-workflows-with-codex

## 18. First task for the development agent

Upon receiving the instruction to begin, read this file and inspect the workspace. Implement **Stage 0 only**. If there is no application, scaffold a minimal compatible project. Validate the approved stack in the Worker runtime without provisioning paid services or deploying production. Document version selections, actual test results, local run commands, risks and outstanding owner inputs. Update `docs/PROGRESS.md` and provide the next recommended stage. Do not mark the storefront or production infrastructure complete until actually implemented and verified.
