# Design system — Royal Indian luxury / modern editorial

Proposed brand visual direction for handcrafted lac bangles. Maroon and gold accents, warm ivory, richly textured real product photography, editorial serif headings, modern readable body type. No generic gradient-heavy dashboard design on the storefront; admin is intentionally calm and functional.

| Token | Proposed value | Use |
|---|---|---|
| brand | #500D1B | Hero/primary controls |
| accent | #D4AF37 | Decorative metal-inspired accents |
| surface | #FFF5E4 | Warm storefront background |
| muted-accent | #B76E79 | Secondary decorative tones |
| ink | #160F12 | Primary text |

Use semantic CSS variables, surface/text/action/error/focus tokens, not scattered hex values. Gold on ivory may fail contrast: use a darker text token, verify WCAG 2.2 AA for actual foreground/background pairs. Choose commercially licensed or open-source serif (e.g. Cormorant Garamond) and sans (e.g. Inter), self-host/subset where appropriate. Verify assets and font licenses; no copied competitor imagery. 4/8 px spacing scale, restrained radius/shadows, content-width and consistent responsive grid.

## Layout and pages
- Home: compact brand header, collection navigation, editorial hero with optional rotating bangle, featured collections, real best sellers, craftsmanship story, actual approved reviews, support/footer.
- Catalogue: filter drawer on mobile, visible filter chips, sort, grid responsive to viewport, product photo ratios consistent, quick view using accessible dialog.
- Product: responsive gallery, optional 360/3D viewer, title, genuine rating, LKR price, swatches with accessible names, size guide, stock/quantity, cart/wishlist, care and delivery info, related items; sticky mobile CTA only if it does not obscure content.
- Checkout: calm form, itemized quote, WhatsApp confirmation expectation, accessible validation, order summary and reopen/copy action. No misleading Pay Now button.
- Account/reviews: readable history and status, clear eligibility and errors. Admin: navigation, filters, accessible data table, product draft preview, inventory adjustments with reason, order status actions and confirmation dialogs.

## Reusable library
| Level | Components |
|---|---|
| Primitive | Button, Input, Label, Select, Dialog, Badge, Tabs, Skeleton, Toast |
| Shared | Header, Footer, MobileNavigation, PriceDisplay, EmptyState, ErrorState, Pagination |
| Product | ProductCard, ProductGallery, ProductGrid, ProductFilters, BangleSizeSelector, ColourSwatch |
| Shopping | QuantitySelector, CartItem, CartDrawer, OrderSummary |
| Reviews | StarRating, ReviewCard, ReviewForm |
| Admin | DataTable, StatusBadge, StatisticsCard, ConfirmDialog |
| Experience | Reveal, StaggerGroup, Product3DViewer, StaticMediaFallback |

## Motion / 3D
Use CSS for simple transitions, Motion for meaningful reveals. Avoid conflicting animation libraries; Lenis optional only with tested native scroll/accessibility behavior. Small durations, no scroll hijacking, respect prefers-reduced-motion and keyboard. Real product GLB from Blender or licensed asset; no fabricated exact replica. React Three Fiber/Drei client-only lazy import, poster first, defer offscreen render, cap DPR, stop render when hidden/idle, dispose resources, optional drag/rotate controls plus reset. Avoid loading all models with catalogue. Unsupported WebGL, low-power and reduced-motion fallback: image gallery or supplied 360 photos. Measure actual asset and runtime budgets on a throttled mobile connection. Aim LCP <= 2.5s, CLS <= .1, INP <= 200ms at p75 when field data exists; lab checks are proxies. Optimize pictures with responsive pre-generated sizes and alt text. No fabricated customer reviews, fake scarcity or distracting effects.

## Review checklist
Desktop/mobile screenshots, meaningful typography/spacing, consistent tokens, keyboard focus, contrast, reduced motion, 3D fallback, visual regressions, no broken assets or overflowing layouts. Verify with Playwright and visual review; an external design skill advises, but this approved brand direction and actual content take priority.
