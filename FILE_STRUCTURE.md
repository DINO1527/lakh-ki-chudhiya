# Target application structure (created incrementally)

```text
lakh-ki-chudhiya/
├── AGENTS.md / PROJECT_SPEC.md / DESIGN.md / README.md
├── START_AGENT.md / FILE_STRUCTURE.md
├── package.json / pnpm-lock.yaml / tsconfig.json
├── next.config.ts / wrangler.jsonc / open-next.config.ts
├── eslint.config.mjs / prettier.config.mjs / playwright.config.ts
├── .env.example / .gitignore
├── src/
│   ├── app/
│   │   ├── (storefront)/
│   │   │   ├── page.tsx / layout.tsx
│   │   │   ├── shop/ / collections/[slug]/ / products/[slug]/
│   │   │   ├── size-guide/ / search/ / wishlist/ / cart/ / checkout/
│   │   │   └── order/[reference]/ / about/ / contact/ / policies/[slug]/
│   │   ├── (auth)/login/ / register/ / forgot-password/ / reset-password/
│   │   ├── (customer)/account/ (orders/ / reviews/ / addresses/)
│   │   ├── admin/ (products/ / collections/ / inventory/ / orders/ / customers/
│   │   │          reviews/ / media/ / content/ / reports/ / settings/)
│   │   ├── api/ / auth/callback/ / manifest.ts / robots.ts / sitemap.ts
│   │   └── layout.tsx / globals.css / error.tsx / not-found.tsx
│   ├── features/
│   │   ├── products/ / collections/ / inventory/ / cart/ / checkout/
│   │   ├── orders/ / payments/ / customers/ / authentication/ / reviews/
│   │   └── wishlist/ / promotions/ / media/ / content/ / reports/ / delivery/
│   ├── components/ (ui/ / layout/ / shared/ / animations/ / three/)
│   ├── server/ (auth/ / orchestration/ / integrations/)
│   ├── lib/ (supabase/ / cloudflare/ / whatsapp/ / money/ / validation/)
│   ├── config/ / hooks/ / stores/ / styles/ / types/
├── public/ (icons/ / licensed-assets/ / offline.html)
├── supabase/ (migrations/ / tests/ / seed.sql)
├── tests/ (unit/ / integration/ / e2e/ / accessibility/ / visual/ / fixtures/)
├── docs/ (decisions/ and engineering/domain guides)
├── .agents/skills/<name>/SKILL.md
├── .codex/config.example.toml
├── .github/ (workflows/ / pull_request_template.md)
└── scripts/ (approved backup, setup and media tooling)
```

## Feature example
```text
features/products/
  components/ProductCard.tsx
  components/ProductGallery.tsx
  components/ProductForm.tsx
  domain/product.types.ts
  domain/product.rules.ts
  schemas/product.schema.ts
  server/product.queries.ts
  server/product.repository.ts
  server/product.service.ts
  server/product.actions.ts
  hooks/use-product-selection.ts
  tests/product.rules.test.ts
  index.ts  # client-safe public exports only, if useful
```

Routes compose features. Shared UI must not import business features. Server entry points and privileged data access must not be re-exported from client-safe barrels. A feature may omit irrelevant layers. Cross-feature orchestration lives in `server/` only when it genuinely spans domains. Place protected route layouts plus server checks at mutation and query boundaries. Keep feature test files near logic or in `tests/`, not duplicated. Build P1 routes only when enabled by scope.

## ZIP distinction
This ZIP contains Markdown, a disabled MCP configuration example and a PR template. Application folders and executable config files above are planned, not placeholders masquerading as implemented code. The actual package manifest is listed in `KIT_CONTENTS.md`.
