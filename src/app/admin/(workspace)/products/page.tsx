import Image from "next/image";
import Link from "next/link";
import { AdminNotice, AdminPageHeader, StatusBadge } from "@/features/admin/components/admin-ui";
import { AdminPagination } from "@/features/admin/components/admin-pagination";
import { AdminSearchForm } from "@/features/admin/components/admin-search-form";
import { requireStaff } from "@/features/admin/server/access";
import { logAdminQueryFailure } from "@/features/admin/server/action-logger";

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
    .select("id, title, slug, status, updated_at", { count: "exact" })
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
        .select("id, product_id, storage_path, alt_text, sort_order")
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
  if (mediaResult.error)
    logAdminQueryFailure("loadProductCardImages", "product_media", mediaResult.error.code);
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
      {params.error ? (
        <AdminNotice tone="error">The requested product change could not be completed.</AdminNotice>
      ) : null}
      {mediaResult.error || signedMedia.error ? (
        <AdminNotice tone="error">Some product images could not be loaded.</AdminNotice>
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
                          <StatusBadge>{product.status}</StatusBadge>
                        </td>
                        <td>
                          {new Intl.DateTimeFormat("en-LK", {
                            dateStyle: "medium",
                            timeZone: "Asia/Colombo",
                          }).format(new Date(product.updated_at))}
                        </td>
                        <td>
                          <Link className="admin-text-link" href={`/admin/products/${product.id}`}>
                            Edit
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
