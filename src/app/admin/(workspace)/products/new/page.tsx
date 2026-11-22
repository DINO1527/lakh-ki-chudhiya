import Link from "next/link";
import { AdminNotice, AdminPageHeader } from "@/features/admin/components/admin-ui";
import { createProduct } from "@/features/admin/server/product-actions";

export default async function NewAdminProductPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const params = await searchParams;
  return (
    <>
      <AdminPageHeader
        eyebrow="Catalogue"
        title="New product draft"
        description="Save the product details first. Add variants and an approved image before publishing."
      />
      {params.error ? (
        <AdminNotice tone="error">
          Check the product details or try again. The product was not saved.
        </AdminNotice>
      ) : null}
      <section className="admin-panel admin-panel--narrow">
        <form action={createProduct} className="admin-form">
          <label className="admin-field">
            <span>Product name</span>
            <input autoComplete="off" maxLength={160} name="title" required />
          </label>
          <label className="admin-field">
            <span>
              URL slug <small>Leave blank to make it from the product name.</small>
            </span>
            <input autoComplete="off" maxLength={100} name="slug" />
          </label>
          <label className="admin-field">
            <span>Description</span>
            <textarea maxLength={8_000} name="description" rows={5} />
          </label>
          <label className="admin-field">
            <span>Material</span>
            <input maxLength={160} name="material" />
          </label>
          <label className="admin-field">
            <span>Care instructions</span>
            <textarea maxLength={2_000} name="care_instructions" rows={4} />
          </label>
          <div className="admin-form__row">
            <label className="admin-field">
              <span>Pieces per sellable unit</span>
              <input defaultValue="1" max="32" min="1" name="set_count" required type="number" />
            </label>
            <label className="admin-field">
              <span>Display order</span>
              <input defaultValue="0" name="sort_order" type="number" />
            </label>
          </div>
          <div className="admin-form__actions">
            <button className="admin-button admin-button--primary" type="submit">
              Save draft
            </button>
            <Link className="admin-button admin-button--quiet" href="/admin/products">
              Cancel
            </Link>
          </div>
        </form>
      </section>
    </>
  );
}
