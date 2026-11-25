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
        description="Give each colour its own product name, add complete-set details, then add size stock and real photos before publishing."
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
            <input
              autoComplete="off"
              maxLength={160}
              name="title"
              placeholder="Royal Wedding Set — Ruby Red"
              required
            />
            <small>Include the colour in the name. Each colour is a separate product.</small>
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
              <span>Bangles in each set</span>
              <input defaultValue="5" max="32" min="2" name="set_count" required type="number" />
            </label>
            <label className="admin-field">
              <span>Display order</span>
              <input defaultValue="0" name="sort_order" type="number" />
            </label>
          </div>
          <label className="admin-field">
            <span>Delivery fee per order (LKR)</span>
            <input
              inputMode="decimal"
              min="0"
              name="delivery_fee_lkr"
              placeholder="Enter 0 for free delivery"
              step="0.01"
              type="number"
            />
            <small>Set this before publishing. The highest fee in a cart is charged once.</small>
          </label>
          <label className="admin-checkbox">
            <input name="cod_enabled" type="checkbox" />
            <span>
              Allow cash on delivery for this product
              <small>Cash on delivery also needs to be enabled in Commerce settings.</small>
            </span>
          </label>
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
