import Link from "next/link";
import { AdminNotice, AdminPageHeader, StatusBadge } from "@/features/admin/components/admin-ui";
import { requireStaff } from "@/features/admin/server/access";

const PAGE_SIZE = 30;

export default async function AdminProductsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const [params, { supabase }] = await Promise.all([searchParams, requireStaff()]);
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const pageNumber = rawPage && /^[0-9]{1,5}$/.test(rawPage) ? Math.max(1, Number(rawPage)) : 1;
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
  const from = (pageNumber - 1) * PAGE_SIZE;
  const { data, count, error } = await query.range(from, from + PAGE_SIZE - 1);

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
      {error ? (
        <AdminNotice tone="error">The product list could not be loaded.</AdminNotice>
      ) : data?.length ? (
        <div className="admin-panel">
          <form action="/admin/products" className="admin-filter" method="get">
            <label className="admin-field admin-field--compact">
              <span>Product status</span>
              <select defaultValue={statusFilter} name="status">
                <option value="">All products</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <button className="admin-button admin-button--secondary" type="submit">
              Filter
            </button>
          </form>
          <div className="admin-table-wrap">
            <table className="admin-table">
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
                {data.map((product) => (
                  <tr key={product.id}>
                    <th scope="row">
                      <Link href={`/admin/products/${product.id}`}>{product.title}</Link>
                      <span className="admin-table__subtext">/{product.slug}</span>
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
          <p className="admin-muted">
            Showing {from + 1}–{Math.min(from + PAGE_SIZE, count ?? 0)} of {count ?? 0} products.
          </p>
          <div className="admin-pager">
            {pageNumber > 1 ? (
              <Link
                href={`/admin/products?page=${pageNumber - 1}${statusFilter ? `&status=${statusFilter}` : ""}`}
              >
                Previous page
              </Link>
            ) : (
              <span />
            )}
            {(count ?? 0) > from + PAGE_SIZE ? (
              <Link
                href={`/admin/products?page=${pageNumber + 1}${statusFilter ? `&status=${statusFilter}` : ""}`}
              >
                Next page
              </Link>
            ) : null}
          </div>
        </div>
      ) : (
        <section className="admin-empty-state">
          <h2>No products in this view</h2>
          <p>Start with a draft. Public pages only show products after the publish checks pass.</p>
          <Link className="admin-button admin-button--primary" href="/admin/products/new">
            Create a product
          </Link>
        </section>
      )}
    </>
  );
}
