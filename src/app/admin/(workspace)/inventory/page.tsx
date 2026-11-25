import Link from "next/link";
import {
  AdminNotice,
  AdminPageHeader,
  StatusBadge,
  formatAdminDate,
} from "@/features/admin/components/admin-ui";
import { adjustInventory } from "@/features/admin/server/inventory-actions";
import { requireStaff } from "@/features/admin/server/access";

export default async function AdminInventoryPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const [params, { supabase }] = await Promise.all([searchParams, requireStaff()]);
  const rawSearch = Array.isArray(params.q) ? params.q[0] : params.q;
  const search = (rawSearch ?? "").normalize("NFKC").slice(0, 64).trim();
  const unavailableOnly = params.availability === "unavailable";
  let variantsQuery = supabase
    .from("product_variants")
    .select(
      "id, product_id, sku, size_code, colour_name, stock_on_hand, reserved_quantity, is_active, is_available",
      { count: "exact" },
    )
    .order("sku", { ascending: true })
    .limit(100);
  if (search) variantsQuery = variantsQuery.ilike("sku", `%${search}%`);
  if (unavailableOnly) variantsQuery = variantsQuery.eq("is_available", false);
  const [variantsResult, movementResult] = await Promise.all([
    variantsQuery,
    supabase
      .from("inventory_movements")
      .select(
        "id, variant_id, movement_type, on_hand_delta, reserved_delta, reason, actor_user_id, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const variantRows = variantsResult.data ?? [];
  const relevantIds = [
    ...new Set([
      ...variantRows.map((variant) => variant.id),
      ...(movementResult.data ?? []).map((movement) => movement.variant_id),
    ]),
  ];
  const [productResult, variantLookupResult] = await Promise.all([
    supabase
      .from("products")
      .select("id, title, slug")
      .in("id", [...new Set(variantRows.map((variant) => variant.product_id))]),
    relevantIds.length
      ? supabase
          .from("product_variants")
          .select("id, product_id, sku, size_code, colour_name")
          .in("id", relevantIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const productById = new Map((productResult.data ?? []).map((product) => [product.id, product]));
  const variantById = new Map(
    (variantLookupResult.data ?? []).map((variant) => [variant.id, variant]),
  );

  return (
    <>
      <AdminPageHeader
        eyebrow="Stock control"
        title="Inventory"
        description="Manage how many complete sets are physically in stock for each size. Every change needs a reason and is recorded."
      />
      {params.saved ? <AdminNotice tone="success">Stock adjustment recorded.</AdminNotice> : null}
      {params.error ? (
        <AdminNotice tone="error">
          Stock could not be changed. The requested quantity may be invalid or below reserved stock.
        </AdminNotice>
      ) : null}
      {variantsResult.error ||
      movementResult.error ||
      productResult.error ||
      variantLookupResult.error ? (
        <AdminNotice tone="error">Some inventory data could not be loaded.</AdminNotice>
      ) : null}
      <AdminNotice>
        Available stock is on hand minus reserved. Orders reserve stock when confirmed, dispatch
        consumes it, and cancellation before dispatch releases it. Carts and pending orders do not
        reserve stock. Enter a positive change to add complete sets or a negative change to remove
        them; changes below the reserved quantity are rejected.
      </AdminNotice>

      <section aria-labelledby="inventory-list-heading" className="admin-panel">
        <div className="admin-section-heading">
          <div>
            <p className="admin-eyebrow">Per-variant quantities</p>
            <h2 id="inventory-list-heading">Stock by SKU</h2>
          </div>
        </div>
        <form action="/admin/inventory" className="admin-filter" method="get">
          <label className="admin-field admin-field--compact">
            <span>Search by SKU</span>
            <input defaultValue={search} maxLength={64} name="q" />
          </label>
          <label className="admin-checkbox">
            <input
              defaultChecked={unavailableOnly}
              name="availability"
              type="checkbox"
              value="unavailable"
            />
            <span>Unavailable only</span>
          </label>
          <button className="admin-button admin-button--secondary" type="submit">
            Apply filters
          </button>
          <Link className="admin-text-link" href="/admin/inventory">
            Clear
          </Link>
        </form>
        {variantRows.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table admin-inventory-table">
              <caption className="admin-sr-only">
                On-hand stock, reserved quantities and adjustments by product variant
              </caption>
              <thead>
                <tr>
                  <th scope="col">SKU and product</th>
                  <th scope="col">On hand</th>
                  <th scope="col">Reserved</th>
                  <th scope="col">Available</th>
                  <th scope="col">Add or remove stock</th>
                </tr>
              </thead>
              <tbody>
                {variantRows.map((variant) => {
                  const product = productById.get(variant.product_id);
                  return (
                    <tr key={variant.id}>
                      <th scope="row">
                        <strong>{variant.sku}</strong>
                        <span className="admin-table__subtext">
                          {product?.title ?? "Unknown product"} · {variant.size_code ?? "One size"}{" "}
                          · {variant.colour_name}
                        </span>
                        <span className="admin-table__subtext">
                          {variant.is_active ? "Active" : "Inactive"}
                        </span>
                      </th>
                      <td>{variant.stock_on_hand}</td>
                      <td>{variant.reserved_quantity}</td>
                      <td>
                        <StatusBadge>
                          {variant.is_available
                            ? String(variant.stock_on_hand - variant.reserved_quantity)
                            : "Unavailable"}
                        </StatusBadge>
                      </td>
                      <td>
                        <form action={adjustInventory} className="admin-adjust-form">
                          <input name="variant_id" type="hidden" value={variant.id} />
                          <label className="admin-field">
                            <span>Quantity change</span>
                            <input
                              aria-label={`Quantity change for ${variant.sku}`}
                              aria-describedby={`quantity-help-${variant.id}`}
                              inputMode="numeric"
                              name="quantity_delta"
                              placeholder="e.g. 5"
                              required
                              step="1"
                              type="number"
                            />
                            <small id={`quantity-help-${variant.id}`}>
                              Use a minus sign to remove sets.
                            </small>
                          </label>
                          <label className="admin-field">
                            <span>Reason</span>
                            <input
                              aria-label={`Reason for ${variant.sku} adjustment`}
                              maxLength={500}
                              name="reason"
                              placeholder="Stock count or delivery received"
                              required
                            />
                          </label>
                          <button className="admin-button admin-button--secondary" type="submit">
                            Save stock adjustment
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="admin-muted">
            No variants match this view. Add product variants in the catalogue.
          </p>
        )}
        {(variantsResult.count ?? 0) > 100 ? (
          <p className="admin-muted">
            Showing the first 100 matching variants. Search by SKU to narrow the list.
          </p>
        ) : null}
      </section>

      <section aria-labelledby="inventory-history-heading" className="admin-panel">
        <div className="admin-section-heading">
          <div>
            <p className="admin-eyebrow">Audit trail</p>
            <h2 id="inventory-history-heading">Recent stock movements</h2>
          </div>
        </div>
        {movementResult.data?.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <caption className="admin-sr-only">Most recent inventory adjustments</caption>
              <thead>
                <tr>
                  <th scope="col">Time</th>
                  <th scope="col">SKU</th>
                  <th scope="col">Change</th>
                  <th scope="col">Reason</th>
                  <th scope="col">Actor</th>
                </tr>
              </thead>
              <tbody>
                {movementResult.data.map((movement) => {
                  const variant = variantById.get(movement.variant_id);
                  return (
                    <tr key={movement.id}>
                      <td>{formatAdminDate(movement.created_at)}</td>
                      <td>{variant?.sku ?? "SKU no longer available"}</td>
                      <td>
                        {movement.on_hand_delta > 0 ? "+" : ""}
                        {movement.on_hand_delta}
                      </td>
                      <td>{movement.reason}</td>
                      <td>
                        <code>{movement.actor_user_id ?? "Account removed"}</code>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="admin-muted">No inventory movements recorded yet.</p>
        )}
      </section>
    </>
  );
}
