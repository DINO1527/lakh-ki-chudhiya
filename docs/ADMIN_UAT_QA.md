# Admin UAT QA — 2026-11-26

## Environment and safety

- Manual admin QA ran at `http://localhost:3001` while signed in as the existing UAT owner. The connected Supabase project was `lakh-ki-chudhiya-uat` (`xkubxzzbnbggpdpobcil`). No production app deployment, checkout or payment action was performed.
- The previously approved business-data reset preserved the owner membership, Auth users and required settings. QA subsequently created only one explicitly labelled product draft, one explicitly labelled collection draft and one disabled offer targeting that draft. No customer/order/stock facts or saleable merchandise facts were added.
- The Supabase dashboard had previously displayed a `main PRODUCTION` branch badge beside the UAT project name. That environment-label mismatch remains a risk to resolve before future destructive database actions; the two catalogue migrations applied in this task and their checks were run in the owner-selected project shown above.

## Product QA

- Create-product required-field and set-count bounds (2–32) were checked in the earlier route pass. The valid QA draft create path initially exposed PostgreSQL `42P17` from recursive product/collection RLS. After the approved recursion migration, draft creation succeeded and showed the success notice; the row persisted after navigating away and back.
- Product list clearly displays an image when signed media exists and an explicit “No product image uploaded” placeholder when it does not. The QA draft has no variants, delivery fee, care instructions or image, so it remained private.
- “Review and publish” opened the shared confirmation dialog. Confirming an incomplete draft was rejected by the database and it stayed Draft. The first response was too generic; the server now maps the database’s `22023` requirement failure to a message naming care instructions, delivery fee, an active size and a product image. Repeating the same publish attempt displayed that actionable message.
- Archive confirmation opened correctly; Cancel left the product unchanged.

## Collection QA

- A labelled draft collection was created; the page showed a success notice and the new image-first card displayed its “No collection image uploaded” placeholder.
- Attempting to add a photo with no selection showed the browser’s “Please select a file” validation. The image dialog presents alternative text, photo order, local preview, crop controls and restore-original control. Crop produced a local cropped JPEG preview and Restore original returned to the source. Neither file was uploaded.
- A hostile-looking slug test (`bad slug/<script>`) was normalized to the safe slug `bad-slug-script`; no markup executed. The collection was restored to `qa-only-not-for-sale-collection-flow-check` afterward.
- Attempting to publish without an image showed “Add at least one image before publishing this collection.” The collection remained Draft. Collection search and list refresh were previously checked; the saved draft remained visible after navigating back.

## Offer QA

- Created `QA ONLY - NOT FOR SALE - Offer flow check`, targeting only the QA product draft with a 1-set minimum and 1% test discount. It was saved Off and remains disabled; no commercial impact is possible while disabled and the target is unpublished.
- Attempting to enable the offer without a published banner returned the explicit “Publish an offer banner before enabling this offer” message. The offer remained Off, matching the database constraint.
- Offer search returned the matching QA record and a clear no-match state for a sentinel query. Reload/navigation preserved the saved offer. Schedule ordering, banner Storage upload, banner publish/archive and pagination beyond page one were not manually exercised.

## Shared UI, data and security checks

- Success feedback was observed for product draft, collection draft, collection edit and offer save. Pending controls disabled and displayed “Creating draft…” or “Saving…” while mutations ran. Error feedback was observed for missing collection image, missing offer banner, offer enable guard and product publish guard.
- The product details editor has one primary save button. Product collection/SKU/photo operations are separate focused tasks. Confirmation dialogs are shared, keyboard-accessible dialogs. Offer and collection cards are image-first with explicit empty placeholders.
- Search checks covered products, collections, offers, inventory and orders in the route pass. Positive and no-match offer searches were checked during this pass. Data refresh after navigation showed the saved draft rows.
- Input normalization, numeric bounds, UUID/role checks, image size/type/signature checks, signed private media URLs, server-authoritative pricing/stock/eligibility, staff checks, RLS and sanitised logs were source-reviewed. Logs retain operation, resource and a validated error code only; they do not include submitted values or raw database messages.
- Applied to the owner-selected UAT project: `20261126000000_fix_catalogue_admin_rls_recursion.sql` and `20261126010000_offer_banner_media.sql`. Both rollback-only structural SQL checks (`catalogue_admin_rls_recursion.sql`, `offer_banner_policies.sql`) returned success in the UAT SQL editor. The tests verified staff-only policies, active target/schedule visibility, private signing, one active banner per offer, and offer enable/archive safeguards. They made no persistent business-data changes.

## Findings and limitations

- **Fixed and manually verified:** incomplete product publishing had a generic error. The action now distinguishes SQLSTATE `22023` and the UI gives staff the exact setup checklist.
- **Not verified end to end:** selecting a new local file through the in-app browser and uploading it to Supabase Storage. The only selected preview during QA was an unrelated personal poster, so it was used only to exercise local crop/restore and was never uploaded. No image appears on the QA product, collection or offer yet.
- **Not verified:** malicious file payloads/oversize files against live Storage, direct unauthenticated/role-matrix/API requests, mobile viewport screenshots, later-page pagination, product SKU save/edit and actual Storage cleanup after a metadata failure. The browser viewport remained at its default 1314 px; responsive breakpoints were source-reviewed.
- The prior 13-route pass checked `/admin`, product create/list, collection/offer, inventory, orders, customers, content, commerce settings, account security, team and activity. Empty required-field submissions were blocked where available. Order, customer, security and team writes were deliberately not generated.
- No real product facts or matching product photographs were provided. The requested five saleable products therefore were not created; the only product is an unpublished QA fixture with no price/SKU/stock.

## Local verification

Results are recorded after the final source change:

- PASS `pnpm lint`
- PASS `pnpm format:check`
- PASS `pnpm test` — 7 files, 33 tests
- PASS `pnpm exec tsc --noEmit --incremental false`
- PASS `git diff --check`
- Not run: OpenNext Cloudflare Worker preview/build; the Windows worktree has a documented Worker packaging symlink `EPERM` failure. No full browser automation suite is configured.

## Form and cropper UX follow-up — 2026-11-26

- On `http://localhost:3001`, submitting the product-create form with the product name and set count empty was blocked and showed a field-labelled popup. The product photo dialog also blocked an empty submission and marked both required fields. Its popup was initially obscured by the native modal layer; notifications now render inside open admin dialogs and were visually confirmed above the photo form. Dismissing the notification left the dialog open.
- The first popup render repeated punctuation at the end of native browser validation text; the message formatter now normalizes that punctuation.
- The photo interface now offers an image-space crop frame that can be dragged and resized directly, keyboard arrow adjustment, crop preview, Apply crop and Restore original. This follow-up could not choose a local file in the in-app browser, so direct drag/resize/apply/restore and file-type/size cases remain unverified for the new crop frame. No image was selected, uploaded or saved in this follow-up.
- The active product detail page showed status **Published**, one active SKU (`UAT-PASTEL-AQUA-24`, zero on hand), and one published image whose alt text is `asd`. This differs from the earlier QA note that the fixture was a draft with no image. No data was changed while checking the form; owner review is needed before treating this QA fixture as storefront-ready.
- No new collection, offer, product, image, SKU, inventory or order writes were made in this follow-up. The local cropper still needs a real file-driven browser check before its interaction can be marked manually verified.

## Lacora admin and reviews follow-up — 2026-11-26

- Fixed the maximum-update-depth issue by stabilizing the toast context value and making each notice effect depend on the stable `push` function. The app code compiles and lint passes; this checkout could not reproduce the issue in the signed-in browser because CUA returned a `service_info` timeout.
- Updated admin branding/theme and control layouts, added the Lacora mark and product section navigation, and restyled the file-picker button. Source-level changes are present; this checkout could not visually inspect port 3001 because no local listener or Supabase environment was available.
- Product editing sections now use keyboard-accessible tabs and render only the selected form, so the visible workflow presents one editing section at a time. Inventory stays a separate link and publish/archive controls remain in the toolbar.
- Implemented verified-purchase review submission, pending moderation, public approved review display, product review enablement, staff approve/decline actions, RLS, minimal public column grants, and SQL assertions. The new migration `20261126020000_product_reviews.sql` and `supabase/tests/product_reviews.sql` were not applied or run against UAT.
- The two supplied product photos were not uploaded. The current worktree has no `.env.local`, Supabase project link, or active port-3001 server; the browser automation service also failed to initialize.
- Local checks after these changes: PASS `pnpm typecheck`, `pnpm lint`, `pnpm test` (8 files, 46 tests), `pnpm format:check`, `pnpm build`, and `git diff --check`. `pnpm cf:build` compiled Next successfully but OpenNext bundling failed with Windows `EPERM` creating a middleware dependency symlink. WSL enumeration was denied; `pnpm test:worker` was not run.
- Still required before treating this as UAT-verified: confirm/link the documented UAT project in this worktree, apply and execute the review migration/assertions there, manually retest toast behavior and review permissions, upload both supplied images through the cropper, and run a Worker preview.

## Homepage, reviews error and public-fixture follow-up (2026-11-26)

- Rechecked the desktop storefront on `localhost:3001`. The bangle was initially scaled to 2.95 while its rings assembled, so the first render extended past the art frame and across the copy boundary. The opening scale is now 0.8 on landscape and 0.68 on portrait; the settled 1280 × 720 screenshot shows the complete assembled set inside the art panel. The static illustration stays visible until WebGL is ready.
- Collection and product carousel `<ul>` tracks now reset list markers and padding. The visible collection cards no longer have stray bullets outside their borders. The homepage scroll review confirmed the “Need help?” block is absent and the footer surface matches its burgundy wave.
- The signed-in browser exposed one QA product and a synthetic collection collage on the public homepage. Prefix filters and QA-marker checks now suppress `uat-*`, `qa-only-*`, “QA ONLY”, “UAT”, “NOT FOR SALE” and “MOCKUP ONLY” content across public product, collection and offer mapping. The shop and homepage now show empty states instead of QA merchandise. Those test rows/media remain stored; this change did not delete them.
- `/admin/reviews` displayed a clear toast explaining that the UAT review migration is missing. `PGRST205` now uses the safe warning logger path; the page no longer emits the prior Next development error overlay. The migration remains unapplied, so no review submission or moderation workflow was exercised.
- PASS: lint, formatting, TypeScript (`pnpm exec tsc --noEmit --incremental false`), 50 unit tests, and `git diff --check`. Mobile viewport, Worker build, SQL migration tests, and database-backed display-order shifting remain unverified.

## Manual UAT image upload follow-up — 2026-11-26

- In the signed-in admin at `http://localhost:3001`, selected the two supplied photos for the QA-only product. The first file was dragged within the live crop area and produced a cropped local preview before upload. The second file showed its local preview and was uploaded with descriptive alternative text.
- After saving, both image records appeared in Photos with status **draft** and a “Review and publish image” action. They remain private; neither image nor the product was published during this follow-up. No fixture was deleted or otherwise edited.
- The photo form rejected empty alternative text with a field-labelled popup. After valid text, the submit button displayed “Uploading…” and the photo records were visible when the operation returned. No duplicate upload was created during recovery from the earlier expired browser session.
- This manual pass wrote only the two explicitly authorized image assets and their private media metadata to the QA product through the signed-in local admin. No data reset, schema migration, review/order/customer write or publication was performed.

## UAT public flow and shopping information strip follow-up — 2026-11-26

- Removed the UAT/QA slug and text-marker exclusions from public catalogue queries and mapping. Published UAT products, collections, active offers and matching product details now load. Removed the fixture notice and fixture-only purchase blockers from product selection and cart editing. Draft publication, variant availability, private media, quantity bounds and server pricing remain in force.
- Updated the homepage shopping-information strip to a raised light-ivory card with burgundy icon badges, staggered entrance motion, restrained hover response, keyboard-visible focus and reduced-motion support. Checked at 340 px and desktop width: the three cells remain aligned and readable with no overflow.
- On the public homepage, the QA-labelled collection cards and QA product card now appear. Opening the product detail route worked; selecting its available size enabled the normal Add to cart button. No cart or order was submitted. The browser console had no errors. The product review panel still reports its missing-schema state because `product_reviews` remains unapplied.

## Shop filters, offer banner and homepage shelf follow-up — 2026-11-26

- Customer collection routes now redirect into Shop filters. `/collections` redirects to `/shop#catalogue-collection`; legacy `/collections/[slug]` routes redirect to the matching Shop filter. Header, mobile navigation, footer, product breadcrumbs, offer links and homepage shelf links now use Shop filters.
- Replaced homepage collection/editorial cards and the latest-arrivals carousel with published offer banners immediately after the hero, then compact product grids grouped by collection. Banners use published `offer_media` signed images; the carousel is manual, has no blinking badge/autoplay, and respects reduced motion. Shop uses a compact introduction and the same banner component.
- Product cards use square photo areas and a responsive four/three/two/one-column grid, short size summaries, static offer badges, price/review/stock details and size selection. Shop excludes products without an available variant; homepage shelves also require published photos. This follows normal stock/media rules and does not hide UAT-marked data.
- The first Shop product photo now loads eagerly while later product images stay lazy. The first manual Shop review recorded Next's LCP loading hint; after the change, the image reported `loading="eager"`, loaded at full natural width, and a fresh browser reload produced no new LCP warning.
- Manual local review on port 3001: desktop Shop filters aligned and cards remained compact. At a 390 × 844 viewport override, the mobile banner and cards fit without page-level horizontal overflow. Both legacy collection routes landed on Shop. Selecting size `2-4` retained the collection filter; a no-match search showed a readable empty state and retained selected filters. No cart/order submission or database write occurred.
- The current active UAT offer banner contains unrelated Harry Potter event artwork and QA-labelled copy. It is shown as stored for UAT flow checks; no replacement or fabricated banner was created. Replace that UAT media before using the page as a polished brand preview.
- Added migration `20261126040000_include_qa_catalogue_records.sql` to remove the remaining fixture exclusions in `get_active_storefront_offers` and `get_public_low_stock_variants`. Published-target, enabled/date and stock bounds remain enforced. It was not applied or executed against UAT, so collection-target QA offers and QA low-stock labels remain dependent on applying the migration.
- PASS: `pnpm typecheck`, `pnpm lint`, `pnpm test` (9 files, 49 tests), `pnpm build`, targeted Prettier check and `git diff --check`. Earlier console logs showed two existing Three.js warnings from the hero; no app errors or new LCP warning remained after the final Shop reload.
