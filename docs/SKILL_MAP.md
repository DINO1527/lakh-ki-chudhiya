# Local agent skill routing

These 13 original project skills are included in `.agents/skills/<name>/SKILL.md`. Use the relevant skill before making changes. If automatic discovery is unavailable, read the file manually; no extra plugin needed. Always-on AGENTS.md governs all tasks. External skills supplement these and must be reviewed.

| Skill | Trigger |
|---|---|
| `clean-code` | Apply SOLID, maintainable TypeScript, composition and safe refactoring to code changes. |
| `project-architecture` | Plan or change feature boundaries, file structure and dependencies in the Next.js monolith. |
| `jewellery-design-system` | Design or review premium lac bangle storefront and admin interfaces. |
| `reusable-components` | Create or refactor shared UI primitives, product components and composable layouts. |
| `ecommerce-development` | Implement catalogue, product publishing, search, cart, accounts, wishlist, and commerce behavior. |
| `product-3d-preview` | Implement performance-conscious optional 3D bangle hero or product preview and motion. |
| `inventory-management` | Implement per-variant stock, inventory adjustments, atomic reservations and order transitions. |
| `whatsapp-checkout` | Implement validated order persistence, guest access, WhatsApp handoff and retry. |
| `payment-provider` | Design checkout settings and later verified PayHere, Koko or Mintpay provider integration. |
| `admin-management` | Implement protected admin catalogue, content, orders, customers, inventory, reports and reviews workflows. |
| `pwa-development` | Implement installability, service worker, safe offline browsing, caching and performance. |
| `seo-optimization` | Implement truthful storefront metadata, product structured data, discovery and performance. |
| `ecommerce-qa` | Plan, execute and document regression, security and release verification for store features. |

For cross-cutting features, combine relevant skills without repeating instructions. Example checkout: project-architecture + whatsapp-checkout + inventory-management + ecommerce-qa. For a product page: jewellery-design-system + reusable-components + ecommerce-development + seo-optimization; add product-3d-preview only when needed. For future gateway: payment-provider + ecommerce-qa. For release: pwa-development + ecommerce-qa plus docs/DEPLOYMENT.md and reviewed Cloudflare skill. External tool permissions are not implied by this map.
