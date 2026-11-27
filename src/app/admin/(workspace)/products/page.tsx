import Image from "next/image";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { AdminNotice, AdminPageHeader, StatusBadge } from "@/features/admin/components/admin-ui";
import { AdminPagination } from "@/features/admin/components/admin-pagination";
import { AdminSearchForm } from "@/features/admin/components/admin-search-form";
import { ConfirmButton } from "@/features/admin/components/confirm-button";
import { getProductPublishBlockers } from "@/features/admin/domain/product-publish-readiness";
import { requireStaff } from "@/features/admin/server/access";
import { logAdminQueryFailure } from "@/features/admin/server/action-logger";
import { toggleProductPublication } from "@/features/admin/server/product-actions";

const PAGE_SIZE = 30;

export default async function AdminProductsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const [params, { supabase }] = await Promise.all([searchParams, requireStaff()]);
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const pageNumber = rawPage && /^[0-9]{1,5}$/.test(rawPage) ? Math.max(1, Number(rawPage)) : 1;
  const rawSearch = Array.isArray(params.q) ? params.q[0] : params.q;
  const search = (rawSearch ?? "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .slice(0, 64)
    .trim();
  const selectedStatus = Array.isArray(params.status) ? params.status[0] : params.status;
  const statusFilter =
    selectedStatus === "draft" || selectedStatus === "published" || selectedStatus === "archived"
      ? selectedStatus
      : "";
  let query = supabase
    .from("products")
    .select(
      "id, title, slug, status, updated_at, set_count, care_instructions, delivery_fee_minor",
      { count: "exact" },
    )
    .order("updated_at", { ascending: false });
  if (statusFilter) query = query.eq("status", statusFilter);
  if (search) query = query.or(`title.ilike.%${search}%,slug.ilike.%${search}%`);
  const from = (pageNumber - 1) * PAGE_SIZE;
  const { data, count, error } = await query.range(from, from + PAGE_SIZE - 1);
  if (error) logAdminQueryFailure("loadProducts", "products", error.code);
  const products = data ?? [];
  const mediaResult = products.length
    ? await supabase
        .from("product_media")
        .select("id, product_id, storage_path, alt_text, media_type, status, sort_order")
        .in(
          "product_id",
          products.map((product) => product.id),
        )
        .eq("media_type", "image")
        .in("status", ["draft", "published"])
        .order("sort_order")
        .order("id")
        .limit(PAGE_SIZE * 20)
    : { data: [], error: null };
  const variantsResult = products.length
    ? await supabase
        .from("product_variants")
        .select("product_id, is_active")
        .in(
          "product_id",
          products.map((product) => product.id),
        )
        .limit(PAGE_SIZE * 40)
    : { data: [], error: null };
  if (mediaResult.error)
    logAdminQueryFailure("loadProductCardImages", "product_media", mediaResult.error.code);
  if (variantsResult.error)
    logAdminQueryFailure("loadProductPublishChecks", "product_variants", variantsResult.error.code);
  const mediaRows = mediaResult.data ?? [];
  const signedMedia = mediaRows.length
    ? await supabase.storage.from("product-media").createSignedUrls(
        mediaRows.map((media) => media.storage_path),
        300,
      )
    : { data: [], error: null };
  if (signedMedia.error)
    logAdminQueryFailure("signProductCardImages", "product-media", signedMedia.error.name);
  const coverByProduct = new Map<string, { url: string; altText: string }>();
  mediaRows.forEach((media, index) => {
    const url = signedMedia.data?.[index]?.signedUrl;
    if (url && !coverByProduct.has(media.product_id)) {
      coverByProduct.set(media.product_id, { url, altText: media.alt_text });
    }
  });
  const publishBlockersByProduct = new Map(
    products.map((product) => {
      const blockers =
        mediaResult.error || variantsResult.error
          ? ["Refresh to verify product images and active sizes before publishing."]
          : getProductPublishBlockers({
              title: product.title,
              careInstructions: product.care_instructions,
              setCount: product.set_count,
              deliveryFeeMinor: product.delivery_fee_minor,
              variants: (variantsResult.data ?? []).filter(
                (variant) => variant.product_id === product.id,
              ),
              media: mediaRows.filter((media) => media.product_id === product.id),
            });
      return [product.id, blockers] as const;
    }),
  );
  const changed = Array.isArray(params.changed) ? params.changed[0] : params.changed;

  return (
    <>
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Products"
        description="Create drafts, complete product details, preview them privately, then publish or archive."
        action={
          <Link className="admin-button admin-button--primary" href="/admin/products/new">
            Create product
          </Link>
        }
      />
      {changed === "published" ? (
        <AdminNotice tone="success">
          Product published and available in the public catalogue.
        </AdminNotice>
      ) : null}
      {changed === "draft" ? (
        <AdminNotice tone="success">Product moved to drafts and hidden from shoppers.</AdminNotice>
      ) : null}
      {changed === "photos" ? (
        <AdminNotice tone="success">
          Product photos saved. Review the draft status before publishing.
        </AdminNotice>
      ) : null}
      {params.error ? (
        <AdminNotice tone="error">
          {params.error === "publish_requirements"
            ? "Complete the product checklist before publishing. Open Edit to review the missing details."
            : params.error === "database_update" || params.error === "status"
              ? "The product status could not be changed. The UAT database may be missing the current product publishing migration."
              : params.error === "permission"
                ? "Your staff access does not allow this change. Ask the store owner to check your role."
                : params.error === "missing_record"
                  ? "This product is no longer available. Refresh the product list."
                  : "The product status could not be changed. Refresh the product list and try again."}
        </AdminNotice>
      ) : null}
      {mediaResult.error || signedMedia.error ? (
        <AdminNotice tone="error">Some product images could not be loaded.</AdminNotice>
      ) : null}
      {variantsResult.error ? (
        <AdminNotice tone="error">
          Product sizes could not be checked. Publishing draft products is disabled until the list
          refreshes.
        </AdminNotice>
      ) : null}
      {error ? (
        <AdminNotice tone="error">
          The product list could not be loaded. Refresh the page or try again.
        </AdminNotice>
      ) : (
        <div className="admin-panel">
          <AdminSearchForm
            action="/admin/products"
            hasFilters={Boolean(statusFilter)}
            label="Search products"
            placeholder="Name or URL slug"
            query={search}
          >
            <label className="admin-field admin-field--compact">
              <span>Status</span>
              <select defaultValue={statusFilter} name="status">
                <option value="">All products</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          </AdminSearchForm>
          {products.length ? (
            <>
              <div className="admin-table-wrap">
                <table className="admin-table admin-product-table">
                  <caption className="admin-sr-only">Products in the catalogue</caption>
                  <thead>
                    <tr>
                      <th scope="col">Product</th>
                      <th scope="col">Status</th>
                      <th scope="col">Last updated</th>
                      <th scope="col">
                        <span className="admin-sr-only">Edit</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id}>
                        <th scope="row" className="admin-product-table__product-cell">
                          <div className="admin-product-table__product">
                            {coverByProduct.has(product.id) ? (
                              <Image
                                alt={coverByProduct.get(product.id)?.altText ?? ""}
                                className="admin-product-table__cover"
                                height={88}
                                src={coverByProduct.get(product.id)?.url ?? ""}
                                unoptimized
                                width={88}
                              />
                            ) : (
                              <div
                                aria-label="No product image uploaded"
                                className="admin-product-table__cover admin-product-table__cover--empty"
                                role="img"
                              >
                                No image
                              </div>
                            )}
                            <span>
                              <Link href={`/admin/products/${product.id}`}>{product.title}</Link>
                              <span className="admin-table__subtext">/{product.slug}</span>
                            </span>
                          </div>
                        </th>
                        <td>
                          <div className="admin-product-visibility">
                            <StatusBadge>{product.status}</StatusBadge>
                            {product.status === "archived" ? null : product.status === "draft" &&
                              (publishBlockersByProduct.get(product.id)?.length ?? 0) > 0 ? (
                              <>
                                <button
                                  aria-checked={false}
                                  aria-describedby={`publish-blockers-${product.id}`}
                                  aria-label={`Publish ${product.title}`}
                                  className="admin-product-status-switch"
                                  disabled
                                  role="switch"
                                  title={publishBlockersByProduct.get(product.id)?.join(" ")}
                                  type="button"
                                >
                                  <span
                                    aria-hidden="true"
                                    className="admin-product-status-switch__track"
                                  >
                                    <span className="admin-product-status-switch__thumb" />
                                  </span>
                                </button>
                                <span className="admin-product-visibility__hint">
                                  Complete checklist to publish
                                </span>
                                <span
                                  className="admin-sr-only"
                                  id={`publish-blockers-${product.id}`}
                                >
                                  {publishBlockersByProduct.get(product.id)?.join(" ")}
                                </span>
                              </>
                            ) : (
                              <form
                                action={toggleProductPublication}
                                className="admin-product-visibility__form"
                              >
                                <input name="product_id" type="hidden" value={product.id} />
                                <input
                                  name="next_status"
                                  type="hidden"
                                  value={product.status === "published" ? "draft" : "published"}
                                />
                                <input name="return_q" type="hidden" value={search} />
                                <input name="return_status" type="hidden" value={statusFilter} />
                                <ConfirmButton
                                  className={`admin-product-status-switch${product.status === "published" ? " admin-product-status-switch--published" : ""}`}
                                  formAction={toggleProductPublication}
                                  message={
                                    product.status === "published"
                                      ? `Move ${product.title} back to drafts? It will no longer appear in the storefront.`
                                      : `Publish ${product.title}? Shoppers will be able to see its eligible details and photos.`
                                  }
                                  submitClassName="admin-button admin-button--primary"
                                  submitLabel={
                                    product.status === "published"
                                      ? "Move to drafts"
                                      : "Publish product"
                                  }
                                  triggerAriaChecked={product.status === "published"}
                                  triggerAriaLabel={
                                    product.status === "published"
                                      ? `Move ${product.title} to drafts`
                                      : `Publish ${product.title}`
                                  }
                                  triggerRole="switch"
                                  triggerTitle={
                                    product.status === "published"
                                      ? "Move this product back to drafts"
                                      : "Publish this product"
                                  }
                                >
                                  <span
                                    aria-hidden="true"
                                    className="admin-product-status-switch__track"
                                  >
                                    <span className="admin-product-status-switch__thumb" />
                                  </span>
                                </ConfirmButton>
                              </form>
                            )}
                          </div>
                        </td>
                        <td>
                          {new Intl.DateTimeFormat("en-LK", {
                            dateStyle: "medium",
                            timeZone: "Asia/Colombo",
                          }).format(new Date(product.updated_at))}
                        </td>
                        <td className="admin-product-table__action-cell">
                          <Link
                            aria-label={`Edit ${product.title}`}
                            className="admin-button admin-button--icon admin-button--quiet"
                            href={`/admin/products/${product.id}`}
                            title={`Edit ${product.title}`}
                          >
                            <Pencil aria-hidden="true" size={16} strokeWidth={1.8} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <AdminPagination
                action="/admin/products"
                itemLabel="products"
                page={pageNumber}
                pageSize={PAGE_SIZE}
                query={params}
                total={count ?? 0}
              />
            </>
          ) : (
            <div className="admin-empty-state">
              <h2>{search || statusFilter ? "No matching products" : "No products yet"}</h2>
              <p>
                {search || statusFilter
                  ? "Change the search or status filter to see more products."
                  : "Start with a draft. Public pages only show products after the publish checks pass."}
              </p>
              {!search && !statusFilter ? (
                <Link className="admin-button admin-button--primary" href="/admin/products/new">
                  Create a product
                </Link>
              ) : null}
            </div>
          )}
        </div>
      )}
    </>
  );
}
