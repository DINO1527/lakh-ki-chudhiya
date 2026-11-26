import Link from "next/link";
import { AdminNotice, AdminPageHeader } from "@/features/admin/components/admin-ui";
import { AdminSubmitButton } from "@/features/admin/components/admin-submit-button";
import { createProduct } from "@/features/admin/server/product-actions";

export default async function NewAdminProductPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const params = await searchParams;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  return (
    <>
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Create a product"
        description="Start with the product name and set size. Add prices, stock, photos and a collection in the next steps."
      />
      {error ? (
        <AdminNotice tone="error">
          {error === "invalid"
            ? "Review the product name and set size, then try again."
            : error === "duplicate"
              ? "That product name or URL is already in use. Choose a different name or slug."
              : error === "access"
                ? "The database rejected this draft. Ask the owner to review catalogue access and retry."
                : "The product could not be saved. Check the fields and retry. If it continues, ask the owner to review the error log."}
        </AdminNotice>
      ) : null}
      <section className="admin-panel admin-panel--narrow">
        <form action={createProduct} className="admin-form">
          <label className="admin-field">
            <span>Product name</span>
            <input
              autoComplete="off"
              maxLength={160}
              minLength={1}
              name="title"
              placeholder="Royal Wedding Set — Ruby Red"
              required
            />
            <small>Use one product for each design or colour.</small>
          </label>
          <label className="admin-field">
            <span>Bangles in each set</span>
            <input max="32" min="2" name="set_count" required step="1" type="number" />
            <small>
              This is the number of bangles in one sellable set. Stock counts complete sets.
            </small>
          </label>
          <p className="admin-muted">
            This creates a private draft. You can leave optional details for later.
          </p>
          <details className="admin-form-details">
            <summary>Add optional product information now</summary>
            <div className="admin-form-details__content">
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
              <p className="admin-field__hint">
                New products are added after the existing catalogue. You can reorder them from the
                product details page.
              </p>
              <label className="admin-field">
                <span>Delivery fee per order (LKR)</span>
                <input
                  inputMode="decimal"
                  max="21474836.47"
                  min="0"
                  name="delivery_fee_lkr"
                  placeholder="Enter 0 for free delivery"
                  step="0.01"
                  type="number"
                />
                <small>The highest delivery fee in a cart is charged once.</small>
              </label>
              <label className="admin-checkbox">
                <input name="cod_enabled" type="checkbox" />
                <span>
                  Allow cash on delivery for this product
                  <small>COD also needs to be enabled in Checkout settings.</small>
                </span>
              </label>
            </div>
          </details>
          <div className="admin-form__actions">
            <AdminSubmitButton pendingLabel="Creating draft…">
              Create draft and continue
            </AdminSubmitButton>
            <Link className="admin-button admin-button--quiet" href="/admin/products">
              Cancel
            </Link>
          </div>
        </form>
      </section>
    </>
  );
}
