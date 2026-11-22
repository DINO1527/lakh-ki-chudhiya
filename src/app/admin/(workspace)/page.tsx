import Link from "next/link";
import { AdminNotice, AdminPageHeader } from "@/features/admin/components/admin-ui";
import { getAdminOverview } from "@/features/admin/server/dashboard-data";

export default async function AdminDashboard({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const [overview, params] = await Promise.all([getAdminOverview(), searchParams]);
  const forbidden = params.error === "forbidden";

  return (
    <>
      <AdminPageHeader
        eyebrow="Store desk"
        title="Overview"
        description="Manage the catalogue, keep variant stock accurate, and prepare public content."
      />
      {forbidden ? (
        <AdminNotice tone="error">Your staff role does not have access to that page.</AdminNotice>
      ) : null}
      {overview.status === "error" ? (
        <AdminNotice tone="error">
          The dashboard data could not be loaded. Refresh or contact the owner.
        </AdminNotice>
      ) : (
        <section aria-label="Catalogue summary" className="admin-stat-grid">
          <article className="admin-stat-card">
            <span>Products</span>
            <strong>{overview.productCount}</strong>
            <Link href="/admin/products">Open catalogue</Link>
          </article>
          <article className="admin-stat-card">
            <span>Drafts</span>
            <strong>{overview.draftCount}</strong>
            <Link href="/admin/products?status=draft">Review drafts</Link>
          </article>
          <article className="admin-stat-card">
            <span>Active variants</span>
            <strong>{overview.variantCount}</strong>
            <Link href="/admin/inventory">View stock</Link>
          </article>
          <article className="admin-stat-card admin-stat-card--attention">
            <span>Unavailable variants</span>
            <strong>{overview.unavailableCount}</strong>
            <Link href="/admin/inventory?availability=unavailable">Check availability</Link>
          </article>
        </section>
      )}
      <section aria-labelledby="admin-quick-actions" className="admin-panel">
        <div className="admin-section-heading">
          <div>
            <p className="admin-eyebrow">Next steps</p>
            <h2 id="admin-quick-actions">Store controls</h2>
          </div>
        </div>
        <div className="admin-quick-links">
          <Link href="/admin/products/new">Create a product</Link>
          <Link href="/admin/collections">Manage collections</Link>
          <Link href="/admin/inventory">Adjust stock with a reason</Link>
          <Link href="/admin/content">Edit homepage content</Link>
        </div>
        <p className="admin-muted">
          Order confirmation, reservations and dispatch controls arrive in the orders stage. Stock
          is not reserved by this dashboard.
        </p>
      </section>
    </>
  );
}
