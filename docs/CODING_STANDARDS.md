# Software engineering standards

## Principles with examples
| Rule | Apply | Avoid |
|---|---|---|
| Single responsibility | Price calculation separate from UI, order creation and messaging | Checkout component performing all logic |
| Open/closed | Extend checkout with verified payment adapters | Editing every checkout component for each provider |
| Liskov substitution | Provider implementations honor contract semantics/errors | Stub marking payment successful |
| Interface segregation | Narrow inventory read/reserve contracts | Giant commerce interface |
| Dependency inversion | Pure use cases accept external adapters where useful | Domain importing Supabase client |
| DRY | Shared money, variant and UI primitives | Copy/paste repeated checkout logic |
| KISS/YAGNI | Use direct, typed queries and functions when enough | Generic base classes, event buses, early microservices |
| Composition | ProductCard composes Image, PriceDisplay, StarRating | Giant component with dozens of conditional modes |

## Implementation rules
- Strict TypeScript; avoid `any`, unexplained assertions, `@ts-ignore` and non-null assertions. Narrow unknown errors and inputs. Prefer discriminated unions for meaningful states. Use generated Supabase types and Zod boundary schemas; no duplicated drift-prone schemas without justification.
- PascalCase component files, camelCase functions, descriptive symbols, kebab-case routes and skill folders, snake_case SQL. Respect established patterns. Avoid magic business numbers; centralize units, semantic tokens, configuration and state codes. Monetary values use integer minor units, bounded calculations and explicit currency.
- Prefer named exports and focused functions, early validation, readable branches and explicit error mapping. Use JSDoc for invariants, not obvious comments. Handle expected errors without leaking stack/database details. Logging is structured and sanitized.
- Client components do not directly invoke privileged DB clients; protect server-only using the framework mechanism. Role and ownership checks precede sensitive actions. Use parameterized queries/typed APIs, transactional RPC for stock/order mutations and migration-controlled schema.
- Search repository for prior components and utilities; share only stable, genuinely reusable patterns. Keep product-specific UI in its feature. Design tokens control colors/spacing/typography; shadcn primitives remain accessible. No duplicate dialog/table/cart implementations. Use Storybook only if justified later.
- Every screen has loading, empty, error and disabled states where applicable. Keyboard and screen-reader behavior, touch-friendly controls, mobile responsiveness and reduced motion are mandatory. Product data must be real in production; fixtures clearly separated.
- Separate import boundaries using ESLint restrictions or equivalent; avoid circular dependencies and client/server barrel mixing. Avoid needless client-side fetch waterfalls and repeated large queries. Review dynamic imports for heavy 3D/chart code.

## Quality tooling
Adopt one pnpm lockfile, strict TS, ESLint, Prettier, Vitest, Playwright, Supabase SQL tests, axe-core. Optional Knip, lint-staged/Husky, Bruno, Lighthouse and Gitleaks when benefits justify setup. CI should run lint, format check, typecheck, tests and Worker build; use a separate approved environment for integration/e2e. Do not mask failures or commit generated secrets/artifacts. Use small diffs and conventional commit names when authorized. Pull requests explain why, evidence, regression risks, security and migration changes.
